import { FEATURE_WEIGHTS } from "../data/vulnerabilityData";

export default function Report() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>📄 Laporan Teknis</h2>
        <p className="page-desc">
          Dokumentasi metodologi, arsitektur data, dan temuan utama
        </p>
      </div>

      {/* Methodology */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 20 }}>
          Metodologi
        </h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            lineHeight: 1.7,
            marginBottom: 20,
          }}
        >
          DAWG-ID menggunakan lima fitur struktural per provinsi yang
          di-z-normalize dan dibobotkan menjadi indeks komposit, kemudian
          diproyeksikan di bawah tiga skenario guncangan makro. Pendekatan ini
          mengadaptasi framework stress-test yang lazim digunakan oleh bank
          sentral untuk sistem perbankan, diterapkan untuk ketahanan ekonomi
          regional.
        </p>

        {/* Feature Weights Table */}
        <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 12 }}>
          Bobot Fitur
        </h4>
        <table className="data-table" style={{ marginBottom: 24 }}>
          <thead>
            <tr>
              <th>Fitur</th>
              <th>Label</th>
              <th>Bobot</th>
              <th>Interpretasi</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_WEIGHTS.map((f) => (
              <tr key={f.feature}>
                <td
                  style={{ fontFamily: "JetBrains Mono", fontSize: "0.75rem" }}
                >
                  {f.feature}
                </td>
                <td
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {f.label}
                </td>
                <td
                  style={{
                    color: f.weight > 0 ? "#f87171" : "#4ade80",
                    fontFamily: "JetBrains Mono",
                    fontWeight: 600,
                  }}
                >
                  {f.weight > 0 ? "+" : ""}
                  {f.weight.toFixed(2)}
                </td>
                <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {f.weight > 0
                    ? "Meningkatkan kerentanan"
                    : "Mengurangi kerentanan"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Steps */}
        <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 12 }}>
          Tahapan Analisis
        </h4>
        <div className="method-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Data Collection</h4>
            <p>
              Pull data dari BPS WebAPI (inflasi, PDRB, ekspor), World Bank Pink
              Sheet (komoditas), FRED, Yahoo Finance (minyak, kurs), dan Bank
              Indonesia.
            </p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Feature Engineering</h4>
            <p>
              Hitung HHI sektoral, export intensity, migas share, shock
              sensitivity coefficients (β_oil, β_fx), dan resilience composite.
            </p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h4>Vulnerability Index</h4>
            <p>
              Z-normalize, weight, sum → min-max scale ke [0,1]. Ranking 38
              provinsi.
            </p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h4>Scenario Simulation</h4>
            <p>
              Base (status quo), Adverse (Hormuz +20% oil, +3% IDR), Severe (all
              adverse + downgrade + oil &gt;$100/bbl).
            </p>
          </div>
        </div>
        <div className="method-step">
          <div className="step-number">5</div>
          <div className="step-content">
            <h4>Insight Generation</h4>
            <p>
              Azure OpenAI GPT-4o untuk menghasilkan policy brief per provinsi
              dalam Bahasa Indonesia.
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>
          Sumber Data
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Dataset</th>
              <th>Sumber</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                id: 1,
                name: "Inflasi bulanan per provinsi",
                src: "BPS WebAPI",
              },
              {
                id: 2,
                name: "PDRB per provinsi per lapangan usaha",
                src: "BPS WebAPI",
              },
              {
                id: 3,
                name: "Ekspor-impor per provinsi (HS code)",
                src: "BPS WebAPI",
              },
              {
                id: 4,
                name: "Kurs USD/IDR harian (JISDOR)",
                src: "Bank Indonesia",
              },
              {
                id: 5,
                name: "Harga komoditas global",
                src: "World Bank Pink Sheet",
              },
              { id: 6, name: "Commodity price indices", src: "FRED" },
              {
                id: 7,
                name: "Harga minyak Brent harian",
                src: "Yahoo Finance",
              },
              { id: 8, name: "Tingkat kemiskinan & Gini", src: "BPS" },
              {
                id: 9,
                name: "Data ketenagakerjaan per sektor",
                src: "BPS (Sakernas)",
              },
            ].map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {d.name}
                </td>
                <td>{d.src}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Caveats */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>
          ⚠️ Caveats & Limitasi
        </h3>
        <ul
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            lineHeight: 1.8,
            paddingLeft: 20,
          }}
        >
          <li>
            Data inflasi provinsi dari BPS hanya tersedia 2022-sekarang,
            sehingga β coefficients diestimasi dari ~3 tahun data bulanan.
          </li>
          <li>
            4 provinsi Papua hasil pemekaran (2022) tetap ada di dataset tetapi
            diagregasi ke provinsi induk pada peta choropleth.
          </li>
          <li>
            Ini adalah prototype: bobot fitur menggunakan default dari proposal,
            belum dikalibrasi terhadap historical-shock outcomes.
          </li>
          <li>
            Proposal bersifat dinamis dan dapat berubah berdasarkan ketersediaan
            data.
          </li>
        </ul>
      </div>

      {/* Azure Integration */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>
          ☁️ Pemanfaatan Azure
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Komponen</th>
              <th>Layanan Azure</th>
              <th>Fungsi</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                comp: "Data Storage",
                svc: "Azure Blob Storage",
                fn: "Dataset mentah & hasil olahan",
              },
              {
                comp: "Model Training",
                svc: "Azure Machine Learning",
                fn: "Experiment tracking, tuning",
              },
              {
                comp: "Explainability",
                svc: "Responsible AI Dashboard",
                fn: "SHAP values & fairness",
              },
              {
                comp: "Insight Gen",
                svc: "Azure OpenAI (GPT-4o)",
                fn: "Policy brief per provinsi",
              },
              {
                comp: "Deployment",
                svc: "Azure Static Web Apps",
                fn: "Hosting dashboard ini",
              },
              {
                comp: "Monitoring",
                svc: "Azure Monitor",
                fn: "Logging & monitoring",
              },
            ].map((r) => (
              <tr key={r.comp}>
                <td
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {r.comp}
                </td>
                <td style={{ color: "var(--text-accent)" }}>{r.svc}</td>
                <td>{r.fn}</td>
                <td>{r.status} Planned</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
