#!/usr/bin/env node

/**
 * TSXファイルをJSON形式に変換するツール（Babel Parser使用）
 *
 * 使用方法:
 * node scripts/convert-tsx-to-json.js app/pedigree/ScarletInk.tsx
 *
 * 必要なパッケージ:
 * npm install @babel/parser @babel/traverse @babel/types
 */

const fs = require('fs')
const path = require('path')

// Babel関連のインポート（動的インポートでエラーハンドリング）
let parser, traverse, t
try {
  const babelParser = require('@babel/parser')
  const babelTraverse = require('@babel/traverse').default
  const babelTypes = require('@babel/types')

  parser = babelParser
  traverse = babelTraverse
  t = babelTypes
} catch (error) {
  console.error('❌ Babelパッケージがインストールされていません。')
  console.error('以下のコマンドでインストールしてください:')
  console.error('npm install @babel/parser @babel/traverse @babel/types')
  process.exit(1)
}

// 日付変換関数
function convertFoaled(foaledValue) {
  if (typeof foaledValue === 'string') {
    return foaledValue
  }

  if (foaledValue && typeof foaledValue === 'object') {
    if (foaledValue.year) {
      if (foaledValue.month && foaledValue.day) {
        return `${foaledValue.year}-${foaledValue.month.toString().padStart(2, '0')}-${foaledValue.day.toString().padStart(2, '0')}`
      } else if (foaledValue.month) {
        return `${foaledValue.year}-${foaledValue.month.toString().padStart(2, '0')}`
      } else {
        return foaledValue.year.toString()
      }
    }
  }

  return foaledValue
}

// 日付配列変換関数（new Foaled()用）
function convertFoaledToArray(foaledValue) {
  if (typeof foaledValue === 'string') {
    // "1971" -> ["1971"]
    // "1987-03-08" -> ["1987", "03", "08"]
    return foaledValue.split('-')
  }

  if (foaledValue && typeof foaledValue === 'object') {
    if (foaledValue.year) {
      if (foaledValue.month && foaledValue.day) {
        return [foaledValue.year.toString(), foaledValue.month.toString().padStart(2, '0'), foaledValue.day.toString().padStart(2, '0')]
      } else if (foaledValue.month) {
        return [foaledValue.year.toString(), foaledValue.month.toString().padStart(2, '0')]
      } else {
        return [foaledValue.year.toString()]
      }
    }
  }

  return [foaledValue?.toString() || '']
}

// 馬データをフラット化する関数
function flattenHorseData(horse, motherId = null, allHorses = []) {
  const horseData = {
    id: horse.id,
    name: horse.name,
    foaled: convertFoaled(horse.foaled),
    foaledArray: convertFoaledToArray(horse.foaled), // new Foaled()用の配列
    sex: horse.sex,
    breed: horse.breed || 'サラブレッド種',
    sire: horse.sire || '',
    dam: horse.dam || '',
    color: horse.color || '',
    breeder: horse.breeder || '',
    netkeibaId: horse.netkeibaId || '',
    source: 'tsx_conversion',
  }

  // オプショナルフィールド（Horse型のすべての属性を含める）
  if (horse.pedigreeName) horseData.pedigreeName = horse.pedigreeName
  if (horse.formerName) horseData.formerName = horse.formerName
  if (horse.localName) horseData.localName = horse.localName
  if (horse.formerPedigreeName) horseData.formerPedigreeName = horse.formerPedigreeName
  if (horse.linkName) horseData.linkName = horse.linkName
  if (horse.linkPedigreeName) horseData.linkPedigreeName = horse.linkPedigreeName
  if (horse.englishName) horseData.englishName = horse.englishName
  if (horse.hasArticle !== undefined) horseData.hasArticle = horse.hasArticle
  if (horse.summary) horseData.summary = horse.summary
  if (horse.details) horseData.details = horse.details
  if (horse.raceStats) horseData.raceStats = horse.raceStats
  if (horse.prizeMoney) horseData.prizeMoney = horse.prizeMoney
  if (horse.awards) horseData.awards = horse.awards
  if (horse.raceResults) horseData.raceResults = horse.raceResults
  if (horse.citation) horseData.citation = horse.citation
  if (horse.retired) horseData.retired = horse.retired
  if (horse.died) horseData.died = horse.died
  if (horse.foaledAt) horseData.foaledAt = horse.foaledAt
  if (horse.owner) horseData.owner = horse.owner
  if (horse.trainer) horseData.trainer = horse.trainer
  if (horse.jockey) horseData.jockey = horse.jockey

  // 親子関係
  if (motherId) {
    horseData.damId = motherId
  }

  // コメント情報の保存（可能な限り）
  if (horse.comments) {
    horseData.comments = horse.comments
  }

  allHorses.push(horseData)

  // 子馬を再帰的に処理
  if (horse.children && horse.children.length > 0) {
    horse.children.forEach((child) => {
      flattenHorseData(child, horse.id, allHorses)
    })
  }

  return allHorses
}

