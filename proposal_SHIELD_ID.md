# SHIELD-ID: Shock & Hazard Index for Economic Livelihood Diagnostics — Indonesia

## Macro Shock Vulnerability Index by Province

**Tema:** Ekonomi Digital & Inklusi Keuangan  
**Problem Statement:** Menganalisis pola makroekonomi dan aktivitas keuangan digital untuk merumuskan strategi penguatan ketahanan ekonomi masyarakat serta optimalisasi penyaluran sumber daya finansial negara secara tepat sasaran.

---

## 1. Latar Belakang & Motivasi

Indonesia pada tahun 2026 menghadapi konvergensi guncangan eksternal yang belum pernah terjadi sebelumnya:

- **Krisis Selat Hormuz** — Perang Iran telah mengganggu jalur pelayaran minyak global. IEA menyebutnya sebagai gangguan pasokan terbesar dalam sejarah pasar minyak. Sebagai net importir minyak dan gas, Indonesia sangat rentan terhadap lonjakan harga energi.
- **Tarif AS & Investigasi Section 301** — Indonesia menghadapi tarif 19% dari AS, dengan investigasi Section 301 baru yang diluncurkan Maret 2026 terkait "excess manufacturing capacity." Sektor tekstil, alas kaki, elektronik, karet, dan minyak sawit terdampak langsung.
- **Tekanan Nilai Tukar** — Rupiah mendekati rekor terendah di ~Rp 17.200/USD, ditekan oleh capital outflow, penguatan dolar, dan risiko geopolitik.
- **Ancaman Downgrade** — Moody's dan Fitch memangkas outlook utang Indonesia menjadi negatif. MSCI membekukan review pasar saham Indonesia hingga Juni 2026.
- **Stagflasi Global** — IMF memangkas proyeksi pertumbuhan dunia 2026 menjadi 3,1%. Analis menarik paralel dengan oil shock era 1970-an.

**Pertanyaan inti:** Dari 34 provinsi Indonesia, mana yang paling rentan terhadap kombinasi guncangan ini — dan apa strategi penguatan ketahanan ekonomi yang tepat sasaran untuk masing-masing profil kerentanan?

---

## 2. Tujuan Proyek

1. **Membangun Vulnerability Index** — Indeks komposit kerentanan ekonomi per provinsi berdasarkan fitur struktural (komposisi PDRB, eksposur ekspor, ketergantungan energi, diversifikasi ekonomi).
2. **Validasi Historis** — Menguji apakah provinsi yang diidentifikasi "rentan" oleh model memang mengalami outcome ekonomi terburuk selama episode guncangan masa lalu (COVID-19 2020, commodity bust 2015, GFC 2008).
3. **Simulasi Skenario 2026** — Menjalankan skenario "what-if" untuk kondisi aktual 2026 (Hormuz berlanjut, tarif Section 301 aktif, Rupiah di 17.500) dan memetakan provinsi prioritas.
4. **Rekomendasi Strategis** — Menggunakan Azure OpenAI untuk menghasilkan policy brief per provinsi dalam Bahasa Indonesia, diterjemahkan dari output model ke rekomendasi yang actionable.

---

## 3. Desain Metodologi

### 3.1 Unit Analisis

**34 Provinsi Indonesia** — dipilih karena seluruh variabel kunci tersedia dalam format clean dan machine-readable pada level ini.

### 3.2 Arsitektur Data

