**DAWG-ID**

Dynamic Assessment of Weakness and Growth

*Indonesia*

*Project Brief — Datathon METC 2026*

**Informasi Peserta**

| **No** | **Nama** | **Email Dicoding** |
|--------|----------|--------------------|
| 1      |          |                    |
| 2      |          |                    |
| 3      |          |                    |

> **Topik :** Ekonomi Digital & Inklusi Keuangan

**Ringkasan Eksekutif**

Indonesia pada tahun 2026 menghadapi konvergensi guncangan eksternal yang belum pernah terjadi sebelumnya. Krisis Selat Hormuz akibat konflik Iran mengganggu jalur pelayaran minyak global, IEA menyebutnya gangguan pasokan terbesar dalam sejarah pasar minyak. Bersamaan, Indonesia menghadapi tarif AS 19% melalui investigasi Section 301 yang mengancam sektor tekstil, alas kaki, elektronik, karet, dan sawit; Rupiah mendekati rekor terendah Rp 17.200/USD; serta ancaman downgrade dari Moody’s dan Fitch yang membekukan review pasar modal Indonesia.

**Problem Statement:** Analisis makroekonomi Indonesia umumnya dilakukan di level nasional, menyembunyikan heterogenitas kerentanan antar daerah. Ketika sumber daya pemerintah terbatas, diperlukan peta yang jelas: provinsi mana yang paling rentan, dan intervensi apa yang tepat sasaran?

**Research Questions:** (1) Fitur struktural apa yang paling menentukan kerentanan provinsi terhadap guncangan eksternal? (2) Kluster kerentanan apa yang terbentuk dari 38 provinsi? (3) Pada skenario adverse 2026, provinsi mana yang memerlukan intervensi prioritas?

**Mengapa proyek ini?** DAWG-ID menganalisis krisis yang *sedang berlangsung*, bukan retrospektif. Dengan mengadaptasi stress-test framework yang lazim digunakan bank sentral ke level ketahanan ekonomi regional, proyek ini menghasilkan Vulnerability Index yang actionable: ranking 38 provinsi berdasarkan eksposur struktural terhadap guncangan nyata 2026, dilengkapi rekomendasi kebijakan per provinsi dalam Bahasa Indonesia yang dihasilkan oleh Azure OpenAI GPT-4o.

**Deskripsi Project**

**DAWG-ID** *(Dynamic Assessment of Weakness and Growth — Indonesia)* adalah platform analitik berbasis data yang membangun indeks kerentanan ekonomi komposit untuk **38 provinsi Indonesia** terhadap guncangan makro eksternal.

Produk ini menggabungkan tiga lapisan utama:

1.  **Data Layer:** Pipeline otomatis yang mengintegrasikan data dari BPS WebAPI, World Bank Pink Sheet, FRED, Yahoo Finance, dan Bank Indonesia ke dalam satu panel dataset bersih.

2.  **Modeling Layer:** Pemodelan ekonometrik (Panel Regression) dan machine learning untuk memprediksi risiko distress ekonomi per provinsi.

3.  **Insight Layer:** Menghasilkan policy brief per provinsi dalam Bahasa Indonesia dengan *LLM*, ditampilkan melalui dashboard interaktif peta kerentanan dengan tiga skenario 2026.

DAWG-ID menyelesaikan masalah ketiadaan alat diagnostik regional yang mampu secara kuantitatif membandingkan kerentanan ekonomi 38 provinsi secara simultan, sehingga alokasi sumber daya fiskal dan program perlindungan sosial dapat dilakukan lebih tepat sasaran.

**Fitur Utama dan Teknologi yang Digunakan**

**Fitur Utama:**

- **Pipeline Data Multi-Sumber** : Pengunduhan otomatis dari BPS WebAPI, World Bank Pink Sheet, FRED API, Yahoo Finance, dan Bank Indonesia.

- **Feature Engineering Ekonometrik** : Herfindahl-Hirschman Index (HHI) sektoral; Rasio Eksposur Ekspor ke AS berbobot tarif Section 301; Proxy Kerentanan Energi berbasis CPI transportasi/BBM; Shock Sensitivity Coefficient via rolling regression.

- **Pemodelan Vulnerability** : Panel Regression baseline; XGBoost/LightGBM untuk klasifikasi distress ekonomi; validasi historis terhadap GFC 2008, commodity bust 2015, dan COVID-19 2020.

