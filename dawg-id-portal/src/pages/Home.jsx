import { useState } from "react";
import { Link } from "react-router-dom";
import {
  getTop10,
  SCENARIOS,
  SCENARIO_PARAMS,
  FEATURE_WEIGHTS,
} from "../data/vulnerabilityData";

function ScoreBar({ score, maxScore = 1 }) {
  const pct = (score / maxScore) * 100;
  const color = score > 0.8 ? "#ef4444" : score > 0.7 ? "#f59e0b" : "#22c55e";
  return (
    <div className="score-inline">
      <span className="score-value" style={{ color }}>
        {score.toFixed(3)}
      </span>
      <div className="score-bar-bg" style={{ width: 120 }}>
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [scenario, setScenario] = useState("Adverse");
  const top10 = getTop10(scenario);

  return (
    <div className="page-container">
      {/* Hero */}
      <div className="hero">
        <h2>
          <span>DAWG-ID</span> — Macro Shock
          <br />
          Vulnerability Index
        </h2>
        <p>
          Dynamic Assessment of Weakness and Growth — Indonesia. Menganalisis
          kerentanan ekonomi 38 provinsi Indonesia terhadap konvergensi
          guncangan global 2026: krisis Selat Hormuz, tarif AS, tekanan nilai
          tukar, dan ancaman downgrade.
        </p>
      </div>

      {/* Context Cards */}
      <div className="context-cards">
        <div className="context-card">
          <div className="icon">⛽</div>
          <h4>Krisis Selat Hormuz</h4>
          <p>
            Gangguan pasokan minyak terbesar dalam sejarah. Indonesia sebagai
            net importir sangat rentan terhadap lonjakan harga energi.
          </p>
        </div>
        <div className="context-card">
          <div className="icon">🏛️</div>
          <h4>Tarif AS & Section 301</h4>
          <p>
            Tarif 19% dari AS dengan investigasi baru. Sektor tekstil, alas
            kaki, elektronik, karet, dan minyak sawit terdampak langsung.
          </p>
        </div>
        <div className="context-card">
          <div className="icon">💱</div>
          <h4>Tekanan Nilai Tukar</h4>
          <p>
            Rupiah mendekati rekor terendah ~Rp 17.200/USD, ditekan oleh capital
            outflow dan risiko geopolitik.
          </p>
        </div>
        <div className="context-card">
          <div className="icon">📉</div>
          <h4>Ancaman Downgrade</h4>
          <p>
            Moody's dan Fitch memangkas outlook menjadi negatif. MSCI membekukan
            review hingga Juni 2026.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stat-grid">
        <div className="card">
          <div className="card-title">Provinsi Dianalisis</div>
          <div className="card-value">38</div>
        </div>
        <div className="card">
          <div className="card-title">Skenario</div>
          <div className="card-value">3</div>
        </div>
        <div className="card">
          <div className="card-title">Fitur Struktural</div>
          <div className="card-value">6</div>
        </div>
        <div className="card">
          <div className="card-title">Provinsi Paling Rentan</div>
          <div className="card-value" style={{ fontSize: "1.2rem" }}>
            {top10[0]?.province}
          </div>
        </div>
      </div>

      {/* Top 10 Preview */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Top 10 Provinsi Paling Rentan
            </h3>
            <p className="page-desc">
              Peringkat berdasarkan Vulnerability Index
            </p>
          </div>
          <Link
            to="/dashboard"
            style={{
              color: "var(--text-accent)",
              fontSize: "0.85rem",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Lihat Dashboard →
          </Link>
        </div>

        <div className="scenario-tabs">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              className={`scenario-tab ${scenario === s ? "active" : ""}`}
              onClick={() => setScenario(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Provinsi</th>
              <th>Skor</th>
              <th>HHI</th>
              <th>Exp. Intensity</th>
              <th>β Oil</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((row) => (
              <tr key={row.province}>
                <td>{row.rank}</td>
                <td
                  style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                >
                  {row.province}
                </td>
                <td>
                  <ScoreBar score={row.score} />
                </td>
                <td>{row.hhi.toFixed(3)}</td>
                <td>{row.export_intensity.toFixed(1)}</td>
                <td style={{ color: row.beta_oil > 0 ? "#f87171" : "#4ade80" }}>
                  {row.beta_oil > 0 ? "+" : ""}
                  {row.beta_oil.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scenario Parameters */}
      <div className="card">
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>
          Parameter Skenario
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Skenario</th>
              <th>Δ Harga Minyak</th>
              <th>Δ USD/IDR</th>
              <th>Multiplier</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SCENARIO_PARAMS).map(([name, p]) => (
              <tr key={name}>
                <td
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 600,
                    color: "var(--text-accent)",
                  }}
                >
                  {name}
                </td>
                <td>{p.d_oil}</td>
                <td>{p.d_fx}</td>
                <td>{p.multiplier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
