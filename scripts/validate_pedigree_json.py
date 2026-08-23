#!/usr/bin/env python3
"""
牝系JSONファイルの誤りを検知し、自動補正するスクリプト

検証項目:
1. ファイル名の検証（日本語ファイル名の検出）
2. 牝祖IDの検証（空のIDの検出）
3. 牝祖性別の検証（牡馬の検出）
4. 牝祖判定の検証（母馬が日本語の検出）
5. 重複牝系の検証（同じ母馬が複数ファイルに存在）
6. 基本構造の検証（必須フィールドの存在）
7. ID重複の検証と自動補正（生年付きIDに変更。生年でも解消できない場合はa/b/c添え字。牝祖は修正対象外）
8. name重複の検証と自動補正（linkNameを設定。牝祖は修正対象外）
9. linkName重複の検証と自動補正（生年付きlinkNameに変更。牝祖は修正対象外）
10. ファイル名と牝祖IDの齟齬検証（ハイフン除去＋小文字化して比較）
11. 馬名のサニタイジング（改行・記号*・前後空白の削除）
12. 馬のID欠損の修正（generate_horse_idでID生成、子のdamIdも更新）
13. damId整合性チェック（牝系でたどれない馬の検出、dam名による母馬探索とdamId修正）
14. netkeibaId重複の検証（自動補正なし・手動編集が必要）
15. 品種齟齬の検証と自動補正
    - アラブ系競走出走なのに breed=サラ → アア（自動補正）
    - 牝祖/母馬がサラ以外なのに breed=サラ → 要手動修正（自動補正なし）
16. ID変更時の参照同期（同一ファイル内の damId / sireId）
17. sireId未設定の補完
    - sire/dam が「不詳」の場合は対象外（補完IDなし）
    - sireNetkeibaId がある → pedigree-traditional / pedigree-sires から netkeibaId 一致馬の id を設定
    - sireNetkeibaId が空 → 両ディレクトリの牡馬を name/pedigreeName 一致で検索
      （馬名末尾の (GB) 等は除去。候補1頭なら自動修正、0or複数は要手動修正）
    - sireNetkeibaId=none かつ sireId空:
      - sire 空 → 「父馬名要確認」（記入漏れか不詳かの判断）
      - 牝祖本人 + sire あり + 4代未完了 → 「牝祖4代要手動補完」
        （種牡馬単独保存せず、牝祖 ancestryByPath でカバー）
      - 非牝祖 + sire あり → 「父馬要手動補完」（父馬未登録タブと同期）
      - 牝祖本人 + 4代完了済み → 対象外（sireId 不要）
      - sire=不詳 → 対象外
18. sireId / sireNetkeibaId 齟齬
    - sireNetkeibaId で父馬を特定し、その id と sireId が異なれば sireId を自動追従
"""

import os
import sys
import json
import re
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from collections import defaultdict

# scraping/ 配下のモジュールを参照できるようにする
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_SCRAPING_DIR = _PROJECT_ROOT / "scraping"
if str(_SCRAPING_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRAPING_DIR))

# get_pedigree_dataから必要な関数をインポート
from get_pedigree_data import (  # noqa: E402
    PEDIGREE_DIR,
    TRADITIONAL_PEDIGREE_DIR,
    extract_year_from_foaled,
    generate_horse_id,
    handle_duplicate_horses
)
from breed_determination import breed_determination  # noqa: E402

# 自動補正前バックアップの出力先。
# app/ 配下に置くと Next.js のルート走査と dev watcher の対象になり、
# ビルド時のメモリ消費とファイルロックの原因になるため app/ の外へ出している。
BACKUP_ROOT = _PROJECT_ROOT / ".backups"

# 馬名サニタイジングの対象カラム（name, pedigree_name, former_name, former_pedigree_name, sire, dam）
HORSE_NAME_COLUMNS = ['name', 'pedigreeName',
                      'formerName', 'formerPedigreeName', 'sire', 'dam']

# 種牡馬4代血統（sireId補完の検索対象）
SIRE_PEDIGREE_DIR = str(_PROJECT_ROOT / "app" / "pedigree-sires")

# 父・母が不明な場合のプレースホルダ（ID補完対象外）
UNKNOWN_PARENT_NAME = "不詳"

# 父が netkeiba 未登録と確認済みのマーカー
SIRE_NETKEIBA_NONE = "none"

# サマリ1行の見やすさ用
SUMMARY_SEP = " | "
SUMMARY_HORSE_MAX = 36
SUMMARY_DETAIL_MAX = 56


def _truncate_summary_text(text: str, max_len: int) -> str:
    """サマリ表示用に文字列を短縮する"""
    text = str(text or "").replace("\n", " ").strip()
    if max_len <= 0 or len(text) <= max_len:
        return text
    if max_len <= 1:
        return "…"
    return text[: max_len - 1] + "…"


def format_horse_label(name: str = "", horse_id: str = "") -> str:
    """サマリ用の対象馬ラベル（馬名 / id）"""
    name = (name or "").strip()
    horse_id = (horse_id or "").strip()
    if name and horse_id:
        label = f"{name} ({horse_id})"
    elif name:
        label = name
    elif horse_id:
        label = f"id={horse_id}"
    else:
        label = "-"
    return _truncate_summary_text(label, SUMMARY_HORSE_MAX)


def format_summary_issue(
    filename: str,
    horse: str,
    action: str,
    detail: str = "",
) -> str:
    """
    サマリ用メッセージを統一形式で作る。

    形式: `{file}: {horse} | {action} | {detail}`
    """
    filename = (filename or "-").strip() or "-"
    horse = _truncate_summary_text(horse or "-", SUMMARY_HORSE_MAX)
    action = (action or "-").strip() or "-"
    detail = _truncate_summary_text(detail, SUMMARY_DETAIL_MAX)
    parts = [f"{filename}: {horse}", action]
    if detail:
        parts.append(detail)
    return SUMMARY_SEP.join(parts)


def sanitize_horse_name(value: str) -> str:
    """
    馬名をサニタイズする。
    改行(\\n)、記号(*)、前後の空白を削除。
    中黒(・)、感嘆符(!)、ピリオド(.)、カンマ(,)、スペース、クォーテーションは馬名にありうるため残す。
    """
    if not isinstance(value, str):
        return value
    # 改行を削除
    result = value.replace('\n', '').replace('\r', '')
    # アスタリスク(*)を削除
    result = result.replace('*', '')
    # 前後の空白を削除
    result = result.strip()
    return result