// Babelパーサーを使用してTSXファイルを解析
function parseTsxWithBabel(tsxContent) {
  try {
    // TSXファイルをパース
    const ast = parser.parse(tsxContent, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
      ],
    })

    let horseObject = null
    let comments = []

    // ASTをトラバースしてHorseオブジェクトを抽出
    traverse(ast, {
      // コメントを収集
      enter(path) {
        if (path.node.leadingComments) {
          path.node.leadingComments.forEach((comment) => {
            if (comment.type === 'CommentLine') {
              comments.push(comment.value.trim())
            }
          })
        }
      },

      // const HORSE_NAME: Horse = { ... } を探す
      VariableDeclarator(path) {
        if (path.node.id && path.node.id.typeAnnotation && path.node.id.typeAnnotation.typeAnnotation && path.node.id.typeAnnotation.typeAnnotation.name === 'Horse' && path.node.init) {
          console.log(`Found Horse object: ${path.node.id.name}`)
          horseObject = convertAstToObject(path.node.init)
        }
      },
    })

    // より柔軟な検索（型注釈がない場合も含む）
    if (!horseObject) {
      console.log('🔍 Trying flexible search for Horse objects...')
      let foundVariables = []
      traverse(ast, {
        VariableDeclarator(path) {
          if (path.node.id && path.node.init) {
            const varName = path.node.id.name
            const initType = path.node.init.type
            foundVariables.push({ name: varName, type: initType })

            if (initType === 'ObjectExpression' || initType === 'TSSatisfiesExpression') {
              // 大文字で始まる定数名をHorseオブジェクトの候補とする
              if (varName && varName.match(/^[A-Z0-9_]+$/) && !horseObject) {
                console.log(`Found potential Horse object: ${varName} (${initType})`)
                try {
                  // TSSatisfiesExpressionの場合はexpressionプロパティを取得
                  const targetNode = initType === 'TSSatisfiesExpression' ? path.node.init.expression : path.node.init
                  horseObject = convertAstToObject(targetNode)
                  if (horseObject && horseObject.name) {
                    console.log(`✅ Confirmed Horse object: ${horseObject.name}`)
                  } else {
                    console.log(`❌ Not a valid Horse object: ${varName} (no name property)`)
                    horseObject = null
                  }
                } catch (error) {
                  console.log(`❌ Error parsing ${varName}: ${error.message}`)
                  horseObject = null
                }
              }
            }
          }
        },
      })

      console.log(`📊 Found ${foundVariables.length} variables:`, foundVariables.slice(0, 10))
    }

    if (!horseObject) {
      throw new Error('Horse object not found in TSX file')
    }

    // コメント情報を追加
    if (comments.length > 0) {
      horseObject.comments = comments.join('; ')
    }

    return horseObject
  } catch (error) {
    console.error('Babel parsing error:', error.message)
    throw error
  }
}

