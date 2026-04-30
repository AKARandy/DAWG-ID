export default function PolicyBriefs() {
  const exampleBrief = {
    province: "Kalimantan Timur",
    score: 0.752,
    scenario: "Severe",
    summary: `Provinsi Kalimantan Timur memiliki skor kerentanan 0.752 (tinggi). 
Faktor utama: konsentrasi ekonomi pada sektor pertambangan (HHI = 0.303) 
dan eksposur tinggi terhadap harga batu bara global (export intensity = 14.83). 
Pada skenario severe, kombinasi kenaikan harga minyak +40% dan depresiasi 
Rupiah +6% memproyeksikan peningkatan tekanan inflasi signifikan.

Rekomendasi: akselerasi diversifikasi ke sektor jasa digital dan pariwisata, 
serta penguatan program bantuan sosial untuk pekerja sektor tambang.`,
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>📋 AI-Generated Policy Briefs</h2>
        <p className="page-desc">Rekomendasi strategis per provinsi menggunakan Azure OpenAI GPT-4o</p>
      </div>

      {/* Coming Soon */}
      <div className="placeholder-section" style={{ marginBottom: 32 }}>
        <div className="placeholder-icon">🤖</div>
        <div className="placeholder-title">Integrasi Azure OpenAI — Segera Hadir</div>
        <div className="placeholder-desc">
          Fitur ini akan menggunakan Azure OpenAI Service (GPT-4o) untuk menghasilkan
          policy brief per provinsi dalam Bahasa Indonesia, berdasarkan output model
          vulnerability index.
        </div>
      </div>

      {/* Example Brief */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: '0.7rem', background: 'rgba(249,115,22,0.15)', color: 'var(--accent-2)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>CONTOH</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Policy Brief — {exampleBrief.province}</h3>
        </div>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div style={{ padding: '8px 16px', background: 'var(--bg-primary)', borderRadius: 8, fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Skenario: </span>
            <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{exampleBrief.scenario}</span>
          </div>
          <div style={{ padding: '8px 16px', background: 'var(--bg-primary)', borderRadius: 8, fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Skor: </span>
            <span style={{ color: '#f59e0b', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{exampleBrief.score}</span>
          </div>
        </div>
        <div style={{ 
          padding: 20, 
          background: 'var(--bg-primary)', 
          borderRadius: 8, 
          borderLeft: '3px solid var(--accent-1)',
          whiteSpace: 'pre-line', 
          fontSize: '0.85rem', 
          lineHeight: 1.7, 
          color: 'var(--text-secondary)' 
        }}>
          {exampleBrief.summary}
        </div>
      </div>

      {/* Pipeline description */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📐 Pipeline yang Direncanakan</h3>
        <div className="method-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Model Output</h4>
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
            <h4>Azure OpenAI GPT-4o</h4>
            <p>Generate policy brief dalam Bahasa Indonesia yang actionable dan spesifik per profil kerentanan.</p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h4>Review & Display</h4>
            <p>Tampilkan hasil di halaman ini dengan opsi filter per provinsi dan skenario.</p>
          </div>
        </div>
      </div>

      {/* Province selector placeholder */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>🏘️ Pilih Provinsi</h3>
        <div className="placeholder-section" style={{ padding: 40 }}>
          <div className="placeholder-icon">🔒</div>
          <div className="placeholder-title">Pilih Provinsi untuk Melihat Policy Brief</div>
          <div className="placeholder-desc">
            Setelah integrasi Azure OpenAI selesai, Anda dapat memilih provinsi
            dari dropdown dan melihat policy brief yang dihasilkan AI secara real-time.
          </div>
        </div>
      </div>
    </div>
  );
}
