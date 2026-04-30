# SHIELD-ID Prototype — Vulnerability Index Report

Generated: 2026-04-28 23:23

## Methodology
Five structural features per province, z-normalized and weighted into a
composite index, then projected under three macro-shock scenarios.

**Weights**

| Feature | Weight |
|---|---|
| `hhi_sectoral` | +0.20 |
| `export_intensity` | +0.20 |
| `migas_share` | +0.20 |
| `beta_oil` | +0.15 |
| `beta_fx` | +0.15 |
| `resilience` | -0.10 |

**Scenarios**

| Scenario | Δ oil | Δ USD/IDR | Multiplier |
|---|---|---|---|
| Base | +0% | +0% | ×1.0 |
| Adverse | +20% | +3% | ×1.5 |
| Severe | +40% | +6% | ×2.0 |

## Top-10 Most Vulnerable Provinces by Scenario

### Base

| Rank | Province | Score |
|---|---|---|
| 1 | Papua Barat | 0.775 |
| 2 | Papua Tengah | 0.766 |
| 3 | Maluku Utara | 0.713 |
| 4 | Sulawesi Tengah | 0.701 |
| 5 | Kepulauan Riau | 0.699 |
| 6 | Jambi | 0.691 |
| 7 | Papua Barat Daya | 0.688 |
| 8 | Kalimantan Timur | 0.679 |
| 9 | Kalimantan Selatan | 0.671 |
| 10 | Jawa Barat | 0.671 |

### Adverse

| Rank | Province | Score |
|---|---|---|
| 1 | Banten | 0.787 |
| 2 | Jawa Timur | 0.755 |
| 3 | Papua Tengah | 0.746 |
| 4 | Sulawesi Tengah | 0.741 |
| 5 | Jawa Barat | 0.741 |
| 6 | Jawa Tengah | 0.734 |
| 7 | Kalimantan Selatan | 0.726 |
| 8 | Jambi | 0.716 |
| 9 | Papua Barat | 0.714 |
| 10 | Bali | 0.713 |

### Severe

| Rank | Province | Score |
|---|---|---|
| 1 | Banten | 1.000 |
| 2 | Jawa Timur | 0.915 |
| 3 | Jawa Barat | 0.858 |
| 4 | Jawa Tengah | 0.857 |
| 5 | Bali | 0.843 |
| 6 | Kalimantan Selatan | 0.817 |
| 7 | Aceh | 0.811 |
| 8 | Kalimantan Utara | 0.810 |
| 9 | Sulawesi Tengah | 0.809 |
| 10 | Sulawesi Selatan | 0.803 |

## Caveats
- BPS provincial inflation only available 2022-onwards, so β coefficients are estimated on ~3 years of monthly data.
- The 4 newly-split Papuan provinces (created 2022) are kept in the CSV but mapped to their parent province on the choropleth.
- This is a prototype: weights are the proposal's defaults, not yet calibrated to historical-shock outcomes.