// ASTノードをJavaScriptオブジェクトに変換
function convertAstToObject(node) {
  if (!node) return null

  switch (node.type) {
    case 'ObjectExpression': {
      const obj = {}
      node.properties.forEach((prop) => {
        if (prop.type === 'ObjectProperty' && prop.key) {
          const key = prop.key.name || prop.key.value
          const value = convertAstToObject(prop.value)
          if (value !== null) {
            obj[key] = value
          }
        } else if (prop.type === 'SpreadElement') {
          // スプレッド演算子の処理
          const spreadValue = convertAstToObject(prop.argument)
          if (spreadValue && typeof spreadValue === 'object') {
            Object.assign(obj, spreadValue)
          }
        }
      })
      return obj
    }

    case 'StringLiteral':
      return node.value

    case 'NumericLiteral':
      return node.value

    case 'BooleanLiteral':
      return node.value

    case 'ArrayExpression':
      return node.elements.map((element) => convertAstToObject(element)).filter((element) => element !== null)

    case 'CallExpression':
      // new Foaled() や newDate() の処理
      if (node.callee && node.callee.name === 'Foaled') {
        if (node.arguments.length === 1) {
          const arg = convertAstToObject(node.arguments[0])
          if (typeof arg === 'string') {
            return arg
          } else if (arg && typeof arg === 'object' && arg.year) {
            return arg
          }
        }
      } else if (node.callee && node.callee.name === 'newDate') {
        if (node.arguments.length >= 3) {
          const year = convertAstToObject(node.arguments[0])
          const month = convertAstToObject(node.arguments[1])
          const day = convertAstToObject(node.arguments[2])
          return { year, month, day }
        }
      }
      return null

    case 'NewExpression':
      // new Foaled() の処理
      if (node.callee && node.callee.name === 'Foaled') {
        if (node.arguments.length === 1) {
          const arg = convertAstToObject(node.arguments[0])
          if (typeof arg === 'string') {
            return arg
          } else if (arg && typeof arg === 'object' && arg.year) {
            return arg
          }
        }
      }
      return null

    case 'NullLiteral':
      return null

    case 'Identifier':
      // 変数参照の場合はnullを返す（後で処理）
      return null

    case 'TemplateLiteral':
      // テンプレートリテラルの処理
      if (node.expressions.length === 0) {
        return node.quasis[0].value.cooked
      }
      return null

    case 'ConditionalExpression': {
      // 三項演算子の処理（条件がtrueの場合のみ）
      const test = convertAstToObject(node.test)
      if (test) {
        return convertAstToObject(node.consequent)
      } else {
        return convertAstToObject(node.alternate)
      }
    }

    case 'LogicalExpression': {
      // 論理演算子の処理
      if (node.operator === '||') {
        const left = convertAstToObject(node.left)
        return left !== null ? left : convertAstToObject(node.right)
      } else if (node.operator === '&&') {
        const left = convertAstToObject(node.left)
        return left ? convertAstToObject(node.right) : left
      }
      return null
    }

    case 'BinaryExpression': {
      // 二項演算子の処理
      const left = convertAstToObject(node.left)
      const right = convertAstToObject(node.right)

      if (typeof left === 'number' && typeof right === 'number') {
        switch (node.operator) {
          case '+':
            return left + right
          case '-':
            return left - right
          case '*':
            return left * right
          case '/':
            return left / right
          case '%':
            return left % right
        }
      }
      return null
    }

    case 'UnaryExpression':
      // 単項演算子の処理
      if (node.operator === '-' && node.argument.type === 'NumericLiteral') {
        return -node.argument.value
      }
      return convertAstToObject(node.argument)

    case 'MemberExpression': {
      // メンバーアクセスの処理（例：obj.prop）
      const object = convertAstToObject(node.object)
      if (object && typeof object === 'object') {
        const property = node.computed ? convertAstToObject(node.property) : node.property.name
        return object[property]
      }
      return null
    }

    case 'TSAsExpression':
      // TypeScriptの型アサーション（例：obj as Type）
      return convertAstToObject(node.expression)

    case 'TSSatisfiesExpression':
      // TypeScriptのsatisfies演算子（例：obj satisfies Type）
      return convertAstToObject(node.expression)

    default:
      console.warn(`Unhandled AST node type: ${node.type}`)
      return null
  }
}

// TSXファイルをパースしてJSONに変換（Babel使用）
function convertTsxToJson(tsxFilePath) {
  try {
    console.log(`Converting ${tsxFilePath} to JSON using Babel parser...`)

    // TSXファイルを読み込み
    const tsxContent = fs.readFileSync(tsxFilePath, 'utf8')
    console.log(`📄 File size: ${tsxContent.length} characters`)

    // Babelパーサーで解析
    const horseObject = parseTsxWithBabel(tsxContent)

    if (!horseObject) {
      throw new Error('Failed to parse horse object from TSX file')
    }

    console.log(`✅ Successfully parsed horse object: ${horseObject.name || 'Unknown'}`)
    console.log(`📊 Object keys: ${Object.keys(horseObject).join(', ')}`)

    // フラット化
    const allHorses = flattenHorseData(horseObject)
    console.log(`🐎 Flattened ${allHorses.length} horses`)

    // 牝祖を特定
    const rootHorse = allHorses.find((horse) => !horse.damId)
    if (!rootHorse) {
      console.error('❌ Root horse not found. Available horses:')
      allHorses.forEach((horse, index) => {
        console.error(`  ${index + 1}. ${horse.name} (damId: ${horse.damId || 'none'})`)
      })
      throw new Error('Root horse not found')
    }

    console.log(`🏆 Root horse identified: ${rootHorse.name} (${rootHorse.id})`)

    // JSON形式に変換
    const jsonData = {
      metadata: {
        pedigreeName: rootHorse.pedigreeName || rootHorse.name,
        rootHorseId: rootHorse.id,
        lastUpdated: new Date().toISOString(),
        source: 'tsx_conversion_babel',
      },
      horses: allHorses,
    }

    return jsonData
  } catch (error) {
    console.error(`❌ Error converting ${tsxFilePath}:`, error.message)
    console.error('Stack trace:', error.stack)
    throw error
  }
}

