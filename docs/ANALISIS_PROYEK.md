# Analisis Proyek DAWG-ID

**Dynamic Assessment of Weakness and Growth — Indonesia**

Dokumen ini berisi analisis lengkap kode sumber proyek DAWG-ID.

---

## 1. Ringkasan Proyek

DAWG-ID adalah aplikasi web portal interaktif yang memvisualisasikan **Macro Shock Vulnerability Index** dari 38 provinsi di Indonesia terhadap konvergensi guncangan global 2026 (krisis Selat Hormuz, tarif AS, tekanan nilai tukar, ancaman downgrade).

---

## 2. Struktur Proyek

```
DAWG-ID/
├── dawg-id-portal/          # Frontend React + Vite
│   ├── api/
│   │   └── policy-brief.js  # Vercel Serverless Function (Azure AI)
│   ├── src/
│   │   ├── App.jsx           # Root component + routing
│   │   ├── main.jsx          # Entry point
│   │   ├── index.css         # Dark analytics theme
│   │   ├── pages/
│   │   │   ├── Home.jsx      # Landing page + top 10 preview
│   │   │   ├── Dashboard.jsx # Peta choropleth + ranking interaktif
│   │   │   ├── Dataset.jsx   # Tabel data lengkap + download CSV
│   │   │   ├── PolicyBriefs.jsx # AI-generated policy briefs
│   │   │   └── Report.jsx    # Laporan teknis metodologi
│   │   └── data/
│   │       └── vulnerabilityData.js  # Dataset vulnerability index (hardcoded)
│   ├── public/
│   │   ├── vulnerability_map.html    # Peta choropleth Folium
│   │   ├── indonesia-province.geo.json
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── .env.example          # ⭐ Template konfigurasi API Azure
│   ├── vercel.json           # Konfigurasi deployment Vercel
│   ├── vite.config.js        # Vite config (base: /DAWG-ID/)
│   ├── package.json
│   └── index.html
├── data/
│   ├── raw/                  # Data mentah dari berbagai sumber
│   │   ├── bps/             # BPS: inflasi, PDRB, ekspor, kemiskinan, Gini
│   │   ├── commodities/     # World Bank Pink Sheet, Yahoo (Brent, WTI), FRED
│   │   └── exchange_rates/  # Yahoo Finance USD/IDR
│   └── processed/           # Data hasil olahan
│       ├── vulnerability_index.csv
│       ├── vulnerability_features.csv
│       ├── master_panel.csv
│       ├── ml_inflation_panel.csv
│       ├── ml_shap_values.csv
│       └── ml_scenario_predictions.csv
├── models/                   # ML model artifacts
│   ├── inflation_distress_decision_tree.joblib
│   ├── inflation_distress_metrics.json
│   ├── inflation_distress_best_params.json
│   └── inflation_distress_feature_columns.json
├── outputs/                  # Visualisasi & report
│   ├── vulnerability_map.html
│   ├── decision_tree_plot.png
│   ├── shap_global_importance.png
│   └── prototype_report.md
├── .github/workflows/
│   └── deploy.yml            # GitHub Actions → GitHub Pages
├── collect_data.py           # Script pengumpulan data
├── prototype_lib.py          # Library prototype (feature engineering)
├── train_ml_decision_tree.py # Training Decision Tree + SHAP
├── config.py                 # ⭐ Konfigurasi API keys (BPS, FRED)
├── requirements.txt          # Python dependencies
└── README.md
```

---

## 3. Komponen Utama

### 3.1 Frontend (dawg-id-portal/)

| Teknologi | Versi |
|-----------|-------|
| React | ^19.2.5 |
| React Router DOM | ^7.14.2 |
| Vite | ^5.4.0 |
| @vitejs/plugin-react | ^4.3.0 |