- **Vulnerability Index Komposit** : Ranking 38 provinsi dari paling rentan ke paling tahan, berbasis feature importance dan SHAP values dari model terbaik.

- **Simulasi Skenario 2026** : Tiga skenario (Base Case, Adverse, Severe) menghasilkan vulnerability map per skenario dengan proyeksi inflasi dan pertumbuhan PDRB.

- **AI Policy Briefs** : LLM menghasilkan rekomendasi strategis per provinsi dalam Bahasa Indonesia berdasarkan output model.

- **Dashboard Interaktif** : Peta Indonesia dengan color-coding skor kerentanan per provinsi, difilter per skenario; hosting via Azure App Service.

- **Explainability** : Visualisasi dan analisis fairness antar region.

**Teknologi yang Digunakan:**

- **Bahasa & Library:** Python, Pandas, NumPy, Scikit-learn, XGBoost, LightGBM, Statsmodels, Matplotlib, Plotly

- **Sumber Data:** BPS WebAPI, World Bank Pink Sheet, FRED (St. Louis Fed), Yahoo Finance, Bank Indonesia

- **Development:** Jupyter Notebook, Python 3, Git

**Cara Penggunaan Product**

**Alur Penggunaan:**

1.  **Pengumpulan Data** : Mengunduh semua dataset secara otomatis. Sumber tanpa API key (World Bank, Yahoo Finance) berjalan langsung; BPS dan FRED memerlukan key gratis yang dapat didaftarkan dalam 5 menit.

2.  **EDA & Feature Engineering** : Menampilkan radar charts struktur ekonomi 38 provinsi, korelasi spasial guncangan global terhadap inflasi regional, dan clustering provinsi.

3.  **Pelatihan Model** : Jalankan notebook modeling: Panel Regression baseline → XGBoost/LightGBM → Vulnerability Index. Evaluasi dengan F1-Score, AUC-ROC, dan validasi Spearman rank correlation terhadap outcome krisis historis.

4.  **Simulasi Skenario 2026** : Input parameter tiga skenario (Base / Adverse / Severe) dan model menghasilkan vulnerability map per skenario dengan proyeksi inflasi dan pertumbuhan PDRB per provinsi.

5.  **Akses Dashboard** : Buka dashboard interaktif di browser, lihat peta kerentanan Indonesia. Klik provinsi untuk melihat skor kerentanan, faktor utama, dan proyeksi per skenario.

6.  **Baca Policy Brief** : Setiap provinsi memiliki policy brief Bahasa Indonesia dari LLM berisi: skor kerentanan, faktor utama, proyeksi skenario, dan rekomendasi strategis.

> *Demo kredensial dan link prototipe akan tersedia setelah deployment ke Azure App Service.*

**Informasi Pendukung**

**Stack Teknologi Lengkap:**

| **Komponen** | **Layanan / Tool** | **Fungsi** |
|----|----|----|
| Data Storage | Azure Blob Storage | Menyimpan dataset mentah dan hasil olahan |
| Model Training | Azure Machine Learning | Experiment tracking, hyperparameter tuning, model registry |
| Explainability | Azure Responsible AI Dashboard | Visualisasi SHAP values dan fairness analysis antar region |
| Insight Generation | LLM | Policy brief per provinsi dalam Bahasa Indonesia |
| Deployment | Azure App Service | Hosting dashboard interaktif vulnerability map |
| Monitoring | Azure Monitor | Logging dan monitoring API calls |

**Sumber Data:**

| **Dataset** | **Sumber** | **Granularitas** |
|----|----|----|
| Inflasi bulanan per provinsi | BPS WebAPI | Bulanan |
| PDRB per provinsi per sektor (17 sektor KBLI) | BPS WebAPI | Kuartalan / Tahunan |
| Ekspor-impor per provinsi (HS code & negara tujuan) | BPS WebAPI | Bulanan |
| Tingkat kemiskinan & Gini ratio | BPS | Tahunan |
| Ketenagakerjaan per sektor per provinsi (Sakernas) | BPS WebAPI | Tahunan |
| Harga komoditas global (minyak, sawit, nikel, batu bara, timah) | World Bank Pink Sheet | Bulanan |
| Indeks komoditas & kurs USD/IDR | FRED API (St. Louis Fed) | Harian / Bulanan |
| Harga minyak Brent & WTI harian | Yahoo Finance | Harian |
| Kurs USD/IDR harian | Yahoo Finance / Bank Indonesia | Harian |