| Layer | Variabel | Sumber | Format | Granularitas |
|-------|----------|--------|--------|--------------|
| **Target** | Perubahan inflasi YoY per provinsi; Pertumbuhan PDRB kuartalan | BPS (WebAPI + Statistical Tables) | CSV/JSON via API | Bulanan (inflasi), Kuartalan (PDRB) |
| **Shock Variables** | Harga minyak mentah (Brent/Dubai/WTI); Harga komoditas (sawit, nikel, batu bara, timah); Kurs USD/IDR | World Bank Pink Sheet; FRED; Bank Indonesia JISDOR; Yahoo Finance | Excel/CSV download | Bulanan/Harian |
| **Structural Features** | Komposisi PDRB per sektor (17 sektor KBLI); Nilai ekspor per provinsi menurut HS code & negara tujuan; Data ketenagakerjaan per sektor | BPS WebAPI; Publikasi Statistik Ekspor-Impor per Provinsi; Sakernas | CSV/JSON/PDF | Tahunan (PDRB, tenaga kerja), Bulanan (ekspor) |
| **Derived Features** | Herfindahl Index sektoral PDRB; Rasio eksposur ekspor ke AS; Proxy ketergantungan energi (bobot CPI transportasi/BBM); Indeks diversifikasi ekonomi | Dihitung dari data di atas | Computed | Per provinsi |
| **Resilience Proxies** | Tingkat inklusi keuangan per provinsi; Penetrasi e-commerce / transaksi digital; Tingkat kemiskinan & Gini ratio | BPS (SNLIK, Susenas); BI | CSV/Tabel Statistik | Tahunan |

### 3.3 Feature Engineering

Fitur turunan yang akan dihitung dari data mentah:

- **Herfindahl-Hirschman Index (HHI) sektoral** — Mengukur konsentrasi/diversifikasi ekonomi provinsi. HHI tinggi = ekonomi tergantung pada sedikit sektor = lebih rentan.
  
  $$HHI_i = \sum_{s=1}^{S} \left(\frac{PDRB_{i,s}}{PDRB_{i,total}}\right)^2$$

- **US Export Exposure Ratio** — Proporsi nilai ekspor provinsi yang ditujukan ke AS, dibobotkan oleh sektor-sektor yang terkena tarif.

- **Energy Vulnerability Proxy** — Bobot komponen transportasi dan bahan bakar dalam keranjang IHK provinsi, dikombinasikan dengan ada/tidaknya kilang minyak dan pembangkit listrik lokal.

- **Shock Sensitivity Coefficient** — Dari regresi historis: seberapa besar perubahan harga minyak global mentransmisi ke inflasi lokal provinsi tersebut (dihitung sebagai elastisitas pass-through).

  $$\beta_{oil,i} = \frac{\partial \pi_i}{\partial P_{oil}}$$ (estimated via rolling regression)

- **Economic Resilience Score** — Composite dari inklusi keuangan, diversifikasi ekonomi, dan fiscal capacity (rasio PAD terhadap total pendapatan daerah).

### 3.4 Pendekatan Pemodelan

**Tahap 1: Exploratory Data Analysis**
- Visualisasi struktur ekonomi 34 provinsi (radar charts per sektor PDRB)
- Korelasi spasial antara guncangan global dan inflasi regional
- Identifikasi regime changes selama episode krisis historis
- Clustering provinsi berdasarkan profil struktural (K-Means / Hierarchical)

**Tahap 2: Shock Transmission Modeling**
- **Panel Regression / Panel VAR:** Memodelkan bagaimana variabel shock global (harga minyak, kurs, harga komoditas) mentransmisi ke outcome provinsi (inflasi, pertumbuhan PDRB), dengan fitur struktural sebagai moderator/interaksi.
- **Gradient Boosted Trees (XGBoost/LightGBM):** Classification — memprediksi apakah suatu provinsi akan mengalami "economic distress" (didefinisikan sebagai inflasi > threshold ATAU pertumbuhan PDRB < threshold) given a set of shock magnitudes dan structural features. Training pada episode 2008, 2015, 2020; testing pada hold-out.
- **Perbandingan model:** Evaluasi apakah pendekatan ML memberikan predictive power signifikan di atas panel regression tradisional.

**Tahap 3: Vulnerability Index Construction**
- Dari model terbaik, ekstrak feature importance / SHAP values
- Konstruksi indeks komposit tertimbang berdasarkan kontribusi fitur terhadap prediksi distress
- Ranking 34 provinsi dari paling rentan ke paling tahan

