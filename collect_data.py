"""
SHIELD-ID Data Collection Script
=================================
Downloads all raw datasets required for the Macro Shock Vulnerability Index.

Sources
-------
1. World Bank Pink Sheet  — commodity prices (no key needed)
2. Yahoo Finance          — oil prices & USD/IDR (no key needed)
3. FRED API               — commodity indices  (free key: https://fred.stlouisfed.org/docs/api/api_key.html)
4. BPS WebAPI             — Indonesian statistics (free key: https://webapi.bps.go.id/developer/register)

Usage
-----
    python collect_data.py

Set BPS_API_KEY and FRED_API_KEY in config.py before running to enable all sources.
"""

import os
import re
import sys
import time
import requests
import pandas as pd
from io import BytesIO
from tqdm import tqdm

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False

try:
    from fredapi import Fred
    FREDAPI_AVAILABLE = True
except ImportError:
    FREDAPI_AVAILABLE = False

import config

# ─── Paths ───────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_ROOT = os.path.join(BASE_DIR, "data", "raw")

DIRS = {
    "commodities":    os.path.join(DATA_ROOT, "commodities"),
    "exchange_rates": os.path.join(DATA_ROOT, "exchange_rates"),
    "bps":            os.path.join(DATA_ROOT, "bps"),
}

# ─── FRED Series ─────────────────────────────────────────────────────────────

FRED_SERIES = {
    "DCOILBRENTEU": "brent_crude_daily_usd_bbl",
    "DCOILWTICO":   "wti_crude_daily_usd_bbl",
    "PNICKUSDM":    "nickel_monthly_usd_mt",
    "PCOALAUUSDM":  "coal_australia_monthly_usd_mt",
    "PPALMUSDM":    "palm_oil_monthly_usd_mt",
    "PTINUTUSDM":   "tin_monthly_usd_mt",
    "DEXINUS":      "usd_idr_daily",
}

# ─── Logging Helpers ──────────────────────────────────────────────────────────

def _log(tag, msg):
    print(f"[{tag:4s}] {msg}")

def log_info(msg): _log("INFO", msg)
def log_ok(msg):   _log(" OK ", msg)
def log_skip(msg): _log("SKIP", msg)
def log_fail(msg): _log("FAIL", msg)

# ─── Setup ───────────────────────────────────────────────────────────────────

def setup_directories():
    for path in DIRS.values():
        os.makedirs(path, exist_ok=True)
    log_ok("Output directories ready")

# ─── Source 1: World Bank Pink Sheet ─────────────────────────────────────────

def _get_pinksheet_url():
    """
    Dynamically find the current Pink Sheet download URL from the World Bank
    commodity markets page. Falls back to config.WORLDBANK_PINKSHEET_URL if
    scraping fails (e.g. the page structure changed).
    """
    page_url = "https://www.worldbank.org/en/research/commodity-markets"
    headers  = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        r = requests.get(page_url, timeout=30, headers=headers)
        r.raise_for_status()
        pattern = r'https://thedocs\.worldbank\.org[^\s"\'<>]*CMO-Historical-Data-Monthly\.xlsx'
        match = re.search(pattern, r.text)
        if match:
            url = match.group(0)
            log_ok(f"Pink Sheet URL found: {url}")
            return url
    except Exception as e:
        log_fail(f"Pink Sheet URL discovery failed ({e}) — using config.py fallback")
    return config.WORLDBANK_PINKSHEET_URL


