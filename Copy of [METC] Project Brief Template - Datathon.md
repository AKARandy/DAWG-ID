---

### **Informasi Peserta**

| No | Nama | Email Dicoding |
| :---: | :---: | :---: |
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |

* ### **Topik : Ekonomi Digital & Inklusi Keuangan**

* ### **Ringkasan Eksekutif**

Indonesia pada tahun 2026 menghadapi konvergensi guncangan eksternal yang belum pernah terjadi sebelumnya. Krisis Selat Hormuz akibat konflik Iran mengganggu jalur pelayaran minyak global—IEA menyebutnya gangguan pasokan terbesar dalam sejarah pasar minyak. Bersamaan, Indonesia menghadapi tarif AS 19% melalui investigasi Section 301 yang mengancam sektor tekstil, alas kaki, elektronik, karet, dan sawit; Rupiah mendekati rekor terendah Rp 17.200/USD; serta ancaman downgrade dari Moody's dan Fitch yang membekukan review pasar modal Indonesia.

**Problem Statement:** Analisis makroekonomi Indonesia umumnya dilakukan di level nasional, menyembunyikan heterogenitas kerentanan antar daerah. Ketika sumber daya pemerintah terbatas, diperlukan peta yang jelas: provinsi mana yang paling rentan, dan intervensi apa yang tepat sasaran?

**Research Questions:** (1) Fitur struktural apa yang paling menentukan kerentanan provinsi terhadap guncangan eksternal? (2) Kluster kerentanan apa yang terbentuk dari 34 provinsi? (3) Pada skenario adverse 2026, provinsi mana yang memerlukan intervensi prioritas?

**Mengapa proyek ini?** SHIELD-ID menganalisis krisis yang *sedang berlangsung*, bukan retrospektif. Dengan mengadaptasi stress-test framework yang lazim digunakan bank sentral ke level ketahanan ekonomi regional, proyek ini menghasilkan Vulnerability Index yang actionable: ranking 34 provinsi berdasarkan eksposur struktural terhadap guncangan nyata 2026, dilengkapi rekomendasi kebijakan per provinsi dalam Bahasa Indonesia yang dihasilkan oleh Azure OpenAI GPT-4o.

* ### **Deskripsi Project**

**SHIELD-ID** *(Shock & Hazard Index for Economic Livelihood Diagnostics — Indonesia)* adalah platform analitik berbasis data yang membangun indeks kerentanan ekonomi komposit untuk **34 provinsi Indonesia** terhadap guncangan makro eksternal.

Produk ini menggabungkan tiga lapisan utama:
1. **Data Layer** — pipeline otomatis yang mengintegrasikan data dari BPS WebAPI, World Bank Pink Sheet, FRED, Yahoo Finance, dan Bank Indonesia ke dalam satu panel dataset bersih.
2. **Modeling Layer** — pemodelan ekonometrik (Panel Regression) dan machine learning (XGBoost/LightGBM) untuk memprediksi risiko distress ekonomi per provinsi, diperkuat dengan SHAP values untuk explainability.
3. **Insight Layer** — Azure OpenAI GPT-4o menghasilkan policy brief per provinsi dalam Bahasa Indonesia, ditampilkan melalui dashboard interaktif peta kerentanan dengan tiga skenario 2026.

SHIELD-ID menyelesaikan masalah ketiadaan alat diagnostik regional yang mampu secara kuantitatif membandingkan kerentanan ekonomi 34 provinsi secara simultan, sehingga alokasi sumber daya fiskal dan program perlindungan sosial dapat dilakukan lebih tepat sasaran.

* ### **Fitur Utama dan Teknologi yang Digunakan**

**Fitur Utama:**

* **Pipeline Data Multi-Sumber** — Pengunduhan otomatis dari BPS WebAPI (inflasi, PDRB, ekspor, kemiskinan, ketenagakerjaan), World Bank Pink Sheet (harga komoditas), FRED API (indeks harga global), Yahoo Finance (minyak harian, USD/IDR), dan Bank Indonesia (kurs JISDOR).
* **Feature Engineering Ekonometrik** — Perhitungan Herfindahl-Hirschman Index (HHI) sektoral per provinsi sebagai ukuran konsentrasi ekonomi; Rasio Eksposur Ekspor ke AS berbobot tarif Section 301; Proxy Kerentanan Energi berbasis bobot CPI transportasi/BBM; Shock Sensitivity Coefficient via rolling regression elastisitas pass-through harga minyak ke inflasi lokal.
* **Pemodelan Vulnerability** — Panel Regression sebagai baseline; XGBoost/LightGBM untuk klasifikasi risiko distress ekonomi (inflasi > threshold ATAU pertumbuhan PDRB < threshold); validasi historis terhadap GFC 2008, commodity bust 2015, dan COVID-19 2020.
* **Vulnerability Index Komposit** — Ranking 34 provinsi dari paling rentan ke paling tahan, berbasis feature importance dan SHAP values dari model terbaik.
* **Simulasi Skenario 2026** — Tiga skenario (Base Case: Hormuz pulih Q3 2026; Adverse: Hormuz berlanjut + tarif tambahan + Rupiah 17.500+; Severe: semua adverse + MSCI downgrade + minyak >$100/bbl) menghasilkan vulnerability map per skenario.
* **AI Policy Briefs** — Azure OpenAI GPT-4o menghasilkan rekomendasi strategis per provinsi dalam Bahasa Indonesia berdasarkan output model (skor kerentanan, faktor utama, proyeksi per skenario).
* **Dashboard Interaktif** — Peta Indonesia dengan color-coding skor kerentanan per provinsi, dapat difilter per skenario; di-hosting via Azure App Service.
* **Explainability** — Azure Responsible AI Dashboard untuk visualisasi SHAP values dan analisis fairness antar region.

