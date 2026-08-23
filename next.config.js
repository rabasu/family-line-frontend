// withContentlayer は next build / next dev の中で contentlayer を動かすため、
// 先に作業ディレクトリの環境変数を正規化しておく必要がある。
const { normalizeCwdEnv } = require('./scripts/lib/normalize-cwd-env')

normalizeCwdEnv()

const { withContentlayer } = require('next-contentlayer2')

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// You might need to insert additional domains in script-src if you are using external services
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' giscus.app analytics.umami.is;
  style-src 'self' 'unsafe-inline';
  img-src * blob: data:;
  media-src *.s3.amazonaws.com;
  connect-src *;
  font-src 'self';
  frame-src giscus.app
`

const securityHeaders = [
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ''),
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

// 在来牝系データを編集するローカル専用ツール（/tools/* と /api/tools/*）は
// ファイル書き込みを伴うため静的エクスポートできない。
// ファイル名を route.dev.ts / page.dev.tsx とし、開発時だけルートとして認識させる。
const devOnlyExtensions = ['dev.ts', 'dev.tsx']
const productionExtensions = ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx']

/**
 * @type {import('next/dist/next-server/server/config').NextConfig}
 **/
module.exports = () => {
  const plugins = [withContentlayer, withBundleAnalyzer]
  return plugins.reduce((acc, next) => next(acc), {
    reactStrictMode: true,
    // Cloudflare へは out/ をそのまま配信する
    output: process.env.NODE_ENV === 'development' ? undefined : 'export',
    pageExtensions: process.env.NODE_ENV === 'development' ? [...devOnlyExtensions, ...productionExtensions] : productionExtensions,
    eslint: {
      dirs: ['app', 'components', 'layouts', 'scripts'],
    },
    images: {
      // 静的エクスポートでは Next の画像最適化サーバーが存在しない
      unoptimized: true,
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
        },
      ],
    },
    // 静的エクスポートでは headers() が非サポート。本番の配信ヘッダは public/_headers。
    ...(process.env.NODE_ENV === 'development'
      ? {
          async headers() {
            return [
              {
                source: '/(.*)',
                headers: securityHeaders,
              },
            ]
          },
        }
      : {}),
    webpack: (config, options) => {
      const { IgnorePlugin } = require('webpack')

      config.module.rules.push({
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      })

      // 動的インポートの警告を抑制
      config.module.exprContextCritical = false
      config.module.exprContextRecursive = false

      // .backup.jsonファイルとbackup/ディレクトリ内のファイルを除外（二重の保護）
      // require.contextの正規表現でも除外しているが、念のためIgnorePluginも追加
      config.plugins.push(
        new IgnorePlugin({
          resourceRegExp: /\.backup\.json$/,
        }),
        new IgnorePlugin({
          resourceRegExp: /backup\//,
        })
      )

      return config
    },
  })
}