def collect_worldbank_pinksheet():
    log_info("World Bank Pink Sheet — monthly commodity prices")
    url = _get_pinksheet_url()
    try:
        r = requests.get(url, timeout=60)
        r.raise_for_status()

        # The Pink Sheet header rows vary — try row 4 (0-indexed) first
        df_raw = pd.read_excel(BytesIO(r.content), sheet_name="Monthly Prices",
                               header=4, index_col=0)

        # Map verbose column names to short names (partial match to handle variants)
        col_map = {
            "Crude oil, avg, spot":  "oil_avg_usd_bbl",
            "Palm oil":              "palm_oil_usd_mt",
            "Nickel":                "nickel_usd_mt",
            "Coal, Australia":       "coal_australia_usd_mt",
            "Tin":                   "tin_usd_mt",
            "Copper":                "copper_usd_mt",
            "Natural gas, US":       "natgas_us_usd_mmbtu",
        }
        matched = {}
        for col in df_raw.columns:
            for key, alias in col_map.items():
                if key.lower() in str(col).lower():
                    matched[col] = alias
                    break

        if not matched:
            log_fail("Pink Sheet — could not identify expected commodity columns. "
                     "The sheet layout may have changed; update the column names in collect_data.py.")
            return

        df = df_raw[list(matched.keys())].rename(columns=matched)
        df.index = pd.to_datetime(df.index, errors="coerce")
        df = df[df.index.notna()].sort_index()
        df = df.loc[config.DATE_START:config.DATE_END]
        df.index.name = "date"

        out = os.path.join(DIRS["commodities"], "worldbank_pinksheet.csv")
        df.to_csv(out)
        log_ok(f"World Bank Pink Sheet — {len(df)} rows, {len(df.columns)} columns → {out}")

    except requests.HTTPError as e:
        log_fail(f"World Bank Pink Sheet — HTTP {e.response.status_code}. "
                 f"Update WORLDBANK_PINKSHEET_URL in config.py.")
    except Exception as e:
        log_fail(f"World Bank Pink Sheet — {e}")

# ─── Source 2: Yahoo Finance ──────────────────────────────────────────────────

def collect_yahoo_finance():
    if not YFINANCE_AVAILABLE:
        log_skip("Yahoo Finance — yfinance not installed. Run: pip install yfinance")
        return

    tickers = {
        "BZ=F":     (DIRS["commodities"],    "yahoo_brent.csv"),
        "CL=F":     (DIRS["commodities"],    "yahoo_wti.csv"),
        "USDIDR=X": (DIRS["exchange_rates"], "yahoo_usdidr.csv"),
    }

    for ticker, (out_dir, filename) in tickers.items():
        log_info(f"Yahoo Finance — {ticker}")
        try:
            df = yf.download(ticker, start=config.DATE_START, end=config.DATE_END,
                             progress=False, auto_adjust=True)
            if df.empty:
                log_skip(f"Yahoo Finance {ticker} — empty response")
                continue

            # yfinance >= 0.2.x may return MultiIndex columns for single tickers
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            df.index.name = "date"
            out = os.path.join(out_dir, filename)
            df.to_csv(out)
            log_ok(f"Yahoo Finance {ticker} — {len(df)} rows → {out}")

        except Exception as e:
            log_fail(f"Yahoo Finance {ticker} — {e}")

# ─── Source 3: FRED API ───────────────────────────────────────────────────────

def collect_fred_data():
    if not config.FRED_API_KEY:
        log_skip(
            "FRED API — no key set in config.py.\n"
            "         Register free at: https://fred.stlouisfed.org/docs/api/api_key.html\n"
            "         Then set FRED_API_KEY in config.py and re-run."
        )
        return
    if not FREDAPI_AVAILABLE:
        log_skip("FRED API — fredapi not installed. Run: pip install fredapi")
        return

    log_info("FRED API — commodity & exchange rate series")
    try:
        fred = Fred(api_key=config.FRED_API_KEY)
        frames = []

        for series_id, col_name in tqdm(FRED_SERIES.items(), desc="  FRED series"):
            try:
                s = fred.get_series(
                    series_id,
                    observation_start=config.DATE_START,
                    observation_end=config.DATE_END,
                )
                s.name = col_name
                frames.append(s)
            except Exception as e:
                log_fail(f"FRED {series_id} — {e}")

        if frames:
            df = pd.concat(frames, axis=1)
            df.index.name = "date"
            out = os.path.join(DIRS["commodities"], "fred_series.csv")
            df.to_csv(out)
            log_ok(f"FRED API — {len(df)} rows, {len(df.columns)} series → {out}")

    except Exception as e:
        log_fail(f"FRED API — {e}")

