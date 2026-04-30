"""
SHIELD-ID Prototype: shared helpers
====================================
Pure functions used by `02_prototype.ipynb` to go from raw CSVs to a
province-level Macro Shock Vulnerability Index.

Design: every function takes DataFrames in, returns DataFrames out — so the
notebook can show intermediate results between calls and so any function is
testable in isolation (`python -c "import prototype_lib"`).
"""

from __future__ import annotations

import os
import re
import json
import urllib.request
from pathlib import Path
from io import BytesIO

import numpy as np
import pandas as pd

# ─── Province normalization ──────────────────────────────────────────────────

# Indonesian month names → month number
ID_MONTH = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5,
    "juni": 6, "juli": 7, "agustus": 8, "september": 9, "oktober": 10,
    "november": 11, "desember": 12,
}

# Quarterly periods (use the *last* month of each quarter as the date stamp)
ID_QUARTER = {
    "triwulan i": 3, "triwulan ii": 6, "triwulan iii": 9, "triwulan iv": 12,
}

# Semester periods (Gini, poverty)
ID_SEMESTER = {
    "semester 1 (maret)":     3,
    "semester 2 (september)": 9,
}


def norm_province_name(name: str) -> str:
    """
    Normalize a province label so different BPS tables can be joined.

    "PROV ACEH"              -> "Aceh"
    "DKI JAKARTA"            -> "Dki Jakarta"
    "Aceh"                   -> "Aceh"
    "PAPUA BARAT DAYA"       -> "Papua Barat Daya"
    "Kep. Bangka Belitung"   -> "Kepulauan Bangka Belitung"  (PDRB uses abbreviation)
    """
    if not isinstance(name, str):
        return ""
    s = name.strip()
    if s.upper().startswith("PROV "):
        s = s[5:]
    s = s.title().strip()
    # PDRB uses "Kep." while every other BPS table uses "Kepulauan"
    s = re.sub(r"^Kep\.?\s+", "Kepulauan ", s)
    return s


def norm_province_code(code) -> int:
    """
    Convert any BPS province code to the 4-digit form used by inflation/exports.

    11   → 1100   (PDRB short form)
    1100 → 1100   (already long)
    """
    c = int(code)
    return c * 100 if c < 100 else c


# ─── Period → date ───────────────────────────────────────────────────────────

def period_to_month(year: int, period) -> pd.Timestamp | pd.NaT:
    """
    Map a (year, period_label) pair to the first-of-month timestamp.

    Handles: month names, "Triwulan I/II/III/IV", "Tahunan", "Semester N (...)".
    Returns NaT for unrecognised labels (e.g. annual rows we'll handle separately).
    """
    if not isinstance(period, str):
        return pd.NaT
    p = period.lower().strip()
    if p in ID_MONTH:
        return pd.Timestamp(year=int(year), month=ID_MONTH[p], day=1)
    if p in ID_QUARTER:
        return pd.Timestamp(year=int(year), month=ID_QUARTER[p], day=1)
    if p in ID_SEMESTER:
        return pd.Timestamp(year=int(year), month=ID_SEMESTER[p], day=1)
    if p == "tahunan":
        return pd.Timestamp(year=int(year), month=12, day=1)  # year-end stamp
    return pd.NaT


# ─── Raw loaders ─────────────────────────────────────────────────────────────

def load_bps_csv(path: str | Path) -> pd.DataFrame:
    """
    Load any BPS long-format CSV and return it with normalized columns:
    `province_code` (4-digit int), `province` (Title-case), `area_type`,
    `year`, `period`, `value`, plus a parsed `date` column.

    Drops the national-aggregate row (province_code == 9999) so downstream
    code only sees the 38 actual provinces.
    """
    df = pd.read_csv(path)
    df["province_code"] = df["province_code"].apply(norm_province_code)
    df = df[df["province_code"] != 9999].copy()
    df["province"]      = df["province"].apply(norm_province_name)
    df["value"]         = pd.to_numeric(df["value"], errors="coerce")
    df["date"]          = df.apply(lambda r: period_to_month(r["year"], r["period"]), axis=1)
    return df


