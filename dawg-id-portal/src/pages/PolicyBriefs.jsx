import { useState } from 'react';
import { vulnerabilityData, SCENARIOS, getByScenario } from '../data/vulnerabilityData';

export default function PolicyBriefs() {
  const [scenario, setScenario] = useState('Adverse');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const provinces = [...new Set(vulnerabilityData.map(d => d.province))].sort();
  const provinceData = vulnerabilityData.find(
    d => d.province === selectedProvince && d.scenario === scenario
  );

  async function generateBrief() {
    if (!provinceData) return;
    setLoading(true);
    setError('');
    setBrief('');

    try {
      const res = await fetch('/api/policy-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ province: provinceData, scenario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal generate policy brief');
      setBrief(data.brief);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>📋 AI-Generated Policy Briefs</h2>
        <p className="page-desc">Rekomendasi strategis per provinsi menggunakan Microsoft Foundry Phi-4-mini</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>🎯 Generate Policy Brief</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Provinsi</label>
            <select
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="">— Pilih Provinsi —</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Skenario</label>
            <div className="scenario-tabs" style={{ marginBottom: 0 }}>
              {SCENARIOS.map(s => (
                <button key={s} className={`scenario-tab ${scenario === s ? 'active' : ''}`} onClick={() => setScenario(s)}>{s}</button>
              ))}
            </div>
          </div>
          <button
            onClick={generateBrief}
            disabled={!selectedProvince || loading}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: selectedProvince && !loading ? 'var(--accent-gradient)' : 'var(--border-subtle)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: selectedProvince && !loading ? 'pointer' : 'not-allowed' }}
          >
            {loading ? '⏳ Generating...' : '🤖 Generate'}
          </button>
        </div>

        {/* Province quick stats */}
        {provinceData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
            {[
              { label: 'Skor', value: provinceData.score.toFixed(3), color: provinceData.score > 0.8 ? '#ef4444' : provinceData.score > 0.7 ? '#f59e0b' : '#22c55e' },
              { label: 'Rank', value: `#${provinceData.rank}` },
              { label: 'HHI', value: provinceData.hhi.toFixed(3) },
              { label: 'β Oil', value: provinceData.beta_oil.toFixed(2) },
              { label: 'β FX', value: provinceData.beta_fx.toFixed(2) },
              { label: 'Resiliensi', value: provinceData.resilience.toFixed(2) },
            ].map(s => (
              <div key={s.label} style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: s.color || 'var(--text-accent)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid #ef4444' }}>
          <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>❌ {error}</p>
        </div>
      )}

      {/* Result */}
      {brief && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: '0.7rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>AI GENERATED</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Policy Brief — {selectedProvince}</h3>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ padding: '6px 12px', background: 'var(--bg-primary)', borderRadius: 8, fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Skenario: </span>
              <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{scenario}</span>
            </div>
            <div style={{ padding: '6px 12px', background: 'var(--bg-primary)', borderRadius: 8, fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Skor: </span>
              <span style={{ color: '#f59e0b', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{provinceData?.score.toFixed(3)}</span>
            </div>
          </div>
          <div style={{ padding: 20, background: 'var(--bg-primary)', borderRadius: 8, borderLeft: '3px solid var(--accent-1)', whiteSpace: 'pre-line', fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            {brief}
          </div>
        </div>
      )}

      {/* Pipeline description */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📐 Pipeline AI</h3>
        <div className="method-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Data Input</h4>
            <p>Skor kerentanan, rank, dan breakdown fitur per provinsi dari vulnerability index model.</p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Prompt Engineering</h4>
            <p>Structured prompt dengan konteks ekonomi provinsi, faktor risiko utama, dan parameter skenario.</p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h4>Microsoft Foundry — Phi-4-mini-instruct</h4>
            <p>Generate policy brief dalam Bahasa Indonesia yang actionable dan spesifik per profil kerentanan.</p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h4>Output</h4>
            <p>Policy brief ditampilkan langsung di halaman ini dengan konteks data provinsi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