**Tahap 4: Scenario Simulation 2026**
- Definisikan 3 skenario:
  - **Base Case:** Hormuz pulih Q3 2026, tarif tetap 19%, Rupiah stabil 17.000
  - **Adverse:** Hormuz berlanjut 2026, Section 301 tarif tambahan, Rupiah 17.500+
  - **Severe:** Semua adverse + MSCI downgrade ke frontier + oil > $100/bbl sustained
- Jalankan model dengan shock variables sesuai skenario, hasilkan vulnerability map per skenario

**Tahap 5: Insight Generation via Azure OpenAI**
- Feed output model (provinsi, skor kerentanan, faktor utama, skenario) ke Azure OpenAI GPT-4o
- Generate policy brief per provinsi dalam Bahasa Indonesia
- Contoh output: *"Provinsi Kalimantan Timur memiliki skor kerentanan 0.82 (tinggi). Faktor utama: konsentrasi ekonomi pada sektor pertambangan (HHI = 0.31) dan eksposur tinggi terhadap harga batu bara global. Pada skenario adverse, inflasi diproyeksikan meningkat 2.3pp. Rekomendasi: akselerasi diversifikasi ke sektor jasa digital dan pariwisata, serta penguatan program bantuan sosial untuk pekerja sektor tambang."*

### 3.5 Metrik Evaluasi

| Aspek | Metrik |
|-------|--------|
| Classification (distress/non-distress) | F1-Score, AUC-ROC, Precision-Recall |
| Regression (magnitude inflasi/PDRB drop) | RMSE, MAE, R² |
| Vulnerability Index | Validasi terhadap outcome aktual krisis historis (Spearman rank correlation antara predicted vulnerability ranking vs actual outcome ranking) |
| Clustering | Silhouette Score, Davies-Bouldin Index |

---

## 4. Pemanfaatan Microsoft Azure

| Komponen | Layanan Azure | Fungsi |
|----------|---------------|--------|
| Data Storage | Azure Blob Storage | Menyimpan dataset mentah dan hasil olahan |
| Model Training | Azure Machine Learning | Experiment tracking, hyperparameter tuning, model registry (opsional — training juga bisa di local/Colab) |
| Explainability | Azure AI — Responsible AI Dashboard | Visualisasi SHAP values dan fairness analysis antar region |
| Insight Generation | Azure OpenAI Service (GPT-4o) | Menghasilkan policy brief per provinsi dalam Bahasa Indonesia dari output model |
| Deployment | Azure App Service / Static Web Apps | Hosting dashboard interaktif vulnerability map |
| Monitoring | Azure Monitor | Logging dan monitoring API calls |

**Catatan:** Azure diposisikan sebagai *platform enabler*, bukan sebagai black box. Core model training dapat dilakukan di environment manapun (local, Kaggle, Colab). Nilai tambah Azure terletak pada integrasi end-to-end: dari penyimpanan data → training → explainability → insight generation → deployment.

---

## 5. Sumber Data (Confirmed Available)

| No | Dataset | Sumber | URL/Akses | Status |
|----|---------|--------|-----------|--------|
| 1 | Inflasi bulanan per kota/provinsi (by expenditure group) | BPS | webapi.bps.go.id + bps.go.id statistical tables | ✅ Tersedia, API gratis |
| 2 | PDRB per provinsi menurut lapangan usaha 2020-2024 | BPS | Publikasi per provinsi + WebAPI | ✅ Tersedia |
| 3 | Ekspor-impor per provinsi menurut HS code & negara tujuan | BPS | WebAPI endpoint `/dataexim` | ✅ Tersedia, API gratis |
| 4 | Kurs USD/IDR harian (JISDOR) | Bank Indonesia | bi.go.id/statistik/informasi-kurs | ✅ Tersedia, time series download |
| 5 | Harga komoditas global (minyak, sawit, nikel, batu bara, timah) | World Bank | Pink Sheet (Excel monthly) | ✅ Tersedia, free download |
| 6 | Commodity price indices | FRED (St. Louis Fed) | fred.stlouisfed.org | ✅ Tersedia, API gratis |
| 7 | Harga minyak Brent harian | Yahoo Finance | finance.yahoo.com (BZ=F) | ✅ Tersedia, CSV download |
| 8 | Tingkat kemiskinan & Gini per provinsi | BPS | bps.go.id | ✅ Tersedia |
| 9 | Data ketenagakerjaan per sektor per provinsi (Sakernas) | BPS | bps.go.id + WebAPI | ✅ Tersedia (annual) |
| 10 | Inklusi keuangan per provinsi (SNLIK) | BPS / OJK | Publikasi survei | ⚠️ Tersedia tapi mungkin hanya snapshot beberapa tahun |