def load_commodity_panel(raw_dir: str | Path) -> pd.DataFrame:
    """
    Build a national monthly commodity/FX panel by combining FRED + Yahoo + Pink Sheet.

    Returns a DataFrame indexed by month-start date with columns:
        brent, wti, usd_idr, palm_oil, nickel, coal, tin

    Daily series are resampled to monthly mean; monthly series kept as-is.
    Multiple sources for the same commodity are coalesced by `combine_first`.
    """
    raw = Path(raw_dir)

    # ── Yahoo (daily → monthly mean) ────────────────────────────────────────
    def _yh(path, col):
        df = pd.read_csv(path, parse_dates=["date"]).set_index("date")
        df = df[~df.index.isna()]
        return df["Close"].resample("MS").mean().rename(col)

    brent_y    = _yh(raw / "commodities/yahoo_brent.csv",   "brent")
    wti_y      = _yh(raw / "commodities/yahoo_wti.csv",     "wti")
    usd_idr_y  = _yh(raw / "exchange_rates/yahoo_usdidr.csv", "usd_idr")

    # ── FRED ────────────────────────────────────────────────────────────────
    fred = pd.read_csv(raw / "commodities/fred_series.csv", parse_dates=["date"]).set_index("date")
    fred_m = fred.resample("MS").mean()  # daily series collapse, monthly stay
    fred_m = fred_m.rename(columns={
        "brent_crude_daily_usd_bbl":    "brent_fred",
        "wti_crude_daily_usd_bbl":      "wti_fred",
        "nickel_monthly_usd_mt":        "nickel",
        "coal_australia_monthly_usd_mt":"coal",
        "usd_idr_daily":                "usd_idr_fred",
    })

    # ── World Bank Pink Sheet (palm oil, tin, fallback for the rest) ───────
    pink_path = raw / "commodities/CMO-Historical-Data-Monthly.xlsx"
    pink: pd.DataFrame | None = None
    if pink_path.exists():
        raw_pink = pd.read_excel(pink_path, sheet_name="Monthly Prices", header=4)
        raw_pink = raw_pink.rename(columns={raw_pink.columns[0]: "period"})
        raw_pink = raw_pink[raw_pink["period"].astype(str).str.match(r"^\d{4}M\d{2}$", na=False)]
        raw_pink["date"] = pd.to_datetime(raw_pink["period"].str.replace("M", "-") + "-01")
        raw_pink = raw_pink.set_index("date").sort_index()
        # Replace the "�" placeholder for missing values
        raw_pink = raw_pink.replace("�", np.nan).apply(pd.to_numeric, errors="coerce")
        col_map = {
            "Crude oil, Brent": "brent_pink",
            "Crude oil, WTI":   "wti_pink",
            "Coal, Australian": "coal_pink",
            "Palm oil":         "palm_oil",
            "Nickel":           "nickel_pink",
            "Tin":              "tin",
        }
        keep = {c: a for c, a in col_map.items() if c in raw_pink.columns}
        pink = raw_pink[list(keep.keys())].rename(columns=keep)

    # ── Coalesce ─────────────────────────────────────────────────────────────
    panel = pd.DataFrame()
    panel["brent"]   = brent_y.combine_first(fred_m.get("brent_fred"))
    panel["wti"]     = wti_y.combine_first(fred_m.get("wti_fred"))
    panel["usd_idr"] = usd_idr_y.combine_first(fred_m.get("usd_idr_fred"))
    panel["nickel"]  = fred_m.get("nickel")
    panel["coal"]    = fred_m.get("coal")
    panel["palm_oil"] = pd.Series(dtype="float64")
    panel["tin"]      = pd.Series(dtype="float64")

    if pink is not None:
        panel["brent"]    = panel["brent"].combine_first(pink.get("brent_pink"))
        panel["wti"]      = panel["wti"].combine_first(pink.get("wti_pink"))
        panel["coal"]     = panel["coal"].combine_first(pink.get("coal_pink"))
        panel["palm_oil"] = panel["palm_oil"].combine_first(pink.get("palm_oil"))
        panel["nickel"]   = panel["nickel"].combine_first(pink.get("nickel_pink"))
        panel["tin"]      = panel["tin"].combine_first(pink.get("tin"))

    panel.index.name = "date"
    return panel.sort_index()