// フォールバック用の簡易パーサー（元の実装）
function convertTsxToJsonFallback(tsxFilePath) {
  try {
    console.log(`🔄 Trying fallback parser for ${tsxFilePath}...`)

    const tsxContent = fs.readFileSync(tsxFilePath, 'utf8')

    // 簡単なパース（実際のTSXパーサーを使うべきですが、今回は手動で処理）
    const horseObjectMatch = tsxContent.match(/const\s+\w+:\s*Horse\s*=\s*({[\s\S]*?});/)

    if (!horseObjectMatch) {
      throw new Error('Horse object not found in TSX file')
    }

    // 簡易的なJavaScriptオブジェクトに変換
    let horseObjectStr = horseObjectMatch[1]

    // new Foaled() と newDate() を文字列に変換
    horseObjectStr = horseObjectStr.replace(/new\s+Foaled\(([^)]+)\)/g, (match, content) => {
      if (content.includes('newDate')) {
        const dateMatch = content.match(/newDate\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (dateMatch) {
          return JSON.stringify({ year: parseInt(dateMatch[1]), month: parseInt(dateMatch[2]), day: parseInt(dateMatch[3]) })
        }
      } else {
        return content.replace(/['"]/g, '')
      }
      return content
    })

    // newDate() を日付オブジェクトに変換
    horseObjectStr = horseObjectStr.replace(/newDate\((\d+),\s*(\d+),\s*(\d+)\)/g, (match, year, month, day) => {
      return JSON.stringify({ year: parseInt(year), month: parseInt(month), day: parseInt(day) })
    })

    // コメントを抽出して保存
    const comments = []
    horseObjectStr = horseObjectStr.replace(/\/\/\s*([^\n\r]+)/g, (match, comment) => {
      comments.push(comment.trim())
      return ''
    })

    // JavaScriptオブジェクトとして評価
    const horseObject = eval(`(${horseObjectStr})`)

    if (comments.length > 0) {
      horseObject.comments = comments.join('; ')
    }

    // フラット化
    const allHorses = flattenHorseData(horseObject)

    // 牝祖を特定
    const rootHorse = allHorses.find((horse) => !horse.damId)
    if (!rootHorse) {
      throw new Error('Root horse not found')
    }

    // JSON形式に変換
    const jsonData = {
      metadata: {
        pedigreeName: rootHorse.pedigreeName || rootHorse.name,
        rootHorseId: rootHorse.id,
        lastUpdated: new Date().toISOString(),
        source: 'tsx_conversion_fallback',
      },
      horses: allHorses,
    }

    return jsonData
  } catch (error) {
    console.error(`Fallback parser error: ${error.message}`)
    throw error
  }
}

// メイン処理
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node convert-tsx-to-json.js <tsx-file-path>')
    process.exit(1)
  }

  const tsxFilePath = args[0]

  if (!fs.existsSync(tsxFilePath)) {
    console.error(`File not found: ${tsxFilePath}`)
    process.exit(1)
  }

  try {
    let jsonData

    // まずBabelパーサーを試す
    try {
      jsonData = convertTsxToJson(tsxFilePath)
    } catch (babelError) {
      console.warn(`⚠️  Babel parser failed: ${babelError.message}`)
      console.log('🔄 Trying fallback parser...')
      jsonData = convertTsxToJsonFallback(tsxFilePath)
    }

    // 出力ファイル名を生成
    const outputPath = tsxFilePath.replace('.tsx', '.json')

    // JSONファイルに書き込み
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8')

    console.log(`✅ Successfully converted to ${outputPath}`)
    console.log(`📊 Converted ${jsonData.horses.length} horses`)
    console.log(`🏆 Root horse: ${jsonData.metadata.pedigreeName} (${jsonData.metadata.rootHorseId})`)
    console.log(`🔧 Source: ${jsonData.metadata.source}`)
  } catch (error) {
    console.error('❌ Conversion failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  convertTsxToJson,
  convertTsxToJsonFallback,
  flattenHorseData,
  parseTsxWithBabel,
  convertAstToObject,
}