class PedigreeJsonValidator:
    """牝系JSONファイルの検証クラス"""

    def __init__(self, pedigree_dir: str = None):
        """
        初期化

        Args:
            pedigree_dir: 牝系JSONファイルのディレクトリパス
        """
        if pedigree_dir is None:
            pedigree_dir = TRADITIONAL_PEDIGREE_DIR

        self.pedigree_dir = pedigree_dir
        self._reset_validation_state()

    def _reset_validation_state(self):
        """検証結果・重複検出用の内部状態を初期化"""
        self.errors = []
        self.warnings = []
        self.info = []
        self._auto_fix_applied = False

        # 重複検出用の辞書
        self.mother_horses = defaultdict(list)  # 母馬名 -> [ファイル名のリスト]
        # netkeibaId -> [{'file': str, 'horse': dict, 'is_root': bool}]
        self.netkeiba_ids = defaultdict(list)

        # ID、name、linkName重複チェック用の辞書
        # horse_id -> [{'file': str, 'horse': dict}]
        self.horse_ids = defaultdict(list)
        # horse_name -> [{'file': str, 'horse': dict}]
        self.horse_names = defaultdict(list)
        # linkName -> [{'file': str, 'horse': dict}]
        self.link_names = defaultdict(list)

    def validate_all_files(self, auto_fix: bool = True) -> Dict[str, List[str]]:
        """
        すべてのJSONファイルを検証

        Args:
            auto_fix: Trueのとき自動補正を提案・実行する。
                       自動補正後は再検証し、未解消の対応必要項目だけをサマリに出す。

        Returns:
            Dict[str, List[str]]: 検証結果の辞書
        """
        self._reset_validation_state()

        if auto_fix:
            print(f"牝系JSONファイルの検証を開始: {self.pedigree_dir}")
        else:
            print(f"\n自動補正後の再検証を開始: {self.pedigree_dir}")

        # ディレクトリ内のJSONファイルを取得
        json_files = self._get_json_files()

        if not json_files:
            print("JSONファイルが見つかりませんでした")
            return {"errors": [], "warnings": [], "info": []}

        print(f"検証対象ファイル数: {len(json_files)}")

        # 各ファイルを検証
        for json_file in json_files:
            self._validate_single_file(json_file)

        # 重複検証（全ファイル読み込み後）。自動補正は初回のみ
        self._validate_duplicates(auto_fix=auto_fix)

        # 自動補正した場合は再検証し、修正済み項目を結果から除外する
        if auto_fix and self._auto_fix_applied:
            return self.validate_all_files(auto_fix=False)

        # 結果をまとめる
        result = {
            "errors": self.errors,
            "warnings": self.warnings,
            "info": self.info
        }

        self._print_summary(result)
        return result

    def _write_json_file(self, filepath: str, data: dict):
        """JSONファイルを書き込み、末尾に改行を付けて差分を防ぐ"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')

    def _get_json_files(self) -> List[str]:
        """JSONファイルのリストを取得"""
        json_files = []

        if not os.path.exists(self.pedigree_dir):
            return json_files

        for filename in os.listdir(self.pedigree_dir):
            if filename.endswith('.json') and not filename.startswith('pedigree_analysis_report_'):
                json_files.append(filename)

        return sorted(json_files)

    def _validate_single_file(self, filename: str):
        """単一ファイルの検証"""
        filepath = os.path.join(self.pedigree_dir, filename)

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 基本構造の検証
            self._validate_basic_structure(filename, data)

            # ファイル名の検証
            self._validate_filename(filename)

            # 牝祖の検証
            self._validate_root_horse(filename, data)

            # 重複検出用データの収集
            self._collect_duplicate_data(filename, data)

        except Exception as e:
            self.errors.append(f"{filename}: JSONファイルの読み込みエラー - {e}")

    def _validate_basic_structure(self, filename: str, data: dict):
        """基本構造の検証"""
        # metadataの存在確認
        if 'metadata' not in data:
            self.errors.append(f"{filename}: metadataセクションが存在しません")
            return

        metadata = data['metadata']
        required_metadata_fields = ['pedigreeName',
                                    'rootHorseId', 'lastUpdated', 'source']

        for field in required_metadata_fields:
            if field not in metadata:
                self.errors.append(f"{filename}: metadata.{field}が存在しません")

        # horsesの存在確認
        if 'horses' not in data:
            self.errors.append(f"{filename}: horsesセクションが存在しません")
            return

        horses = data['horses']
        if not isinstance(horses, list) or len(horses) == 0:
            self.errors.append(f"{filename}: horsesが空のリストです")
            return

        # 各馬の基本フィールド確認
        for i, horse in enumerate(horses):
            if not isinstance(horse, dict):
                self.errors.append(f"{filename}: horses[{i}]が辞書ではありません")
                continue

            required_horse_fields = ['id', 'name', 'sex']
            for field in required_horse_fields:
                if field not in horse:
                    self.errors.append(
                        f"{filename}: horses[{i}].{field}が存在しません")

    def _validate_filename(self, filename: str):
        """ファイル名の検証"""
        # 日本語文字の検出
        japanese_pattern = re.compile(
            r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]')
        if japanese_pattern.search(filename):
            self.errors.append(f"{filename}: ファイル名に日本語が含まれています")

        # ファイル名の形式チェック（英数字とハイフンのみ）
        base_name = filename.replace('.json', '')
        if not re.match(r'^[A-Za-z0-9\-]+$', base_name):
            self.warnings.append(f"{filename}: ファイル名の形式が推奨されません（英数字とハイフンのみ推奨）")

    def _validate_root_horse(self, filename: str, data: dict):
        """牝祖の検証"""
        if 'horses' not in data or len(data['horses']) == 0:
            return

        # 牝祖（最初の馬）を取得
        root_horse = data['horses'][0]
        root_horse_id = root_horse.get('id', '')
        root_horse_name = root_horse.get('name', '')
        root_horse_sex = root_horse.get('sex', '')
        root_horse_dam = root_horse.get('dam', '')

        # 1. 牝祖IDの検証
        if not root_horse_id:
            self.errors.append(format_summary_issue(
                filename,
                format_horse_label(root_horse_name, ''),
                "牝祖IDが空",
            ))

        # 2. 牝祖性別の検証
        if root_horse_sex == 'male' or root_horse_sex == 'gelding':
            self.errors.append(format_summary_issue(
                filename,
                format_horse_label(root_horse_name, root_horse_id),
                "牝祖が牡馬/騙馬",
                f"sex={root_horse_sex}",
            ))

        # 3. 牝祖判定の検証（母馬が日本語の場合）
        # 在来馬・血統不詳馬増加のため廃止する
        # if root_horse_dam:
        #     japanese_pattern = re.compile(
        #         r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]')
        #     if japanese_pattern.search(root_horse_dam):
        #         self.warnings.append(
        #             f"{filename}: 牝祖の母馬が日本語です（牝祖: {root_horse_name}, 母馬: {root_horse_dam}）")

        # 4. netkeibaIdの検証
        # netkeiba未登録馬増加のためINFOに落とす
        root_netkeiba_id = root_horse.get('netkeibaId', '')
        if not root_netkeiba_id:
            self.info.append(format_summary_issue(
                filename,
                format_horse_label(root_horse_name, root_horse_id),
                "牝祖netkeibaIdが空",
            ))

        # 5. ファイル名と牝祖IDの齟齬検証
        self._validate_filename_root_id_consistency(
            filename, data, root_horse_id, root_horse_name)

    def _validate_filename_root_id_consistency(self, filename: str, data: dict, root_horse_id: str, root_horse_name: str):
        """ファイル名と牝祖IDの齟齬を検証"""
        # metadataのrootHorseIdを取得
        metadata_root_id = data.get('metadata', {}).get('rootHorseId', '')

        # 1. metadataのrootHorseIdと実際の牝祖IDが一致しない場合
        if metadata_root_id and metadata_root_id != root_horse_id:
            self.errors.append(format_summary_issue(
                filename,
                format_horse_label(root_horse_name, root_horse_id),
                "rootHorseId不一致",
                f"metadata={metadata_root_id}",
            ))

        # 2. ファイル名と牝祖IDの一致チェック（ハイフン除去＋小文字化）
        if self._is_filename_root_id_strictly_incompatible(filename, root_horse_id):
            self.errors.append(format_summary_issue(
                filename,
                format_horse_label(root_horse_name, root_horse_id),
                "ファイル名と牝祖IDが不一致",
            ))

        # 3. metadataのrootHorseIdがファイル名と異なる場合（警告レベル）
        if metadata_root_id and self._is_filename_root_id_strictly_incompatible(filename, metadata_root_id):
            self.warnings.append(format_summary_issue(
                filename,
                format_horse_label(root_horse_name, root_horse_id),
                "metadata.rootHorseIdがファイル名と乖離",
                f"metadata={metadata_root_id}",
            ))

    def _is_filename_root_id_strictly_incompatible(self, filename: str, root_horse_id: str) -> bool:
        """ファイル名と牝祖IDが不一致かどうかをチェック（ハイフン除去＋小文字化して比較）"""
        if not root_horse_id:
            return True

        normalized_filename = filename.replace(
            '.json', '').replace('-', '').lower()
        normalized_root_id = root_horse_id.replace('-', '').lower()
        return normalized_filename != normalized_root_id

    def _collect_duplicate_data(self, filename: str, data: dict):
        """重複検出用データの収集"""
        if 'horses' not in data:
            return

        for i, horse in enumerate(data['horses']):
            # 牝祖は horses[0]（自動補正の対象外判定に使用）
            is_root = (i == 0)

            # 母馬名の収集
            dam_name = horse.get('dam', '')
            if dam_name:
                self.mother_horses[dam_name].append(filename)

            # ID、name、linkName、netkeibaIdの収集
            horse_entry = {
                'file': filename,
                'horse': horse,
                'is_root': is_root,
            }

            netkeiba_id = horse.get('netkeibaId', '')
            if netkeiba_id:
                self.netkeiba_ids[netkeiba_id].append(horse_entry)

            horse_id = horse.get('id', '')
            if horse_id:
                self.horse_ids[horse_id].append(horse_entry)

            horse_name = horse.get('name', '')
            if horse_name:
                self.horse_names[horse_name].append(horse_entry)

            link_name = horse.get('linkName', '')
            if link_name:
                self.link_names[link_name].append(horse_entry)

    def _validate_duplicates(self, auto_fix: bool = True):
        """重複の検証"""
        # 母馬の重複検証
        for dam_name, files in self.mother_horses.items():
            if len(files) > 1:
                # 実際に存在するファイルのみを対象とし、重複を除去
                existing_files = list(
                    set([f for f in files if os.path.exists(os.path.join(self.pedigree_dir, f))]))
                if len(existing_files) > 1:
                    # 各ファイルでその母馬が牝祖かどうかを確認
                    root_horses_with_same_dam = []
                    non_root_horses_with_same_dam = []

                    for filename in existing_files:
                        try:
                            with open(os.path.join(self.pedigree_dir, filename), 'r', encoding='utf-8') as f:
                                data = json.load(f)
                            if 'horses' in data and len(data['horses']) > 0:
                                # 牝祖（最初の馬）の母馬を確認
                                root_horse = data['horses'][0]
                                if root_horse.get('dam') == dam_name:
                                    root_horses_with_same_dam.append(filename)
                                else:
                                    # 牝祖以外の馬で同じ母馬を持つものを検索
                                    for horse in data['horses'][1:]:
                                        if horse.get('dam') == dam_name:
                                            non_root_horses_with_same_dam.append(
                                                filename)
                                            break
                        except Exception:
                            continue

                    # 同じ母を持つ牝祖が複数存在する場合（問題なし、警告まで）
                    # 在来馬・血統不詳馬増加のため廃止する
                    # if len(root_horses_with_same_dam) > 1:
                    #     self.warnings.append(
                    #         f"同じ母 '{dam_name}' を持つ牝祖が複数のファイルに存在: {', '.join(root_horses_with_same_dam)}")

                    # # 同じ母を持つ牝祖以外の馬が複数ファイルに存在する場合（エラー）
                    # if len(non_root_horses_with_same_dam) > 0:
                    #     self.errors.append(
                    #         f"同じ母 '{dam_name}' を持つ牝祖以外の馬が複数ファイルに存在: {', '.join(non_root_horses_with_same_dam)}")

        # netkeibaIdの重複検証（自動補正なし・手動編集が必要）
        self._report_netkeiba_id_duplicates()

        # ID、name、linkNameの重複チェックと自動補正
        if auto_fix:
            self._validate_and_fix_duplicates()
        else:
            # 再検証: 未解消の対応必要項目をサマリ用に収集（自動補正はしない）
            self._collect_remaining_issues()

    def _collect_remaining_issues(self):
        """未解消の対応必要項目を検出し、self.errors に追加する（自動補正はしない）"""
        id_duplicates = self._detect_id_duplicates()
        name_duplicates = self._detect_name_duplicates()
        linkname_duplicates = self._detect_linkname_duplicates()
        # metadata不一致は _validate_single_file 側でも検出済みのためここでは扱わない
        missing_damid = self._detect_missing_damid()
        # 修正不能な damId 整合性は _detect_invalid_damid 内で self.errors に追加される
        invalid_damid = self._detect_invalid_damid()
        missing_id = self._detect_missing_id()
        name_sanitization_issues = self._detect_name_sanitization_issues()
        # 品種要手動修正は _detect_breed_mismatches 内で self.errors に追加される
        breed_mismatches = self._detect_breed_mismatches()
        # sireId要手動修正は _detect_missing_sireid 内で self.errors に追加される
        netkeiba_index, male_name_index = self._build_sire_lookup_indexes()
        missing_sireid = self._detect_missing_sireid(
            netkeiba_index, male_name_index)
        sireid_mismatch = self._detect_sireid_netkeiba_mismatch(netkeiba_index)

        self._append_remaining_issues_to_errors(
            id_duplicates=id_duplicates,
            name_duplicates=name_duplicates,
            linkname_duplicates=linkname_duplicates,
            missing_damid=missing_damid,
            invalid_damid=invalid_damid,
            missing_id=missing_id,
            name_sanitization_issues=name_sanitization_issues,
            breed_mismatches=breed_mismatches,
            missing_sireid=missing_sireid,
            sireid_mismatch=sireid_mismatch,
        )

    def _append_remaining_issues_to_errors(
        self,
        id_duplicates=None,
        name_duplicates=None,
        linkname_duplicates=None,
        missing_damid=None,
        invalid_damid=None,
        missing_id=None,
        name_sanitization_issues=None,
        breed_mismatches=None,
        missing_sireid=None,
        sireid_mismatch=None,
    ):
        """未解消の自動補正対象をサマリ用エラーとして追加する"""
        id_duplicates = id_duplicates or []
        name_duplicates = name_duplicates or []
        linkname_duplicates = linkname_duplicates or []
        missing_damid = missing_damid or []
        invalid_damid = invalid_damid or []
        missing_id = missing_id or []
        name_sanitization_issues = name_sanitization_issues or []
        breed_mismatches = breed_mismatches or []
        missing_sireid = missing_sireid or []
        sireid_mismatch = sireid_mismatch or []

        for horse_id, horse_list in id_duplicates:
            first = horse_list[0]
            others = ', '.join(
                f"{h['file']}:{h['horse'].get('name', '-')}"
                for h in horse_list[:3]
            )
            if len(horse_list) > 3:
                others += f" 他{len(horse_list) - 3}頭"
            self.errors.append(format_summary_issue(
                first['file'],
                format_horse_label(
                    first['horse'].get('name', ''), horse_id),
                "ID重複が未解消",
                others,
            ))

        for horse_name, horse_list in name_duplicates:
            first = horse_list[0]
            others = ', '.join(
                f"{h['file']}:{h['horse'].get('id', '-')}"
                for h in horse_list[:3]
            )
            if len(horse_list) > 3:
                others += f" 他{len(horse_list) - 3}頭"
            self.errors.append(format_summary_issue(
                first['file'],
                format_horse_label(horse_name, first['horse'].get('id', '')),
                "name重複が未解消",
                f"linkName未設定 / {others}",
            ))

        for linkname, horse_list in linkname_duplicates:
            first = horse_list[0]
            others = ', '.join(
                f"{h['file']}:{h['horse'].get('id', '-')}"
                for h in horse_list[:3]
            )
            if len(horse_list) > 3:
                others += f" 他{len(horse_list) - 3}頭"
            self.errors.append(format_summary_issue(
                first['file'],
                format_horse_label(
                    first['horse'].get('name', ''),
                    first['horse'].get('id', '')),
                "linkName重複が未解消",
                f"linkName={linkname} / {others}",
            ))

        for item in missing_damid:
            self.errors.append(format_summary_issue(
                item['filename'],
                format_horse_label(item['horse_name'], item['horse_id']),
                "damId未設定が未解消",
                f"dam={item['dam_name']} -> {item['dam_id']}",
            ))

        for item in invalid_damid:
            self.errors.append(format_summary_issue(
                item['filename'],
                format_horse_label(item['horse_name'], item['horse_id']),
                "damId整合性が未適用",
                f"{item['old_dam_id']} -> {item['correct_dam_id']}",
            ))

        for item in missing_id:
            for mod in item['modifications']:
                self.errors.append(format_summary_issue(
                    item['filename'],
                    format_horse_label(mod['horse_name'], ''),
                    "ID欠損が未解消",
                    f"id候補={mod['new_id']}",
                ))

        for item in name_sanitization_issues:
            for mod in item['modifications']:
                self.errors.append(format_summary_issue(
                    item['filename'],
                    format_horse_label(mod['horse_name'], ''),
                    "馬名サニタイズが未適用",
                    f"{mod['field']}: {mod['old_value']} -> {mod['new_value']}",
                ))

        for item in breed_mismatches:
            for mod in item['modifications']:
                self.errors.append(format_summary_issue(
                    item['filename'],
                    format_horse_label(mod['horse_name'], mod['horse_id']),
                    "品種齟齬が未適用",
                    f"{mod['old_breed']}->{mod['new_breed']} ({mod['reason']})",
                ))

        for item in missing_sireid:
            self.errors.append(format_summary_issue(
                item['filename'],
                format_horse_label(item['horse_name'], item['horse_id']),
                "sireId未設定が未適用",
                f"sire={item['sire_name']} -> {item['sire_id']}",
            ))

        for item in sireid_mismatch:
            self.errors.append(format_summary_issue(
                item['filename'],
                format_horse_label(item['horse_name'], item['horse_id']),
                "sireId齟齬が未適用",
                f"{item['old_sire_id']} -> {item['new_sire_id']}",
            ))

    def _validate_and_fix_duplicates(self):
        """ID、name、linkNameの重複チェックと自動補正"""
        # 重複を検出
        id_duplicates = self._detect_id_duplicates()
        name_duplicates = self._detect_name_duplicates()
        linkname_duplicates = self._detect_linkname_duplicates()
        metadata_mismatches = self._detect_metadata_mismatch()
        missing_damid = self._detect_missing_damid()
        invalid_damid = self._detect_invalid_damid()
        missing_id = self._detect_missing_id()
        name_sanitization_issues = self._detect_name_sanitization_issues()
        # 品種要手動修正は _detect_breed_mismatches 内で self.errors に追加される
        breed_mismatches = self._detect_breed_mismatches()
        # sireId要手動修正は _detect_missing_sireid 内で self.errors に追加される
        netkeiba_index, male_name_index = self._build_sire_lookup_indexes()
        missing_sireid = self._detect_missing_sireid(
            netkeiba_index, male_name_index)
        sireid_mismatch = self._detect_sireid_netkeiba_mismatch(netkeiba_index)

        # 自動補正対象がなくても、手動エラーを self.errors に積んでいる場合がある
        # （サマリに出すため return のみ）
        if not id_duplicates and not name_duplicates and not linkname_duplicates and not metadata_mismatches and not missing_damid and not invalid_damid and not missing_id and not name_sanitization_issues and not breed_mismatches and not missing_sireid and not sireid_mismatch:
            return

        # 重複の一覧を表示
        self._display_duplicates(
            id_duplicates, name_duplicates, linkname_duplicates, metadata_mismatches,
            missing_damid, invalid_damid, missing_id, name_sanitization_issues,
            breed_mismatches, missing_sireid, sireid_mismatch)

        # ユーザーの確認を求める
        if not self._confirm_fixes():
            print("自動補正をキャンセルしました。未解消項目を検証結果に残します。")
            # キャンセル時もサマリに対応必要項目が出るよう追加
            # （修正不能項目は detect 済みのため重複追加しない）
            self._append_remaining_issues_to_errors(
                id_duplicates=id_duplicates,
                name_duplicates=name_duplicates,
                linkname_duplicates=linkname_duplicates,
                missing_damid=missing_damid,
                invalid_damid=invalid_damid,
                missing_id=missing_id,
                name_sanitization_issues=name_sanitization_issues,
                breed_mismatches=breed_mismatches,
                missing_sireid=missing_sireid,
                sireid_mismatch=sireid_mismatch,
            )
            return

        # バックアップを作成
        if not self._create_backup(
                invalid_damid=invalid_damid,
                breed_mismatches=breed_mismatches,
                missing_sireid=missing_sireid,
                sireid_mismatch=sireid_mismatch):
            print("バックアップの作成に失敗しました。自動補正を中止します。")
            self._append_remaining_issues_to_errors(
                id_duplicates=id_duplicates,
                name_duplicates=name_duplicates,
                linkname_duplicates=linkname_duplicates,
                missing_damid=missing_damid,
                invalid_damid=invalid_damid,
                missing_id=missing_id,
                name_sanitization_issues=name_sanitization_issues,
                breed_mismatches=breed_mismatches,
                missing_sireid=missing_sireid,
                sireid_mismatch=sireid_mismatch,
            )
            return

        # 修正を実行
        if id_duplicates:
            self._fix_id_duplicates(id_duplicates)
        if name_duplicates:
            self._fix_name_duplicates(name_duplicates)
        if linkname_duplicates:
            self._fix_linkname_duplicates(linkname_duplicates)
        if metadata_mismatches:
            self._fix_metadata_mismatches(metadata_mismatches)
        if missing_damid:
            self._fix_missing_damid(missing_damid)
        if invalid_damid:
            self._fix_invalid_damid(invalid_damid)
        if missing_id:
            self._fix_missing_id(missing_id)
        if name_sanitization_issues:
            self._fix_name_sanitization(name_sanitization_issues)
        if breed_mismatches:
            self._fix_breed_mismatches(breed_mismatches)
        if missing_sireid:
            self._fix_missing_sireid(missing_sireid)
        if sireid_mismatch:
            self._fix_sireid_netkeiba_mismatch(sireid_mismatch)

        self._auto_fix_applied = True
        print("\n自動補正が完了しました。未解消の対応必要項目を再検証します...")

    def _detect_netkeiba_id_duplicates(self):
        """netkeibaId重複を検出（自動補正対象外）"""
        duplicates = []
        for netkeiba_id, horse_list in self.netkeiba_ids.items():
            if len(horse_list) > 1:
                duplicates.append((netkeiba_id, horse_list))
        return duplicates

    def _report_netkeiba_id_duplicates(self):
        """netkeibaId重複をエラーとして報告する（自動補正なし）"""
        for netkeiba_id, horse_list in self._detect_netkeiba_id_duplicates():
            first = horse_list[0]
            others = ', '.join(
                f"{h['file']}:{h['horse'].get('name', '-')}"
                for h in horse_list[:3]
            )
            if len(horse_list) > 3:
                others += f" 他{len(horse_list) - 3}頭"
            self.errors.append(format_summary_issue(
                first['file'],
                format_horse_label(
                    first['horse'].get('name', ''),
                    first['horse'].get('id', '')),
                "netkeibaId重複",
                f"nk={netkeiba_id} / {others}",
            ))

    def _detect_id_duplicates(self):
        """ID重複を検出（牝祖は自動補正の対象外）"""
        duplicates = []
        for horse_id, horse_list in self.horse_ids.items():
            if len(horse_list) > 1:
                # 牝祖はIDを維持し、牝祖以外のみ生年付きIDへ修正する
                fixable = [h for h in horse_list if not h.get('is_root')]
                if fixable:
                    duplicates.append((horse_id, fixable))
        return duplicates

    def _letter_suffix(self, index: int) -> str:
        """0→a, 1→b, ... 25→z, 26→aa の添え字を返す"""
        if index < 26:
            return chr(ord('a') + index)
        # 26以上は aa, ab, ... と続ける
        first = (index // 26) - 1
        second = index % 26
        return chr(ord('a') + first) + chr(ord('a') + second)

    def _propose_new_ids_for_duplicates(self, horse_id: str, horse_list: list, used_ids: Set[str] = None) -> List[Tuple[dict, str]]:
        """
        ID重複の修正案を生成する。

        1. 生年がID末尾に未付与なら `{id}-{year}` を候補にする
        2. 生年でも一意にならない（同生年・既に生年付きなど）場合は末尾に a,b,c... を付ける
        """
        if used_ids is None:
            used_ids = set(self.horse_ids.keys())

        # 仮候補（生年付与まで）
        tentative = []
        for horse_info in horse_list:
            year = extract_year_from_foaled(
                horse_info['horse'].get('foaled', ''))
            if year and not str(horse_id).endswith(f"-{year}"):
                proposed = f"{horse_id}-{year}"
            else:
                # 生年不詳、または既に同じ生年がID末尾にある → 生年追加では解消できない
                proposed = horse_id
            tentative.append((horse_info, proposed))

        proposed_counts = defaultdict(int)
        for _, proposed in tentative:
            proposed_counts[proposed] += 1

        # 牝祖が同じIDを保持する場合、そのIDは使用中のまま
        root_keeps_id = any(
            h.get('is_root') for h in self.horse_ids.get(horse_id, []))
        local_used = set(used_ids)
        if not root_keeps_id:
            # 修正対象だけで占有しているIDは付け替え可能なので一旦解放
            local_used.discard(horse_id)

        suffix_index = defaultdict(int)
        results = []

        for horse_info, proposed in tentative:
            # 同候補が複数、または既存ID（牝祖が保持するIDなど）と衝突する場合は添え字を付与
            needs_letter = (
                proposed_counts[proposed] > 1
                or proposed in local_used
            )

            if needs_letter:
                base = proposed
                while True:
                    letter = self._letter_suffix(suffix_index[base])
                    suffix_index[base] += 1
                    candidate = f"{base}{letter}"
                    if candidate not in local_used:
                        new_id = candidate
                        break
            else:
                new_id = proposed

            local_used.add(new_id)
            results.append((horse_info, new_id))

        return results

    def _detect_name_duplicates(self):
        """name重複を検出（linkNameが未定義の馬のみ。牝祖は自動補正の対象外）"""
        duplicates = []
        for horse_name, horse_list in self.horse_names.items():
            if len(horse_list) > 1:  # 同じnameを持つ馬が複数存在
                # linkNameが未定義の牝祖以外を抽出
                horses_without_linkname = []
                for horse_info in horse_list:
                    if horse_info.get('is_root'):
                        continue
                    if not horse_info['horse'].get('linkName'):
                        horses_without_linkname.append(horse_info)

                # linkNameが未定義の馬が1頭以上ある場合のみ修正対象
                # （linkName定義済みの馬との重複も含む）
                if len(horses_without_linkname) >= 1:
                    # 対象が1頭のみ、かつ生年が不詳の場合、重複として扱わない
                    if len(horses_without_linkname) == 1 and not extract_year_from_foaled(horses_without_linkname[0]['horse'].get('foaled', '')):
                        continue
                    duplicates.append((horse_name, horses_without_linkname))
        return duplicates

    def _detect_linkname_duplicates(self):
        """linkName重複を検出（牝祖は自動補正の対象外）"""
        duplicates = []
        for linkname, horse_list in self.link_names.items():
            if len(horse_list) > 1:
                fixable = [h for h in horse_list if not h.get('is_root')]
                if fixable:
                    duplicates.append((linkname, fixable))
        return duplicates

    def _detect_metadata_mismatch(self):
        """metadata.rootHorseIdと実際の牝祖IDの不一致を検出"""
        mismatches = []

        # ディレクトリ内のJSONファイルを取得
        json_files = self._get_json_files()

        for filename in json_files:
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # 基本構造の確認
                if 'metadata' not in data or 'horses' not in data or len(data['horses']) == 0:
                    continue

                metadata_root_id = data['metadata'].get('rootHorseId', '')
                actual_root_id = data['horses'][0].get('id', '')
                actual_root_name = data['horses'][0].get('name', '')

                # metadata.rootHorseIdと実際の牝祖IDが一致しない場合
                if metadata_root_id and actual_root_id and metadata_root_id != actual_root_id:
                    mismatches.append({
                        'filename': filename,
                        'metadata_root_id': metadata_root_id,
                        'actual_root_id': actual_root_id,
                        'actual_root_name': actual_root_name,
                        'filepath': filepath,
                        'data': data
                    })

            except Exception as e:
                # ファイル読み込みエラーは無視
                continue

        return mismatches

    def _detect_missing_damid(self):
        """牝祖以外でdamIdが空の馬を検出"""
        missing_damid_list = []

        # ディレクトリ内のJSONファイルを取得
        json_files = self._get_json_files()

        for filename in json_files:
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # 基本構造の確認
                if 'horses' not in data or len(data['horses']) == 0:
                    continue

                # 牝祖以外の馬をチェック（horses[1:]）
                for i, horse in enumerate(data['horses'][1:], start=1):
                    horse_id = horse.get('id', '')
                    horse_name = horse.get('name', '')
                    dam_id = horse.get('damId', '')
                    dam_name = horse.get('dam', '')

                    # damIdが空で、dam（母馬名）が存在する場合
                    # 「不詳」は補完対象の母馬が存在しないためスキップ
                    if not dam_id and dam_name and dam_name != UNKNOWN_PARENT_NAME:
                        # 同じファイル内で母馬を探す
                        dam_horse = self._find_dam_in_file(data, dam_name)
                        if dam_horse:
                            missing_damid_list.append({
                                'filename': filename,
                                'filepath': filepath,
                                'horse_index': i,
                                'horse_id': horse_id,
                                'horse_name': horse_name,
                                'dam_name': dam_name,
                                'dam_id': dam_horse.get('id', ''),
                                'data': data
                            })

            except Exception as e:
                # ファイル読み込みエラーは無視
                continue

        return missing_damid_list

    def _detect_missing_id(self):
        """IDが空の馬を検出（generate_horse_idでID生成、子のdamIdも更新対象）"""
        issues = []

        json_files = self._get_json_files()

        for filename in json_files:
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                if 'horses' not in data or len(data['horses']) == 0:
                    continue

                horses = data['horses']
                existing_ids = {h.get('id', '') for h in horses if h.get('id')}

                modifications = []
                for i, horse in enumerate(horses):
                    horse_id = horse.get('id', '')
                    if horse_id:
                        continue

                    name = horse.get('name', '') or ''
                    pedigree_name = horse.get('pedigreeName', '') or ''
                    source_name = name or pedigree_name
                    if not source_name:
                        continue

                    base_id = generate_horse_id(source_name)
                    if not base_id:
                        # generate_horse_idが空を返す場合のフォールバック（例: ひらがなのみ「おく」）
                        base_id = 'h' + \
                            hashlib.md5(source_name.encode(
                                'utf-8')).hexdigest()[:8]

                    year = extract_year_from_foaled(horse.get('foaled', ''))
                    new_id = base_id
                    if base_id in existing_ids:
                        new_id = f"{base_id}-{year}" if year else f"{base_id}-unknown"
                    existing_ids.add(new_id)

                    # 子の検出: 同じファイル内、damIdが空、damがnameまたはpedigreeNameと一致
                    children = []
                    for j, other in enumerate(horses):
                        if i == j:
                            continue
                        dam = other.get('dam', '')
                        if not other.get('damId') and dam and (
                                dam == name or dam == pedigree_name):
                            children.append({
                                'horse_index': j,
                                'horse_name': other.get('name', ''),
                            })

                    modifications.append({
                        'horse_index': i,
                        'horse_name': name or pedigree_name,
                        'new_id': new_id,
                        'children': children,
                    })

                if modifications:
                    issues.append({
                        'filename': filename,
                        'filepath': filepath,
                        'data': data,
                        'modifications': modifications,
                    })

            except Exception:
                continue

        return issues

    def _normalize_horse_name_for_lookup(self, name: str) -> str:
        """馬名末尾の国名括弧（(GB) / （IRE）など）を除去して検索用に正規化する"""
        if not isinstance(name, str):
            return ''
        return re.sub(r'[\(（][^\)）]*[\)）]\s*$', '', name).strip()

    def _iter_sire_lookup_horses(self):
        """
        sireId補完の検索対象馬を列挙する。
        pedigree-traditional（検証対象）と pedigree-sires（種牡馬）の両方。
        yield: (source_label, horse_dict)
        """
        # 在来牝系
        for filename in self._get_json_files():
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception:
                continue
            for horse in data.get('horses', []):
                if isinstance(horse, dict):
                    yield filename, horse

        # 種牡馬（app/pedigree-sires/*.json の horse）
        if not os.path.isdir(SIRE_PEDIGREE_DIR):
            return
        for filename in sorted(os.listdir(SIRE_PEDIGREE_DIR)):
            if not filename.endswith('.json') or filename.startswith('.'):
                continue
            filepath = os.path.join(SIRE_PEDIGREE_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception:
                continue
            horse = data.get('horse')
            if isinstance(horse, dict):
                yield f"pedigree-sires/{filename}", horse

    def _build_sire_lookup_indexes(self):
        """
        sireId補完用インデックスを構築する。

        Returns:
            netkeiba_index: netkeibaId -> [{id, name, filename, sex}, ...]
            male_name_index: name/pedigreeName（末尾括弧除去後も） ->
              [{id, name, pedigreeName, filename}, ...]
              （牡馬のみ。同一idは1件にまとめる）
        """
        netkeiba_index = defaultdict(list)
        male_name_index = defaultdict(list)
        # male_name_index の id 重複排除用
        male_name_seen = defaultdict(set)

        for source_label, horse in self._iter_sire_lookup_horses():
            horse_id = horse.get('id', '')
            horse_name = horse.get('name', '') or ''
            pedigree_name = horse.get('pedigreeName', '') or ''
            sex = horse.get('sex', '')
            netkeiba_id = horse.get('netkeibaId', '')

            if netkeiba_id and horse_id:
                netkeiba_index[netkeiba_id].append({
                    'id': horse_id,
                    'name': horse_name,
                    'filename': source_label,
                    'sex': sex,
                })

            # pedigree-sires の subject は種牡馬なので sex 欠損時も牡馬扱い
            is_male = sex == 'male' or (
                source_label.startswith('pedigree-sires/') and sex in ('', 'male')
            )
            if not is_male or not horse_id:
                continue

            entry = {
                'id': horse_id,
                'name': horse_name,
                'pedigreeName': pedigree_name,
                'filename': source_label,
            }
            name_keys = set()
            for raw in (horse_name, pedigree_name):
                if not raw:
                    continue
                name_keys.add(raw)
                normalized = self._normalize_horse_name_for_lookup(raw)
                if normalized:
                    name_keys.add(normalized)

            for key in name_keys:
                if horse_id in male_name_seen[key]:
                    continue
                male_name_seen[key].add(horse_id)
                male_name_index[key].append(entry)

        return netkeiba_index, male_name_index

    def _unique_horses_by_netkeiba_id(
        self,
        netkeiba_index: dict,
        netkeiba_id: str,
    ) -> List[dict]:
        """netkeibaId に対応する馬を id 一意で返す"""
        unique = []
        seen_ids = set()
        for candidate in netkeiba_index.get(netkeiba_id, []):
            horse_id = candidate.get('id') or ''
            if not horse_id or horse_id in seen_ids:
                continue
            seen_ids.add(horse_id)
            unique.append(candidate)
        return unique

    def _detect_missing_sireid(
        self,
        netkeiba_index: dict = None,
        male_name_index: dict = None,
    ):
        """
        sireIdが空の馬を検出する。

        自動補正:
        - sireNetkeibaId がある → traditional / pedigree-sires から netkeibaId 一致馬の id を候補に
        - sireNetkeibaId が空 → 両ディレクトリの牡馬を name/pedigreeName 一致で検索し、
          候補がちょうど1頭なら自動補正（馬名末尾の (GB) 等は除去して比較）

        手動修正（self.errors に追加）:
        - sireNetkeibaId=none かつ sire 空 → 「父馬名要確認」
        - 牝祖 + none + sire あり + 4代未完了 → 「牝祖4代要手動補完」
        - 非牝祖 + none + sire あり → 「父馬要手動補完」
        - netkeibaId で解決できない
        - 名前検索の候補が0頭または複数頭

        対象外:
        - sire が「不詳」
        - 牝祖で ancestryByPath が4代分そろっている（sireId 不要）

        報告順:
        - 父馬名要確認 → 牝祖4代要手動補完 → 父馬要手動補完
        """
        missing_sireid_list = []
        empty_sire_name_issues = []
        root_four_gen_issues = []
        missing_sire_data_issues = []
        root_four_gen_complete = 30
        if netkeiba_index is None or male_name_index is None:
            netkeiba_index, male_name_index = self._build_sire_lookup_indexes()

        for filename in self._get_json_files():
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception:
                continue

            horses = data.get('horses', [])
            if not horses:
                continue

            root_horse_id = (data.get('metadata') or {}).get('rootHorseId') or ''

            for i, horse in enumerate(horses):
                if horse.get('sireId'):
                    continue

                horse_id = horse.get('id', '')
                horse_name = horse.get('name', '')
                sire_name = (horse.get('sire', '') or '').strip()
                sire_netkeiba_id = horse.get('sireNetkeibaId', '') or ''
                is_root = bool(root_horse_id) and horse_id == root_horse_id

                # 不詳は馬名不明のため補完不能（none 報告も含めスキップ）
                if sire_name == UNKNOWN_PARENT_NAME:
                    continue

                # (1) none + sireId空
                if sire_netkeiba_id == SIRE_NETKEIBA_NONE:
                    label = format_horse_label(horse_name, horse_id)
                    if not sire_name:
                        empty_sire_name_issues.append(format_summary_issue(
                            filename,
                            label,
                            "父馬名要確認",
                            "sireNetkeibaId=none / sire=(空) → 記入漏れか不詳かを判断",
                        ))
                    elif is_root:
                        ancestry_count = len(horse.get('ancestryByPath') or {})
                        if ancestry_count < root_four_gen_complete:
                            root_four_gen_issues.append(format_summary_issue(
                                filename,
                                label,
                                "牝祖4代要手動補完",
                                f"sireNetkeibaId=none / sire={sire_name} / "
                                f"ancestry={ancestry_count}/{root_four_gen_complete}",
                            ))
                        # 4代完了済みの牝祖は sireId 不要 → 報告しない
                    else:
                        missing_sire_data_issues.append(format_summary_issue(
                            filename,
                            label,
                            "父馬要手動補完",
                            f"sireNetkeibaId=none / sire={sire_name}",
                        ))
                    continue

                if not sire_name:
                    continue

                if sire_netkeiba_id:
                    unique_ids = self._unique_horses_by_netkeiba_id(
                        netkeiba_index, sire_netkeiba_id)

                    if len(unique_ids) == 1:
                        missing_sireid_list.append({
                            'filename': filename,
                            'filepath': filepath,
                            'horse_index': i,
                            'horse_id': horse_id,
                            'horse_name': horse_name,
                            'sire_name': sire_name,
                            'sire_id': unique_ids[0]['id'],
                            'reason': (
                                f"sireNetkeibaId={sire_netkeiba_id} "
                                f"-> {unique_ids[0]['filename']}:{unique_ids[0]['name']}"
                            ),
                        })
                    else:
                        detail = (
                            f"候補{len(unique_ids)}頭"
                            if unique_ids else "候補なし"
                        )
                        self.errors.append(format_summary_issue(
                            filename,
                            format_horse_label(horse_name, horse_id),
                            "sireId要手動修正",
                            f"sire={sire_name} / nk={sire_netkeiba_id} ({detail})",
                        ))
                    continue

                # sireNetkeibaId が空 → 牡馬を名前で検索（末尾括弧は除去）
                lookup_name = self._normalize_horse_name_for_lookup(sire_name)
                name_candidates = male_name_index.get(lookup_name, [])
                if not name_candidates and lookup_name != sire_name:
                    name_candidates = male_name_index.get(sire_name, [])

                if len(name_candidates) == 1:
                    missing_sireid_list.append({
                        'filename': filename,
                        'filepath': filepath,
                        'horse_index': i,
                        'horse_id': horse_id,
                        'horse_name': horse_name,
                        'sire_name': sire_name,
                        'sire_id': name_candidates[0]['id'],
                        'reason': (
                            f"牡馬名一致(正規化='{lookup_name}') "
                            f"-> {name_candidates[0]['filename']}:"
                            f"{name_candidates[0]['name'] or name_candidates[0]['pedigreeName']}"
                        ),
                    })
                else:
                    detail = (
                        f"候補{len(name_candidates)}頭"
                        if name_candidates else "候補なし"
                    )
                    if name_candidates:
                        cand_desc = ', '.join(
                            f"{c['filename']}:{c['id']}"
                            for c in name_candidates[:3]
                        )
                        if len(name_candidates) > 3:
                            cand_desc += "…"
                        detail = f"{detail} {cand_desc}"
                    self.errors.append(format_summary_issue(
                        filename,
                        format_horse_label(horse_name, horse_id),
                        "sireId要手動修正",
                        f"sire={sire_name} / 名検索({detail})",
                    ))

        # 父馬名要確認 → 牝祖4代要手動補完 → 父馬要手動補完
        self.errors.extend(empty_sire_name_issues)
        self.errors.extend(root_four_gen_issues)
        self.errors.extend(missing_sire_data_issues)

        return missing_sireid_list

    def _detect_sireid_netkeiba_mismatch(self, netkeiba_index: dict = None):
        """
        sireId と sireNetkeibaId の齟齬を検出する。

        sireNetkeibaId（none/空以外）で父馬を特定し、
        その id が sireId と異なれば自動補正対象とする。
        """
        mismatches = []
        if netkeiba_index is None:
            netkeiba_index, _ = self._build_sire_lookup_indexes()

        for filename in self._get_json_files():
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception:
                continue

            for i, horse in enumerate(data.get('horses', [])):
                sire_netkeiba_id = horse.get('sireNetkeibaId', '') or ''
                if not sire_netkeiba_id or sire_netkeiba_id == SIRE_NETKEIBA_NONE:
                    continue

                current_sire_id = horse.get('sireId', '') or ''
                # sireId 空は _detect_missing_sireid 側で扱う
                if not current_sire_id:
                    continue

                unique_ids = self._unique_horses_by_netkeiba_id(
                    netkeiba_index, sire_netkeiba_id)
                if len(unique_ids) == 0:
                    continue
                if len(unique_ids) > 1:
                    cand_desc = ', '.join(
                        f"{c['filename']}:{c['id']}" for c in unique_ids[:3]
                    )
                    self.errors.append(format_summary_issue(
                        filename,
                        format_horse_label(
                            horse.get('name', ''), horse.get('id', '')),
                        "sireId齟齬要手動修正",
                        f"nk={sire_netkeiba_id} 候補複数 / 現={current_sire_id} / {cand_desc}",
                    ))
                    continue

                correct_sire_id = unique_ids[0]['id']
                if current_sire_id == correct_sire_id:
                    continue

                mismatches.append({
                    'filename': filename,
                    'filepath': filepath,
                    'horse_index': i,
                    'horse_id': horse.get('id', ''),
                    'horse_name': horse.get('name', ''),
                    'sire_name': horse.get('sire', '') or '',
                    'sire_netkeiba_id': sire_netkeiba_id,
                    'old_sire_id': current_sire_id,
                    'new_sire_id': correct_sire_id,
                    'reason': (
                        f"sireNetkeibaId={sire_netkeiba_id} "
                        f"-> {unique_ids[0]['filename']}:{unique_ids[0]['name']}"
                    ),
                })

        return mismatches

    def _detect_name_sanitization_issues(self):
        """馬名サニタイジングが必要な馬を検出"""
        issues = []

        json_files = self._get_json_files()

        for filename in json_files:
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                if 'horses' not in data or len(data['horses']) == 0:
                    continue

                modifications = []
                for i, horse in enumerate(data['horses']):
                    horse_name = horse.get('name', '')
                    for field in HORSE_NAME_COLUMNS:
                        value = horse.get(field, '')
                        if not isinstance(value, str) or not value:
                            continue
                        sanitized = sanitize_horse_name(value)
                        if sanitized != value:
                            modifications.append({
                                'horse_index': i,
                                'horse_name': horse_name,
                                'field': field,
                                'old_value': value,
                                'new_value': sanitized,
                            })

                if modifications:
                    issues.append({
                        'filename': filename,
                        'filepath': filepath,
                        'data': data,
                        'modifications': modifications,
                    })

            except Exception:
                continue

        return issues

    def _find_dam_in_file(self, data: dict, dam_name: str):
        """同じファイル内で母馬名（dam）に一致する馬を探す"""
        if 'horses' not in data:
            return None

        for horse in data['horses']:
            # name、linkName、pedigreeNameが一致する場合
            if (horse.get('name') == dam_name or
                    horse.get('linkName') == dam_name or
                    horse.get('pedigreeName') == dam_name):
                return horse

        return None

    def _detect_invalid_damid(self):
        """
        damId整合性チェック: damIdが同じファイル内に存在しない馬を検出。
        存在しない場合、dam(母馬名)で同一ファイル内を探索し、
        母馬候補が見つかれば修正対象、見つからなければエラーとして通知する。
        """
        invalid_damid_fixable = []
        json_files = self._get_json_files()

        for filename in json_files:
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                if 'horses' not in data or len(data['horses']) == 0:
                    continue

                horses = data['horses']
                ids_in_file = {h.get('id', '') for h in horses if h.get('id')}

                for i, horse in enumerate(horses):
                    dam_id = horse.get('damId', '')
                    if not dam_id:
                        continue

                    # damIdが同じファイル内に存在するか確認
                    if dam_id in ids_in_file:
                        continue

                    horse_id = horse.get('id', '')
                    horse_name = horse.get('name', '')
                    dam_name = horse.get('dam', '')

                    # dam(母馬名)で同一ファイル内を探索
                    dam_horse = self._find_dam_in_file(data, dam_name)
                    if dam_horse:
                        correct_dam_id = dam_horse.get('id', '')
                        if correct_dam_id:
                            invalid_damid_fixable.append({
                                'filename': filename,
                                'filepath': filepath,
                                'horse_index': i,
                                'horse_id': horse_id,
                                'horse_name': horse_name,
                                'dam_name': dam_name,
                                'old_dam_id': dam_id,
                                'correct_dam_id': correct_dam_id,
                                'data': data
                            })
                    else:
                        # 適切な母馬候補が見つからなかった場合、エラーとして通知
                        self.errors.append(format_summary_issue(
                            filename,
                            format_horse_label(horse_name, horse_id),
                            "damId整合性エラー",
                            f"damId={dam_id} / dam={dam_name}",
                        ))

            except Exception:
                continue

        return invalid_damid_fixable

    def _get_race_results(self, horse: dict) -> List[dict]:
        """競走成績リストを取得（表記ゆれを吸収）"""
        race_results = (
            horse.get('raceResults')
            or horse.get('race-results')
            or horse.get('race_results')
            or []
        )
        return race_results if isinstance(race_results, list) else []

    def _has_arab_race(self, race_results: List[dict]) -> bool:
        """アラブ系競走への出走があるか"""
        for race_result in race_results:
            if not isinstance(race_result, dict):
                continue
            race_name = (
                race_result.get('displayRace', '')
                or race_result.get('race_name', '')
                or race_result.get('race', '')
                or ''
            )
            if breed_determination.is_arab_race(race_name):
                return True
        return False

    def _find_mother_horse(self, data: dict, horse: dict) -> Optional[dict]:
        """同一ファイル内から母馬を探索する"""
        dam_id = horse.get('damId', '')
        if dam_id:
            for candidate in data.get('horses', []):
                if candidate.get('id') == dam_id:
                    return candidate

        dam_name = horse.get('dam', '')
        if dam_name:
            return self._find_dam_in_file(data, dam_name)
        return None

    def _detect_breed_mismatches(self):
        """
        品種齟齬を検出する。

        自動補正対象:
        (1) breed=サラ かつアラブ系競走出走あり → アア

        手動修正対象（self.errors に追加）:
        (2) 牝祖/母馬がサラ以外、breed=サラ（出走有無を問わず自動補正しない）
        """
        breed_mismatches = []
        json_files = self._get_json_files()

        for filename in json_files:
            filepath = os.path.join(self.pedigree_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                horses = data.get('horses', [])
                if not horses:
                    continue

                root_horse = horses[0]
                root_breed = root_horse.get('breed')
                modifications = []

                for i, horse in enumerate(horses):
                    if horse.get('breed') != 'サラ':
                        continue

                    horse_id = horse.get('id', '')
                    horse_name = horse.get('name', '')
                    race_results = self._get_race_results(horse)
                    has_arab = self._has_arab_race(race_results)

                    # (1) アラブ系競走出走 → アア（最優先・自動補正）
                    if has_arab:
                        modifications.append({
                            'horse_index': i,
                            'horse_id': horse_id,
                            'horse_name': horse_name,
                            'old_breed': 'サラ',
                            'new_breed': 'アア',
                            'reason': 'アラブ系競走出走',
                        })
                        continue

                    mother = self._find_mother_horse(data, horse)
                    mother_breed = mother.get('breed') if mother else None
                    ancestor_non_sara = (
                        (root_breed and root_breed != 'サラ')
                        or (mother_breed and mother_breed != 'サラ')
                    )
                    if not ancestor_non_sara:
                        continue

                    # (2) 牝祖/母馬がサラ以外 → 要手動修正（自動補正しない）
                    ancestor_desc = []
                    if root_breed and root_breed != 'サラ':
                        ancestor_desc.append(f"牝祖={root_breed}")
                    if mother_breed and mother_breed != 'サラ':
                        ancestor_desc.append(f"母馬={mother_breed}")
                    ancestor_info = (
                        f"（{', '.join(ancestor_desc)}）" if ancestor_desc else ''
                    )
                    race_info = (
                        f"非アラブ出走{len(race_results)}件"
                        if race_results else "出走情報なし"
                    )
                    self.errors.append(format_summary_issue(
                        filename,
                        format_horse_label(horse_name, horse_id),
                        "品種要手動修正",
                        f"breed=サラ / {race_info}{ancestor_info}",
                    ))

                if modifications:
                    breed_mismatches.append({
                        'filename': filename,
                        'filepath': filepath,
                        'modifications': modifications,
                    })

            except Exception:
                continue

        return breed_mismatches

    def _display_duplicates(self, id_duplicates, name_duplicates, linkname_duplicates, metadata_mismatches, missing_damid, invalid_damid=None, missing_id=None, name_sanitization_issues=None, breed_mismatches=None, missing_sireid=None, sireid_mismatch=None):
        """重複の一覧を表示"""
        if invalid_damid is None:
            invalid_damid = []
        if missing_id is None:
            missing_id = []
        if name_sanitization_issues is None:
            name_sanitization_issues = []
        if breed_mismatches is None:
            breed_mismatches = []
        if missing_sireid is None:
            missing_sireid = []
        if sireid_mismatch is None:
            sireid_mismatch = []

        print("\n" + "="*60)
        print("検出された重複・不一致:")
        print("="*60)

        if id_duplicates:
            print("\n【ID重複】")
            used_ids = set(self.horse_ids.keys())
            for horse_id, horse_list in id_duplicates:
                print(f"  ID: '{horse_id}' ({len(horse_list)}頭)")
                proposals = self._propose_new_ids_for_duplicates(
                    horse_id, horse_list, used_ids)
                for horse_info, new_id in proposals:
                    used_ids.add(new_id)
                    print(
                        f"    - {horse_info['file']}: {horse_info['horse'].get('name', 'N/A')} -> {new_id}")

        if name_duplicates:
            print("\n【name重複】")
            for horse_name, horse_list in name_duplicates:
                print(f"  馬名: '{horse_name}' ({len(horse_list)}頭、linkName未定義)")
                for horse_info in horse_list:
                    year = extract_year_from_foaled(
                        horse_info['horse'].get('foaled', ''))
                    linkname = f"{horse_name}({year})" if year else f"{horse_name}"
                    horse_id = horse_info['horse'].get('id', 'N/A')
                    print(
                        f"    - {horse_info['file']}: {horse_info['horse'].get('name', 'N/A')} (id={horse_id}) -> linkName: {linkname}")

        if linkname_duplicates:
            print("\n【linkName重複】")
            for linkname, horse_list in linkname_duplicates:
                print(f"  linkName: '{linkname}' ({len(horse_list)}頭)")
                for i, horse_info in enumerate(horse_list):
                    year = extract_year_from_foaled(
                        horse_info['horse'].get('foaled', ''))
                    new_linkname = f"{linkname}_{i+1}" if f"({year})" in linkname else f"{linkname}({year})" if year else f"{linkname}_{i+1}"
                    print(
                        f"    - {horse_info['file']}: {horse_info['horse'].get('name', 'N/A')} -> {new_linkname}")

        if metadata_mismatches:
            print("\n【metadata.rootHorseId不一致】")
            for mismatch in metadata_mismatches:
                print(
                    f"  {mismatch['filename']}: {mismatch['actual_root_name']}")
                print(
                    f"    metadata.rootHorseId: '{mismatch['metadata_root_id']}' -> '{mismatch['actual_root_id']}'")

        if missing_damid:
            print("\n【damId未設定】")
            for item in missing_damid:
                print(
                    f"  {item['filename']}: {item['horse_name']} (ID: {item['horse_id']})")
                print(
                    f"    母馬名: '{item['dam_name']}' -> damId: '{item['dam_id']}'")

        if invalid_damid:
            print("\n【damId整合性（牝系でたどれない参照）】")
            for item in invalid_damid:
                print(
                    f"  {item['filename']}: {item['horse_name']} (ID: {item['horse_id']})")
                print(
                    f"    母馬名: '{item['dam_name']}' -> damId: '{item['old_dam_id']}' を '{item['correct_dam_id']}' に修正")

        if missing_id:
            print("\n【ID欠損】")
            for item in missing_id:
                print(f"  {item['filename']}:")
                for mod in item['modifications']:
                    print(
                        f"    馬: {mod['horse_name']} -> id: '{mod['new_id']}'")
                    for child in mod['children']:
                        print(
                            f"      子のdamId更新: {child['horse_name']} -> damId: '{mod['new_id']}'")

        if name_sanitization_issues:
            print("\n【馬名サニタイジング】")
            for item in name_sanitization_issues:
                print(f"  {item['filename']}:")
                for mod in item['modifications']:
                    print(
                        f"    {mod['field']}: '{mod['old_value']}' -> '{mod['new_value']}' (馬: {mod['horse_name']})")

        if breed_mismatches:
            print("\n【品種齟齬】")
            for item in breed_mismatches:
                print(f"  {item['filename']}:")
                for mod in item['modifications']:
                    print(
                        f"    {mod['horse_name']} (ID: {mod['horse_id']}): "
                        f"'{mod['old_breed']}' -> '{mod['new_breed']}' ({mod['reason']})")

        if missing_sireid:
            print("\n【sireId未設定】")
            for item in missing_sireid:
                print(
                    f"  {item['filename']}: {item['horse_name']} (ID: {item['horse_id']})")
                print(
                    f"    父馬名: '{item['sire_name']}' -> sireId: '{item['sire_id']}' ({item['reason']})")

        if sireid_mismatch:
            print("\n【sireId / sireNetkeibaId 齟齬】")
            for item in sireid_mismatch:
                print(
                    f"  {item['filename']}: {item['horse_name']} (ID: {item['horse_id']})")
                print(
                    f"    sireId: '{item['old_sire_id']}' -> '{item['new_sire_id']}' "
                    f"({item['reason']})")

    def _confirm_fixes(self):
        """修正の確認を求める"""
        print("\n上記の重複を自動補正しますか？ (Y/N): ", end="")
        try:
            response = input().strip().upper()
            return response == 'Y'
        except KeyboardInterrupt:
            print("\nキャンセルされました。")
            return False

    def _create_backup(self, invalid_damid=None, breed_mismatches=None, missing_sireid=None, sireid_mismatch=None):
        """バックアップを作成"""
        if invalid_damid is None:
            invalid_damid = []
        if breed_mismatches is None:
            breed_mismatches = []
        if missing_sireid is None:
            missing_sireid = []
        if sireid_mismatch is None:
            sireid_mismatch = []
        import shutil
        import datetime

        # バックアップディレクトリを作成
        backup_dir = os.path.join(
            str(BACKUP_ROOT), os.path.basename(
                os.path.normpath(self.pedigree_dir)) + '-backup')
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_subdir = os.path.join(
            backup_dir, f'before_auto_fix_{timestamp}')

        try:
            os.makedirs(backup_subdir, exist_ok=True)

            # 影響を受けるファイルをバックアップ
            affected_files = set()
            for horse_id, horse_list in self.horse_ids.items():
                if len(horse_list) > 1:
                    for horse_info in horse_list:
                        affected_files.add(horse_info['file'])

            for horse_name, horse_list in self.horse_names.items():
                if len(horse_list) > 1:
                    for horse_info in horse_list:
                        affected_files.add(horse_info['file'])

            for linkname, horse_list in self.link_names.items():
                if len(horse_list) > 1:
                    for horse_info in horse_list:
                        affected_files.add(horse_info['file'])

            # metadataの不一致ファイルもバックアップ対象に追加
            metadata_mismatches = self._detect_metadata_mismatch()
            for mismatch in metadata_mismatches:
                affected_files.add(mismatch['filename'])

            # damId未設定のファイルもバックアップ対象に追加
            missing_damid = self._detect_missing_damid()
            for item in missing_damid:
                affected_files.add(item['filename'])

            # damId整合性のファイルもバックアップ対象に追加
            for item in invalid_damid:
                affected_files.add(item['filename'])

            # 馬名サニタイジングのファイルもバックアップ対象に追加
            name_sanitization_issues = self._detect_name_sanitization_issues()
            for item in name_sanitization_issues:
                affected_files.add(item['filename'])

            # ID欠損のファイルもバックアップ対象に追加
            missing_id = self._detect_missing_id()
            for item in missing_id:
                affected_files.add(item['filename'])

            # 品種齟齬のファイルもバックアップ対象に追加
            for item in breed_mismatches:
                affected_files.add(item['filename'])

            # sireId未設定のファイルもバックアップ対象に追加
            for item in missing_sireid:
                affected_files.add(item['filename'])

            # sireId齟齬のファイルもバックアップ対象に追加
            for item in sireid_mismatch:
                affected_files.add(item['filename'])

            # ファイルをコピー
            for filename in affected_files:
                src = os.path.join(self.pedigree_dir, filename)
                dst = os.path.join(backup_subdir, filename)
                shutil.copy2(src, dst)

            print(f"\nバックアップを作成しました: {backup_subdir}")
            print(f"影響を受けるファイル数: {len(affected_files)}")
            return True

        except Exception as e:
            print(f"バックアップ作成エラー: {e}")
            return False

    def _fix_id_duplicates(self, id_duplicates):
        """ID重複の修正（生年付与、必要ならa/b/c添え字）"""
        used_ids = set(self.horse_ids.keys())

        for horse_id, horse_list in id_duplicates:
            self.errors.append(f"ID重複発見: '{horse_id}' ({len(horse_list)}頭)")

            proposals = self._propose_new_ids_for_duplicates(
                horse_id, horse_list, used_ids)

            for horse_info, new_id in proposals:
                old_id = horse_info['horse'].get('id', '')
                if not new_id or new_id == old_id:
                    continue

                filepath = os.path.join(
                    self.pedigree_dir, horse_info['file'])
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    # 馬のIDを更新
                    for file_horse in data.get('horses', []):
                        if file_horse.get('id') == old_id:
                            file_horse['id'] = new_id
                            break

                    # damId / sireId 参照を更新
                    self._update_id_references(data, old_id, new_id)

                    # ファイルを保存
                    self._write_json_file(filepath, data)

                    used_ids.add(new_id)
                    self.info.append(
                        f"ID修正完了: {old_id} -> {new_id} ({horse_info['file']})")

                except Exception as e:
                    self.errors.append(
                        f"ID修正エラー {horse_info['file']}: {e}")

    def _fix_name_duplicates(self, name_duplicates):
        """name重複の修正（対象馬はidで特定。同名の牝祖を誤更新しない）"""
        for horse_name, horse_list in name_duplicates:
            self.errors.append(
                f"name重複発見: '{horse_name}' ({len(horse_list)}頭)")

            # 各馬の生年を取得してlinkNameを設定
            for horse_info in horse_list:
                horse = horse_info['horse']
                horse_id = horse.get('id', '')
                year = extract_year_from_foaled(horse.get('foaled', ''))

                if year and horse_id:
                    new_linkname = f"{horse_name}({year})"

                    # ファイルを読み込み、修正
                    filepath = os.path.join(
                        self.pedigree_dir, horse_info['file'])
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)

                        # idで対象馬を特定（同名の牝祖など先頭一致で誤更新しない）
                        updated = False
                        for file_horse in data.get('horses', []):
                            if file_horse.get('id') == horse_id:
                                file_horse['linkName'] = new_linkname
                                updated = True
                                break

                        if not updated:
                            self.errors.append(
                                f"linkName設定対象が見つかりません: id={horse_id} ({horse_info['file']})")
                            continue

                        # ファイルを保存
                        self._write_json_file(filepath, data)

                        self.info.append(
                            f"linkName設定完了: {horse_name} (id={horse_id}) -> {new_linkname} ({horse_info['file']})")

                    except Exception as e:
                        self.errors.append(
                            f"linkName設定エラー {horse_info['file']}: {e}")

    def _fix_linkname_duplicates(self, linkname_duplicates):
        """linkName重複の修正（対象馬はidで特定）"""
        for linkname, horse_list in linkname_duplicates:
            self.errors.append(
                f"linkName重複発見: '{linkname}' ({len(horse_list)}頭)")

            # 各馬の生年を取得してlinkNameを修正
            for i, horse_info in enumerate(horse_list):
                horse = horse_info['horse']
                horse_id = horse.get('id', '')
                year = extract_year_from_foaled(horse.get('foaled', ''))

                if year and horse_id:
                    # 既に生年が含まれている場合は、インデックスを追加
                    if f"({year})" in linkname:
                        new_linkname = f"{linkname}_{i+1}"
                    else:
                        new_linkname = f"{linkname}({year})"

                    # ファイルを読み込み、修正
                    filepath = os.path.join(
                        self.pedigree_dir, horse_info['file'])
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)

                        # idで対象馬を特定
                        updated = False
                        for file_horse in data.get('horses', []):
                            if file_horse.get('id') == horse_id:
                                file_horse['linkName'] = new_linkname
                                updated = True
                                break

                        if not updated:
                            self.errors.append(
                                f"linkName修正対象が見つかりません: id={horse_id} ({horse_info['file']})")
                            continue

                        # ファイルを保存
                        self._write_json_file(filepath, data)

                        self.info.append(
                            f"linkName修正完了: {linkname} (id={horse_id}) -> {new_linkname} ({horse_info['file']})")

                    except Exception as e:
                        self.errors.append(
                            f"linkName修正エラー {horse_info['file']}: {e}")

    def _fix_metadata_mismatches(self, metadata_mismatches):
        """metadata.rootHorseIdの不一致を修正"""
        for mismatch in metadata_mismatches:
            self.errors.append(
                f"metadata.rootHorseId不一致発見: '{mismatch['metadata_root_id']}' -> '{mismatch['actual_root_id']}' ({mismatch['filename']})")

            # ファイルを読み込み、修正
            filepath = mismatch['filepath']
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # metadata.rootHorseIdを実際の牝祖IDに更新
                old_root_id = data['metadata'].get('rootHorseId', '')
                new_root_id = mismatch['actual_root_id']

                data['metadata']['rootHorseId'] = new_root_id

                # ファイルを保存
                self._write_json_file(filepath, data)

                self.info.append(
                    f"metadata.rootHorseId修正完了: {old_root_id} -> {new_root_id} ({mismatch['filename']})")

            except Exception as e:
                self.errors.append(
                    f"metadata.rootHorseId修正エラー {mismatch['filename']}: {e}")

    def _fix_missing_damid(self, missing_damid):
        """damId未設定の修正"""
        for item in missing_damid:
            self.errors.append(
                f"damId未設定発見: '{item['horse_name']}' (ID: {item['horse_id']}, 母馬名: {item['dam_name']}) -> damId: '{item['dam_id']}' ({item['filename']})")

            # ファイルを読み込み、修正
            filepath = item['filepath']
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # 該当する馬のdamIdを設定
                horse_index = item['horse_index']
                if 'horses' in data and len(data['horses']) > horse_index:
                    data['horses'][horse_index]['damId'] = item['dam_id']

                # ファイルを保存
                self._write_json_file(filepath, data)

                self.info.append(
                    f"damId設定完了: {item['horse_name']} -> damId: {item['dam_id']} ({item['filename']})")

            except Exception as e:
                self.errors.append(
                    f"damId設定エラー {item['filename']}: {e}")

    def _fix_invalid_damid(self, invalid_damid):
        """damId整合性の修正（存在しないdamIdを正しいIDに更新）"""
        for item in invalid_damid:
            self.info.append(
                f"damId整合性修正: {item['horse_name']} (ID: {item['horse_id']}) "
                f"damId '{item['old_dam_id']}' -> '{item['correct_dam_id']}' ({item['filename']})")

            filepath = item['filepath']
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                horse_index = item['horse_index']
                if 'horses' in data and len(data['horses']) > horse_index:
                    data['horses'][horse_index]['damId'] = item['correct_dam_id']

                self._write_json_file(filepath, data)

            except Exception as e:
                self.errors.append(
                    f"damId整合性修正エラー {item['filename']}: {e}")

    def _fix_missing_id(self, missing_id):
        """ID欠損の修正（generate_horse_idでID生成、子のdamIdも更新）"""
        for item in missing_id:
            filepath = item['filepath']
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                for mod in item['modifications']:
                    horse_index = mod['horse_index']
                    new_id = mod['new_id']
                    if 'horses' in data and len(data['horses']) > horse_index:
                        data['horses'][horse_index]['id'] = new_id
                        self.info.append(
                            f"ID設定: {mod['horse_name']} -> id: '{new_id}' ({item['filename']})")

                    for child in mod['children']:
                        child_index = child['horse_index']
                        if len(data['horses']) > child_index:
                            data['horses'][child_index]['damId'] = new_id
                            self.info.append(
                                f"  damId設定: {child['horse_name']} -> damId: '{new_id}' ({item['filename']})")

                self._write_json_file(filepath, data)

            except Exception as e:
                self.errors.append(
                    f"ID欠損修正エラー {item['filename']}: {e}")

    def _fix_missing_sireid(self, missing_sireid):
        """sireId未設定の修正（sireNetkeibaIdまたは牡馬名一意一致）"""
        for item in missing_sireid:
            filepath = item['filepath']
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                horse_index = item['horse_index']
                if 'horses' in data and len(data['horses']) > horse_index:
                    data['horses'][horse_index]['sireId'] = item['sire_id']
                    self.info.append(
                        f"sireId設定: {item['horse_name']} -> sireId: '{item['sire_id']}' "
                        f"({item['reason']}) ({item['filename']})")

                self._write_json_file(filepath, data)

            except Exception as e:
                self.errors.append(
                    f"sireId設定エラー {item['filename']}: {e}")

    def _fix_sireid_netkeiba_mismatch(self, sireid_mismatch):
        """sireNetkeibaId に合わせて sireId を追従修正する"""
        for item in sireid_mismatch:
            filepath = item['filepath']
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                horse_index = item['horse_index']
                if 'horses' in data and len(data['horses']) > horse_index:
                    data['horses'][horse_index]['sireId'] = item['new_sire_id']
                    self.info.append(
                        f"sireId追従: {item['horse_name']} "
                        f"'{item['old_sire_id']}' -> '{item['new_sire_id']}' "
                        f"({item['reason']}) ({item['filename']})")

                self._write_json_file(filepath, data)

            except Exception as e:
                self.errors.append(
                    f"sireId追従エラー {item['filename']}: {e}")

    def _fix_name_sanitization(self, name_sanitization_issues):
        """馬名サニタイジングの修正"""
        for item in name_sanitization_issues:
            filepath = item['filepath']
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                for mod in item['modifications']:
                    horse_index = mod['horse_index']
                    field = mod['field']
                    new_value = mod['new_value']
                    if 'horses' in data and len(data['horses']) > horse_index:
                        data['horses'][horse_index][field] = new_value
                        self.info.append(
                            f"馬名サニタイジング: {mod['field']} '{mod['old_value']}' -> '{new_value}' ({item['filename']})")

                self._write_json_file(filepath, data)

            except Exception as e:
                self.errors.append(
                    f"馬名サニタイジングエラー {item['filename']}: {e}")

    def _fix_breed_mismatches(self, breed_mismatches):
        """品種齟齬の自動修正（サラ→アア）"""
        for item in breed_mismatches:
            filepath = item['filepath']
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                for mod in item['modifications']:
                    horse_index = mod['horse_index']
                    new_breed = mod['new_breed']
                    if 'horses' in data and len(data['horses']) > horse_index:
                        data['horses'][horse_index]['breed'] = new_breed
                        self.info.append(
                            f"品種修正: {mod['horse_name']} (ID: {mod['horse_id']}) "
                            f"'{mod['old_breed']}' -> '{new_breed}' "
                            f"({mod['reason']}) ({item['filename']})")

                self._write_json_file(filepath, data)

            except Exception as e:
                self.errors.append(
                    f"品種修正エラー {item['filename']}: {e}")

    def _update_id_references(self, data: dict, old_id: str, new_id: str):
        """同一ファイル内の damId / sireId 参照を更新"""
        damid_updated = 0
        sireid_updated = 0

        for horse in data.get('horses', []):
            if horse.get('damId') == old_id:
                horse['damId'] = new_id
                damid_updated += 1
            if horse.get('sireId') == old_id:
                horse['sireId'] = new_id
                sireid_updated += 1

        if damid_updated > 0:
            self.info.append(f"  {damid_updated} 個のdamId参照を更新しました")
        if sireid_updated > 0:
            self.info.append(f"  {sireid_updated} 個のsireId参照を更新しました")

    def _print_summary_item(self, level: str, message: str):
        """
        サマリ1件を見やすく出力する。

        統一形式 `{file}: {horse} | {action} | {detail}` は複数行に展開する。
        """
        if SUMMARY_SEP in message and ": " in message.split(SUMMARY_SEP, 1)[0]:
            head, *rest = message.split(SUMMARY_SEP)
            print(f"  [{level}] {head}")
            labels = ("作業", "補足")
            for i, part in enumerate(rest):
                part = part.strip()
                if not part:
                    continue
                label = labels[i] if i < len(labels) else "補足"
                print(f"         {label}: {part}")
            return

        # 旧形式・短いメッセージはそのまま（長すぎる場合のみ折り返し）
        prefix = f"  [{level}] "
        width = 88
        if len(prefix) + len(message) <= width:
            print(f"{prefix}{message}")
            return
        print(prefix + message[: width - len(prefix) - 1] + "…")

    def _print_summary(self, result: Dict[str, List[str]]):
        """検証結果のサマリーを出力"""
        print("\n" + "="*60)
        print("牝系JSONファイル検証結果")
        print("="*60)

        print(f"\n【エラー】 ({len(result['errors'])}件)")
        if result['errors']:
            for error in result['errors']:
                self._print_summary_item("ERROR", error)
        else:
            print("  エラーはありません")

        print(f"\n【警告】 ({len(result['warnings'])}件)")
        if result['warnings']:
            for warning in result['warnings']:
                self._print_summary_item("WARNING", warning)
        else:
            print("  警告はありません")

        print(f"\n【情報】 ({len(result['info'])}件)")
        if result['info']:
            for info in result['info']:
                self._print_summary_item("INFO", info)
        else:
            print("  情報はありません")

        print("\n" + "="*60)

    def get_problematic_files(self) -> List[str]:
        """問題のあるファイルのリストを取得"""
        problematic_files = set()

        for error in self.errors:
            # エラーメッセージからファイル名を抽出
            if ': ' in error:
                filename = error.split(': ')[0]
                error_msg = error.split(': ', 1)[1]

                # 実際に問題となるエラーのみを対象とする
                # 「JSONファイルの構造を修正してください」は除外（正常なファイルでも発生）
                if not error_msg.startswith('JSONファイルの構造を修正してください'):
                    problematic_files.add(filename)

        return sorted(list(problematic_files))

    def generate_fix_suggestions(self) -> Dict[str, List[str]]:
        """修正提案を生成"""
        suggestions = {}

        for error in self.errors:
            if ': ' in error:
                filename = error.split(': ')[0]
                error_msg = error.split(': ', 1)[1]

                if filename not in suggestions:
                    suggestions[filename] = []

                # エラータイプに応じた修正提案
                if "ファイル名に日本語が含まれています" in error_msg:
                    suggestions[filename].append(
                        "ファイル名を英語に変更してください（例: ソニックレディ.json → SonicLady.json）")

                elif "牝祖のIDが空です" in error_msg:
                    suggestions[filename].append(
                        "牝祖のIDを生成してください（馬名から英数字のIDを生成）")

                elif "牝祖が牡馬または騙馬です" in error_msg:
                    suggestions[filename].append(
                        "牡馬・騙馬は牝祖にできません。牝祖を正しい牝馬に変更してください")

                elif "metadata" in error_msg:
                    suggestions[filename].append(
                        "JSONファイルの構造を修正してください（metadataセクションの追加）")

                elif "horses" in error_msg:
                    suggestions[filename].append(
                        "JSONファイルの構造を修正してください（horsesセクションの追加）")

                elif "metadata.rootHorseId" in error_msg and "実際の牝祖ID" in error_msg:
                    suggestions[filename].append(
                        "metadata.rootHorseIdを実際の牝祖IDに修正してください")

                elif "ファイル名と牝祖IDが完全に無関係です" in error_msg:
                    suggestions[filename].append(
                        "ファイル名と牝祖IDを揃えてください（ハイフン除去・小文字化して一致すること）")

        return suggestions


def main():
    """メイン処理"""
    print("牝系JSONファイルの検証と自動補正を開始します...")
    print("自動補正機能:")
    print("  - ID重複: 生年付きIDに変更 (例: amelia -> amelia-1998)。生年でも解消できない場合はa/b/c添え字")
    print("  - name重複: linkNameを設定 (例: アメーリア -> アメーリア(1998))")
    print("  - linkName重複: 生年付きlinkNameに変更")
    print("  - metadata.rootHorseId不一致: 実際の牝祖IDに修正")
    print("  - damId / sireId参照の自動更新（同一ファイル内のID変更に追従）")
    print("  - damId整合性: 牝系でたどれないdamIdを母馬名探索で修正")
    print("  - ID欠損: generate_horse_idでID生成、子のdamIdも更新")
    print("  - sireId未設定: sireNetkeibaId一致、または traditional/sires 牡馬の名前一意一致で補完（末尾(GB)等は除去）")
    print("  - sireId齟齬: sireNetkeibaIdで特定した父馬idへsireIdを追従")
    print("  - 馬名サニタイジング: 改行・記号*・前後空白の削除 (name, pedigreeName, formerName, formerPedigreeName, sire, dam)")
    print("  - 品種齟齬: アラブ系競走出走のサラ→アア")
    print("  - 自動補正前にバックアップを作成")
    print("  - ユーザーの確認を求めてから実行")
    print("検知のみ（自動補正なし）:")
    print("  - netkeibaId重複: 同一netkeibaIdを持つ馬をエラー報告（手動編集が必要）")
    print("  - 品種要手動修正: 牝祖/母馬がサラ以外なのにbreed=サラ")
    print("  - sireId要手動修正: sireNetkeibaId/牡馬名検索で候補が0頭または複数頭（sire=不詳は対象外）")
    print("  - 父馬名要確認: sireNetkeibaId=none かつ sire空（記入漏れか不詳かの判断）")
    print("  - 牝祖4代要手動補完: 牝祖本人の none + 4代未完了（種牡馬単独保存しない）")
    print("  - 父馬要手動補完: 非牝祖の none + sireあり（4代血統表・父馬未登録と同期）")
    print()

    validator = PedigreeJsonValidator()
    result = validator.validate_all_files()

    # 問題のあるファイルのリスト
    problematic_files = validator.get_problematic_files()

    if problematic_files:
        print(f"\n【修正が必要なファイル】 ({len(problematic_files)}件)")
        for filename in problematic_files:
            print(f"  [FILE] {filename}")

        # 修正提案 →実行しない
        # suggestions = validator.generate_fix_suggestions()
        # if suggestions:
        #     print(f"\n【修正提案】")
        #     for filename, file_suggestions in suggestions.items():
        #         print(f"\n[FILE] {filename}:")
        #         for suggestion in file_suggestions:
        #             print(f"  [SUGGESTION] {suggestion}")

    return result


if __name__ == "__main__":
    main()
