import { useState, useEffect, useRef } from 'react';
import { getByScenario, getTop10, SCENARIOS, BPS_TO_GEOJSON } from '../data/vulnerabilityData';

function BarChart({ data, maxScore = 1 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((row, i) => {
        const pct = (row.score / maxScore) * 100;
        const color = row.score > 0.85 ? '#ef4444' : row.score > 0.75 ? '#f97316' : row.score > 0.65 ? '#fbbf24' : '#22c55e';
        return (
          <div key={row.province} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 20, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textAlign: 'right' }}>{i + 1}</span>
            <span style={{ width: 180, fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.province}</span>
            <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${color}88, ${color})`,
                borderRadius: 4,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: `0 0 12px ${color}44`
              }} />
            </div>
            <span style={{ width: 50, fontSize: '0.75rem', fontFamily: 'JetBrains Mono', fontWeight: 600, color, textAlign: 'right' }}>
              {row.score.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProvinceDetail({ province, onClose }) {
  if (!province) return null;

  const features = [
    { label: 'HHI Sektoral', value: province.hhi, desc: 'Konsentrasi ekonomi' },
    { label: 'Intensitas Ekspor', value: province.export_intensity, desc: 'Exp/PDRB ratio' },
    { label: 'Pangsa Migas', value: province.migas_share, desc: 'Oil & gas share' },
    { label: 'β Minyak', value: province.beta_oil, desc: 'Oil price sensitivity' },
    { label: 'β Kurs', value: province.beta_fx, desc: 'FX rate sensitivity' },
    { label: 'Resiliensi', value: province.resilience, desc: 'Composite resilience' },
  ];

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{province.province}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rank #{province.rank} — Skenario {province.scenario}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px', fontSize: '0.8rem' }}>✕ Tutup</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {features.map(f => (
          <div key={f.label} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-accent)' }}>
              {typeof f.value === 'number' ? f.value.toFixed(3) : f.value}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [scenario, setScenario] = useState('Adverse');
  const [selectedProvince, setSelectedProvince] = useState(null);
  const allData = getByScenario(scenario);
  const top10 = allData.slice(0, 10);

  // Summary stats
  const avgScore = allData.reduce((s, d) => s + d.score, 0) / allData.length;
  const maxProv = allData[0];
  const minProv = allData[allData.length - 1];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>📊 Interactive Dashboard</h2>
        <p className="page-desc">Peta kerentanan & visualisasi per skenario guncangan makro</p>
      </div>

      {/* Scenario Tabs */}
      <div className="scenario-tabs">
        {SCENARIOS.map(s => (
          <button key={s} className={`scenario-tab ${scenario === s ? 'active' : ''}`} onClick={() => { setScenario(s); setSelectedProvince(null); }}>
            {s}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="stat-grid">
        <div className="card">
          <div className="card-title">Skor Rata-rata</div>
          <div className="card-value">{avgScore.toFixed(3)}</div>
        </div>
        <div className="card">
          <div className="card-title">Paling Rentan</div>
          <div className="card-value" style={{ fontSize: '1rem' }}>{maxProv?.province}</div>
          <div style={{ fontSize: '0.8rem', color: '#ef4444', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{maxProv?.score.toFixed(3)}</div>
        </div>
        <div className="card">
          <div className="card-title">Paling Tahan</div>
          <div className="card-value" style={{ fontSize: '1rem' }}>{minProv?.province}</div>
          <div style={{ fontSize: '0.8rem', color: '#22c55e', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{minProv?.score.toFixed(3)}</div>
        </div>
        <div className="card">
          <div className="card-title">Range</div>
          <div className="card-value">{(maxProv?.score - minProv?.score).toFixed(3)}</div>
        </div>
      </div>

      {/* Map */}
      <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🗺️ Vulnerability Map — Skenario {scenario}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Peta choropleth interaktif Indonesia. Warna lebih gelap = lebih rentan.</p>
        </div>
        <div className="map-container">
          <iframe
            src={`${import.meta.env.BASE_URL}vulnerability_map.html`}
            title="Indonesia Vulnerability Map"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>

      {/* Bar Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Top 10 Provinsi Paling Rentan — {scenario}</h3>
        <BarChart data={top10} />
        <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Klik provinsi di tabel bawah untuk melihat detail fitur.
        </div>
      </div>

      {/* Full ranking table */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Ranking Lengkap — {scenario}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Provinsi</th>
                <th>Skor</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {allData.map(row => (
                <tr
                  key={row.province}
                  onClick={() => setSelectedProvince(row)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{row.rank}</td>
                  <td style={{ fontFamily: 'Inter', fontWeight: 500, color: selectedProvince?.province === row.province ? 'var(--text-accent)' : 'var(--text-primary)' }}>
                    {row.province}
                  </td>
                  <td>
                    <div className="score-inline">
                      <span className="score-value" style={{ color: row.score > 0.8 ? '#ef4444' : row.score > 0.7 ? '#f59e0b' : '#22c55e' }}>
                        {row.score.toFixed(3)}
                      </span>
                      <div className="score-bar-bg" style={{ width: 80 }}>
                        <div className="score-bar-fill" style={{ width: `${row.score * 100}%`, background: row.score > 0.8 ? '#ef4444' : row.score > 0.7 ? '#f59e0b' : '#22c55e' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${row.score > 0.8 ? 'badge-high' : row.score > 0.7 ? 'badge-mid' : 'badge-low'}`}>
                      {row.score > 0.8 ? '🔴 Kritis' : row.score > 0.7 ? '🟡 Tinggi' : '🟢 Sedang'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Province Detail Popup */}
      {selectedProvince && (
        <ProvinceDetail
          province={selectedProvince}
          onClose={() => setSelectedProvince(null)}
        />
      )}
    </div>
  );
}
