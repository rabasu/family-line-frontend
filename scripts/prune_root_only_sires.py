#!/usr/bin/env python3
"""
牝祖の祖先としてしか立項されていない種牡馬を削除する。

- 在来牝祖から sireId / sireNetkeibaId を外す（血統は ancestryByPath）
- 種牡馬4代ファイルから5代目パスを牝祖へ移してから消す
- sireId 参照が牝祖だけ（または牝祖 ancestry の netkeibaId のみ）の pedigree-sires を削除

使い方:
  python scripts/prune_root_only_sires.py --dry-run
  python scripts/prune_root_only_sires.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

ROOT = Path(__file__).resolve().parent.parent
TRADITIONAL_DIR = ROOT / "app" / "pedigree-traditional"
PEDIGREE_DIR = ROOT / "app" / "pedigree"
SIRE_DIR = ROOT / "app" / "pedigree-sires"

NODE_KEYS = ("name", "foaled", "color", "sex", "breed", "netkeibaId")


def json_files(directory: Path) -> List[Path]:
    if not directory.is_dir():
        return []
    return sorted(
        p
        for p in directory.iterdir()
        if p.suffix == ".json" and ".backup" not in p.name
    )


def load_json(path: Path) -> Optional[dict]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def dump_json(path: Path, data: dict) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def copy_node(node: Any) -> Optional[dict]:
    if not isinstance(node, dict):
        return None
    out: Dict[str, Any] = {}
    for key in NODE_KEYS:
        if key not in node:
            continue
        value = node[key]
        if value is None or value == "":
            continue
        out[key] = value
    return out or None


def walk_horses(obj: Any) -> Iterable[dict]:
    if obj is None:
        return
    if isinstance(obj, list):
        for item in obj:
            yield from walk_horses(item)
        return
    if not isinstance(obj, dict):
        return
    if obj.get("id") or obj.get("netkeibaId") or obj.get("name"):
        yield obj
    if isinstance(obj.get("horses"), list):
        yield from walk_horses(obj["horses"])
    if isinstance(obj.get("children"), list):
        yield from walk_horses(obj["children"])


def netkeiba_id_of(horse: dict, meta: Optional[dict] = None) -> str:
    raw = str(
        horse.get("netkeibaId")
        or (meta or {}).get("subjectNetkeibaId")
        or ""
    ).strip()
    if not raw or raw.lower() == "none":
        return ""
    return raw


def load_sire_index() -> Dict[str, Tuple[Path, dict, dict]]:
    """id -> (path, file_data, horse)"""
    index: Dict[str, Tuple[Path, dict, dict]] = {}
    for path in json_files(SIRE_DIR):
        data = load_json(path)
        if not data:
            continue
        horse = data.get("horse")
        if not isinstance(horse, dict):
            continue
        horse_id = str(
            horse.get("id") or (data.get("metadata") or {}).get("subjectHorseId") or ""
        ).strip()
        if horse_id:
            index[horse_id] = (path, data, horse)
    return index


def collect_sire_id_refs(
    sire_index: Dict[str, Tuple[Path, dict, dict]],
) -> Tuple[Dict[str, List[str]], Dict[str, List[str]], Set[str]]:
    """
    returns:
      root_refs[sireId] = 牝祖 id リスト
      other_refs[sireId] = 非牝祖（在来・非在来・種牡馬ファイル）id リスト
      root_ancestry_nk
    """
    root_refs: Dict[str, List[str]] = {}
    other_refs: Dict[str, List[str]] = {}
    root_ancestry_nk: Set[str] = set()

    def add(bucket: Dict[str, List[str]], sire_id: str, horse_id: str) -> None:
        bucket.setdefault(sire_id, []).append(horse_id)

    for path in json_files(TRADITIONAL_DIR):
        data = load_json(path)
        if not data:
            continue
        meta = data.get("metadata") or {}
        root_id = str(meta.get("rootHorseId") or "").strip()
        is_trad = meta.get("isTraditionalFamily") is True
        for horse in data.get("horses") or []:
            if not isinstance(horse, dict):
                continue
            horse_id = str(horse.get("id") or "").strip()
            sire_id = str(horse.get("sireId") or "").strip()
            is_root = is_trad and bool(root_id) and horse_id == root_id
            if is_root:
                for node in (horse.get("ancestryByPath") or {}).values():
                    nk = netkeiba_id_of(node or {})
                    if nk:
                        root_ancestry_nk.add(nk)
            if not sire_id:
                continue
            add(root_refs if is_root else other_refs, sire_id, horse_id)

    for path, _data, horse in sire_index.values():
        sire_id = str(horse.get("sireId") or "").strip()
        horse_id = str(horse.get("id") or "").strip()
        if sire_id:
            add(other_refs, sire_id, horse_id or path.stem)

    for path in json_files(PEDIGREE_DIR):
        data = load_json(path)
        if not data:
            continue
        for horse in walk_horses(data.get("horses") or data.get("horse") or data):
            sire_id = str(horse.get("sireId") or "").strip()
            horse_id = str(horse.get("id") or "").strip()
            if sire_id:
                add(other_refs, sire_id, horse_id)

    return root_refs, other_refs, root_ancestry_nk


def merge_sire_fifth_gen(root: dict, sire_horse: dict) -> int:
    """種牡馬の ancestryByPath を s プレフィックスで牝祖へ足す（既存キーは触らない）。"""
    dest = root.setdefault("ancestryByPath", {})
    if not isinstance(dest, dict):
        dest = {}
        root["ancestryByPath"] = dest
    added = 0
    for path, node in (sire_horse.get("ancestryByPath") or {}).items():
        if not path:
            continue
        key = f"s{path}"
        if key in dest:
            continue
        copied = copy_node(node)
        if not copied:
            continue
        dest[key] = copied
        added += 1
    return added


def strip_root_sire_fields(root: dict) -> bool:
    changed = False
    if "sireId" in root:
        del root["sireId"]
        changed = True
    if "sireNetkeibaId" in root:
        del root["sireNetkeibaId"]
        changed = True
    return changed


def deletable_sire_ids(
    sire_index: Dict[str, Tuple[Path, dict, dict]],
    root_refs: Dict[str, List[str]],
    other_refs: Dict[str, List[str]],
    root_ancestry_nk: Set[str],
) -> List[str]:
    out: List[str] = []
    for sire_id, (_path, _data, horse) in sire_index.items():
        if other_refs.get(sire_id):
            continue
        if root_refs.get(sire_id):
            out.append(sire_id)
            continue
        nk = netkeiba_id_of(horse, None)
        if nk and nk in root_ancestry_nk:
            out.append(sire_id)
    return sorted(out)


def process(dry_run: bool) -> int:
    sire_index = load_sire_index()
    root_refs, other_refs, root_ancestry_nk = collect_sire_id_refs(sire_index)
    to_delete = deletable_sire_ids(sire_index, root_refs, other_refs, root_ancestry_nk)

    trad_updated = 0
    roots_stripped = 0
    paths_added = 0

    for path in json_files(TRADITIONAL_DIR):
        data = load_json(path)
        if not data:
            continue
        meta = data.get("metadata") or {}
        if meta.get("isTraditionalFamily") is not True:
            continue
        root_id = str(meta.get("rootHorseId") or "").strip()
        if not root_id:
            continue
        horses = data.get("horses") or []
        root = next((h for h in horses if isinstance(h, dict) and h.get("id") == root_id), None)
        if not root:
            continue

        file_changed = False
        sire_id = str(root.get("sireId") or "").strip()
        if sire_id and sire_id in sire_index:
            added = merge_sire_fifth_gen(root, sire_index[sire_id][2])
            if added:
                paths_added += added
                file_changed = True
        if strip_root_sire_fields(root):
            roots_stripped += 1
            file_changed = True
        if not file_changed:
            continue
        data["metadata"] = meta
        trad_updated += 1
        if not dry_run:
            dump_json(path, data)

    deleted = 0
    for sire_id in to_delete:
        sire_path = sire_index[sire_id][0]
        deleted += 1
        if not dry_run:
            sire_path.unlink(missing_ok=True)

    print(
        json.dumps(
            {
                "dryRun": dry_run,
                "traditionalFilesUpdated": trad_updated,
                "rootsStripped": roots_stripped,
                "fifthGenPathsAdded": paths_added,
                "sireFilesDeleted": deleted,
                "deletedIdsSample": to_delete[:20],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(process(parse_args().dry_run))
