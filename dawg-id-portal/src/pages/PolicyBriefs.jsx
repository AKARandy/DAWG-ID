import { useState } from 'react';
import { vulnerabilityData, SCENARIOS, getByScenario } from '../data/vulnerabilityData';

const MAX_GENERATES = 3;
const STORAGE_KEY = 'policyBriefGenerateCount';

function getGenerateCount() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
}

export default function PolicyBriefs() {
  const [scenario, setScenario] = useState('Adverse');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generateCount, setGenerateCount] = useState(getGenerateCount);

  const limitReached = generateCount >= MAX_GENERATES;

  const provinces = [...new Set(vulnerabilityData.map(d => d.province))].sort();
  const provinceData = vulnerabilityData.find(
    d => d.province === selectedProvince && d.scenario === scenario
  );

  function getRiskLevel(score) {
    if (score > 0.8) return { label: 'Kritis', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🔴' };
    if (score > 0.7) return { label: 'Tinggi', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🟡' };
    return { label: 'Sedang', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '🟢' };
  }

  async function generateBrief() {
    if (!provinceData || limitReached) return;
    setLoading(true);
    setError('');
    setBrief('');

    const prompt = `Kamu adalah analis ekonomi senior yang menganalisis kerentanan ekonomi regional Indonesia terhadap konvergensi guncangan global 2026 (krisis Selat Hormuz, tarif AS, tekanan nilai tukar, ancaman downgrade).

## Data Provinsi: ${provinceData.province}
- Skor Kerentanan: ${provinceData.score.toFixed(3)} (Rank #${provinceData.rank} dari 38 provinsi)
- Skenario: ${scenario}
- HHI Sektoral: ${provinceData.hhi.toFixed(3)}
- Intensitas Ekspor: ${provinceData.export_intensity.toFixed(2)}
- Pangsa Migas: ${(provinceData.migas_share * 100).toFixed(1)}%
- β Minyak: ${provinceData.beta_oil.toFixed(2)}
- β Kurs: ${provinceData.beta_fx.toFixed(2)}
- Resiliensi: ${provinceData.resilience.toFixed(2)}

## Tugas:
Tulis policy brief dalam Bahasa Indonesia (maks 300 kata) yang mencakup:
1. Ringkasan profil kerentanan provinsi ini
2. Faktor risiko utama berdasarkan data di atas
3. Proyeksi dampak pada skenario ${scenario}
4. 2-3 rekomendasi kebijakan yang actionable dan spesifik untuk pemerintah daerah

Gunakan bahasa formal namun mudah dipahami oleh pembuat kebijakan daerah.`;

    try {
      const res = await fetch('/api/policy-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ province: provinceData, scenario }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`API error (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal generate policy brief');
      const content = data.brief || data.choices?.[0]?.message?.content || 'No response generated.';
      setBrief(content);
      const newCount = generateCount + 1;
      localStorage.setItem(STORAGE_KEY, String(newCount));
      setGenerateCount(newCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const risk = provinceData ? getRiskLevel(provinceData.score) : null;

  function renderMarkdown(text) {
    const html = [];
    let inList = false;
    const closeList = () => { if (inList) { html.push('</ul>'); inList = false; } };

    text.split('\n').forEach(raw => {
      let line = raw.trim();
      if (line === '') { closeList(); return; }

      // Markdown headers (## or #)
      if (line.startsWith('#')) {
        closeList();
        const txt = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        html.push(`<h3 style="font-size:0.95rem;font-weight:700;color:var(--text-accent);margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border-subtle)">${txt}</h3>`);
        return;
      }

      // Numbered section heading (e.g. "1. Ringkasan ...")
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        closeList();
        const txt = numMatch[2].replace(/\*\*/g, '');
        html.push(`<h3 style="display:flex;align-items:center;gap:8px;font-size:0.95rem;font-weight:700;color:var(--text-primary);margin:22px 0 10px"><span style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:6px;background:var(--accent-gradient);color:#fff;font-size:0.75rem;font-family:'JetBrains Mono'">${numMatch[1]}</span>${txt}</h3>`);
        return;
      }

      // Inline bold
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>');

      // Bullet list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) { html.push('<ul style="list-style:none;padding:0;margin:8px 0">'); inList = true; }
        html.push(`<li style="display:flex;gap:8px;margin:6px 0"><span style="color:var(--text-accent);flex-shrink:0">▸</span><span>${line.slice(2)}</span></li>`);
        return;
      }

      // Standalone bold line = treat as sub-heading
      const boldOnly = raw.trim().match(/^\*\*(.+)\*\*:?$/);
      if (boldOnly) {
        closeList();
        html.push(`<h3 style="font-size:0.95rem;font-weight:700;color:var(--text-primary);margin:18px 0 8px">${boldOnly[1]}</h3>`);
        return;
      }

      // Normal paragraph
      closeList();
      html.push(`<p style="margin:8px 0;line-height:1.8">${line}</p>`);
    });
    closeList();
    return html.join('');
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>📋 AI-Generated Policy Briefs</h2>
        <p className="page-desc">Rekomendasi kebijakan strategis per provinsi — powered by Azure AI Foundry (GPT-4.1-mini)</p>
      </div>

      {/* Input Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🎯</div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Pilih Provinsi & Skenario</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Pilih provinsi untuk menghasilkan policy brief berbasis AI</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Provinsi</label>
            <select
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', transition: 'border 0.2s' }}
            >
              <option value="">— Pilih Provinsi —</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Skenario</label>
            <div className="scenario-tabs" style={{ marginBottom: 0 }}>
              {SCENARIOS.map(s => (
                <button key={s} className={`scenario-tab ${scenario === s ? 'active' : ''}`} onClick={() => setScenario(s)}>{s}</button>
              ))}
            </div>
          </div>
          <button
            onClick={generateBrief}
            disabled={!selectedProvince || loading || limitReached}
            style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: selectedProvince && !loading && !limitReached ? 'var(--accent-gradient)' : 'var(--border-subtle)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: selectedProvince && !loading && !limitReached ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: selectedProvince && !loading && !limitReached ? '0 4px 15px rgba(249,115,22,0.3)' : 'none' }}
          >
            {loading ? '⏳ Generating...' : limitReached ? '🚫 Limit Tercapai' : '🤖 Generate Brief'}
          </button>
        </div>
        {limitReached && (
          <p style={{ marginTop: 12, fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
            ⚠️ Anda telah mencapai batas maksimal {MAX_GENERATES}x generate policy brief.
          </p>
        )}
        {!limitReached && (
          <p style={{ marginTop: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Sisa generate: {MAX_GENERATES - generateCount}/{MAX_GENERATES}
          </p>
        )}
      </div>

      {/* Province Profile Card */}
      {provinceData && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: risk.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{risk.icon}</div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{provinceData.province}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Rank #{provinceData.rank} dari 38 provinsi • Skenario {scenario}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: risk.color }}>{provinceData.score.toFixed(3)}</div>
              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: risk.bg, color: risk.color, fontWeight: 600 }}>{risk.label}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {[
              { label: 'HHI Sektoral', value: provinceData.hhi.toFixed(3), icon: '📊' },
              { label: 'Exp. Intensity', value: provinceData.export_intensity.toFixed(1), icon: '🚢' },
              { label: 'Pangsa Migas', value: `${(provinceData.migas_share * 100).toFixed(1)}%`, icon: '⛽' },
              { label: 'β Minyak', value: provinceData.beta_oil.toFixed(2), icon: '🛢️', color: provinceData.beta_oil > 0 ? '#f87171' : '#4ade80' },
              { label: 'β Kurs', value: provinceData.beta_fx.toFixed(2), icon: '💱', color: provinceData.beta_fx > 0 ? '#f87171' : '#4ade80' },
              { label: 'Resiliensi', value: provinceData.resilience.toFixed(2), icon: '🛡️', color: provinceData.resilience > 0 ? '#4ade80' : '#f87171' },
            ].map(s => (
              <div key={s.label} style={{ padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Animation */}
      {loading && (
        <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12, animation: 'pulse 1.5s infinite' }}>🤖</div>
          <p style={{ color: 'var(--text-accent)', fontWeight: 600, fontSize: '0.9rem' }}>Generating policy brief...</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>AI sedang menganalisis profil kerentanan {selectedProvince}</p>
          <div style={{ marginTop: 16, height: 3, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '60%', background: 'var(--accent-gradient)', borderRadius: 4, animation: 'loading 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid #ef4444', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Gagal Generate</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '4px 0 0' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {brief && !loading && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>✨</div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Policy Brief — {selectedProvince}</h3>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: '0.6rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>AI GENERATED</span>
                  <span style={{ fontSize: '0.6rem', background: 'rgba(249,115,22,0.15)', color: '#fb923c', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{scenario}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(brief)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer' }}
            >
              📋 Copy
            </button>
          </div>

          <div
            dangerouslySetInnerHTML={{ __html: renderMarkdown(brief) }}
            style={{ padding: 24, background: 'var(--bg-primary)', borderRadius: 12, fontSize: '0.85rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}
          />

          <div style={{ marginTop: 16, display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>🤖 Model: GPT-4.1-mini</span>
            <span>•</span>
            <span>📍 {selectedProvince}</span>
            <span>•</span>
            <span>📊 Skor: {provinceData?.score.toFixed(3)}</span>
          </div>
        </div>
      )}

      {/* Pipeline description */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>⚙️</div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Pipeline AI</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Bagaimana policy brief dihasilkan</p>
          </div>
        </div>
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
            <h4>Azure AI Foundry — GPT-4.1-mini</h4>
            <p>Generate policy brief dalam Bahasa Indonesia yang actionable dan spesifik per profil kerentanan.</p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h4>Output</h4>
            <p>Policy brief ditampilkan dengan konteks data provinsi dan tombol copy untuk kemudahan distribusi.</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