**Teknologi yang Digunakan:**

* **Bahasa & Library:** Python, Pandas, NumPy, Scikit-learn, XGBoost, LightGBM, Statsmodels, Matplotlib, Plotly
* **Platform Cloud:** Microsoft Azure (Blob Storage, Azure Machine Learning, Azure OpenAI Service, Azure App Service, Azure Monitor)
* **Data Sources:** BPS WebAPI, World Bank Commodity Price Data, FRED (St. Louis Fed), Yahoo Finance, Bank Indonesia
* **Development:** Jupyter Notebook, Git

* ### **Cara Penggunaan Product**

**Alur Penggunaan:**

1. **Pengumpulan Data** — Jalankan `python collect_data.py` untuk mengunduh semua dataset secara otomatis. Sumber tanpa API key (World Bank, Yahoo Finance) berjalan langsung; BPS dan FRED memerlukan key gratis yang dapat didaftarkan dalam 5 menit.

2. **Eksplorasi Data & Feature Engineering** — Buka `01_data_collection.ipynb` lalu lanjutkan ke notebook EDA. Notebook menampilkan radar charts struktur ekonomi 34 provinsi, korelasi spasial guncangan global terhadap inflasi regional, dan clustering provinsi berdasarkan profil struktural.

3. **Pelatihan Model** — Jalankan notebook modeling untuk melatih Panel Regression baseline → XGBoost/LightGBM → konstruksi Vulnerability Index. Evaluasi dengan F1-Score, AUC-ROC, dan validasi Spearman rank correlation terhadap outcome krisis historis.

4. **Simulasi Skenario 2026** — Input parameter tiga skenario (Base / Adverse / Severe) dan model menghasilkan vulnerability map per skenario dengan proyeksi inflasi dan pertumbuhan PDRB per provinsi.

5. **Akses Dashboard** — Buka dashboard interaktif di browser untuk melihat peta kerentanan Indonesia. Klik provinsi untuk melihat skor kerentanan, faktor utama, dan proyeksi per skenario.

6. **Baca Policy Brief** — Setiap provinsi memiliki policy brief dalam Bahasa Indonesia yang dihasilkan Azure OpenAI, berisi: skor kerentanan, faktor utama, proyeksi skenario, dan rekomendasi strategis yang actionable.

> *Demo kredensial dan link prototipe akan tersedia setelah deployment ke Azure App Service.*

* ### **Informasi Pendukung \[Opsional\]**

**Stack Teknologi Lengkap:**

| Komponen | Layanan/Tool | Fungsi |
| :--- | :--- | :--- |
| Data Storage | Azure Blob Storage | Menyimpan dataset mentah dan hasil olahan |
| Model Training | Azure Machine Learning | Experiment tracking, hyperparameter tuning, model registry |
| Explainability | Azure Responsible AI Dashboard | Visualisasi SHAP values dan fairness analysis antar region |
| Insight Generation | Azure OpenAI (GPT-4o) | Policy brief per provinsi dalam Bahasa Indonesia |
| Deployment | Azure App Service | Hosting dashboard interaktif vulnerability map |
| Monitoring | Azure Monitor | Logging dan monitoring API calls |

**Sumber Data:**

| Dataset | Sumber | Granularitas |
| :--- | :--- | :--- |
| Inflasi bulanan per provinsi | BPS WebAPI | Bulanan |
| PDRB per provinsi per sektor | BPS WebAPI | Kuartalan/Tahunan |
| Ekspor-impor per provinsi (HS code) | BPS WebAPI | Bulanan |
| Kemiskinan & Gini ratio | BPS | Tahunan |
| Ketenagakerjaan per sektor (Sakernas) | BPS WebAPI | Tahunan |
| Harga komoditas global (minyak, sawit, nikel, batu bara, timah) | World Bank Pink Sheet | Bulanan |
| Indeks komoditas & kurs | FRED API | Harian/Bulanan |
| Harga minyak Brent/WTI harian | Yahoo Finance | Harian |
| Kurs USD/IDR harian | Yahoo Finance / Bank Indonesia | Harian |

**Rencana Pengembangan:**

* Integrasi data real-time untuk early warning system berbasis guncangan harga komoditas
* Perluasan analisis ke level kabupaten/kota (Tier 2)
* API endpoint terbuka untuk integrasi dengan sistem perencanaan pemerintah daerah
* Pembaruan otomatis skor kerentanan setiap bulan menggunakan Azure Scheduler
