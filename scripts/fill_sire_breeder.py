#!/usr/bin/env python3
"""
種牡馬 JSON（app/pedigree-sires）の horse.breeder を埋める。

1. 産駒（在来牝系 JSON）の sire 末尾括弧から生産国を推定する
2. 表記ゆれ、または産駒から推定できない場合は netkeiba の「産地」を正本にする
   （ログイン不要。間隔・件数は scraping/config.py と同じ 3秒 / 30分200件）

既存の breeder が国名として解釈できる、または牧場名など非空のときは上書きしない。
書き込む国名は既存の輸入馬と同じ短い日本語略（米・英・加 など）。

使い方:
  python scripts/fill_sire_breeder.py --dry-run
  python scripts/fill_sire_breeder.py --skip-fetch
  python scripts/fill_sire_breeder.py
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
TRADITIONAL_DIR = ROOT / "app" / "pedigree-traditional"
PEDIGREE_DIR = ROOT / "app" / "pedigree"
SIRE_DIR = ROOT / "app" / "pedigree-sires"
CACHE_PATH = ROOT / "scripts" / "fill-sire-breeder-cache.json"
REPORT_PATH = ROOT / "scripts" / "fill-sire-breeder-report.json"

# scraping/config.py と同じ制限
MAX_REQUESTS_PER_30MIN = 200
MIN_INTERVAL_SECONDS = 3.0

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]

# app/lib/origin-country.ts の ORIGIN_CODE_BY_LABEL と揃える
ORIGIN_CODE_BY_LABEL = {
    "英": "GB",
    "英国": "GB",
    "イギリス": "GB",
    "イングランド": "GB",
    "GB": "GB",
    "愛": "IRE",
    "愛蘭": "IRE",
    "アイルランド": "IRE",
    "IRE": "IRE",
    "米": "US",
    "米国": "US",
    "アメリカ": "US",
    "US": "US",
    "USA": "US",
    "豪": "AUS",
    "豪州": "AUS",
    "オーストラリア": "AUS",
    "AUS": "AUS",
    "新": "NZ",
    "ニュージーランド": "NZ",
    "NZ": "NZ",
    "仏": "FR",
    "フランス": "FR",
    "FR": "FR",
    "独": "GER",
    "ドイツ": "GER",
    "GER": "GER",
    "伊": "ITY",
    "イタリア": "ITY",
    "ITY": "ITY",
    "ITA": "ITY",
    "加": "CAN",
    "カナダ": "CAN",
    "CAN": "CAN",
    "南": "SAF",
    "南ア": "SAF",
    "南阿": "SAF",
    "南アフリカ": "SAF",
    "SAF": "SAF",
    "亜": "ARG",
    "アルゼンチン": "ARG",
    "ARG": "ARG",
    "伯": "BRZ",
    "ブラジル": "BRZ",
    "BRZ": "BRZ",
    "智": "CHI",
    "チリ": "CHI",
    "CHI": "CHI",
    "印": "IND",
    "インド": "IND",
    "IND": "IND",
    "土": "TUR",
    "トルコ": "TUR",
    "TUR": "TUR",
    "露": "RUS",
    "ロシア": "RUS",
    "RUS": "RUS",
    "洪": "HUN",
    "ハンガリー": "HUN",
    "HUN": "HUN",
    "叙": "SYR",
    "シリア": "SYR",
    "SYR": "SYR",
    "叔": "IRQ",
    "イラク": "IRQ",
    "メソポタミヤ": "IRQ",
    "メソポタミア": "IRQ",
    "IRQ": "IRQ",
    "沙": "KSA",
    "サウジアラビア": "KSA",
    "KSA": "KSA",
    "蘭": "HOL",
    "オランダ": "HOL",
    "HOL": "HOL",
    "白": "BEL",
    "ベルギー": "BEL",
    "BEL": "BEL",
    "西": "SPA",
    "スペイン": "SPA",
    "SPA": "SPA",
    "埃": "EGY",
    "エジプト": "EGY",
    "EGY": "EGY",
}

KNOWN_ORIGIN_CODES = {
    "GB", "IRE", "US", "USA", "AUS", "NZ", "FR", "GER", "ITY", "ITA",
    "CAN", "SAF", "ARG", "BRZ", "CHI", "IND", "TUR", "RUS", "HUN", "SYR",
    "UAE", "KSA", "IRQ", "EGY", "PER", "URU", "MEX", "SPA", "BEL", "HOL",
    "DEN", "NOR", "POL", "GRE", "CZE", "AUT", "SUI", "SWE",
}

# 既存の pedigree-sires / 基礎牝馬と同じ短い日本語略
SHORT_JP_BY_CODE = {
    "GB": "英",
    "IRE": "愛",
    "US": "米",
    "AUS": "豪",
    "NZ": "新",
    "FR": "仏",
    "GER": "独",
    "ITY": "伊",
    "CAN": "加",
    "SAF": "南",
    "ARG": "亜",
    "BRZ": "伯",
    "CHI": "智",
    "IND": "印",
    "TUR": "土",
    "RUS": "露",
    "HUN": "洪",
    "SYR": "叙",
    "IRQ": "叔",
    "KSA": "沙",
    "HOL": "蘭",
    "BEL": "白",
    "SPA": "西",
    "EGY": "埃",
}

TRAILING_PAREN_RE = re.compile(r"[（(]([^）)]*)[）)]\s*$", re.U)
SANCHI_TH_RE = re.compile(
    r"<th[^>]*>\s*産地\s*</th>\s*<td[^>]*>(.*?)</td>",
    re.S,
)
TAG_RE = re.compile(r"<[^>]+>")
SKIP_SANCHI = {"", "-", "－", "—", "なし", "不明", "不詳", "jpn", "日本", "国内"}

NETKEIBA_HORSE_URL = "https://db.netkeiba.com/horse/{id}/"


class RateLimiter:
    """scraping/config.py の ScrapingRateLimiter と同じ考え方。"""

    def __init__(
        self,
        max_requests_per_30min: int = MAX_REQUESTS_PER_30MIN,
        min_interval_seconds: float = MIN_INTERVAL_SECONDS,
    ):
        self.max_requests_per_30min = max_requests_per_30min
        self.min_interval_seconds = min_interval_seconds
        self.request_times: List[float] = []
        self.last_request_start_time = 0.0

    def wait_if_needed(self) -> None:
        current_time = time.time()
        if self.last_request_start_time > 0:
            elapsed = current_time - self.last_request_start_time
            if elapsed < self.min_interval_seconds:
                sleep_time = self.min_interval_seconds - elapsed
                print(f"{self.min_interval_seconds:g}秒間隔のため {sleep_time:.2f}秒待機")
                time.sleep(sleep_time)
                current_time = time.time()

        thirty_minutes_ago = current_time - (30 * 60)
        self.request_times = [t for t in self.request_times if t > thirty_minutes_ago]
        if len(self.request_times) >= self.max_requests_per_30min:
            oldest = min(self.request_times)
            wait_time = (oldest + 30 * 60) - current_time
            if wait_time > 0:
                print(
                    f"30分{self.max_requests_per_30min}回制限に達したので "
                    f"{wait_time:.1f}秒待機"
                )
                time.sleep(wait_time)
                current_time = time.time()
                thirty_minutes_ago = current_time - (30 * 60)
                self.request_times = [
                    t for t in self.request_times if t > thirty_minutes_ago
                ]

        self.request_times.append(current_time)
        self.last_request_start_time = current_time
        remaining = self.max_requests_per_30min - len(self.request_times)
        print(f"残りリクエスト数: {remaining}/{self.max_requests_per_30min} (30分以内)")


def normalize_origin_code(raw: Optional[str]) -> Optional[str]:
    t = (raw or "").strip()
    if not t:
        return None
    mapped = ORIGIN_CODE_BY_LABEL.get(t) or ORIGIN_CODE_BY_LABEL.get(t.upper())
    if mapped:
        return mapped
    upper = t.upper()
    if upper in KNOWN_ORIGIN_CODES and upper != "JPN":
        return ORIGIN_CODE_BY_LABEL.get(upper) or upper
    return None


def origin_code_from_label(label: Optional[str]) -> Optional[str]:
    t = (label or "").strip()
    if not t:
        return None
    return normalize_origin_code(t) or normalize_origin_code(
        t.replace("（", "").replace("）", "").replace("(", "").replace(")", "")
    )


def extract_trailing_country_code(name: Optional[str]) -> Optional[str]:
    t = (name or "").strip()
    if not t:
        return None
    m = TRAILING_PAREN_RE.search(t)
    if not m:
        return None
    return normalize_origin_code(m.group(1).strip())


def origin_code_from_horse(horse: dict) -> Optional[str]:
    imported_year = str(horse.get("importedYear") or "").strip()
    if imported_year and "内国産" in imported_year:
        return None
    return (
        origin_code_from_label(horse.get("foaledAt"))
        or origin_code_from_label(horse.get("breeder"))
        or extract_trailing_country_code(horse.get("name"))
    )


def short_jp_label(code: str) -> str:
    return SHORT_JP_BY_CODE.get(code, code)


def json_files(directory: Path) -> Iterable[Path]:
    if not directory.is_dir():
        return []
    return sorted(
        p
        for p in directory.iterdir()
        if p.suffix == ".json" and ".backup" not in p.name
    )


def pick_majority(counts: Dict[str, int]) -> Tuple[Optional[str], bool]:
    best: Optional[str] = None
    best_n = 0
    tie = False
    for code, n in counts.items():
        if n > best_n:
            best = code
            best_n = n
            tie = False
        elif n == best_n:
            tie = True
    return (None, True) if tie else (best, False)


def harvest_offspring_votes() -> Dict[str, Dict[str, int]]:
    votes: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for directory in (TRADITIONAL_DIR, PEDIGREE_DIR):
        for path in json_files(directory):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            horses = data.get("horses") or []
            if not horses and isinstance(data.get("horse"), dict):
                horses = [data["horse"]]
            for horse in horses:
                sire_id = str(horse.get("sireId") or "").strip()
                code = extract_trailing_country_code(horse.get("sire"))
                if sire_id and code:
                    votes[sire_id][code] += 1
    return {k: dict(v) for k, v in votes.items()}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def set_breeder(horse: dict, breeder: str) -> None:
    if "breeder" in horse:
        horse["breeder"] = breeder
        return
    keys = list(horse.keys())
    if "color" in horse:
        idx = keys.index("color") + 1
    elif "ancestryByPath" in horse:
        idx = keys.index("ancestryByPath")
    else:
        idx = len(keys)
    items = list(horse.items())
    horse.clear()
    inserted = False
    for i, (key, value) in enumerate(items):
        if i == idx:
            horse["breeder"] = breeder
            inserted = True
        horse[key] = value
    if not inserted:
        horse["breeder"] = breeder


def write_sire_file(path: Path, data: dict, breeder: str, dry_run: bool) -> None:
    horse = data.setdefault("horse", {})
    set_breeder(horse, breeder)
    meta = data.setdefault("metadata", {})
    meta["lastUpdated"] = now_iso()
    if dry_run:
        return
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def save_json(path: Path, data: dict) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: List[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def html_text(fragment: str) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(fragment)
        parser.close()
        text = "".join(parser.parts)
    except Exception:
        text = TAG_RE.sub("", fragment)
    return re.sub(r"\s+", " ", text).strip()


def parse_sanchi(html: str) -> Optional[str]:
    match = SANCHI_TH_RE.search(html)
    if not match:
        return None
    return html_text(match.group(1))


def decode_netkeiba_html(raw: bytes, content_type: str) -> str:
    charset = "euc_jp"
    m = re.search(r"charset=([^\s;]+)", content_type or "", re.I)
    if m:
        charset = m.group(1).strip().strip("\"'").replace("euc-jp", "euc_jp")
    try:
        return raw.decode(charset)
    except LookupError:
        return raw.decode("euc_jp", errors="replace")
    except UnicodeDecodeError:
        try:
            return raw.decode("euc_jp")
        except UnicodeDecodeError:
            return raw.decode("utf-8", errors="replace")


def breeder_from_sanchi(sanchi: Optional[str]) -> Optional[str]:
    t = (sanchi or "").strip()
    if t.lower() in SKIP_SANCHI or t in SKIP_SANCHI:
        return None
    code = origin_code_from_label(t) or extract_trailing_country_code(t)
    if code:
        return short_jp_label(code)
    return t


def fetch_sanchi(netkeiba_id: str, limiter: RateLimiter) -> Tuple[Optional[str], str]:
    url = NETKEIBA_HORSE_URL.format(id=netkeiba_id)
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Connection": "keep-alive",
    }
    last_error = ""
    for attempt in range(2):
        limiter.wait_if_needed()
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
                html = decode_netkeiba_html(raw, resp.headers.get("Content-Type") or "")
            sanchi = parse_sanchi(html)
            if sanchi is None:
                return None, "no-sanchi-th"
            return sanchi, "ok"
        except urllib.error.HTTPError as err:
            last_error = f"http-{err.code}"
            if err.code in (403, 429, 503) and attempt == 0:
                print(f"HTTP {err.code} {netkeiba_id}: 30秒待って再試行")
                time.sleep(30)
                continue
            return None, last_error
        except Exception as err:  # noqa: BLE001
            last_error = type(err).__name__
            if attempt == 0:
                print(f"{last_error} {netkeiba_id}: 再試行")
                time.sleep(5)
                continue
            return None, last_error
    return None, last_error or "failed"


def cached_sanchi(
    netkeiba_id: str,
    cache: dict,
    limiter: RateLimiter,
    dry_run: bool,
) -> Tuple[Optional[str], str]:
    entry = (cache.get("fetched") or {}).get(netkeiba_id)
    if isinstance(entry, dict) and entry.get("status") in ("ok", "no-sanchi-th"):
        sanchi = entry.get("sanchi")
        # 空の産地で ok にしたキャッシュは取り直し
        if (sanchi or "").strip() or entry.get("status") == "no-sanchi-th":
            return sanchi, entry.get("status") or "ok"
    if dry_run:
        return None, "dry-run-skip-fetch"
    sanchi, status = fetch_sanchi(netkeiba_id, limiter)
    cache.setdefault("fetched", {})[netkeiba_id] = {
        "sanchi": sanchi,
        "status": status,
        "fetchedAt": now_iso(),
    }
    save_json(CACHE_PATH, cache)
    return sanchi, status


def netkeiba_id_of(data: dict, horse: dict) -> str:
    raw = str(horse.get("netkeibaId") or data.get("metadata", {}).get("subjectNetkeibaId") or "").strip()
    if not raw or raw.lower() == "none":
        return ""
    return raw


def walk_horses(obj: object) -> Iterable[dict]:
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
    if isinstance(obj.get("horse"), dict):
        yield from walk_horses(obj["horse"])


def pedigree_breeder_by_netkeiba() -> Dict[str, str]:
    """app/pedigree の netkeibaId → 非空 breeder。先勝ち。"""
    out: Dict[str, str] = {}
    for path in json_files(PEDIGREE_DIR):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        horses = data.get("horses") or []
        if not horses and isinstance(data.get("horse"), dict):
            horses = [data["horse"]]
        for horse in walk_horses(horses):
            nk = str(horse.get("netkeibaId") or "").strip()
            breeder = str(horse.get("breeder") or "").strip()
            if nk and breeder and nk not in out:
                out[nk] = breeder
    return out


def decide_action(
    horse: dict,
    harvest_counts: Optional[Dict[str, int]],
) -> str:
    """
    skip-has-value / harvest / fetch-conflict / fetch-missing / skip-empty
    """
    existing = str(horse.get("breeder") or "").strip()
    if existing:
        return "skip-has-value"
    if origin_code_from_horse(horse):
        return "skip-has-value"

    if harvest_counts:
        code, tie = pick_majority(harvest_counts)
        if tie:
            return "fetch-conflict"
        if code:
            return "harvest"

    nk = str(horse.get("netkeibaId") or "").strip()
    if nk and nk.lower() != "none":
        return "fetch-missing"
    return "skip-empty"


def process(args: argparse.Namespace) -> int:
    votes = harvest_offspring_votes()
    cache = load_json(CACHE_PATH)
    limiter = RateLimiter()
    ped_breeder = {}
    if args.remainder_only or args.from_pedigree:
        ped_breeder = pedigree_breeder_by_netkeiba()
    report = {
        "dryRun": bool(args.dry_run),
        "updated": [],
        "skipped": defaultdict(int),
        "fetchFailed": [],
        "conflicts": [],
    }

    files = list(json_files(SIRE_DIR))
    fetch_budget = args.fetch_limit if args.fetch_limit is not None else None
    fetch_used = 0

    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as err:
            print(f"skip unreadable {path.name}: {err}")
            continue
        horse = data.get("horse")
        if not isinstance(horse, dict):
            continue
        horse_id = str(horse.get("id") or data.get("metadata", {}).get("subjectHorseId") or "").strip()
        harvest_counts = votes.get(horse_id)
        action = decide_action(horse, harvest_counts)
        name = horse.get("name") or horse_id or path.name

        if action == "skip-has-value":
            report["skipped"]["hasValue"] += 1
            continue

        if args.from_pedigree:
            nk_from_ped = netkeiba_id_of(data, horse)
            ped_value = ped_breeder.get(nk_from_ped) if nk_from_ped else None
            if ped_value:
                write_sire_file(path, data, ped_value, args.dry_run)
                report["updated"].append(
                    {
                        "file": path.name,
                        "id": horse_id,
                        "name": name,
                        "breeder": ped_value,
                        "source": "pedigree-breeder",
                    }
                )
                continue

        if action == "skip-empty":
            report["skipped"]["noSource"] += 1
            continue

        if action == "harvest":
            if args.fetch_only:
                report["skipped"]["harvestSkipped"] += 1
                continue
            code, _ = pick_majority(harvest_counts or {})
            breeder = short_jp_label(code or "")
            write_sire_file(path, data, breeder, args.dry_run)
            report["updated"].append(
                {
                    "file": path.name,
                    "id": horse_id,
                    "name": name,
                    "breeder": breeder,
                    "source": "offspring-sire-suffix",
                }
            )
            continue

        if args.remainder_only:
            nk_for_ped = netkeiba_id_of(data, horse)
            if nk_for_ped and ped_breeder.get(nk_for_ped):
                report["skipped"]["hasPedigreeBreeder"] += 1
                continue

        if args.skip_fetch:
            report["skipped"]["needsFetch"] += 1
            continue

        nk = netkeiba_id_of(data, horse)
        if not nk:
            report["skipped"]["noNetkeibaId"] += 1
            continue
        if fetch_budget is not None and fetch_used >= fetch_budget:
            report["skipped"]["fetchLimit"] += 1
            continue

        fetch_used += 1
        print(f"fetch {fetch_used}: {name} ({nk})")
        sanchi, status = cached_sanchi(nk, cache, limiter, args.dry_run)
        if args.dry_run and status == "dry-run-skip-fetch":
            report["skipped"]["dryRunFetch"] += 1
            continue
        breeder = breeder_from_sanchi(sanchi)
        if not breeder:
            report["fetchFailed"].append(
                {
                    "file": path.name,
                    "id": horse_id,
                    "name": name,
                    "netkeibaId": nk,
                    "sanchi": sanchi,
                    "status": status,
                }
            )
            continue
        if action == "fetch-conflict":
            report["conflicts"].append(
                {
                    "file": path.name,
                    "id": horse_id,
                    "votes": harvest_counts,
                    "netkeibaSanchi": sanchi,
                    "breeder": breeder,
                }
            )
        write_sire_file(path, data, breeder, args.dry_run)
        report["updated"].append(
            {
                "file": path.name,
                "id": horse_id,
                "name": name,
                "breeder": breeder,
                "source": "netkeiba-sanchi",
                "sanchi": sanchi,
            }
        )

    summary = {
        "dryRun": report["dryRun"],
        "updated": len(report["updated"]),
        "skipped": dict(report["skipped"]),
        "fetchFailed": len(report["fetchFailed"]),
        "conflicts": len(report["conflicts"]),
    }
    out = {
        **summary,
        "updatedItems": report["updated"],
        "fetchFailedItems": report["fetchFailed"],
        "conflictItems": report["conflicts"],
    }
    if not args.dry_run:
        save_json(REPORT_PATH, out)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.dry_run:
        print(f"report -> {REPORT_PATH}")
    harvest_n = sum(1 for item in report["updated"] if item.get("source") == "offspring-sire-suffix")
    fetch_n = sum(1 for item in report["updated"] if item.get("source") == "netkeiba-sanchi")
    pedigree_n = sum(1 for item in report["updated"] if item.get("source") == "pedigree-breeder")
    print(f"harvest={harvest_n} netkeiba={fetch_n} pedigree={pedigree_n}")
    return 0


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fill pedigree-sires horse.breeder")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--skip-fetch",
        action="store_true",
        help="産駒推定だけ書き、netkeiba にはアクセスしない",
    )
    parser.add_argument(
        "--fetch-only",
        action="store_true",
        help="産駒推定の書き込みをせず、fetch 対象だけ処理する",
    )
    parser.add_argument(
        "--fetch-limit",
        type=int,
        default=None,
        help="netkeiba アクセス（またはキャッシュ未使用）の最大件数",
    )
    parser.add_argument(
        "--remainder-only",
        action="store_true",
        help="産駒国名も pedigree の breeder も無い種牡馬だけ fetch する",
    )
    parser.add_argument(
        "--from-pedigree",
        action="store_true",
        help="空の breeder を app/pedigree の同 netkeibaId からコピーする",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(process(parse_args()))