**Halaman:**
- **Home** — Landing page dengan konteks guncangan global, quick stats, top 10 provinsi
- **Dashboard** — Peta choropleth interaktif (iframe Folium), bar chart, ranking lengkap
- **Dataset** — Tabel sortable + searchable, download CSV
- **PolicyBriefs** — Generate AI policy brief per provinsi via Azure Foundry
- **Report** — Dokumentasi metodologi, sumber data, caveats

**Routing:** HashRouter (`/#/dashboard`, `/#/policy`, dll.)

### 3.2 Backend / Serverless API

File: `dawg-id-portal/api/policy-brief.js`

- **Platform:** Vercel Serverless Functions
- **Model AI:** Microsoft Foundry — Phi-4-mini-instruct
- **Endpoint:** `POST /api/policy-brief`
- **Input:** `{ province: {...data}, scenario: "Adverse" }`
- **Output:** `{ brief: "...policy brief text..." }`

### 3.3 Python Backend (Data Pipeline)

| File | Fungsi |
|------|--------|
| `collect_data.py` | Download data dari BPS, FRED, Yahoo Finance, World Bank |
| `prototype_lib.py` | Feature engineering, vulnerability index calculation |
| `train_ml_decision_tree.py` | Training Decision Tree classifier + SHAP explainability |
| `config.py` | API keys (BPS, FRED) dan parameter tanggal |

**Dependencies Python:** pandas, requests, yfinance, openpyxl, fredapi, scikit-learn, shap, joblib, matplotlib

### 3.4 Machine Learning

- **Model:** Decision Tree Classifier (scikit-learn)
- **Target:** Prediksi apakah inflasi MoM provinsi masuk top quartile
- **Explainability:** SHAP values untuk interpretasi fitur
- **Output:** Model `.joblib`, metrics JSON, SHAP plots

### 3.5 Deployment

- **Frontend (GitHub Pages):** GitHub Actions build Vite → deploy ke GitHub Pages
- **API (Vercel):** Serverless function untuk policy brief generation
- **Base URL:** `/DAWG-ID/` (dikonfigurasi di `vite.config.js`)

---

## 4. Fitur Vulnerability Index

| Fitur | Bobot | Deskripsi |
|-------|-------|-----------|
| HHI Sektoral | +0.20 | Konsentrasi ekonomi (Herfindahl-Hirschman Index) |
| Intensitas Ekspor | +0.20 | Rasio ekspor terhadap PDRB |
| Pangsa Migas | +0.20 | Proporsi sektor migas dalam ekonomi |
| β Minyak | +0.15 | Sensitivitas inflasi terhadap harga minyak |
| β Kurs | +0.15 | Sensitivitas inflasi terhadap depresiasi Rupiah |
| Resiliensi | -0.10 | Komposit kemiskinan, Gini, formalitas kerja |

**Skenario:**
| Skenario | Δ Harga Minyak | Δ USD/IDR | Multiplier |
|----------|---------------|-----------|------------|
| Base | +0% | +0% | ×1.0 |
| Adverse | +20% | +3% | ×1.5 |
| Severe | +40% | +6% | ×2.0 |

---

## 5. Sumber Data

1. **BPS WebAPI** — Inflasi, PDRB, ekspor, kemiskinan, Gini, ketenagakerjaan
2. **World Bank Pink Sheet** — Harga komoditas global
3. **FRED** — Commodity price indices
4. **Yahoo Finance** — Harga minyak Brent/WTI, kurs USD/IDR

---

## 6. Konfigurasi API Azure (⭐ PENTING)

Lihat dokumen terpisah: [KONFIGURASI_API_AZURE.md](./KONFIGURASI_API_AZURE.md)

---

## 7. Cara Menjalankan

### Frontend (Development)
```bash
cd dawg-id-portal
npm install
npm run dev
# Buka http://localhost:5173/
```

### Python Data Pipeline
```bash
pip install -r requirements.txt
# Isi API keys di config.py
python collect_data.py
python train_ml_decision_tree.py
```

### Deploy
- **GitHub Pages:** Push ke branch `main` → otomatis deploy via GitHub Actions
- **Vercel (API):** Connect repo ke Vercel, set environment variables