# ─── Province features ───────────────────────────────────────────────────────

def compute_hhi(pdrb_df: pd.DataFrame) -> pd.DataFrame:
    """
    Herfindahl–Hirschman Index of sectoral PDRB concentration per province.

    Higher = more concentrated economy = more vulnerable to sector-specific shocks.
    Range: 1/N (perfect diversification) to 1 (single sector).
    """
    # Latest available year per province for a stable cross-section
    latest_year = pdrb_df.groupby("province")["year"].max()
    sub = pdrb_df.merge(latest_year.rename("latest_year"), on="province")
    sub = sub[sub["year"] == sub["latest_year"]]
    # Total per province per sector across the year (all four quarters)
    sector_totals = sub.groupby(["province", "area_type"])["value"].sum().reset_index()
    province_totals = sector_totals.groupby("province")["value"].sum().rename("total")
    sector_totals = sector_totals.merge(province_totals, on="province")
    sector_totals["share2"] = (sector_totals["value"] / sector_totals["total"]) ** 2
    hhi = sector_totals.groupby("province")["share2"].sum().rename("hhi_sectoral")
    return hhi.to_frame()


def compute_export_features(
    export_migas: pd.DataFrame,
    export_nonmigas: pd.DataFrame,
    pdrb_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Two features per province:
      - export_intensity = (annual export USD × USD/IDR proxy) / annual PDRB IDR
        Implemented as: total exports (thousand USD) / annual PDRB (billion IDR),
        which gives a relative intensity proxy (not a true ratio — direction matters).
      - migas_share = export_migas / (export_migas + export_nonmigas)
    Uses the latest full year available in both tables.
    """
    # Pick latest common year
    common_years = (
        set(export_migas["year"].unique())
        & set(export_nonmigas["year"].unique())
        & set(pdrb_df["year"].unique())
    )
    latest = max(common_years) if common_years else max(export_migas["year"].unique())

    mig = (export_migas[export_migas["year"] == latest]
           .groupby("province")["value"].sum().rename("migas"))
    non = (export_nonmigas[export_nonmigas["year"] == latest]
           .groupby("province")["value"].sum().rename("nonmigas"))
    pdrb_year = (pdrb_df[pdrb_df["year"] == latest]
                 .groupby("province")["value"].sum().rename("pdrb_total"))

    out = pd.concat([mig, non, pdrb_year], axis=1).fillna(0)
    out["total_export"] = out["migas"] + out["nonmigas"]
    out["export_intensity"] = np.where(out["pdrb_total"] > 0,
                                       out["total_export"] / out["pdrb_total"], 0)
    out["migas_share"] = np.where(out["total_export"] > 0,
                                  out["migas"] / out["total_export"], 0)
    return out[["export_intensity", "migas_share"]]


def compute_betas(
    inflation_mom: pd.DataFrame,
    commodity_panel: pd.DataFrame,
) -> pd.DataFrame:
    """
    Per-province OLS: inflation_mom_t = α + β_oil · Δlog(brent_t) + β_fx · Δlog(usd_idr_t) + ε

    Returns a DataFrame indexed by province with columns `beta_oil`, `beta_fx`.
    Uses 2022-onwards monthly data (the only window where BPS provincial CPI is available).
    Provinces with < 12 monthly observations are dropped (their betas are unstable).
    """
    # Build national monthly shock series
    shocks = pd.DataFrame({
        "d_log_brent":   np.log(commodity_panel["brent"]).diff(),
        "d_log_usd_idr": np.log(commodity_panel["usd_idr"]).diff(),
    }).dropna()

    out = []
    for province, grp in inflation_mom.groupby("province"):
        prov = grp.dropna(subset=["date", "value"]).set_index("date")["value"]
        merged = pd.concat([prov.rename("infl"), shocks], axis=1, join="inner").dropna()
        if len(merged) < 12:
            out.append({"province": province, "beta_oil": np.nan, "beta_fx": np.nan,
                        "n_obs": len(merged)})
            continue
        X = np.column_stack([
            np.ones(len(merged)),
            merged["d_log_brent"].values,
            merged["d_log_usd_idr"].values,
        ])
        y = merged["infl"].values
        # Closed-form OLS: β = (XᵀX)⁻¹ Xᵀy
        coef, *_ = np.linalg.lstsq(X, y, rcond=None)
        out.append({
            "province": province,
            "beta_oil": float(coef[1]),
            "beta_fx":  float(coef[2]),
            "n_obs":    len(merged),
        })
    return pd.DataFrame(out).set_index("province")[["beta_oil", "beta_fx", "n_obs"]]


def compute_resilience(
    poverty_p1: pd.DataFrame,
    gini: pd.DataFrame,
    employment_status: pd.DataFrame,
) -> pd.DataFrame:
    """
    Composite resilience proxy:
      mean(z(−poverty_p1), z(−gini), z(formal_employment_share))
    where formal_employment_share is the fraction of workers in
    "Berusaha dibantu buruh tetap" + "Buruh/Karyawan/Pegawai".
    Higher resilience = LESS vulnerable.
    """
    def _latest(df, area="Perkotaan+Perdesaan"):
        sub = df[df["area_type"].str.lower().str.contains(area.lower(), na=False)
                 if "area_type" in df.columns else slice(None)]
        if sub.empty:
            sub = df
        latest_year = sub.groupby("province")["year"].max()
        sub = sub.merge(latest_year.rename("latest_year"), on="province")
        return sub[sub["year"] == sub["latest_year"]].groupby("province")["value"].mean()

    pov   = _latest(poverty_p1).rename("poverty")
    gn    = _latest(gini).rename("gini")

    # Formal employment share = formal / total in latest period per province
    emp = employment_status.copy()
    formal_keys = ["buruh tetap", "buruh/karyawan", "karyawan/pegawai"]
    emp["is_formal"] = emp["area_type"].fillna("").str.lower().apply(
        lambda s: any(k in s for k in formal_keys)
    )
    latest_emp_year = emp.groupby("province")["year"].max()
    emp = emp.merge(latest_emp_year.rename("latest_year"), on="province")
    emp = emp[emp["year"] == emp["latest_year"]]
    formal_share = (emp[emp["is_formal"]].groupby("province")["value"].sum()
                    / emp.groupby("province")["value"].sum()).rename("formal_share")

    df = pd.concat([pov, gn, formal_share], axis=1)
    # Z-score each component (lower poverty/Gini = higher resilience → flip sign)
    z = pd.DataFrame(index=df.index)
    z["zp"] = -_zscore(df["poverty"])
    z["zg"] = -_zscore(df["gini"])
    z["zf"] =  _zscore(df["formal_share"])
    df["resilience"] = z.mean(axis=1)
    return df[["poverty", "gini", "formal_share", "resilience"]]


def _zscore(s: pd.Series) -> pd.Series:
    s = s.astype(float)
    sd = s.std(ddof=0)
    return (s - s.mean()) / sd if sd and not np.isnan(sd) else pd.Series(0.0, index=s.index)


# ─── Index construction ──────────────────────────────────────────────────────

DEFAULT_WEIGHTS: dict[str, float] = {
    "hhi_sectoral":     0.20,
    "export_intensity": 0.20,
    "migas_share":      0.20,
    "beta_oil":         0.15,
    "beta_fx":          0.15,
    "resilience":      -0.10,   # negative — higher resilience reduces vulnerability
}


def build_features_table(
    hhi: pd.DataFrame,
    exp_feats: pd.DataFrame,
    betas: pd.DataFrame,
    resilience: pd.DataFrame,
) -> pd.DataFrame:
    """
    Outer-join all four feature DataFrames on province name. The new (2022)
    Papuan provinces don't yet appear in PDRB sectoral data, so their HHI is
    missing — fill that and any other isolated gaps with the column median so
    the index can still be computed for every province. Provinces missing
    *all* features are dropped.
    """
    df = (hhi.join(exp_feats, how="outer")
              .join(betas[["beta_oil", "beta_fx"]], how="outer")
              .join(resilience[["resilience"]], how="outer"))
    df = df.dropna(how="all")
    df = df.fillna(df.median(numeric_only=True))
    return df


def compute_index(features: pd.DataFrame,
                  weights: dict[str, float] = None) -> pd.DataFrame:
    """
    Z-normalize each feature column, weight, sum, min-max scale to [0,1].
    Returns the input plus z-scored columns and a `vuln_index` column.
    """
    weights = weights or DEFAULT_WEIGHTS
    df = features.copy()
    z = pd.DataFrame(index=df.index)
    for col in weights:
        if col in df.columns:
            z[f"z_{col}"] = _zscore(df[col])
    df = df.join(z)
    raw = sum(z[f"z_{col}"].fillna(0) * w for col, w in weights.items() if f"z_{col}" in z.columns)
    rng = raw.max() - raw.min()
    df["vuln_raw"]   = raw
    df["vuln_index"] = (raw - raw.min()) / rng if rng else 0.0
    df["rank"]       = df["vuln_index"].rank(ascending=False, method="min").astype(int)
    return df.sort_values("vuln_index", ascending=False)


# ─── Scenario simulation ─────────────────────────────────────────────────────

DEFAULT_SCENARIOS = {
    "Base":    {"d_oil_pct": 0.00, "d_fx_pct": 0.00, "multiplier": 1.0},
    "Adverse": {"d_oil_pct": 0.20, "d_fx_pct": 0.03, "multiplier": 1.5},
    "Severe":  {"d_oil_pct": 0.40, "d_fx_pct": 0.06, "multiplier": 2.0},
}


def apply_scenarios(features: pd.DataFrame,
                    scenarios: dict[str, dict] = None,
                    weights: dict[str, float] = None) -> pd.DataFrame:
    """
    For each scenario, compute:
        score = vuln_raw + multiplier · (β_oil · Δoil_pct + β_fx · ΔIDR_pct)
    then min-max scale across all province×scenario observations so scores are
    comparable across scenarios.
    """
    scenarios = scenarios or DEFAULT_SCENARIOS
    weights   = weights   or DEFAULT_WEIGHTS

    base = compute_index(features, weights)

    rows = []
    for name, params in scenarios.items():
        bo = base["beta_oil"].fillna(0)
        bf = base["beta_fx"].fillna(0)
        score = (base["vuln_raw"]
                 + params["multiplier"] * (bo * params["d_oil_pct"]
                                           + bf * params["d_fx_pct"]))
        for province, val in score.items():
            rows.append({"province": province, "scenario": name, "score_raw": val})

    out = pd.DataFrame(rows)
    rng = out["score_raw"].max() - out["score_raw"].min()
    out["score"] = (out["score_raw"] - out["score_raw"].min()) / rng if rng else 0
    out["rank"]  = out.groupby("scenario")["score"].rank(ascending=False, method="min").astype(int)

    # Attach the underlying features for the output CSV
    feat_cols = ["hhi_sectoral", "export_intensity", "migas_share",
                 "beta_oil", "beta_fx", "resilience"]
    out = out.merge(base[feat_cols].reset_index(), on="province", how="left")
    return out.sort_values(["scenario", "rank"]).reset_index(drop=True)


# ─── Visualisation ───────────────────────────────────────────────────────────

def plot_top10_bar(scenario_df: pd.DataFrame, scenario: str, out_path: str | Path):
    """Save a horizontal bar chart of the top-10 most vulnerable provinces for one scenario."""
    import matplotlib.pyplot as plt
    sub = (scenario_df[scenario_df["scenario"] == scenario]
           .nlargest(10, "score")
           .iloc[::-1])  # reverse so highest is at the top of the chart

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.barh(sub["province"], sub["score"], color="#2c7bb6")
    ax.set_xlabel("Vulnerability Score (0 = least, 1 = most)")
    ax.set_title(f"Top-10 Most Vulnerable Provinces — {scenario} Scenario")
    ax.set_xlim(0, 1)
    for i, (_, row) in enumerate(sub.iterrows()):
        ax.text(row["score"] + 0.01, i, f"{row['score']:.3f}", va="center")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)


# BPS province name (normalized) -> GeoJSON `Propinsi` value (Bakosurtanal naming).
# The GeoJSON has 34 features (post-2012, before the 2022 Papuan splits) so the
# 4 newly-split Papuan provinces aggregate to their parent for map display.
BPS_TO_GEOJSON = {
    "Aceh":                       "DI. ACEH",
    "Bali":                       "BALI",
    "Banten":                     "BANTEN",
    "Bengkulu":                   "BENGKULU",
    "Di Yogyakarta":              "DAERAH ISTIMEWA YOGYAKARTA",
    "Dki Jakarta":                "DKI JAKARTA",
    "Gorontalo":                  "GORONTALO",
    "Jambi":                      "JAMBI",
    "Jawa Barat":                 "JAWA BARAT",
    "Jawa Tengah":                "JAWA TENGAH",
    "Jawa Timur":                 "JAWA TIMUR",
    "Kalimantan Barat":           "KALIMANTAN BARAT",
    "Kalimantan Selatan":         "KALIMANTAN SELATAN",
    "Kalimantan Tengah":          "KALIMANTAN TENGAH",
    "Kalimantan Timur":           "KALIMANTAN TIMUR",
    "Kalimantan Utara":           "KALIMANTAN UTARA",
    "Kepulauan Bangka Belitung":  "BANGKA BELITUNG",
    "Kepulauan Riau":             "KEPULAUAN RIAU",
    "Lampung":                    "LAMPUNG",
    "Maluku":                     "MALUKU",
    "Maluku Utara":               "MALUKU UTARA",
    "Nusa Tenggara Barat":        "NUSATENGGARA BARAT",   # no space — matches GeoJSON typo
    "Nusa Tenggara Timur":        "NUSA TENGGARA TIMUR",
    "Papua":                      "PAPUA",
    "Papua Barat":                "PAPUA BARAT",
    "Papua Barat Daya":           "PAPUA BARAT",          # 2022 split — aggregate
    "Papua Pegunungan":           "PAPUA",                # 2022 split — aggregate
    "Papua Selatan":              "PAPUA",                # 2022 split — aggregate
    "Papua Tengah":               "PAPUA",                # 2022 split — aggregate
    "Riau":                       "RIAU",
    "Sulawesi Barat":             "SULAWESI BARAT",
    "Sulawesi Selatan":           "SULAWESI SELATAN",
    "Sulawesi Tengah":            "SULAWESI TENGAH",
    "Sulawesi Tenggara":          "SULAWESI TENGGARA",
    "Sulawesi Utara":             "SULAWESI UTARA",
    "Sumatera Barat":             "SUMATERA BARAT",
    "Sumatera Selatan":           "SUMATERA SELATAN",
    "Sumatera Utara":             "SUMATERA UTARA",
}


def fetch_indonesia_geojson(out_path: str | Path) -> Path:
    """Download a 34-province Indonesia GeoJSON (Bakosurtanal source) if not cached."""
    out = Path(out_path)
    if out.exists() and out.stat().st_size > 1000:
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    url = ("https://raw.githubusercontent.com/ans-4175/peta-indonesia-geojson/"
           "master/indonesia-prov.geojson")
    with urllib.request.urlopen(url, timeout=30) as r:
        out.write_bytes(r.read())
    return out


def plot_choropleth_map(scenario_df: pd.DataFrame,
                        geojson_path: str | Path,
                        out_html: str | Path):
    """
    Render an interactive Plotly choropleth_mapbox with a scenario animation slider.

    Uses carto-positron tile background so every province fill colour is legible
    regardless of score value (px.choropleth with a blank geo background causes
    dark-scored provinces to blend into the background and disappear visually).

    The GeoJSON has 34 provinces; the 4 newly-split Papuan provinces (2022)
    aggregate to their parent for map display via BPS_TO_GEOJSON.
    """
    import plotly.express as px

    with open(geojson_path, encoding="utf-8") as f:
        gj = json.load(f)

    # Overwrite numeric feature IDs with the Propinsi string so Plotly's
    # top-level "id" lookup works reliably.
    for feat in gj["features"]:
        propinsi = feat.get("properties", {}).get("Propinsi", "")
        feat["id"] = propinsi.strip()

    df = scenario_df.copy()
    df["geo_name"] = df["province"].map(BPS_TO_GEOJSON)
    df["geo_name"] = df["geo_name"].str.strip()
    unmapped = df[df["geo_name"].isna()]["province"].unique()
    if len(unmapped):
        print(f"  [WARN] Provinces without GeoJSON match (omitted from map): {list(unmapped)}")
    df = df.dropna(subset=["geo_name"])

    # Average across BPS provinces that map to the same GeoJSON feature (Papua splits)
    df_map = (df.groupby(["scenario", "geo_name"], as_index=False)["score"]
                .mean())

    # Rescale each scenario independently to [0, 1] so every animation frame
    # uses the full colour range.  Cross-scenario comparisons live in the CSV.
    def _rescale_group(g):
        mn, mx = g["score"].min(), g["score"].max()
        g = g.copy()
        g["score"] = (g["score"] - mn) / (mx - mn) if mx > mn else 0.5
        return g

    df_map = df_map.groupby("scenario", group_keys=False).apply(_rescale_group)

    fig = px.choropleth_mapbox(
        df_map,
        geojson=gj,
        locations="geo_name",
        featureidkey="id",
        color="score",
        color_continuous_scale="Oranges",
        animation_frame="scenario",
        range_color=(0, 1),
        opacity=0.75,
        mapbox_style="carto-positron",
        zoom=3.5,
        center={"lat": -2.5, "lon": 117.5},
        title="Indonesia — Macro Shock Vulnerability Index",
        labels={"score": "Vulnerability"},
        hover_name="geo_name",
    )
    fig.update_layout(margin=dict(l=0, r=0, t=40, b=0))
    fig.write_html(str(out_html), include_plotlyjs="cdn")


def write_markdown_report(scenario_df: pd.DataFrame,
                          features: pd.DataFrame,
                          out_path: str | Path,
                          weights: dict[str, float] = None,
                          scenarios: dict[str, dict] = None) -> None:
    """Generate a self-contained markdown summary of the prototype run."""
    weights   = weights   or DEFAULT_WEIGHTS
    scenarios = scenarios or DEFAULT_SCENARIOS

    lines: list[str] = []
    add = lines.append

    add("# SHIELD-ID Prototype — Vulnerability Index Report")
    add("")
    add(f"Generated: {pd.Timestamp.now():%Y-%m-%d %H:%M}")
    add("")
    add("## Methodology")
    add("Five structural features per province, z-normalized and weighted into a")
    add("composite index, then projected under three macro-shock scenarios.")
    add("")
    add("**Weights**")
    add("")
    add("| Feature | Weight |")
    add("|---|---|")
    for k, v in weights.items():
        add(f"| `{k}` | {v:+.2f} |")
    add("")
    add("**Scenarios**")
    add("")
    add("| Scenario | Δ oil | Δ USD/IDR | Multiplier |")
    add("|---|---|---|---|")
    for name, p in scenarios.items():
        add(f"| {name} | {p['d_oil_pct']:+.0%} | {p['d_fx_pct']:+.0%} | ×{p['multiplier']} |")
    add("")
    add("## Top-10 Most Vulnerable Provinces by Scenario")
    add("")
    for scen in scenarios:
        add(f"### {scen}")
        add("")
        add("| Rank | Province | Score |")
        add("|---|---|---|")
        top = (scenario_df[scenario_df["scenario"] == scen]
               .nlargest(10, "score")[["province", "score"]])
        for i, (_, row) in enumerate(top.iterrows(), 1):
            add(f"| {i} | {row['province']} | {row['score']:.3f} |")
        add("")
    add("## Caveats")
    add("- BPS provincial inflation only available 2022-onwards, so β coefficients are estimated on ~3 years of monthly data.")
    add("- The 4 newly-split Papuan provinces (created 2022) are kept in the CSV but mapped to their parent province on the choropleth.")
    add("- This is a prototype: weights are the proposal's defaults, not yet calibrated to historical-shock outcomes.")
    add("")

    Path(out_path).write_text("\n".join(lines), encoding="utf-8")
