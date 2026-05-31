import { useState } from 'react';

const FEATURE_FIELDS = [
  { key: 'hhi_sectoral', label: 'HHI Sektoral', desc: 'Konsentrasi ekonomi (0-1)', placeholder: '0.290' },
  { key: 'export_intensity', label: 'Intensitas Ekspor', desc: 'Rasio ekspor/PDRB', placeholder: '5.0' },
  { key: 'migas_share', label: 'Pangsa Migas', desc: 'Proporsi sektor migas (0-1)', placeholder: '0.05' },
  { key: 'resilience', label: 'Resiliensi', desc: 'Komposit ketahanan', placeholder: '0.3' },
  { key: 'd_log_brent', label: 'Δ Log Brent', desc: 'Perubahan log harga Brent', placeholder: '0.02' },
  { key: 'd_log_usd_idr', label: 'Δ Log USD/IDR', desc: 'Perubahan log kurs', placeholder: '0.01' },
  { key: 'd_log_wti', label: 'Δ Log WTI', desc: 'Perubahan log harga WTI', placeholder: '0.02' },
  { key: 'd_log_coal', label: 'Δ Log Coal', desc: 'Perubahan log harga batubara', placeholder: '0.01' },
  { key: 'd_log_palm_oil', label: 'Δ Log Palm Oil', desc: 'Perubahan log harga sawit', placeholder: '0.005' },
  { key: 'd_log_nickel', label: 'Δ Log Nickel', desc: 'Perubahan log harga nikel', placeholder: '-0.01' },
  { key: 'd_log_tin', label: 'Δ Log Tin', desc: 'Perubahan log harga timah', placeholder: '0.0' },
  { key: 'migas_share_x_d_log_brent', label: 'Migas × Δ Brent', desc: 'Interaksi migas & Brent', placeholder: '0.001' },
  { key: 'export_intensity_x_d_log_usd_idr', label: 'Export × Δ Kurs', desc: 'Interaksi ekspor & kurs', placeholder: '0.05' },
  { key: 'resilience_x_d_log_usd_idr', label: 'Resiliensi × Δ Kurs', desc: 'Interaksi resiliensi & kurs', placeholder: '0.003' },
];

export default function Predict() {
  const [formData, setFormData] = useState(
    Object.fromEntries(FEATURE_FIELDS.map(f => [f.key, '']))
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const payload = {};
    for (const f of FEATURE_FIELDS) {
      const val = parseFloat(formData[f.key]);
      if (isNaN(val)) {
        setError(`Field "${f.label}" harus berupa angka`);
        setLoading(false);
        return;
      }
      payload[f.key] = val;
    }

    try {
      // === LOCAL DEV: gunakan Azure OpenAI untuk simulasi prediksi ===
      const endpoint = import.meta.env.VITE_FOUNDRY_ENDPOINT;
      const apiKey = import.meta.env.VITE_FOUNDRY_API_KEY;
      const deploymentName = import.meta.env.VITE_DEPLOYMENT_NAME || 'gpt-4.1-mini';

      if (!endpoint || !apiKey) {
        throw new Error('Set VITE_FOUNDRY_ENDPOINT dan VITE_FOUNDRY_API_KEY di file .env');
      }

      const prompt = `Kamu adalah model klasifikasi inflation distress. Berdasarkan fitur berikut, tentukan apakah provinsi ini berisiko inflasi tinggi (top quartile).

Data: ${JSON.stringify(payload)}

Jawab HANYA dalam format JSON berikut (tanpa markdown):
{"distress": 0 atau 1, "probability": angka 0-1, "label": "High Inflation Risk" atau "Normal"}`;

      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          model: deploymentName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 0,
        }),
      });

      // === PRODUCTION (Vercel + Azure ML): uncomment ini dan comment blok di atas ===
      // const res = await fetch('/api/predict', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ input_data: payload }),
      // });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`API error (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data.error) || 'Prediction failed');
      
      // Parse response dari Azure OpenAI
      const content = data.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(content);
      setResult(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillExample() {
    setFormData({
      hhi_sectoral: '0.303',
      export_intensity: '14.83',
      migas_share: '0.098',
      resilience: '0.63',
      d_log_brent: '0.04',
      d_log_usd_idr: '0.02',
      d_log_wti: '0.035',
      d_log_coal: '0.01',
      d_log_palm_oil: '0.005',
      d_log_nickel: '-0.02',
      d_log_tin: '0.0',
      migas_share_x_d_log_brent: '0.004',
      export_intensity_x_d_log_usd_idr: '0.297',
      resilience_x_d_log_usd_idr: '0.013',
    });
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>🤖 Inflation Distress Prediction</h2>
        <p className="page-desc">Prediksi risiko inflasi tinggi per provinsi menggunakan Decision Tree model (Azure ML)</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>📊 Input Features</h3>
            <button
              type="button"
              onClick={fillExample}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-accent)', background: 'transparent', color: 'var(--text-accent)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Isi Contoh (Kaltim)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {FEATURE_FIELDS.map(f => (
              <div key={f.key} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {f.label}
                </label>
                <input
                  type="text"
                  value={formData[f.key]}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'JetBrains Mono', outline: 'none' }}
                />
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 20, padding: '12px 32px', borderRadius: 8, border: 'none', background: loading ? 'var(--border-subtle)' : 'var(--accent-gradient)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}
          >
            {loading ? '⏳ Predicting...' : '🚀 Predict Inflation Distress'}
          </button>
        </div>
      </form>

      {error && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid #ef4444' }}>
          <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginBottom: 24, borderLeft: `3px solid ${result.distress ? '#ef4444' : '#22c55e'}` }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📋 Hasil Prediksi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Status</div>
              <div style={{ fontSize: '1.5rem' }}>{result.distress ? '🔴' : '🟢'}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: result.distress ? '#ef4444' : '#22c55e', marginTop: 4 }}>
                {result.label}
              </div>
            </div>
            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Probabilitas Distress</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-accent)' }}>
                {(result.probability * 100).toFixed(1)}%
              </div>
            </div>
            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Klasifikasi</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>
                {result.distress ? 'Inflasi MoM diprediksi masuk top quartile' : 'Inflasi MoM diprediksi normal'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>ℹ️ Tentang Model</h3>
        <table className="data-table">
          <tbody>
            <tr><td style={{ fontWeight: 600 }}>Model</td><td>Decision Tree Classifier</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Platform</td><td>Azure Machine Learning</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Accuracy</td><td>70.2%</td></tr>
            <tr><td style={{ fontWeight: 600 }}>F1 Score</td><td>0.595</td></tr>
            <tr><td style={{ fontWeight: 600 }}>ROC-AUC</td><td>0.773</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Recall</td><td>86.2%</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Target</td><td>Inflasi MoM ≥ top 25% (threshold: 0.39%)</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
