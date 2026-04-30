import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Dataset from './pages/Dataset';
import PolicyBriefs from './pages/PolicyBriefs';
import Report from './pages/Report';

const NAV_ITEMS = [
  { to: '/',          icon: '🏠', label: 'Beranda' },
  { to: '/dashboard', icon: '🗺️', label: 'Dashboard', badge: null },
  { to: '/dataset',   icon: '📊', label: 'Dataset' },
  { to: '/policy',    icon: '📋', label: 'Policy Briefs', badge: 'Soon' },
  { to: '/report',    icon: '📄', label: 'Laporan Teknis', badge: 'Soon' },
];

function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <h1>DAWG-ID</h1>
        <div className="subtitle">Dynamic Assessment of Weakness & Growth</div>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && <span className="nav-label-badge">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div>DAWG-ID v0.1 — Prototype</div>
        <div style={{ marginTop: 4 }}>© 2026 Project Hormuz</div>
      </div>
    </aside>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useState(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="app-layout">
        <button
          className="mobile-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dataset" element={<Dataset />} />
            <Route path="/policy" element={<PolicyBriefs />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