# ─── Source 4: BPS WebAPI ────────────────────────────────────────────────────
# Uses webapi.bps.go.id — no browser or scraping needed.
# var IDs are decoded from the base64 slugs in each page's URL:
#   e.g. MjI2MiMy → base64 → "2262#2" → var=2262
# domain/0000 returns national-level data with all 38 provinces as vervar rows.
# th parameter uses year-1900 coding (2024→124) with max 2 years per call.

BPS_WEBAPI_BASE = "https://webapi.bps.go.id/v1/api/list/model/data/lang/ind"

BPS_TABLES = [
    # var IDs confirmed from page JSON buttons (webapi.bps.go.id endpoints)
    {"key": "inflation_mom",       "var": 2262, "start_year": 2022,
     "output": "bps_inflation_mom.csv",
     "desc":   "Inflasi Bulanan M-to-M (2022=100), 38 Provinsi"},
    {"key": "inflation_ytd",       "var": 2387, "start_year": 2022,
     "output": "bps_inflation_ytd.csv",
     "desc":   "Inflasi Tahun Kalender Y-to-D (2022=100), 38 Provinsi"},
    {"key": "pdrb_adhb_quarterly", "var": 2268, "start_year": 2022,
     "output": "bps_pdrb_adhb_quarterly.csv",
     "desc":   "PDRB Triwulanan ADHB (seri 2010), Seluruh Provinsi (miliar Rp)"},
    {"key": "export_nonmigas",     "var": 2346, "start_year": 2022,
     "output": "bps_export_nonmigas.csv",
     "desc":   "Ekspor Non-Migas Bulanan per Provinsi (ribu USD)"},
    {"key": "export_migas",        "var": 2347, "start_year": 2022,
     "output": "bps_export_migas.csv",
     "desc":   "Ekspor Migas Bulanan per Provinsi (ribu USD)"},
    {"key": "poverty_p2",          "var": 504,  "start_year": 2005,
     "output": "bps_poverty_severity_p2.csv",
     "desc":   "Indeks Keparahan Kemiskinan P2 per Provinsi (%)"},
    {"key": "poverty_p1",          "var": 503,  "start_year": 2005,
     "output": "bps_poverty_depth_p1.csv",
     "desc":   "Indeks Kedalaman Kemiskinan P1 per Provinsi (%)"},
    {"key": "gini",                "var": 98,   "start_year": 2005,
     "output": "bps_gini.csv",
     "desc":   "Gini Ratio per Provinsi"},
    {"key": "employment_status",   "var": 2335, "start_year": 2022,
     "output": "bps_employment_by_status.csv",
     "desc":   "Penduduk Bekerja per Status Pekerjaan, per Provinsi (orang)"},
    {"key": "employment_sector",   "var": 2333, "start_year": 2022,
     "output": "bps_employment_by_sector.csv",
     "desc":   "Penduduk Bekerja per Lapangan Pekerjaan, per Provinsi (orang)"},
]


def _bps_th_chunks(start_year, end_year, chunk=2):
    """Yield BPS th-range strings; max `chunk` years per call (API limit=2)."""
    for yr in range(start_year, end_year + 1, chunk):
        yr_end = min(yr + chunk - 1, end_year)
        yield str(yr - 1900) if yr == yr_end else f"{yr - 1900}:{yr_end - 1900}"


def _bps_fetch_chunk(var_id, th_str, api_key):
    """Call BPS WebAPI for one th-range. Returns (response_dict, error_str)."""
    url = f"{BPS_WEBAPI_BASE}/domain/0000/var/{var_id}/th/{th_str}/key/{api_key}"
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        resp = r.json()
        if not isinstance(resp, dict):
            return None, "non-dict response"
        if resp.get("status", "").upper() != "OK":
            return None, f"API: {resp.get('message', resp.get('status', ''))}"
        return resp, None
    except Exception as e:
        return None, str(e)


