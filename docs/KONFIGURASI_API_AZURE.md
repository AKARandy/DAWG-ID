# Konfigurasi API Azure — DAWG-ID

## Dimana Mengisi API Azure?

Ada **2 lokasi** konfigurasi API di proyek ini:

---

## 1. Azure Foundry (Phi-4-mini-instruct) — untuk Policy Briefs

### Lokasi File:
```
dawg-id-portal/.env
```

### Cara Setup:

1. **Copy template:**
   ```bash
   cd dawg-id-portal
   cp .env.example .env
   ```

2. **Isi file `.env` dengan kredensial Anda:**
   ```env
   FOUNDRY_ENDPOINT=https://your-project.models.ai.azure.com
   FOUNDRY_API_KEY=your-api-key-here
   ```

3. **Cara mendapatkan kredensial:**
   - Buka https://ai.azure.com
   - Pilih/buat Project
   - Pergi ke **Deployments** → Deploy model **Phi-4-mini-instruct**
   - Salin **Endpoint URL** dan **API Key** dari halaman deployment

### Dimana Digunakan:
File `dawg-id-portal/api/policy-brief.js` membaca environment variables ini:
```javascript
const endpoint = process.env.FOUNDRY_ENDPOINT;
const apiKey = process.env.FOUNDRY_API_KEY;
```

### Untuk Deployment di Vercel:
- Buka Vercel Dashboard → Project Settings → Environment Variables
- Tambahkan:
  - `FOUNDRY_ENDPOINT` = endpoint URL Anda
  - `FOUNDRY_API_KEY` = API key Anda

---

## 2. API Keys Python (BPS & FRED) — untuk Data Collection

### Lokasi File:
```
config.py
```

### Cara Setup:
Edit `config.py` di root proyek:
```python
BPS_API_KEY = "isi-key-bps-anda-disini"
FRED_API_KEY = "isi-key-fred-anda-disini"
```

### Cara mendapatkan:
- **BPS:** Daftar gratis di https://webapi.bps.go.id/developer/register
- **FRED:** Daftar gratis di https://fred.stlouisfed.org/docs/api/api_key.html

---

## Ringkasan Cepat

| API | File Konfigurasi | Variable |
|-----|-----------------|----------|
| Azure Foundry (AI) | `dawg-id-portal/.env` | `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY` |
| BPS (Statistik Indonesia) | `config.py` | `BPS_API_KEY` |
| FRED (Federal Reserve) | `config.py` | `FRED_API_KEY` |

---

## ⚠️ Catatan Penting

- File `.env` **TIDAK** boleh di-commit ke Git (sudah ada di `.gitignore`)
- Untuk production/Vercel, set environment variables melalui dashboard Vercel
- Tanpa `FOUNDRY_ENDPOINT` dan `FOUNDRY_API_KEY`, fitur Policy Briefs akan menampilkan error "Foundry API not configured"
