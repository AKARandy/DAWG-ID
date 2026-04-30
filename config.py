# SHIELD-ID Project Configuration
# ─────────────────────────────────────────────────────────────────
# API Keys — fill these in before running collect_data.py
# ─────────────────────────────────────────────────────────────────

# BPS WebAPI (Badan Pusat Statistik — Indonesian Central Statistics)
# Register free at: https://webapi.bps.go.id/developer/register
BPS_API_KEY = ""

# FRED API (St. Louis Federal Reserve Economic Data)
# Register free at: https://fred.stlouisfed.org/docs/api/api_key.html
FRED_API_KEY = ""

# ─────────────────────────────────────────────────────────────────
# Date range — covers GFC 2008, commodity bust 2015, COVID 2020, and 2026 shocks
# ─────────────────────────────────────────────────────────────────
DATE_START    = "2005-01-01"
DATE_END      = "2026-04-23"   # used by FRED, Yahoo Finance, World Bank
BPS_DATE_END  = "2024-12-31"  # BPS data only available up to 2024

# ─────────────────────────────────────────────────────────────────
# World Bank Pink Sheet download URL
# If this URL breaks, visit: https://www.worldbank.org/en/research/commodity-markets
# and copy the "CMO-Historical-Data-Monthly.xlsx" download link here.
# ─────────────────────────────────────────────────────────────────
WORLDBANK_PINKSHEET_URL = (
    "https://thedocs.worldbank.org/en/doc/"
    "5d903e848db1d1b83e0ec8f744e55570-0350012021/related/"
    "CMO-Historical-Data-Monthly.xlsx"
)
