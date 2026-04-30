import { useState, useMemo } from 'react';
import { vulnerabilityData, SCENARIOS } from '../data/vulnerabilityData';

export default function Dataset() {
  const [scenario, setScenario] = useState('Adverse');
  const [sortCol, setSortCol] = useState('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState('');

  const columns = [
    { key: 'rank', label: '#', width: 50 },
    { key: 'province', label: 'Provinsi', width: 200 },
    { key: 'score', label: 'Skor Kerentanan', width: 130 },
    { key: 'hhi', label: 'HHI Sektoral', width: 110 },
    { key: 'export_intensity', label: 'Intensitas Ekspor', width: 130 },
    { key: 'migas_share', label: 'Pangsa Migas', width: 110 },
    { key: 'beta_oil', label: 'β Minyak', width: 100 },
    { key: 'beta_fx', label: 'β Kurs', width: 100 },
    { key: 'resilience', label: 'Resiliensi', width: 100 },
  ];

  const data = useMemo(() => {
    let filtered = vulnerabilityData
      .filter(d => d.scenario === scenario)
      .filter(d => d.province.toLowerCase().includes(search.toLowerCase()));

    filtered.sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });

    return filtered;
  }, [scenario, sortCol, sortAsc, search]);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(col === 'rank'); }
  }

  function downloadCSV() {
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(d => columns.map(c => d[c.key]).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dawg-id_vulnerability_${scenario.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>📊 Vulnerability Index Dataset</h2>
        <p className="page-desc">Data lengkap skor kerentanan 38 provinsi dengan breakdown fitur struktural</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="scenario-tabs" style={{ marginBottom: 0 }}>
          {SCENARIOS.map(s => (
            <button key={s} className={`scenario-tab ${scenario === s ? 'active' : ''}`} onClick={() => setScenario(s)}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <input
          type="text"
          placeholder="🔍 Cari provinsi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontFamily: 'Inter',
            width: 220,
            outline: 'none',
          }}
        />
        <button
          onClick={downloadCSV}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--border-accent)',
            background: 'transparent',
            color: 'var(--text-accent)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter',
          }}
        >
          ⬇ Download CSV
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={{ minWidth: col.width }}>
                  {col.label} {sortCol === col.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.province}>
                <td>{row.rank}</td>
                <td style={{ fontFamily: 'Inter', fontWeight: 500, color: 'var(--text-primary)' }}>{row.province}</td>
                <td>
                  <div className="score-inline">
                    <span className="score-value" style={{ color: row.score > 0.8 ? '#ef4444' : row.score > 0.7 ? '#f59e0b' : '#22c55e' }}>
                      {row.score.toFixed(3)}
                    </span>
                    <div className="score-bar-bg" style={{ width: 60 }}>
                      <div className="score-bar-fill" style={{ width: `${row.score * 100}%`, background: row.score > 0.8 ? '#ef4444' : row.score > 0.7 ? '#f59e0b' : '#22c55e' }} />
                    </div>
                  </div>
                </td>
                <td>{row.hhi.toFixed(3)}</td>
                <td>{row.export_intensity.toFixed(2)}</td>
                <td>{row.migas_share.toFixed(3)}</td>
                <td style={{ color: row.beta_oil > 0 ? '#f87171' : '#4ade80' }}>
                  {row.beta_oil > 0 ? '+' : ''}{row.beta_oil.toFixed(2)}
                </td>
                <td style={{ color: row.beta_fx > 0 ? '#f87171' : '#4ade80' }}>
                  {row.beta_fx > 0 ? '+' : ''}{row.beta_fx.toFixed(2)}
                </td>
                <td style={{ color: row.resilience > 0 ? '#4ade80' : '#f87171' }}>
                  {row.resilience > 0 ? '+' : ''}{row.resilience.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Menampilkan {data.length} provinsi — Skenario {scenario}</span>
          <span>Klik header kolom untuk mengurutkan</span>
        </div>
      </div>
    </div>
  );
}