---

## 6. Timeline Eksekusi

| Fase | Aktivitas | Durasi |
|------|-----------|--------|
| **1. Data Collection** | Pull data dari semua sumber, bersihkan, gabungkan ke panel dataset | 2-3 hari |
| **2. EDA & Feature Engineering** | Visualisasi, hitung derived features, identifikasi pola | 2-3 hari |
| **3. Modeling** | Panel regression baseline → ML models → comparison → vulnerability index | 3-4 hari |
| **4. Scenario Simulation** | Definisi skenario, run predictions, generate vulnerability maps | 1-2 hari |
| **5. Azure Integration** | Setup Azure OpenAI, generate policy briefs, deploy dashboard | 2-3 hari |
| **6. Documentation & Polish** | Finalisasi notebook, slide, laporan | 1-2 hari |

---

## 7. Deliverables

1. **Jupyter Notebook** — Lengkap dengan EDA, feature engineering, modeling, dan evaluation
2. **Vulnerability Index Dataset** — Skor kerentanan 34 provinsi dengan breakdown faktor
3. **Interactive Dashboard** — Peta Indonesia interaktif dengan vulnerability scores per skenario
4. **AI-Generated Policy Briefs** — Rekomendasi strategis per provinsi dalam Bahasa Indonesia (via Azure OpenAI)
5. **Technical Report** — Dokumentasi metodologi dan temuan

---

## 8. Alignment dengan Kriteria Penilaian

| Kriteria | Bobot | Bagaimana Proyek Ini Memenuhi |
|----------|-------|-------------------------------|
| **Metodologi & Eksplorasi Data** | 25% | Panel data multi-sumber, derived features (HHI, shock elasticity, exposure ratios), clustering, spatial analysis. EDA yang kaya dengan visualisasi struktur ekonomi regional. |
| **Performa Model & Kualitas Kode** | 25% | Perbandingan panel regression vs tree-based ML. Evaluasi dengan F1, AUC-ROC, RMSE. Validasi historis terhadap crisis episodes. Modular, reproducible code. |
| **Pemanfaatan AI & Azure** | 30% | Azure OpenAI untuk insight generation dalam Bahasa Indonesia. Azure ML untuk experiment tracking. Azure App Service untuk deployment. Responsible AI Dashboard untuk explainability. |
| **Insight & Solusi Strategis** | 20% | Output langsung actionable: peta prioritas intervensi per provinsi, rekomendasi spesifik per profil kerentanan, simulasi skenario yang relevan dengan kondisi geopolitik aktual 2026. |

---

## 9. Diferensiasi & Novelty

- **Timing:** Proyek ini menganalisis krisis yang *sedang terjadi* — bukan retrospektif. Skenario-skenario yang disimulasikan adalah skenario nyata yang sedang dihadapi pemerintah Indonesia saat ini.
- **Granularitas Regional:** Mayoritas analisis makroekonomi Indonesia dilakukan di level nasional. Proyek ini turun ke level provinsi, mengungkap heterogenitas yang tersembunyi di balik angka agregat.
- **Stress-Test Framework:** Pendekatan stress-test lazim digunakan oleh central banks untuk sistem perbankan, tetapi jarang diterapkan untuk ketahanan ekonomi regional/masyarakat. Proyek ini mengadaptasi framework tersebut.
- **Mathematical Rigor:** Dari Herfindahl Index hingga shock pass-through elasticity, proyek ini dibangun di atas fondasi ekonometrik yang solid, bukan hanya "throw data into ML."