def _bps_resp_to_df(resp, var_id):
    """
    Convert a BPS WebAPI response to a long-format DataFrame.

    datacontent keys are built by BPS as:
        str(prov_val) + str(var_id) + str(turvar_val) + str(th_val) + str(period_val)
    We reconstruct all combinations and look them up.
    """
    vervar   = resp.get("vervar",   [])
    turvar   = resp.get("turvar",   [])
    tahun    = resp.get("tahun",    [])
    turtahun = resp.get("turtahun", [])
    content  = resp.get("datacontent", {})

    rows = []
    for prov in vervar:
        for tv in turvar:
            for th in tahun:
                for tth in turtahun:
                    key = (str(prov["val"]) + str(var_id) +
                           str(tv["val"])   + str(th["val"]) + str(tth["val"]))
                    val = content.get(key)
                    if val is not None:
                        rows.append({
                            "province_code": prov["val"],
                            "province":      prov["label"],
                            "area_type":     tv["label"],
                            "year":          th["label"],
                            "period":        tth["label"],
                            "value":         val,
                        })
    return pd.DataFrame(rows)


def collect_bps_tables():
    if not config.BPS_API_KEY:
        log_skip(
            "BPS WebAPI — no key set in config.py.\n"
            "         Register free at: https://webapi.bps.go.id/developer/register\n"
            "         Then set BPS_API_KEY in config.py and re-run."
        )
        return

    end_year = min(int(config.BPS_DATE_END[:4]), int(config.DATE_END[:4]))

    for meta in BPS_TABLES:
        desc      = meta["desc"]
        var_id    = meta["var"]
        out_path  = os.path.join(DIRS["bps"], meta["output"])
        start_yr  = meta["start_year"]

        log_info(f"BPS — {desc} (var={var_id}, {start_yr}–{end_year})")
        frames = []

        for th_str in _bps_th_chunks(start_yr, end_year, chunk=2):
            resp, err = _bps_fetch_chunk(var_id, th_str, config.BPS_API_KEY)
            if err:
                log_fail(f"  BPS var={var_id} th={th_str}: {err}")
                continue
            chunk_df = _bps_resp_to_df(resp, var_id)
            if not chunk_df.empty:
                frames.append(chunk_df)
            time.sleep(0.4)

        if not frames:
            log_skip(f"BPS {desc} — no data returned")
            continue

        df = pd.concat(frames, ignore_index=True)
        df.to_csv(out_path, index=False)
        log_ok(f"BPS {desc} — {len(df):,} rows × {len(df.columns)} cols → {out_path}")

# ─── Summary Report ───────────────────────────────────────────────────────────

def print_summary():
    print("\n" + "=" * 60)
    print("COLLECTION SUMMARY")
    print("=" * 60)
    found, missing = [], []
    for subdir, path in DIRS.items():
        if os.path.isdir(path):
            for fname in os.listdir(path):
                if fname.endswith(".csv"):
                    fpath = os.path.join(path, fname)
                    rows = sum(1 for _ in open(fpath, encoding="utf-8")) - 1
                    found.append(f"  ✓ data/raw/{subdir}/{fname}  ({rows} rows)")
    if found:
        print("\nSaved files:")
        print("\n".join(found))
    else:
        print("\nNo files saved.")

    if not config.FRED_API_KEY:
        missing.append("  • FRED API   — register at https://fred.stlouisfed.org/docs/api/api_key.html")
    if not config.BPS_API_KEY:
        missing.append("  • BPS WebAPI — register at https://webapi.bps.go.id/developer/register")
    if missing:
        print("\nTo enable remaining sources, add API keys to config.py:")
        print("\n".join(missing))
    print("=" * 60)

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("SHIELD-ID: Data Collection")
    print(f"Period : {config.DATE_START} → {config.DATE_END}")
    print("=" * 60 + "\n")

    setup_directories()

    collect_worldbank_pinksheet()
    collect_yahoo_finance()
    collect_fred_data()
    collect_bps_tables()

    print_summary()


if __name__ == "__main__":
    main()
