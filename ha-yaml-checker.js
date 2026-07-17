/* HA Tools split — ha-yaml-checker v4.1.10 (2026-07-12) — single-tool standalone repo */
(function() {
'use strict';

// -- HA Tools Persistence (stub -- full impl in ha-tools-panel.js) --
window._haToolsPersistence = window._haToolsPersistence || { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-yaml-checker-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-yaml-checker] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-yaml-checker-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-yaml-checker-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };

// -- HA Tools Escape helper (fallback) --
const _esc = window._haToolsEsc || ((s) => String(s == null ? '' : s).replace(/[&<>"\']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));

/**
 * HA YAML Checker v3.0
 * Advanced YAML validator for Home Assistant configuration files.
 * Part of HA Tools Panel - Debug category
 * Author: Jeff (AI) for MacSiem
 *
 * v3.0 Features:
 *  - Tab 1: HA Config Check — trigger HA built-in validation
 *  - Tab 2: Entity Validator — scan automations for broken entity refs
 *  - Tab 3: File Scanner — status of key YAML files + HA system info
 *  - Tab 4: Paste & Validate — client-side YAML linting with HA-specific rules
 *  - Tab 5: Template Tester — test Jinja2 templates via HA template API
 *  - Tab 6: Common Issues — reference & gotchas
 */

/* ===== HA Tools split — inline shared infrastructure ===== */
// Bento Design System CSS (inline copy — keeps tool standalone)
if (typeof window !== 'undefined' && !window.HAToolsBentoCSS) {
  window.HAToolsBentoCSS = `
/* ═══════════════════════════════════════════════
   HA Tools — Bento Design System v2.0 (Premium)
   ═══════════════════════════════════════════════ */

/* keyboard a11y */
:focus-visible { outline: 2px solid var(--bento-primary, #6366f1); outline-offset: 2px; border-radius: 3px; }

:host {
  /* Brand palette — diamond top, gradient-friendly */
  --bento-primary: #6366f1;
  --bento-primary-2: #8b5cf6;
  --bento-primary-3: #ec4899;
  --bento-primary-hover: #4f46e5;
  --bento-primary-light: rgba(99, 102, 241, 0.08);
  --bento-primary-glow: rgba(99, 102, 241, 0.35);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.10);
  --bento-success-border: rgba(16, 185, 129, 0.25);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.10);
  --bento-error-border: rgba(239, 68, 68, 0.25);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.10);
  --bento-warning-border: rgba(245, 158, 11, 0.25);
  --bento-info: #06b6d4;
  --bento-info-light: rgba(6, 182, 212, 0.10);
  --bento-info-border: rgba(6, 182, 212, 0.25);

  /* Theme */
  --bento-bg:     var(--primary-background-color, #fafaf9);
  --bento-bg-2:   var(--card-background-color, #f5f5f4);
  --bento-card:   var(--card-background-color, #ffffff);
  --bento-glass:  rgba(255, 255, 255, 0.7);
  --bento-border: var(--divider-color, #e7e5e4);
  --bento-border-strong: rgba(0, 0, 0, 0.08);
  --bento-text:           var(--primary-text-color,   #0c0a09);
  --bento-text-secondary: var(--secondary-text-color, #57534e);
  --bento-text-muted:     var(--disabled-text-color,  #a8a29e);

  /* Radii */
  --bento-radius-xs: 8px;
  --bento-radius-sm: 12px;
  --bento-radius-md: 18px;
  --bento-radius-lg: 24px;
  --bento-radius-pill: 999px;

  /* Shadows — modern, layered */
  --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03);
  --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.10), 0 12px 24px -8px rgba(0,0,0,0.05);
  --bento-shadow-glow: 0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px -8px rgba(99,102,241,0.25);

  /* Gradients */
  --bento-grad-primary: linear-gradient(135deg, #6366f1, #8b5cf6);
  --bento-grad-rainbow: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --bento-grad-success: linear-gradient(135deg, #10b981, #34d399);
  --bento-grad-error:   linear-gradient(135deg, #ef4444, #f87171);
  --bento-grad-warning: linear-gradient(135deg, #f59e0b, #fbbf24);

  /* Motion */
  --bento-trans-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans:      0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  font-feature-settings: "cv11" 1, "ss01" 1;
  letter-spacing: -0.01em;
  display: block;
  color: var(--bento-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Dark mode ───────────────────────────────── */
:host(.bento-dark) {
    --bento-bg:     var(--primary-background-color, #0a0a0f);
    --bento-bg-2:   var(--card-background-color,    #111119);
    --bento-card:   var(--card-background-color,    #16161f);
    --bento-glass:  rgba(22, 22, 31, 0.7);
    --bento-border: var(--divider-color,            #27272f);
    --bento-border-strong: rgba(255, 255, 255, 0.08);
    --bento-text:           var(--primary-text-color,   #fafaf9);
    --bento-text-secondary: var(--secondary-text-color, #d6d3d1);
    --bento-text-muted:     var(--disabled-text-color,  #78716c);
    --bento-primary:        #818cf8;
    --bento-primary-2:      #a78bfa;
    --bento-primary-3:      #f472b6;
    --bento-primary-light:  rgba(129, 140, 248, 0.12);
    --bento-primary-glow:   rgba(129, 140, 248, 0.45);
    --bento-success: #34d399;
    --bento-success-light:  rgba(52, 211, 153, 0.12);
    --bento-success-border: rgba(52, 211, 153, 0.30);
    --bento-error:   #f87171;
    --bento-error-light:    rgba(248, 113, 113, 0.12);
    --bento-error-border:   rgba(248, 113, 113, 0.30);
    --bento-warning: #fbbf24;
    --bento-warning-light:  rgba(251, 191, 36, 0.12);
    --bento-warning-border: rgba(251, 191, 36, 0.30);
    --bento-info:    #22d3ee;
    --bento-info-light:     rgba(34, 211, 238, 0.12);
    --bento-info-border:    rgba(34, 211, 238, 0.30);
    --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2);
    --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.6), 0 12px 24px -8px rgba(0,0,0,0.3);
    --bento-shadow-glow: 0 0 0 1px rgba(129,140,248,0.2), 0 8px 32px -8px rgba(129,140,248,0.5);
    --bento-grad-primary: linear-gradient(135deg, #818cf8, #a78bfa);
    --bento-grad-rainbow: linear-gradient(135deg, #818cf8, #a78bfa 50%, #f472b6);
    color-scheme: dark !important;
  }
:host(.bento-dark) .card, :host(.bento-dark) .card-container, :host(.bento-dark) .main-card, :host(.bento-dark) .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
:host(.bento-dark) input, :host(.bento-dark) select, :host(.bento-dark) textarea { background: var(--bento-bg-2); color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) table th { background: var(--bento-bg-2); color: var(--bento-text-secondary); border-color: var(--bento-border); }
:host(.bento-dark) table td { color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) pre, :host(.bento-dark) code { background: #1e1e2e !important; color: #e2e8f0 !important; }

/* ── Reset & motion preferences ──────────────── */
* { box-sizing: border-box; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0s !important; transition-duration: 0s !important; } }

/* ── Main Card Wrapper ───────────────────────── */
.card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-md);
  box-shadow: var(--bento-shadow-md);
  color: var(--bento-text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  transition: box-shadow var(--bento-trans), border-color var(--bento-trans);
}

/* ── Header ──────────────────────────────────── */
.header {
  padding: 20px 24px 0;
  display: flex; align-items: center; gap: 12px;
}
.header-icon { font-size: 24px; }
.header-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--bento-text);
}
.header-badge {
  margin-left: auto;
  background: var(--bento-grad-primary); color: #fff;
  font-size: 11px; padding: 4px 10px; border-radius: var(--bento-radius-pill);
  font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.content { padding: 20px 24px 24px; }

/* ── Tabs (modern pill style) ────────────────── */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex !important; gap: 4px !important;
  padding: 4px !important;
  background: var(--bento-bg-2) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 20px !important;
  overflow: visible !important;
  -webkit-overflow-scrolling: touch !important;
  flex-wrap: wrap !important; border-bottom: 0 !important;
  width: 100%; max-width: 100%; box-sizing: border-box;
}
.tab, .tab-btn, .tab-button, .dtab {
  padding: 8px 16px !important;
  border: none !important; background: transparent !important; cursor: pointer !important;
  font-size: 13px !important; font-weight: 600 !important;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif !important;
  color: var(--bento-text-secondary) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 0 !important;
  transition: all var(--bento-trans) !important;
  white-space: nowrap !important; flex: 1 1 auto !important; text-align: center !important; min-height: 40px !important;
  letter-spacing: -0.005em !important;
}
.tab:hover, .tab-btn:hover, .tab-button:hover, .dtab:hover {
  color: var(--bento-text) !important;
  background: var(--bento-card) !important;
}
.tab.active, .tab-btn.active, .tab-button.active, .dtab.active {
  background: var(--bento-card) !important;
  color: var(--bento-primary) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-weight: 700 !important;
}
.tab-content { display: block; }
.tab-content.active { animation: bentoFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat / KPI cards (premium) ──────────────── */
.stat-card, .stat-item, .metric-card, .kpi-card {
  background: var(--bento-bg-2) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-sm) !important;
  padding: 18px !important;
  text-align: left !important;
  transition: transform var(--bento-trans), box-shadow var(--bento-trans), border-color var(--bento-trans);
  position: relative; overflow: hidden;
}
.stat-card::before, .metric-card::before, .kpi-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--bento-grad-primary);
  opacity: 0; transition: opacity var(--bento-trans);
}
.stat-card:hover, .stat-item:hover, .metric-card:hover, .kpi-card:hover {
  transform: translateY(-2px); box-shadow: var(--bento-shadow-lg); border-color: var(--bento-primary-light);
}
.stat-card:hover::before, .metric-card:hover::before, .kpi-card:hover::before { opacity: 1; }
.stat-icon { font-size: 22px; margin-bottom: 6px; opacity: 0.85; }
.stat-value, .stat-val, .metric-value, .kpi-val {
  font-size: 26px; font-weight: 800; line-height: 1.1;
  letter-spacing: -0.02em; color: var(--bento-text);
  font-feature-settings: "tnum" 1;
}
.stat-label, .stat-lbl, .metric-label, .kpi-lbl {
  font-size: 11px; color: var(--bento-text-secondary);
  margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
}
.stat-num {
  font-size: 24px; font-weight: 800; color: var(--bento-primary);
  font-feature-settings: "tnum" 1; letter-spacing: -0.02em;
}
.stat-sub { font-size: 12px; color: var(--bento-text-muted); font-weight: 500; }

/* ── Overview grid ───────────────────────────── */
.overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px; margin-bottom: 20px;
}

/* ── Section headers ─────────────────────────── */
.section-header, .section-title {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; font-weight: 700; color: var(--bento-text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 16px 0 10px;
}
.section-header::before, .section-title::before {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--bento-primary);
  margin-right: 8px; flex-shrink: 0;
}

/* ── Loading / Empty / Info ──────────────────── */
.loading-bar {
  height: 3px; border-radius: var(--bento-radius-pill);
  background: linear-gradient(90deg, var(--bento-primary), var(--bento-primary-2), transparent);
  background-size: 200% 100%;
  animation: bentoLoad 1.5s linear infinite; margin-bottom: 12px;
}
@keyframes bentoLoad { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state, .no-data, .no-results {
  text-align: center; color: var(--bento-text-secondary);
  padding: 40px 20px; font-size: 14px;
  background: var(--bento-bg-2); border-radius: var(--bento-radius-md);
  border: 1px dashed var(--bento-border);
}
.info-note, .tip-box {
  font-size: 13px; color: var(--bento-text-secondary);
  background: var(--bento-primary-light);
  border-radius: var(--bento-radius-sm); padding: 12px 14px;
  border-left: 3px solid var(--bento-primary); margin-top: 12px;
  line-height: 1.55;
}
.last-updated {
  font-size: 11px; color: var(--bento-text-muted);
  text-align: right; margin-top: 12px; font-feature-settings: "tnum" 1;
}

/* ── Buttons (premium) ───────────────────────── */
.refresh-btn {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-pill); padding: 6px 14px;
  font-size: 12px; color: var(--bento-text-secondary);
  cursor: pointer; font-weight: 600; transition: all var(--bento-trans);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
}
.refresh-btn:hover {
  background: var(--bento-card); color: var(--bento-primary);
  border-color: var(--bento-primary); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-sm);
}
.toggle-btn, .action-btn {
  background: var(--bento-grad-primary); border: none;
  border-radius: var(--bento-radius-xs); padding: 8px 16px;
  font-size: 13px; color: #fff; cursor: pointer; font-weight: 600;
  transition: all var(--bento-trans); font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.005em;
  box-shadow: 0 4px 12px -2px var(--bento-primary-glow);
}
.toggle-btn:hover, .action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -4px var(--bento-primary-glow);
}
.send-btn, .btn-primary {
  width: 100%;
  background: var(--bento-grad-primary); color: #fff;
  border: none; border-radius: var(--bento-radius-sm);
  padding: 12px 20px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.01em;
  transition: all var(--bento-trans);
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.send-btn:hover, .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -6px var(--bento-primary-glow);
}
.send-btn:active, .btn-primary:active { transform: translateY(0); }
.send-btn:disabled, .btn-primary:disabled {
  opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none;
}

/* ── Badges / Status (modern pill) ───────────── */
.badge, .status-badge, .tag, .chip {
  padding: 4px 12px; border-radius: var(--bento-radius-pill);
  font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;
  letter-spacing: 0.04em; text-transform: uppercase;
  border: 1px solid;
}
.badge-ok, .badge-success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.badge-er, .badge-error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }
.badge-warn, .badge-warning { background: var(--bento-warning-light); color: var(--bento-warning); border-color: var(--bento-warning-border); }
.badge-info { background: var(--bento-info-light); color: var(--bento-info); border-color: var(--bento-info-border); }

.count-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px;
  border-radius: var(--bento-radius-pill); display: inline-flex; align-items: center;
  font-feature-settings: "tnum" 1;
}
.error-badge { background: var(--bento-error-light); color: var(--bento-error); border: 1px solid var(--bento-error-border); }
.warn-badge  { background: var(--bento-warning-light); color: var(--bento-warning); border: 1px solid var(--bento-warning-border); }
.info-badge  { background: var(--bento-primary-light); color: var(--bento-primary); border: 1px solid var(--bento-border); }
.ok-badge    { background: var(--bento-success-light); color: var(--bento-success); border: 1px solid var(--bento-success-border); }

/* ── Tables (modern) ─────────────────────────── */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th {
  background: var(--bento-bg-2); color: var(--bento-text-secondary);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid var(--bento-border);
}
th:first-child { border-top-left-radius: var(--bento-radius-sm); }
th:last-child  { border-top-right-radius: var(--bento-radius-sm); }
td {
  padding: 14px 16px; border-bottom: 1px solid var(--bento-border);
  color: var(--bento-text); font-size: 13px;
}
tr { transition: background var(--bento-trans-fast); }
tr:hover td { background: var(--bento-primary-light); }
tr:last-child td { border-bottom: 0; }

/* ── Forms / Inputs ──────────────────────────── */
input, select, textarea {
  padding: 10px 14px; border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card); color: var(--bento-text);
  font-size: 14px; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  transition: all var(--bento-trans); outline: none;
  letter-spacing: -0.005em;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 4px var(--bento-primary-light);
}
input::placeholder, textarea::placeholder { color: var(--bento-text-muted); }

/* ── Code blocks ─────────────────────────────── */
code {
  background: var(--bento-bg-2); padding: 2px 6px;
  border-radius: 4px; font-size: 12px;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  border: 1px solid var(--bento-border);
}
pre {
  background: #1e1e2e; color: #e2e8f0;
  padding: 16px; border-radius: var(--bento-radius-sm);
  font-size: 12.5px; overflow-x: auto; line-height: 1.65;
  white-space: pre-wrap; word-break: break-word;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  box-shadow: var(--bento-shadow-md);
}

/* ── Grid layouts ────────────────────────────── */
.schedule-grid, .send-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.schedule-card, .send-card, .info-card {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm); padding: 16px;
  transition: all var(--bento-trans);
}
.schedule-card:hover, .send-card:hover, .info-card:hover {
  border-color: var(--bento-primary-light); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-md);
}

/* ── Log entries ─────────────────────────────── */
.log-entry {
  display: flex; flex-wrap: wrap; align-items: flex-start;
  gap: 4px 8px; padding: 10px 12px;
  border-radius: var(--bento-radius-sm); margin-bottom: 6px;
  font-size: 12.5px; min-width: 0; overflow: hidden;
  border: 1px solid transparent; transition: all var(--bento-trans-fast);
}
.error-entry { background: var(--bento-error-light); border-color: var(--bento-error-border); }
.warn-entry  { background: var(--bento-warning-light); border-color: var(--bento-warning-border); }
.log-time { color: var(--bento-text-muted); font-feature-settings: "tnum" 1; flex-shrink: 0; font-family: "JetBrains Mono", monospace; }
.log-domain {
  font-weight: 700; flex-shrink: 1; min-width: 0; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.error-domain { color: var(--bento-error); }
.warn-domain  { color: var(--bento-warning); }
.log-msg {
  color: var(--bento-text-secondary); flex-basis: 100%;
  word-break: break-word; overflow-wrap: anywhere;
  white-space: pre-wrap; min-width: 0; line-height: 1.55;
}

/* ── Send status ─────────────────────────────── */
.send-status {
  padding: 12px 16px; border-radius: var(--bento-radius-sm);
  margin-top: 14px; font-size: 13px; font-weight: 600;
  text-align: center; letter-spacing: -0.005em;
  border: 1px solid;
}
.send-status.sending { background: var(--bento-primary-light); color: var(--bento-primary); border-color: var(--bento-border); }
.send-status.success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.send-status.error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: var(--bento-radius-pill); border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); background-clip: content-box; }

/* ── Animations ──────────────────────────────── */
@keyframes bentoSpin  { to { transform: rotate(360deg); } }
@keyframes bentoPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes bentoSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bentoStaggerIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* Apply stagger to grids of stat-cards */
.stats-grid > *, .overview-grid > *, .summary-grid > * {
  animation: bentoStaggerIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.stats-grid > *:nth-child(1)  { animation-delay: 0.02s; }
.stats-grid > *:nth-child(2)  { animation-delay: 0.06s; }
.stats-grid > *:nth-child(3)  { animation-delay: 0.10s; }
.stats-grid > *:nth-child(4)  { animation-delay: 0.14s; }
.stats-grid > *:nth-child(5)  { animation-delay: 0.18s; }
.stats-grid > *:nth-child(6)  { animation-delay: 0.22s; }

/* ── Mobile — 768 px ─────────────────────────── */
@media (max-width: 768px) {
  .content { padding: 16px; }
  .header { padding: 16px 16px 0; }
  .tabs { gap: 2px !important; padding: 3px !important; }
  .tab, .tab-button, .tab-btn { padding: 6px 12px !important; font-size: 12px !important; }
  .overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
    grid-template-columns: repeat(2, 1fr); gap: 10px;
  }
  .stat-value, .stat-val, .kpi-val, .metric-val { font-size: 22px; }
  .stat-label, .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
  .send-grid, .schedule-grid { grid-template-columns: 1fr; }
  .log-entry { flex-wrap: wrap; gap: 2px 6px; padding: 8px 10px; }
  .log-domain { max-width: 60%; font-size: 11.5px; }
  .log-msg { flex-basis: 100%; max-width: 100%; font-size: 11.5px; }
  pre { padding: 12px; font-size: 11.5px; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
  table { font-size: 12.5px; }
  th, td { padding: 10px 12px; }
}
@media (max-width: 480px) {
  .tabs { gap: 1px !important; padding: 2px !important; }
  .tab, .tab-button, .tab-btn { padding: 5px 10px !important; font-size: 11px !important; }
  .overview-grid, .stats-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
  .stat-value, .stat-val, .kpi-val { font-size: 18px; }
}
`;
}
// XSS escape singleton (idempotent)
if (typeof window !== 'undefined') {
  window._haToolsEsc = window._haToolsEsc || (function(){
    var MAP = {};
    MAP[String.fromCharCode(38)] = '&amp;';
    MAP[String.fromCharCode(60)] = '&lt;';
    MAP[String.fromCharCode(62)] = '&gt;';
    MAP[String.fromCharCode(34)] = '&quot;';
    MAP[String.fromCharCode(39)] = '&#39;';
    return function(s){ return typeof s === 'string' ? s.replace(/[&<>"']/g, function(c){ return MAP[c]; }) : (s == null ? '' : s); };
  })();
}
// Universal donate footer injector — guarantees the support box appears
// on every split-tool card regardless of internal render state.
if (typeof window !== 'undefined' && !window.__haToolsSplitDonateInjector) {
  window.__haToolsSplitDonateInjector = true;
  var SPLIT_TAGS = ['ha-purge-cache','ha-yaml-checker','ha-data-exporter','ha-baby-tracker','ha-chore-tracker','ha-energy-optimizer','ha-energy-insights','ha-energy-email','ha-log-email','ha-smart-reports','ha-network-map','ha-trace-viewer','ha-automation-analyzer','ha-storage-monitor','ha-backup-manager','ha-security-check','ha-device-health','ha-sentence-manager','ha-encoding-fixer','ha-entity-renamer','ha-frigate-privacy','ha-vacuum-water-monitor'];
  var DONATE_HTML = ''
    + '<div class="donate-section" data-source="ha-tools-split-injector">'
    + '  <div class="donate-text">'
    + '    <h3>❤️ Support HA Tools Development</h3>'
    + '    <p>If this tool makes your Home Assistant life easier, consider supporting the project. Every coffee motivates further development!</p>'
    + '  </div>'
    + '  <div class="donate-buttons">'
    + '    <a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a>'
    + '    <a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a>'
    + '  </div>'
    + '</div>';
  function deepFindAll(tag, root) {
    var out = [];
    (function walk(node){
      if (!node || !node.querySelectorAll) return;
      var children = node.querySelectorAll('*');
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c.tagName && c.tagName.toLowerCase() === tag) out.push(c);
        if (c.shadowRoot) walk(c.shadowRoot);
      }
    })(root || document);
    return out;
  }
  // Per-tool prerequisite check + inline install banner
  var PREREQS = {
    'ha-energy-email': { service: 'ha_tools_email', repo: 'ha-tools-email-integration', label: 'HA Tools Email integration', kind: 'integration' },
    'ha-log-email':    { service: 'ha_tools_email', repo: 'ha-tools-email-integration', label: 'HA Tools Email integration', kind: 'integration' },
    'ha-encoding-fixer': { shellCommand: 'fix_encoding', label: 'shell_command.fix_encoding (optional advanced feature)', kind: 'shell_command_optional' }
  };
  // Per-tool first-run intro banner (one-line scope + 3 use cases)
  var INTROS = {
    'ha-yaml-checker': { headline: 'Validate Home Assistant YAML configuration on demand.', steps: ['Click \'Check HA Configuration\' to run homeassistant.check_config.', 'Switch to \'Entities\' tab to search entities by domain.', 'Use \'Template\' tab to preview Jinja2 templates.'] },
    'ha-data-exporter': { headline: 'Browse, filter, and export Home Assistant entity data.', steps: ['Filter by domain or search entities live.', 'Take a snapshot or export selection to CSV / JSON.', 'Privacy warning before downloading attributes with sensitive data.'] },
    'ha-chore-tracker': { headline: 'Household chore tracker with kanban + recurring schedules.', steps: ['Add a chore: name + assignee + frequency.', 'Drag from \'Todo\' to \'Done\' to mark complete.', 'Stats tab shows counts per assignee.'] },
    'ha-energy-optimizer': { headline: 'Tariff-aware energy usage with hourly heatmaps + tips.', steps: ['Today / Yesterday / 7-day / 30-day usage and cost.', 'Patterns tab — hourly heatmap of consumption.', 'Recommendations tab — auto-generated tips.'] },
    'ha-energy-insights': { headline: 'Daily / weekly / monthly energy charts + top consumers.', steps: ['Switch view tabs to see consumption over time.', 'Top devices ranked by kWh.', 'Tips tab with energy-saving suggestions.'] },
    'ha-energy-email': { headline: 'Energy reports delivered by email via ha_tools_email.', steps: ['Click \'Send Now\' to email the current snapshot.', 'Schedule daily / weekly / monthly delivery.', 'Configure SMTP in the Schedule tab (one-time).'] },
    'ha-log-email': { headline: 'Daily error / warning digests delivered by email.', steps: ['Click \'Send Now\' to email the current digest.', 'Schedule daily delivery + threshold (e.g. \u22653 errors).', 'Requires ha-tools-email-integration.'] },
    'ha-smart-reports': { headline: 'Aggregate weekly / monthly reports — energy + automations + state changes.', steps: ['Weekly summary card on Overview.', 'Drill down by Energy / Automations / System sub-tabs.', 'Privacy-safe view strips entity names before sharing.'] },
    'ha-network-map': { headline: 'Visualise the network around HA — devices, topology, MAC bindings.', steps: ['Devices tab — table of all known devices.', 'Topology tab — graph view of the network.', 'Click \'Rescan\' to ping the local subnet (user-initiated).'] },
    'ha-trace-viewer': { headline: 'Step through HA automation traces with a flow graph.', steps: ['Pick automation in sidebar to see latest 5 traces.', 'Click trace for full path through triggers / conditions / actions.', 'Export trace as JSON for offline debug.'] },
    'ha-automation-analyzer': { headline: 'Surface slow / failing / suspicious automations.', steps: ['Overview shows total + health score + top failing.', 'Performance tab ranks by avg runtime.', 'Optimization tab suggests improvements (loops, redundant triggers).'] },
    'ha-storage-monitor': { headline: 'Disk + recorder DB + add-on storage breakdown.', steps: ['Overview shows used / free + per-category breakdown.', 'Backups tab — count + size warning.', 'Cleanup tab — actionable suggestions.'] },
    'ha-backup-manager': { headline: 'Create + list + inspect HA backups.', steps: ['List existing backups (date / size / encryption).', 'Click \'Create backup now\' to invoke backup.create.', 'Restore selected backup.'] },
    'ha-security-check': { headline: 'Security audit + remediation tips.', steps: ['Overview shows score (X/100) + letter grade.', 'Click warning row for step-by-step remediation.', 'Tips tab — checklist of best practices.'] },
    'ha-device-health': { headline: 'Device battery / signal / last-seen health.', steps: ['List devices grouped by health (OK / Warning / Critical).', 'Filter by low battery (<20%) or weak signal.', 'Click device for model / manufacturer / last seen.'] },
    'ha-encoding-fixer': { headline: 'Detect + fix UTF-8 / mojibake issues across HA.', steps: ['Click \'Scan\' to walk entity registry + states.', 'Per-entity \'Fix\' button calls homeassistant.reload.', 'Optional: deep file scan via shell_command (see README).'] },
    'ha-entity-renamer': { headline: 'Bulk-rename HA entities + friendly names.', steps: ['Pick an entity, set new ID — entity_registry/update.', 'Bulk pattern: sensor.old_* \u2192 sensor.new_*.', 'Optional: rewrite Lovelace dashboard refs.'] },
    'ha-frigate-privacy': { headline: 'One-click Frigate privacy mode (pause detection / recording / snapshots).', steps: ['Click \'Pause 15 min\' for instant privacy.', 'Schedules tab — daily privacy window (e.g. 22:00\u201306:00).', 'Resume at any time to re-enable cameras.'] }
  };
  var PREREQ_HTML_CACHE = {};
  function buildPrereqBanner(tag, prereq, hass) {
    if (PREREQ_HTML_CACHE[tag]) return PREREQ_HTML_CACHE[tag];
    var html = '';
    if (prereq.kind === 'integration') {
      html = '<div class="prereq-banner prereq-error" data-prereq="' + tag + '">' +
        '<div class="prereq-icon">⚠️</div>' +
        '<div class="prereq-text">' +
          '<strong>This tool requires the ' + prereq.label + '</strong><br>' +
          'Install it from HACS: <code>https://github.com/MacSiem/' + prereq.repo + '</code> ' +
          '(Category: <strong>Integration</strong>) — then add <code>' + prereq.service + ':</code> to your <code>configuration.yaml</code> and restart HA.' +
        '</div>' +
        '<a class="prereq-cta" href="https://github.com/MacSiem/' + prereq.repo + '" target="_blank" rel="noopener noreferrer">Open install guide ↗</a>' +
      '</div>';
    } else if (prereq.kind === 'shell_command_optional') {
      html = '<div class="prereq-banner prereq-info" data-prereq="' + tag + '">' +
        '<div class="prereq-icon">💡</div>' +
        '<div class="prereq-text">' +
          '<strong>Optional advanced feature: deep file scan</strong><br>' +
          'To enable scanning of <code>configuration.yaml</code> files, install the bundled <code>encoding_scanner.py</code> + add <code>shell_command:</code> entries. See README.' +
        '</div>' +
      '</div>';
    }
    PREREQ_HTML_CACHE[tag] = html;
    return html;
  }
  function buildIntroBanner(tag, intro) {
    var stepsHtml = intro.steps.map(function(s){ return '<li>' + s + '</li>'; }).join('');
    return '<div class="intro-banner" data-intro="' + tag + '">' +
      '<button class="intro-dismiss" type="button" title="Dismiss" aria-label="Dismiss">✕</button>' +
      '<div class="intro-headline">💡 ' + intro.headline + '</div>' +
      '<ol class="intro-steps">' + stepsHtml + '</ol>' +
    '</div>';
  }
  function introDismissed(tag) {
    try { return localStorage.getItem('ha-intro-dismissed-' + tag) === '1'; } catch(e) { return false; }
  }
  function dismissIntro(tag, el) {
    try { localStorage.setItem('ha-intro-dismissed-' + tag, '1'); } catch(e) {}
    var node = el.shadowRoot && el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"]');
    if (node) node.remove();
  }
  function injectInto(tag, el) {
        // panel_custom auto-init: HA assigns hass/panel/narrow but does not always call setConfig.
        if (typeof el.setConfig === 'function' && !el.config && !el._config) {
          try { el.setConfig({ type: 'custom:' + tag, title: tag }); } catch(e) {}
        }
        if (!el.shadowRoot) return;
        // 0) First-run intro banner (skip if tool has its own native tip)
        var intro = INTROS[tag];
        if (intro && !introDismissed(tag)) {
          var hasOwnTip = el.shadowRoot.querySelector('#tip-banner, .tip-banner');
          var injectedIntro = el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"]');
          if (!hasOwnTip && !injectedIntro) {
            try {
              var _introTmp = document.createElement('div');
              _introTmp.innerHTML = buildIntroBanner(tag, intro);
              var _introNode = _introTmp.firstElementChild;
              if (_introNode) el.shadowRoot.insertBefore(_introNode, el.shadowRoot.firstChild);
              var btn = el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"] .intro-dismiss');
              if (btn) btn.addEventListener('click', function(ev){ ev.stopPropagation(); dismissIntro(tag, el); });
            } catch(e) {}
          }
        }
        // 1) Prereq banner — checked every poll so it disappears when prereq becomes available
        var prereq = PREREQS[tag];
        if (prereq && el._hass) {
          var hassReady = !!el._hass;
          var present = true;
          if (prereq.service) present = !!(el._hass.services && el._hass.services[prereq.service]);
          if (prereq.shellCommand) present = !!(el._hass.services && el._hass.services.shell_command && el._hass.services.shell_command[prereq.shellCommand]);
          var existing = el.shadowRoot.querySelector('.prereq-banner[data-prereq="' + tag + '"]');
          if (!present && hassReady) {
            if (!existing) {
              try {
                var _prereqTmp = document.createElement('div');
                _prereqTmp.innerHTML = buildPrereqBanner(tag, prereq, el._hass);
                var _prereqNode = _prereqTmp.firstElementChild;
                if (_prereqNode) el.shadowRoot.insertBefore(_prereqNode, el.shadowRoot.firstChild);
              } catch(e) {}
            }
          } else if (present && existing) {
            existing.remove();
          }
        }
        // 2) Donate footer
        if (el.shadowRoot.querySelector('.donate-section')) return;
        try {
          var _donateTmp = document.createElement('div');
          _donateTmp.innerHTML = DONATE_HTML;
          while (_donateTmp.firstChild) el.shadowRoot.appendChild(_donateTmp.firstChild);
        } catch(e) {}
    // Anti-flicker: watch this card's own shadowRoot so a re-render (innerHTML wipe)
    // re-injects the footer synchronously in the same microtask, before paint.
    if (el.shadowRoot && !el.__haToolsReinjectObs) {
      try {
        el.__haToolsReinjectObs = new MutationObserver(function(){
          if (el.__haToolsReinjecting) return;
          el.__haToolsReinjecting = true;
          try { injectInto(tag, el); } catch(e) {}
          el.__haToolsReinjecting = false;
        });
        el.__haToolsReinjectObs.observe(el.shadowRoot, { childList: true });
      } catch(e) {}
    }
  }
  function injectAll() {
    SPLIT_TAGS.forEach(function(tag){
      deepFindAll(tag).forEach(function(el){ injectInto(tag, el); });
    });
  }
  // Run immediately, then aggressive MutationObserver for late mounts + view switches.
  injectAll();
  setTimeout(injectAll, 250);
  setTimeout(injectAll, 1000);
  setTimeout(injectAll, 3000);
  // MutationObserver catches every new node anywhere in the DOM, including shadow root attachments
  // that are deferred until the user navigates to a view.
  try {
    var obs = new MutationObserver(function(muts){
      // Debounce: schedule a microtask injection
      if (window.__haToolsDonateScheduled) return;
      window.__haToolsDonateScheduled = true;
      setTimeout(function(){ window.__haToolsDonateScheduled = false; injectAll(); }, 100);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch(e) {}
  // Also re-inject on hash/path change (Lovelace view switches)
  window.addEventListener('hashchange', function(){ setTimeout(injectAll, 200); });
  window.addEventListener('popstate', function(){ setTimeout(injectAll, 200); });
  // Backup interval (every 3s for first 5min — handles cases where MutationObserver missed events)
  var pollCount = 0;
  var pollInterval = setInterval(function(){
    injectAll();
    if (++pollCount >= 100) clearInterval(pollInterval);
  }, 3000);
}
/* ============================================================ */

class HAYamlChecker extends HTMLElement {
  static getConfigElement() { return document.createElement('ha-yaml-checker-editor'); }
  static getStubConfig() { return { type: 'custom:ha-yaml-checker', title: 'YAML Checker' }; }
  constructor() {
    super();
    this._toolId = this.tagName.toLowerCase().replace('ha-', '');
    this._lang = (navigator.language || '').startsWith('pl') ? 'pl' : 'en';
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._activeTab = 'config-check';
    this._checkResult = null;
    this._checkLoading = false;
    this._scanResult = null;
    this._scanLoading = false;
    this._pasteValue = '';
    this._pasteErrors = [];
    this._entityResult = null;
    this._entityLoading = false;
    this._templateValue = '{{ states("sun.sun") }}';
    this._templateResult = null;
    this._templateLoading = false;
    this._firstRender = false;
  }

  static get KEY_FILES() {
    return [
      { path: 'configuration.yaml', desc: 'G\u0142\u00F3wna konfiguracja HA', critical: true },
      { path: 'automations.yaml', desc: 'Automations', critical: false },
      { path: 'scripts.yaml', desc: 'Skrypty', critical: false },
      { path: 'scenes.yaml', desc: 'Sceny', critical: false },
      { path: 'groups.yaml', desc: 'Grupy', critical: false },
      { path: 'customize.yaml', desc: 'Customize', critical: false },
      { path: 'secrets.yaml', desc: 'Sekrety (wra\u017Cliwe dane)', critical: false },
      { path: 'ui-lovelace.yaml', desc: 'Lovelace (YAML mode)', critical: false },
    ];
  }

  static get DEPRECATED_PATTERNS() {
    return [
      { pattern: /^\s*initial:\s*(on|off)\s*$/i, msg: 'Deprecated: initial on/off \u2014 uzyj true/false (HA 2021.12+)', severity: 'warning' },
      { pattern: /data_template:/, msg: 'Deprecated: data_template: \u2014 uzyj data: z template (HA 2021.12+)', severity: 'warning' },
      { pattern: /^\s*entity_namespace:/, msg: 'Usuniety: entity_namespace (HA 2022.x)', severity: 'error' },
      { pattern: /^\s*hide_entity:/, msg: 'Deprecated: hide_entity \u2014 uzyj entity_registry (HA 2021.x+)', severity: 'warning' },
      { pattern: /^\s*white_value:/, msg: 'Deprecated: white_value \u2014 uzyj white w color_mode (HA 2021.4+)', severity: 'warning' },
      { pattern: /for:\s*\d+$/, msg: 'Deprecated: for: N (integer) \u2014 uzyj for: "HH:MM:SS" lub {seconds: N}', severity: 'warning' },
      { pattern: /value_template:/, msg: 'Info: value_template: \u2014 rozwaz migracje do template sensors (HA 2021.12+)', severity: 'info' },
      { pattern: /^\s*platform:\s+mqtt$/, msg: 'Deprecated: platform: mqtt \u2014 uzyj mqtt: w configuration.yaml (HA 2022.6+)', severity: 'warning' },
      { pattern: /service:\s+homeassistant\.turn/, msg: 'Info: homeassistant.turn_on/off \u2014 mozesz uzywac domain-specific service', severity: 'info' },
      { pattern: /^\s*condition:\s+template$/, msg: 'Info: condition: template \u2014 rozwaz shorthand template conditions (HA 2023.x+)', severity: 'info' },
      { pattern: /^\s*automation:\s*$/, msg: 'Deprecated: automation: \u2192 automations: (HA 2024.4+)', severity: 'warning' },
      { pattern: /^\s*script:\s*$/, msg: 'Deprecated: script: \u2192 scripts: (HA 2024.4+)', severity: 'warning' },
      { pattern: /^\s*trigger:\s*$/, msg: 'Deprecated: trigger: \u2192 triggers: in automations (HA 2024.4+)', severity: 'warning' },
      { pattern: /^\s*condition:\s*$/, msg: 'Deprecated: condition: \u2192 conditions: in automations (HA 2024.4+)', severity: 'warning' },
      { pattern: /^\s*action:\s*$/, msg: 'Deprecated: action: \u2192 actions: in automations (HA 2024.4+)', severity: 'warning' },
      { pattern: /^\s*platform:\s+time\s*$/, msg: 'Deprecated: platform: time \u2192 time_pattern trigger (HA 2024.x+)', severity: 'warning' },
      { pattern: /^\s*(below|above):\s+['"]/, msg: 'Numeric trigger: below/above jako string \u2014 u\u017Cyj warto\u015Bci numerycznej', severity: 'warning' },
      { pattern: /^\s*entity:\s+\w/, msg: 'Deprecated: entity: \u2192 entity_id: w triggers (HA 2024.x+)', severity: 'warning' },
      { pattern: /^\s*platform:\s+template\s*$/, msg: 'Old format: platform: template \u2192 template: (HA 2021.12+)', severity: 'info' },
      { pattern: /count\(\)/, msg: 'Deprecated: count() \u2192 u\u017Cyj | count filter w Jinja2', severity: 'info' },
    ];
  }
  static get SERVICE_MAPPINGS() {
    return {
      'persistent_notification.create': { replacement: 'notify.persistent_notification', version: '2024.x', severity: 'warning' },
      'persistent_notification.dismiss': { replacement: 'notify.persistent_notification (dismiss)', version: '2024.x', severity: 'warning' },
      'homeassistant.turn_on': { note: 'Generic \u2014 rozwa\u017C domain-specific: light.turn_on, switch.turn_on itp.', severity: 'info' },
      'homeassistant.turn_off': { note: 'Generic \u2014 rozwa\u017C domain-specific: light.turn_off, switch.turn_off itp.', severity: 'info' },
      'homeassistant.toggle': { note: 'Generic \u2014 rozwa\u017C domain-specific: light.toggle, switch.toggle itp.', severity: 'info' },
      'climate.set_temperature': { note: 'Upewnij si\u0119 \u017Ce entity_id to climate.*, nie sensor.*', severity: 'info' },
      'notify.notify': { note: 'Generic notify \u2014 lepiej u\u017Cy\u0107 konkretnego serwisu: notify.mobile_app_*', severity: 'info' },
    };
  }
  static get JINJA2_FUNCTIONS() {
    return {
      functions: [
        'states','state_attr','is_state','is_state_attr','has_value','expand','device_attr',
        'area_name','area_id','area_entities','integration_entities','device_entities','device_id',
        'config_entry_id','utcnow','now','as_timestamp','as_datetime','as_timedelta','as_local',
        'strptime','relative_time','timedelta','today_at','max','min','log','sin','cos','tan',
        'sqrt','e','pi','float','int','iif','bool','set','list','dict','namespace','zip',
        'distance','closest','type_debug','slugify','urlencode',
      ],
      filters: [
        'float','int','round','abs','string','bool','list','set','timestamp_custom',
        'timestamp_local','timestamp_utc','as_timestamp','as_datetime','regex_match',
        'regex_replace','regex_findall','regex_findall_index','regex_search','slugify',
        'urlencode','lower','upper','title','capitalize','trim','replace','default',
        'first','last','length','count','sort','unique','join','map','select','reject',
        'selectattr','rejectattr','groupby','min','max','sum','average','median','log',
        'from_json','to_json','is_defined','is_number','has_value','contains',
        'base64_encode','base64_decode','ordinal','bitwise_and','bitwise_or','pack','unpack',
      ],
    };
  }
  static get DEVICE_CLASSES() {
    return {
      sensor: [
        'apparent_power','aqi','atmospheric_pressure','battery','carbon_dioxide','carbon_monoxide',
        'current','data_rate','data_size','date','distance','duration','energy','energy_storage',
        'enum','frequency','gas','humidity','illuminance','irradiance','moisture','monetary',
        'nitrogen_dioxide','nitrogen_monoxide','nitrous_oxide','ozone','ph','pm1','pm10','pm25',
        'power','power_factor','precipitation','precipitation_intensity','pressure','reactive_power',
        'signal_strength','sound_pressure','speed','sulphur_dioxide','temperature',
        'volatile_organic_compounds','volatile_organic_compounds_parts','voltage','volume',
        'volume_flow_rate','volume_storage','water','weight','wind_speed',
      ],
      binary_sensor: [
        'battery','battery_charging','carbon_monoxide','cold','connectivity','door','garage_door',
        'gas','heat','light','lock','moisture','motion','moving','occupancy','opening','plug',
        'power','presence','problem','running','safety','smoke','sound','tamper','update',
        'vibration','window',
      ],
      state_class: ['measurement','total','total_increasing'],
    };
  }
  static get COMMON_ISSUES() {
    return [
      {
        cat: 'Indentation',
        items: [
          { title: 'Mixing spaces and tabs', desc: 'YAML requires spaces — tabs are not allowed. Use 2 or 4 spaces consistently throughout the file.', severity: 'error' },
          { title: 'Bad indentation depth', desc: 'List items (-) must be at the same level. Child keys must have greater indentation than parent.', severity: 'warning' },
        ]
      },
      {
        cat: 'Text Strings',
        items: [
          { title: 'Missing quotes for special characters', desc: 'If value contains : # & * ? | < > = ! wrap it in quotes. E.g., name: "Sensor: Main"', severity: 'warning' },
          { title: 'Templates with quotes', desc: 'Jinja2 templates with apostrophes inside: use inner double quotes, or vice versa. E.g., "{{ states(\'sensor.temp\') }}"', severity: 'warning' },
          { title: 'Multiline text', desc: 'For long strings use | (literal) or > (folded).\nmessage: |\n  Line 1\n  Line 2', severity: 'info' },
        ]
      },
      {
        cat: 'Automations',
        items: [
          { title: 'Missing alias field', desc: 'Every automation should have a unique alias — helps debugging in Trace Viewer.', severity: 'warning' },
          { title: 'Missing mode field', desc: 'Default mode is "single" — add explicit for clarity. Options: single, parallel, queued, restart.', severity: 'info' },
          { title: 'Duplicate ID', desc: 'Each id: must be unique in automations.yaml. Duplicates cause automation to be overwritten.', severity: 'error' },
        ]
      },
      {
        cat: 'Packages',
        items: [
          { title: 'Key conflicts between files', desc: 'Packages are merged. If two packages define the same key, the younger overwrites the older.', severity: 'warning' },
          { title: 'Missing namespace', desc: 'Use a prefix e.g., input_boolean.baby_ not input_boolean without prefix.', severity: 'info' },
        ]
      },
      {
        cat: 'Deprecated / Stara skladnia',
        items: [
          { title: 'data_template:', desc: 'Od HA 2021.12: uzyj data: z Jinja2 zamiast data_template:', severity: 'warning' },
          { title: 'trigger/condition/action (lp)', desc: 'Od HA 2024.4: uzyj triggers:/conditions:/actions: (l. mnoga)', severity: 'info' },
          { title: 'initial: on/off', desc: 'Uzyj true/false zamiast on/off', severity: 'warning' },
          { title: 'entity_namespace', desc: 'Usuniety z HA 2022.x', severity: 'error' },
        ]
      },
      {
        cat: this._lang === 'pl' ? 'Encje i szablony' : 'Entities & templates',
        items: [
          { title: this._lang === 'pl' ? 'Referencja do nieistniej\u0105cej encji' : 'Reference to non-existent entity', desc: this._lang === 'pl' ? 'entity_id wskazuj\u0105ce na nieistn. encj\u0119 nie powoduj\u0105 b\u0142\u0119du YAML, ale automatyzacja nie zadzia\u0142a. Sprawd\u017A nazwy w Dev Tools \u203A States.' : 'An entity_id pointing to a non-existent entity won\'t cause a YAML error, but the automation won\'t work. Check names in Dev Tools \u203A States.', severity: 'warning' },
          { title: this._lang === 'pl' ? 'Zawi\u0105zane zale\u017Cno\u015Bci w szablonach' : 'Broken template dependencies', desc: this._lang === 'pl' ? 'Szablon kt\u00F3ry odwo\u0142uje si\u0119 do encji kt\u00F3ra nie istnieje zwr\u00F3ci "unknown". Testuj szablony w Dev Tools \u203A Template.' : 'A template referencing a non-existent entity will return "unknown". Test templates in Dev Tools \u203A Template.', severity: 'info' },
        ]
      },
    ];
  }

  set hass(hass) {
    try {
      var _bg = (getComputedStyle(this).getPropertyValue('--card-background-color') || getComputedStyle(this).getPropertyValue('--primary-background-color') || '').trim();
      var _d = false;
      if (_bg) {
        var _h, _r, _g, _b, _m;
        if (_bg.charAt(0) === '#') { _h = _bg.slice(1); if (_h.length === 3) _h = _h.replace(/(.)/g, '$1$1'); _r = parseInt(_h.slice(0,2),16); _g = parseInt(_h.slice(2,4),16); _b = parseInt(_h.slice(4,6),16); }
        else { _m = _bg.match(/[\d.]+/g); if (_m) { _r = +_m[0]; _g = +_m[1]; _b = +_m[2]; } }
        if (_r != null) _d = (0.2126*_r + 0.7152*_g + 0.0722*_b) / 255 < 0.5;
      } else if (hass && hass.themes) { _d = !!hass.themes.darkMode; }
      this.classList.toggle('bento-dark', _d);
    } catch (e) {}

    if (hass?.language) this._lang = hass.language.startsWith('pl') ? 'pl' : 'en';    this._hass = hass;
    if (!hass) return;
    if (!this._firstRender) {
      this._firstRender = true;
      this._render();
    }
  }

  get _t() {
    const T = {
      pl: {
        title: 'Sprawdzanie YAML',
        loading: 'Wczytywanie...',
        noData: 'Brak danych',
        error: 'B\u0142\u0105d',
        check: 'Sprawd\u017A',
        scan: 'Skanuj',
        valid: 'Poprawny',
        invalid: 'Niepoprawny',
        configCheck: 'Sprawdzanie konfiguracji',
        pasteCheck: 'Wklej i sprawd\u017A',
        entityCheck: 'Encja',
        templateCheck: 'Szablon',
        errors: 'B\u0142\u0119dy',
        warnings: 'Ostrze\u017Cenia',
        ok: 'OK',
        configOk: 'Konfiguracja poprawna',
        configError: 'Znaleziono b\u0142\u0119dy',
        allOk: 'Wszystko w porz\u0105dku!',
        areas: 'Obszar\u00F3w',
        components: 'Komponent\u00F3w',
        logErrors: 'B\u0142\u0119d\u00F3w w logu',
        logWarnings: 'Ostrze\u017Ce\u0144 w logu',
        entities: 'Encji',
        devices: 'Devices',
        configDirLabel: 'Config directory',
        configFilesNote: 'Config files (status unknown \u2014 HA API does not expose file contents)',
        trailingWhitespace: 'Trailing whitespace',
        emptyValue: 'Empty value for key "{key}" \u2014 verify if intentional',
        inconsistentIndent: 'Inconsistent indentation: mixed 2-space ({count2}x) and 4-space ({count4}x). Recommended: 2 spaces.',
        duplicateRootKey: 'Duplicate root-level key: "{key}" (first: line {line})',
        possibleUnquotedColon: 'Possible issue: value contains ":" without quotes: {value}',
        automationNoAlias: 'Automation without alias field \u2014 add alias for better debugging',
        triggerOldFormat: 'HA 2024.4+: use "triggers:" instead of "trigger:" (deprecated format)',
        conditionOldFormat: 'HA 2024.4+: use "conditions:" instead of "condition:" (deprecated format)',
        actionOldFormat: 'HA 2024.4+: use "actions:" instead of "action:" (deprecated format)',
        entityIdConvention: 'Convention: entity_id lowercase_snake_case',
        modeSingleDefault: '"mode: single" is default \u2014 can be omitted',
        delayBestPractice: 'Best practice: delay with seconds/milliseconds (e.g., delay: {seconds: 5})',
        secretWarning: 'Security: potential secret without !secret \u2014 use secrets.yaml',
        serviceRenamed: 'Service renamed: {old} \u2192 {new} (HA {version})',
        brightnessNote: 'brightness: {value} (0-255) \u2014 consider brightness_pct: 0-100',
        oldStateFormat: 'Old format: states.domain.entity \u2192 use states("domain.entity")',
        missingQuotes: 'Missing quotes in argument: {arg}',
        unknownTemplateFunction: 'Unknown template function: "{name}"',
        unknownFilter: 'Unknown filter: "{name}"',
        invalidStateClass: 'Invalid state_class: "{value}" \u2014 allowed: {allowed}',
        unknownDeviceClass: 'Unknown device_class: "{value}"',
        availabilityTemplate: 'Best practice: add availability_template with value_template',
        jinja2SyntaxError: 'Check {% set %} syntax',
        pasteYamlLabel: 'Paste YAML to check',
        clearBtn: 'Clear',
        validateBtn: 'Validate YAML',
        checkConfigBtn: 'Check HA Configuration',
        checkConfigInfo: "Runs HA's built-in validator (homeassistant.check_config). Detects YAML syntax errors and invalid configuration keys.",
        clickToCheck: 'Click the button to check configuration',
        checkingConfig: 'Checking HA configuration...',
        pasteHint: 'Paste YAML file content here...',
        clientValidation: 'client-side validation',
        scanEntitiesBtn: 'Scan Entities',
        scanEntityInfo: 'Scans entity names, templates, and YAML syntax for common encoding issues',
        scanEntityHint: 'Scanning for potential issues...',
        checkTemplateBtn: 'Check Template',
        templateLabel: 'Template:',
        scanSystemBtn: 'Scan System',
        entityCheckInfo: 'Scans automations and scripts for references to non-existent entities. Helps find broken entity_id after device name change.',
        analyzingEntities: 'Analyzing entities...',
        clickToScanEntities: 'Click the button to scan entities',
        templateTesterInfo: 'Test Jinja2 templates directly via HA API. Same as Dev Tools › Template, but built into the card.',
        jinja2Template: 'Jinja2 Template',
        executingTemplate: 'Executing template...',
        result: 'Result',
        executeTemplate: 'Execute Template',
        locale: (this._lang === 'pl' ? 'pl-PL' : 'en-US'),
        guideTabLabel: '📖 Guide',
        automationsDesc: 'Automations',
        brokenRefsTitle: 'Broken References',
        noRefs: 'No broken references!',
        unavailableTitle: 'Unavailable/Unknown Entities',
        noDescTitle: 'Automations without Description',
        scanSystemInfo: 'HA system information: version, entity, device, area, and component counts.',
        clickToScanSystem: 'Click the button to scan system',
        partialError: 'Partial Error',
        critical: 'critical',
        fileHint: 'To check file contents use: Paste & Validate or HA File Editor addon.',
        moreCount: '...and {count} more',
        entitiesWithoutFriendlyName: 'Entities without friendly_name',
        topDomains: 'Top domains',
      },
      en: {
        title: 'YAML Checker',
        loading: 'Loading...',
        noData: 'No data',
        error: 'Error',
        check: 'Check',
        scan: 'Scan',
        valid: 'Valid',
        invalid: 'Invalid',
        configCheck: 'Config check',
        pasteCheck: 'Paste & check',
        entityCheck: 'Entity',
        templateCheck: 'Template',
        errors: 'Errors',
        warnings: 'Warnings',
        ok: 'OK',
        configOk: 'Configuration valid',
        configError: 'Errors found',
        allOk: 'All good!',
        areas: 'Areas',
        components: 'Components',
        logErrors: 'Log errors',
        logWarnings: 'Log warnings',
        entities: 'Entities',
        devices: 'Devices',
        configDirLabel: 'Config directory',
        configFilesNote: 'Config files (status unknown \u2014 HA API does not expose file contents)',
        trailingWhitespace: 'Trailing whitespace',
        emptyValue: 'Empty value for key "{key}" — verify if intentional',
        inconsistentIndent: 'Inconsistent indentation: mixed 2-space ({count2}x) and 4-space ({count4}x). Recommended: 2 spaces.',
        duplicateRootKey: 'Duplicate root-level key: "{key}" (first: line {line})',
        possibleUnquotedColon: 'Possible issue: value contains ":" without quotes: {value}',
        automationNoAlias: 'Automation without alias field — add alias for better debugging',
        triggerOldFormat: 'HA 2024.4+: use "triggers:" instead of "trigger:" (deprecated format)',
        conditionOldFormat: 'HA 2024.4+: use "conditions:" instead of "condition:" (deprecated format)',
        actionOldFormat: 'HA 2024.4+: use "actions:" instead of "action:" (deprecated format)',
        entityIdConvention: 'Convention: entity_id lowercase_snake_case',
        modeSingleDefault: '"mode: single" is default — can be omitted',
        delayBestPractice: 'Best practice: delay with seconds/milliseconds (e.g., delay: {seconds: 5})',
        secretWarning: 'Security: potential secret without !secret — use secrets.yaml',
        serviceRenamed: 'Service renamed: {old} → {new} (HA {version})',
        brightnessNote: 'brightness: {value} (0-255) — consider brightness_pct: 0-100',
        oldStateFormat: 'Old format: states.domain.entity → use states("domain.entity")',
        missingQuotes: 'Missing quotes in argument: {arg}',
        unknownTemplateFunction: 'Unknown template function: "{name}"',
        unknownFilter: 'Unknown filter: "{name}"',
        invalidStateClass: 'Invalid state_class: "{value}" — allowed: {allowed}',
        unknownDeviceClass: 'Unknown device_class: "{value}"',
        availabilityTemplate: 'Best practice: add availability_template with value_template',
        jinja2SyntaxError: 'Check {% set %} syntax',
        pasteYamlLabel: 'Paste YAML to check',
        clearBtn: 'Clear',
        validateBtn: 'Validate YAML',
        checkConfigBtn: 'Check HA Configuration',
        checkConfigInfo: "Runs HA's built-in validator (homeassistant.check_config). Detects YAML syntax errors and invalid configuration keys.",
        clickToCheck: 'Click the button to check configuration',
        checkingConfig: 'Checking HA configuration...',
        pasteHint: 'Paste YAML file content here...',
        clientValidation: 'client-side validation',
        scanEntitiesBtn: 'Scan Entities',
        scanEntityInfo: 'Scans entity names, templates, and YAML syntax for common encoding issues',
        scanEntityHint: 'Scanning for potential issues...',
        checkTemplateBtn: 'Check Template',
        templateLabel: 'Template:',
        scanSystemBtn: 'Scan System',
        entityCheckInfo: 'Scans automations and scripts for references to non-existent entities. Helps find broken entity_id after device name change.',
        analyzingEntities: 'Analyzing entities...',
        clickToScanEntities: 'Click the button to scan entities',
        templateTesterInfo: 'Test Jinja2 templates directly via HA API. Same as Dev Tools › Template, but built into the card.',
        jinja2Template: 'Jinja2 Template',
        executingTemplate: 'Executing template...',
        result: 'Result',
        executeTemplate: 'Execute Template',
        locale: 'en-US',
        guideTabLabel: '📖 Guide',
        automationsDesc: 'Automations',
        brokenRefsTitle: 'Broken References',
        noRefs: 'No broken references!',
        unavailableTitle: 'Unavailable/Unknown Entities',
        noDescTitle: 'Automations without Description',
        scanSystemInfo: 'HA system information: version, entity, device, area, and component counts.',
        clickToScanSystem: 'Click the button to scan system',
        partialError: 'Partial Error',
        critical: 'critical',
        fileHint: 'To check file contents use: Paste & Validate or HA File Editor addon.',
        moreCount: '...and {count} more',
        entitiesWithoutFriendlyName: 'Entities without friendly_name',
        topDomains: 'Top domains',
      },
    };
    return T[this._lang] || T.en;
  }

  setConfig(config) {
    this._config = config
    // Load persisted UI state
    try {
      const _saved = localStorage.getItem('ha-tools-yaml-checker-settings');
      if (_saved) {
        const _s = JSON.parse(_saved);
        if (_s._activeTab) this._activeTab = _s._activeTab;
      }
    } catch(e) { console.debug('[ha-yaml-checker] caught:', e); }
  }

  getCardSize() { return 8; }
  getGridOptions() { return { rows: 8, columns: 12, min_rows: 3, min_columns: 6 }; }

  _sanitize(s) { try { return decodeURIComponent(escape(s)); } catch(e) { return s; } }

  _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── HA Config Check ──────────────────────────────────────────────────────
  async _runConfigCheck() {
    if (this._checkLoading) return;
    this._checkLoading = true;
    this._checkResult = null;
    this._updateTab('config-check');

    try {
      const result = await this._hass.callApi('POST', 'config/core/check_config');
      // HA API returns errors/warnings as string or null, not array
      const rawErrors = result.errors;
      const rawWarnings = result.warnings;
      const parseMessages = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.map(e => typeof e === 'string' ? { message: e } : e);
        if (typeof raw === 'string') {
          // Split multi-line error string into individual messages
          return raw.split('\n').filter(l => l.trim()).map(line => {
            // Try to extract component and details
            const match = line.match(/^(?:Invalid config for \[(\w+)\]:?\s*)?(.+)/i);
            return { message: line, component: match ? match[1] : null, detail: match ? match[2] : line };
          });
        }
        return [{ message: JSON.stringify(raw) }];
      };
      this._checkResult = {
        ok: result.result === 'valid',
        errors: parseMessages(rawErrors),
        warnings: parseMessages(rawWarnings),
        raw: result,
        ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')),
      };
    } catch (e) {
      try {
        await this._hass.callService('homeassistant', 'check_config', {});
        this._checkResult = {
          ok: true,
          errors: [],
          warnings: [],
          ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')),
          note: this._lang === 'pl' ? 'Sprawdzenie przez service (bez szczeg\u00F3\u0142\u00F3w b\u0142\u0119d\u00F3w)' : 'Checked via service (without error details)',
        };
      } catch (e2) {
        this._checkResult = {
          ok: false,
          errors: [{ message: e.message || String(e) }],
          warnings: [],
          ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')),
          apiError: true,
        };
      }
    }
    this._checkLoading = false;
    this._updateTab('config-check');
  }

  // ── Entity Validator ─────────────────────────────────────────────────────
  async _runEntityValidation() {
    if (this._entityLoading) return;
    this._entityLoading = true;
    this._entityResult = null;
    this._updateTab('entity-validator');

    try {
      // Fetch all states (all entity IDs)
      const states = this._hass.states;
      const allEntityIds = new Set(Object.keys(states));

      // Fetch automations via REST
      let automations = [];
      try {
        automations = await this._hass.callApi('GET', 'config/automation/config');
        if (!Array.isArray(automations)) automations = [];
      } catch (e) {
        // Fallback: filter states for automation.*
        automations = Object.values(states)
          .filter(s => s.entity_id.startsWith('automation.'))
          .map(s => ({ id: s.entity_id, alias: s.attributes.friendly_name || s.entity_id }));
      }

      // Fetch scripts
      let scripts = [];
      try {
        scripts = await this._hass.callApi('GET', 'config/script/config');
        if (typeof scripts === 'object' && !Array.isArray(scripts)) {
          scripts = Object.entries(scripts).map(([id, cfg]) => ({ id, ...cfg }));
        }
      } catch (e) { /* ok */ }

      // Count domain stats
      const domainCounts = {};
      for (const id of allEntityIds) {
        const domain = id.split('.')[0];
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }

      // Find broken entity refs in automation triggers/conditions/actions
      const broken = [];
      const checked = [];
      const dupIds = [];

      const seenIds = {};
      for (const auto of automations) {
        // Check duplicate automation IDs
        const autoId = auto.id || auto.entity_id || '';
        if (autoId && seenIds[autoId]) {
          dupIds.push({ id: autoId, alias: auto.alias || autoId });
        } else if (autoId) {
          seenIds[autoId] = true;
        }

        // Extract entity refs from automation
        const text = JSON.stringify(auto);
        const entityMatches = text.match(/[a-z_]+\.[a-z0-9_]+/g) || [];
        const DOMAINS = ['light','switch','sensor','binary_sensor','input_boolean','input_number',
          'input_select','input_datetime','input_text','automation','script','scene','person',
          'device_tracker','media_player','climate','cover','fan','vacuum','camera','lock',
          'alarm_control_panel','weather','sun','zone','group','counter','timer','number',
          'select','button','text','event'];

        for (const ref of new Set(entityMatches)) {
          const domain = ref.split('.')[0];
          if (!DOMAINS.includes(domain)) continue;
          if (ref.includes('{{') || ref.includes('}}')) continue;
          if (!allEntityIds.has(ref)) {
            broken.push({
              entity: ref,
              in: auto.alias || auto.id || 'automation',
              type: 'automation',
            });
          } else {
            checked.push(ref);
          }
        }
      }

      // Check input_boolean, input_number, etc. references in scripts
      for (const scr of scripts) {
        const text = JSON.stringify(scr);
        const entityMatches = text.match(/[a-z_]+\.[a-z0-9_]+/g) || [];
        const DOMAINS = ['light','switch','sensor','binary_sensor','input_boolean','input_number','input_select'];
        for (const ref of new Set(entityMatches)) {
          const domain = ref.split('.')[0];
          if (!DOMAINS.includes(domain)) continue;
          if (!allEntityIds.has(ref)) {
            broken.push({
              entity: ref,
              in: scr.alias || scr.id || 'script',
              type: 'script',
            });
          }
        }
      }

      // Deduplicate broken
      const brokenMap = {};
      for (const b of broken) {
        const key = b.entity + '|' + b.in;
        if (!brokenMap[key]) brokenMap[key] = b;
      }
      const brokenUniq = Object.values(brokenMap);

      // FUNC-1: Check unavailable/unknown entities
      const problemStates = Object.entries(this._hass.states)
        .filter(([id, s]) => ['unavailable', 'unknown'].includes(s.state))
        .map(([id, s]) => ({ entity: id, state: s.state, name: s.attributes?.friendly_name || id }));

      // FUNC-1: Check entities without friendly_name
      const noFriendlyName = Object.entries(this._hass.states)
        .filter(([id, s]) => !s.attributes?.friendly_name)
        .map(([id]) => id)
        .slice(0, 50);

      // FUNC-1: Check automations without description
      const autoNoDesc = automations
        .filter(a => !a.description)
        .map(a => ({ id: a.id || a.entity_id || '?', alias: a.alias || '(brak alias)' }));

      // Enhanced: Check for scripts referenced in automations
      const scriptRefs = [];
      automations.forEach((auto) => {
        const autoStr = JSON.stringify(auto);
        const scripts_used = new Set();
        const scriptMatches = autoStr.match(/"service"\s*:\s*"script\.([a-z0-9_]+)"/gi) || [];
        scriptMatches.forEach(call => {
          const scriptId = call.match(/script\.([a-z0-9_]+)/i)[1];
          const scriptEntity = `script.${scriptId}`;
          if (!allEntityIds.has(scriptEntity) && !scripts_used.has(scriptId)) {
            scriptRefs.push({ auto: auto.alias || auto.id || '?', script: scriptEntity });
            scripts_used.add(scriptId);
          }
        });
      });

      // Enhanced: Check for scene references
      const sceneRefs = [];
      automations.forEach((auto) => {
        const autoStr = JSON.stringify(auto);
        const sceneMatches = autoStr.match(/"scene"\s*:\s*"([^"]+)"/gi) || [];
        sceneMatches.forEach(call => {
          const sceneId = call.match(/"([^"]+)"/)[1];
          if (sceneId.startsWith('scene.') && !allEntityIds.has(sceneId)) {
            sceneRefs.push({ auto: auto.alias || auto.id || '?', scene: sceneId });
          }
        });
      });

      // Enhanced: Check for input helper references
      const inputRefs = [];
      const inputTypes = ['input_boolean', 'input_number', 'input_select', 'input_text', 'input_datetime'];
      automations.forEach((auto) => {
        const autoStr = JSON.stringify(auto);
        inputTypes.forEach(inputType => {
          const regex = new RegExp(`"${inputType}\\.([a-z0-9_]+)"`, 'gi');
          let match;
          while ((match = regex.exec(autoStr)) !== null) {
            const fullId = `${inputType}.${match[1]}`;
            if (!allEntityIds.has(fullId)) {
              inputRefs.push({ auto: auto.alias || auto.id || '?', helper: fullId });
            }
          }
        });
      });

      this._entityResult = {
        totalEntities: allEntityIds.size,
        totalAutomations: automations.length,
        totalScripts: scripts.length,
        domainCounts,
        broken: brokenUniq,
        dupIds,
        problemStates,
        noFriendlyName,
        autoNoDesc,
        scriptRefs,
        sceneRefs,
        inputRefs,
        checkedCount: new Set(checked).size,
        ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')),
      };
    } catch (e) {
      this._entityResult = { error: e.message || String(e), ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) };
    }

    this._entityLoading = false;
    this._updateTab('entity-validator');
  }

  // ── File Scanner ─────────────────────────────────────────────────────────
  async _runFileScan() {
    if (this._scanLoading) return;
    this._scanLoading = true;
    this._scanResult = { files: [], ts: null };
    this._updateTab('file-scanner');

    try {
      const configInfo = await this._hass.callApi('GET', 'config');
      const entityReg = await this._hass.callApi('GET', 'config/entity_registry/list');
      const deviceReg = await this._hass.callApi('GET', 'config/device_registry/list');
      const areaReg = await this._hass.callApi('GET', 'config/area_registry/list');
      const haVersion = configInfo.version || '?';
      const entityCount = Array.isArray(entityReg) ? entityReg.length : '?';
      const deviceCount = Array.isArray(deviceReg) ? deviceReg.length : '?';
      const areaCount = Array.isArray(areaReg) ? areaReg.length : '?';

      // Try to get log tail for errors
      let logErrors = 0;
      let logWarnings = 0;
      try {
        const logs = await this._hass.callApi('GET', 'error_log');
        if (typeof logs === 'string') {
          logErrors = (logs.match(/ERROR/g) || []).length;
          logWarnings = (logs.match(/WARNING/g) || []).length;
        }
      } catch(e) { /* no log access */ }

      // Check uptime via recorder / system health
      let uptime = null;
      try {
        const sysHealth = await this._hass.callApi('GET', 'system_health');
        if (sysHealth && sysHealth.homeassistant && sysHealth.homeassistant.info) {
          uptime = sysHealth.homeassistant.info.run_as_root !== undefined
            ? null
            : sysHealth.homeassistant.info;
        }
      } catch(e) { /* no system_health */ }

      this._scanResult = {
        haVersion,
        entityCount,
        deviceCount,
        areaCount,
        logErrors,
        logWarnings,
        configDir: configInfo.config_dir || '?',
        components: configInfo.components ? configInfo.components.length : '?',
        unit: configInfo.unit_system ? configInfo.unit_system.length_unit || 'km' : '?',
        ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')),
        files: HAYamlChecker.KEY_FILES.map(f => ({ ...f, status: 'unknown' })),
      };
    } catch (e) {
      this._scanResult = {
        files: HAYamlChecker.KEY_FILES.map(f => ({ ...f, status: 'unknown' })),
        ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')),
        error: e.message,
      };
    }

    this._scanLoading = false;
    this._updateTab('file-scanner');
  }

  // ── Template Tester ──────────────────────────────────────────────────────
  async _runTemplateTester() {
    const template = this._templateValue;
    if (!template.trim()) return;
    if (this._templateLoading) return;
    this._templateLoading = true;
    this._templateResult = null;
    this._updateTab('template-tester');

    try {
      const result = await this._hass.callApi('POST', 'template', { template });
      this._templateResult = { ok: true, value: result, ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) };
    } catch (e) {
      this._templateResult = { ok: false, error: e.message || String(e), ts: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) };
    }

    this._templateLoading = false;
    this._updateTab('template-tester');
  }

  // ── Paste & Validate ─────────────────────────────────────────────────────
  _validateYAML(text) {
    const errors = [];
    const warnings = [];
    const lines = text.split('\n');

    // Indentation consistency: detect mix of 2-space and 4-space
    const indentLevels = { 2: 0, 4: 0 };
    lines.forEach((line, i) => {
      if (/^\t/.test(line)) {
        errors.push({ line: i + 1, msg: 'Tab zamiast spacji \u2014 YAML nie obs\u0142uguje tab\u00F3w do wci\u0119cia', severity: 'error' });
      }
      // Trailing spaces
      if (/\s+$/.test(line) && line.trim().length > 0) {
        warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Spacja na ko\u0144cu linii (trailing whitespace)' : this._t.trailingWhitespace, severity: 'info' });
      }
      // Empty value (key with no value)
      const emptyVal = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):\s*$/);
      if (emptyVal && !line.trim().startsWith('#')) {
        warnings.push({ line: i + 1, msg: this._lang === 'pl' ? `Pusta warto\u015B\u0107 dla klucza "${emptyVal[2]}" \u2014 sprawdz czy zamierzone` : this._t.emptyValue.replace('{key}', emptyVal[2]), severity: 'info' });
      }
      // Count indent styles
      const leadMatch = line.match(/^( +)/);
      if (leadMatch) {
        const spaces = leadMatch[1].length;
        if (spaces % 4 === 0) indentLevels[4]++;
        else if (spaces % 2 === 0) indentLevels[2]++;
      }
    });
    if (indentLevels[2] > 0 && indentLevels[4] > 0) {
      warnings.push({ line: 0, msg: this._t.inconsistentIndent.replace('{count2}', indentLevels[2]).replace('{count4}', indentLevels[4]), severity: 'warning' });
    }

    // Check duplicate root keys
    const rootKeys = {};
    lines.forEach((line, i) => {
      const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
      if (match) {
        const key = match[1];
        if (rootKeys[key] !== undefined) {
          warnings.push({ line: i + 1, msg: this._t.duplicateRootKey.replace('{key}', key).replace('{line}', rootKeys[key] + 1), severity: 'warning' });
        } else {
          rootKeys[key] = i;
        }
      }
    });

    // Check unquoted colons in values
    lines.forEach((line, i) => {
      if (line.trim().startsWith('#')) return;
      const valueMatch = line.match(/^[\s-]*[a-zA-Z_][^:]*:\s+(.+)$/);
      if (valueMatch) {
        const val = valueMatch[1].trim();
        if (!val.startsWith('"') && !val.startsWith("'") && !val.startsWith('{') && !val.startsWith('[') && !val.startsWith('|') && !val.startsWith('>')) {
          if (/[^{]:/.test(val)) {
            warnings.push({ line: i + 1, msg: this._lang === 'pl' ? `Mo\u017Cliwy problem: warto\u015B\u0107 zawiera ":" bez cudzys\u0142ow\u00F3w: ${val.substring(0, 60)}` : this._t.possibleUnquotedColon.replace('{value}', val.substring(0, 60)), severity: 'warning' });
          }
        }
      }
    });

    // Check HA automations specific: missing alias
    const hasAutomation = lines.some(l => /^- (id:|alias:)/.test(l.trim()));
    if (hasAutomation) {
      let inBlock = false;
      let hasAlias = false;
      let blockStart = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('- id:') || line.startsWith('- alias:')) {
          if (inBlock && !hasAlias) {
            warnings.push({ line: blockStart + 1, msg: this._lang === 'pl' ? 'Automatyzacja bez pola alias \u2014 dodaj alias dla lepszego debugowania' : this._t.automationNoAlias, severity: 'warning' });
          }
          inBlock = true;
          hasAlias = line.startsWith('- alias:');
          blockStart = i;
        } else if (inBlock) {
          if (line.startsWith('alias:')) hasAlias = true;
          if (line.startsWith('- ') && !line.startsWith('- id:') && !line.startsWith('- alias:') && !line.startsWith('- trigger') && !line.startsWith('- condition') && !line.startsWith('- action')) {
            // Might be start of another automation
          }
        }
      }
    }

    // Check Jinja2 template syntax (basic)
    lines.forEach((line, i) => {
      const templateMatches = line.match(/\{\{[^}]*\}\}/g) || [];
      for (const tmpl of templateMatches) {
        if ((tmpl.match(/\{\{/g) || []).length !== (tmpl.match(/\}\}/g) || []).length) {
          errors.push({ line: i + 1, msg: `Niezamkni\u0119ty szablon Jinja2: ${tmpl.substring(0, 50)}`, severity: 'error' });
        }
      }
    });

    // ── Check for include directives ──────────────────────────────────
    const includePattern = /(!include(?:_dir)?(?:_merge_)?(?:named|list)?\s+)([^\s#]+)/;
    lines.forEach((line, i) => {
      const match = line.match(includePattern);
      if (match) {
        warnings.push({
          line: i + 1,
          msg: `Include: ${match[1].trim()} referenced file "${match[2]}" — verify path relative to config/`,
          severity: 'info'
        });
      }
    });

    // Check for common HA mistakes: trigger: instead of triggers:
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t === 'trigger:') warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'HA 2024.4+: u\u017Cyj "triggers:" zamiast "trigger:" (starszy format)' : this._t.triggerOldFormat, severity: 'info' });
      if (t === 'condition:') warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'HA 2024.4+: u\u017Cyj "conditions:" zamiast "condition:" (starszy format)' : this._t.conditionOldFormat, severity: 'info' });
      if (t === 'action:') warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'HA 2024.4+: u\u017Cyj "actions:" zamiast "action:" (starszy format)' : this._t.actionOldFormat, severity: 'info' });
    });

    // Deprecated syntax (F4)
    if (typeof HAYamlChecker !== 'undefined' && HAYamlChecker.DEPRECATED_PATTERNS) {
      HAYamlChecker.DEPRECATED_PATTERNS.forEach(dp => {
        lines.forEach((line, i) => {
          if (line.trim().startsWith('#')) return;
          if (dp.pattern.test(line)) {
            warnings.push({ line: i + 1, msg: dp.msg, severity: dp.severity });
          }
        });
      });
    }
    // Best practice lint (F3)
    lines.forEach((line, i) => {
      const t = line.trim();
      if (/entity_id:\s*\w+\.\w*[A-Z]/.test(t)) warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Konwencja: entity_id lowercase_snake_case' : this._t.entityIdConvention, severity: 'info' });
      if (t === 'mode: single') warnings.push({ line: i + 1, msg: this._lang === 'pl' ? '"mode: single" jest domyslny \u2014 mozna pominac' : this._t.modeSingleDefault, severity: 'info' });
         if (/delay:\s*['"]\d+['"]/.test(t)) warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Best practice: delay z seconds/milliseconds (np. delay: {seconds: 5})' : this._t.delayBestPractice, severity: 'info' });
         if (/secret|password|api_key|token/i.test(t) && !/!secret/.test(t) && !t.trim().startsWith('#')) warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Security: potencjalny sekret bez !secret — uzyj secrets.yaml' : this._t.secretWarning, severity: 'warning' });
    });

    // ── Check for deprecated/renamed services ──────────────────────────────
    const servicePattern = /service:\s*["']?([a-z_]+\.[a-z_]+)["']?/i;
    lines.forEach((line, i) => {
      if (line.trim().startsWith('#')) return;
      const match = line.match(servicePattern);
      if (match) {
        const service = match[1].toLowerCase();
        const mapping = HAYamlChecker.SERVICE_MAPPINGS?.[service];
        if (mapping) {
          if (mapping.replacement) {
            warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Service renamed: ' + service + ' \u2192 ' + mapping.replacement + ' (HA ' + mapping.version + ')' : this._t.serviceRenamed.replace('{old}', service).replace('{new}', mapping.replacement).replace('{version}', mapping.version), severity: mapping.severity || 'warning' });
          } else if (mapping.note) {
            warnings.push({ line: i + 1, msg: mapping.note, severity: mapping.severity || 'info' });
          }
        }
      }
      if (/brightness:\s*(\d+)/.test(line)) {
        const bm = line.match(/brightness:\s*(\d+)/);
        if (bm && parseInt(bm[1]) > 100) {
          warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'brightness: ' + bm[1] + ' (0-255) \u2014 rozwa\u017C brightness_pct: 0-100' : this._t.brightnessNote.replace('{value}', bm[1]), severity: 'info' });
        }
      }
    });

    // ── Check Jinja2 functions and filters ────────────────────────────────
    const j2f = HAYamlChecker.JINJA2_FUNCTIONS;
    if (j2f) {
      const allFuncs = new Set(j2f.functions);
      const allFilters = new Set(j2f.filters);
      const builtinJinja = new Set(['range','loop','caller','cycler','joiner','undefined','true','false','none','lipsum']);
      lines.forEach((line, i) => {
        if (line.trim().startsWith('#')) return;
        const tplBlocks = line.match(/\{\{[^}]*\}\}/g) || [];
        for (const block of tplBlocks) {
          if (/states\.[a-z_]+\.[a-z0-9_]+/.test(block)) {
            warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Stary zapis: states.domain.entity \u2192 u\u017Cyj states("domain.entity")' : this._t.oldStateFormat, severity: 'warning' });
          }
          const unquotedArgs = block.match(/(?:states|is_state|state_attr|has_value)\(\s*([a-z_]+\.[a-z0-9_]+)\s*[,)]/g);
          if (unquotedArgs) {
            for (const ua of unquotedArgs) {
              if (!/['"]/.test(ua)) {
                warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Brak cudzys\u0142ow\u00F3w w argumencie: ' + ua.trim() : this._t.missingQuotes.replace('{arg}', ua.trim()), severity: 'warning' });
              }
            }
          }
          const funcCalls = block.match(/([a-z_]\w*)\s*\(/g) || [];
          for (const fc of funcCalls) {
            const name = fc.replace(/\s*\($/, '');
            if (!allFuncs.has(name) && !builtinJinja.has(name) && !allFilters.has(name)) {
              if (/^[a-z_]{2,}$/.test(name) && !['not','and','or','in','is','if','else','elif','for','set','end','macro','block','extends','include','import','from','as','with','without'].includes(name)) {
                warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Nieznana funkcja szablonu: "' + name + '"' : this._t.unknownTemplateFunction.replace('{name}', name), severity: 'warning' });
              }
            }
          }
        }
        const filterMatches = line.match(/\|\s*([a-z_]\w*)/g) || [];
        for (const fm of filterMatches) {
          const filterName = fm.replace(/^\|\s*/, '');
          if (filterName && !allFilters.has(filterName) && !allFuncs.has(filterName) && !builtinJinja.has(filterName)) {
            if (/^[a-z_]{2,}$/.test(filterName) && !['not','and','or','in','is','if','else','elif','for','set','end'].includes(filterName)) {
              warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Nieznany filtr: "' + filterName + '"' : this._t.unknownFilter.replace('{name}', filterName), severity: 'warning' });
            }
          }
        }
      });
    }

    // ── Sensor/template configuration validation ──────────────────────────
    lines.forEach((line, i) => {
      if (line.trim().startsWith('#')) return;
      const stateClassMatch = line.match(/state_class:\s*["']?(\w+)["']?/);
      if (stateClassMatch) {
        const dc = HAYamlChecker.DEVICE_CLASSES;
        if (dc && dc.state_class && !dc.state_class.includes(stateClassMatch[1].toLowerCase())) {
          warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Nieprawid\u0142owy state_class: "' + stateClassMatch[1] + '" \u2014 dozwolone: ' + dc.state_class.join(', ') : this._t.invalidStateClass.replace('{value}', stateClassMatch[1]).replace('{allowed}', dc.state_class.join(', ')), severity: 'warning' });
        }
      }
      const devClassMatch = line.match(/device_class:\s*["']?(\w+)["']?/);
      if (devClassMatch) {
        const dc = HAYamlChecker.DEVICE_CLASSES;
        if (dc) {
          const allClasses = [...(dc.sensor || []), ...(dc.binary_sensor || [])];
          if (allClasses.length && !allClasses.includes(devClassMatch[1].toLowerCase())) {
            warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Nieznany device_class: "' + devClassMatch[1] + '"' : this._t.unknownDeviceClass.replace('{value}', devClassMatch[1]), severity: 'warning' });
          }
        }
      }
      if (/^\s*value_template:/.test(line) && !/^\s*#/.test(line)) {
        const nearby = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 15)).join(' ');
        if (!/availability_template:|availability:/.test(nearby)) {
          warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Best practice: dodaj availability_template przy value_template' : this._t.availabilityTemplate, severity: 'info' });
        }
      }
    });

    // ── Jinja2 control flow validation ────────────────────────────────────
    const ifStack = [];
    const forStack = [];
    lines.forEach((line, i) => {
      const t = line.trim();
      if (/{%-?\s*if\s+/.test(t) && !/{%-?\s*elif\s+/.test(t)) ifStack.push({ line: i + 1, txt: t.substring(0, 40) });
      if (/{%-?\s*endif\s*-?%}/.test(t)) {
        if (ifStack.length === 0) errors.push({ line: i + 1, msg: '{% endif %} bez otwieraj\u0105cego {% if %}', severity: 'error' });
        else ifStack.pop();
      }
      if (/{%-?\s*for\s+/.test(t)) forStack.push({ line: i + 1, txt: t.substring(0, 40) });
      if (/{%-?\s*endfor\s*-?%}/.test(t)) {
        if (forStack.length === 0) errors.push({ line: i + 1, msg: '{% endfor %} bez otwieraj\u0105cego {% for %}', severity: 'error' });
        else forStack.pop();
      }
      if (/{%-?\s*set\s+/.test(t) && !/{%-?\s*set\s+\w+\s*=/.test(t) && !/{%-?\s*set\s+\w+\s*%}/.test(t)) {
        warnings.push({ line: i + 1, msg: this._lang === 'pl' ? 'Sprawd\u017A sk\u0142adni\u0119 {% set %}' : this._t.jinja2SyntaxError, severity: 'warning' });
      }
    });
    ifStack.forEach(b => errors.push({ line: b.line, msg: 'Niezamkni\u0119ty {% if %}: ' + b.txt + '...', severity: 'error' }));
    forStack.forEach(b => errors.push({ line: b.line, msg: 'Niezamkni\u0119ty {% for %}: ' + b.txt + '...', severity: 'error' }));

    return { errors, warnings, lineCount: lines.length };
  }

  // ── Render ───────────────────────────────────────────────────────────────
  _render() {
    if (!this._hass) return;
    this.shadowRoot.innerHTML = `<style>${window.HAToolsBentoCSS || ""}
/* === HA Tools split — premium banners (donate / intro / prereq) === */

/* Donation footer — diamond top */
.donate-section {  margin: 24px 0 4px; padding: 20px 24px; position: relative; overflow: hidden;  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.18); border-radius: var(--bento-radius-md, 18px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;  font-family: 'Inter', -apple-system, sans-serif;}
.donate-section::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.donate-section .donate-text { flex: 1; min-width: 240px; }
.donate-section h3 {  margin: 0 0 6px; font-size: 16px; font-weight: 700; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;}
.donate-section p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--bento-text-secondary, #57534e); letter-spacing: -0.005em; }
.donate-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.donate-btn {  display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;  border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: -0.005em;  text-decoration: none; transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, filter 0.2s;  border: 1px solid transparent;}
.donate-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.donate-btn.coffee {  background: linear-gradient(135deg, #FFDD00, #FFC700); color: #000;  box-shadow: 0 4px 14px -2px rgba(255, 221, 0, 0.4);}
.donate-btn.coffee:hover { box-shadow: 0 8px 24px -4px rgba(255, 221, 0, 0.55); }
.donate-btn.paypal {  background: linear-gradient(135deg, #0070ba, #005ea6); color: #fff;  box-shadow: 0 4px 14px -2px rgba(0, 112, 186, 0.45);}
.donate-btn.paypal:hover { box-shadow: 0 8px 24px -4px rgba(0, 112, 186, 0.6); }
:host(.bento-dark) .donate-section { background: linear-gradient(135deg, rgba(129,140,248,0.10), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.25); }
:host(.bento-dark) .donate-section h3 { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .donate-section p { color: #d6d3d1; }
@media (max-width: 600px) {  .donate-section { flex-direction: column; text-align: center; padding: 18px; }  .donate-buttons { justify-content: center; width: 100%; } }

/* Prereq banner — premium */
.prereq-banner {  display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px;  border-radius: var(--bento-radius-sm, 12px); margin: 0 0 16px;  font-size: 13px; line-height: 1.55; border: 1px solid;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  position: relative; overflow: hidden;}
.prereq-banner::before {  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;}
.prereq-banner.prereq-error { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.25); color: #991b1b; }
.prereq-banner.prereq-error::before { background: linear-gradient(180deg, #ef4444, #f87171); }
.prereq-banner.prereq-info  { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.25); color: #4338ca; }
.prereq-banner.prereq-info::before  { background: linear-gradient(180deg, #6366f1, #8b5cf6); }
.prereq-banner .prereq-icon { font-size: 22px; line-height: 1; padding-top: 2px; flex-shrink: 0; }
.prereq-banner .prereq-text { flex: 1; min-width: 0; }
.prereq-banner .prereq-text strong { font-weight: 700; letter-spacing: -0.01em; }
.prereq-banner code {  background: rgba(0,0,0,0.06); padding: 1px 7px; border-radius: 5px;  font-size: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace;  border: 1px solid rgba(0,0,0,0.08);}
.prereq-banner .prereq-cta {  display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 10px;  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important;  text-decoration: none; font-weight: 700; font-size: 12.5px; flex-shrink: 0;  letter-spacing: -0.005em;  box-shadow: 0 4px 14px -2px rgba(99,102,241,0.45);  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);}
.prereq-banner .prereq-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px -4px rgba(99,102,241,0.6); }
:host(.bento-dark) .prereq-banner.prereq-error { background: rgba(248,113,113,0.10); border-color: rgba(248,113,113,0.30); color: #fca5a5; }
:host(.bento-dark) .prereq-banner.prereq-info { background: rgba(129,140,248,0.10); border-color: rgba(129,140,248,0.30); color: #c7d2fe; }
:host(.bento-dark) .prereq-banner code { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10); }
@media (max-width: 600px) {  .prereq-banner { flex-direction: column; align-items: stretch; padding-left: 20px; }  .prereq-banner .prereq-cta { align-self: flex-start; } }

/* First-run intro banner — premium */
.intro-banner {  position: relative; padding: 18px 52px 18px 22px; margin: 0 0 18px;  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.20);  border-radius: var(--bento-radius-sm, 12px);  font-size: 13px; line-height: 1.55; overflow: hidden;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  animation: bentoSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);}
.intro-banner::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.intro-banner .intro-headline {  font-weight: 700; font-size: 14.5px; margin-bottom: 10px; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;  display: flex; align-items: center; gap: 8px;}
.intro-banner .intro-steps {  margin: 8px 0 0; padding: 0; list-style: none; counter-reset: introstep;}
.intro-banner .intro-steps li {  margin-bottom: 8px; line-height: 1.55; color: var(--bento-text, #0c0a09);  padding-left: 32px; position: relative; counter-increment: introstep;  font-size: 12.5px;}
.intro-banner .intro-steps li::before {  content: counter(introstep); position: absolute; left: 0; top: -1px;  width: 22px; height: 22px; border-radius: 50%;  background: var(--bento-card, #fff); border: 1px solid rgba(99,102,241,0.25);  display: flex; align-items: center; justify-content: center;  font-size: 11px; font-weight: 800; color: #6366f1;  font-family: 'JetBrains Mono', ui-monospace, monospace;  font-feature-settings: 'tnum' 1;}
.intro-banner .intro-dismiss {  position: absolute; top: 12px; right: 14px;  background: var(--bento-card, transparent); border: 1px solid var(--bento-border, transparent);  cursor: pointer; font-size: 14px; line-height: 1;  color: var(--bento-text-secondary, #64748B);  padding: 4px 8px; border-radius: 999px;  transition: all 0.15s ease;}
.intro-banner .intro-dismiss:hover {  background: var(--bento-bg-2, #e7e5e4); color: var(--bento-text, #0c0a09);  transform: rotate(90deg);}
:host(.bento-dark) .intro-banner { background: linear-gradient(135deg, rgba(129,140,248,0.14), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.30); }
:host(.bento-dark) .intro-banner .intro-headline { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .intro-banner .intro-steps li { color: #fafaf9; }
:host(.bento-dark) .intro-banner .intro-steps li::before { background: #16161f; border-color: rgba(129,140,248,0.35); color: #a5b4fc; }
:host(.bento-dark) .intro-banner .intro-dismiss { background: #16161f; border-color: #27272f; color: #d6d3d1; }
:host(.bento-dark) .intro-banner .intro-dismiss:hover { background: #27272f; color: #fafaf9; }

${this._css()}

:host(.bento-dark) {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-text: var(--primary-text-color, #e2e8f0);
    --bento-text-secondary: var(--secondary-text-color, #94a3b8);
    --bento-border: var(--divider-color, #334155);
    --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  }
/* === DARK MODE ADDED - old comment below === */

        /* === MOBILE FIX === */
        @media (max-width: 768px) {
          .tabs { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 2px; }
          .tab, .tab-btn, .tab-btn { padding: 6px 10px; font-size: 12px; white-space: nowrap; }
          .card, .card-container { padding: 14px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-val, .kpi-val, .metric-val { font-size: 18px; }
          .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
          .panels, .board { flex-direction: column; }
          .column { min-width: unset; }
          h2 { font-size: 18px; }
          h3 { font-size: 15px; }
        }
        @media (max-width: 480px) {
          .tabs { gap: 1px; }
          .tab, .tab-btn, .tab-btn { padding: 5px 8px; font-size: 11px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: 1fr 1fr; }
          .stat-val, .kpi-val, .metric-val { font-size: 16px; }
        }

</style>${this._html()}`
    this._attachEvents();
    this._injectDiscovery();
  }
  _html() {
    return `
      <div class="card">
        <div class="card-header">
          <span class="card-title-icon">🔍</span>
          <h2>YAML Checker</h2>
          <span class="version-badge">v3.0</span>
        
        </div>
        <div class="tabs" id="tabs" role="tablist">
          ${['config-check','entity-validator','file-scanner','paste-validate','template-tester','common-issues'].map(t => `
            <button class="tab-btn${t===this._activeTab?' active':''}" data-tab="${t}" role="tab" aria-selected="${t===this._activeTab}" aria-label="${{
                'config-check': 'Config Check',
                'entity-validator': 'Entity Validator',
                'file-scanner': 'File Scanner',
                'paste-validate': 'Paste Validate',
                'template-tester': 'Template Tester',
                'common-issues': 'Common Issues Guide',
              }[t]}">
              ${{
                'config-check': '✅ Config',
                'entity-validator': '🔗 Entities',
                'file-scanner': '📁 Files',
                'paste-validate': '📝 Paste',
                'template-tester': '🧪 Template',
                'common-issues': this._t.guideTabLabel,
              }[t]}
            </button>
          `).join('')}
        </div>
        <div id="tab-content">${this._renderTabContent()}</div>
      </div>
    `;
  }

  _renderTabContent() {
    switch (this._activeTab) {
      case 'config-check': return this._renderConfigCheck();
      case 'entity-validator': return this._renderEntityValidator();
      case 'file-scanner': return this._renderFileScan();
      case 'paste-validate': return this._renderPasteValidate();
      case 'template-tester': return this._renderTemplateTester();
      case 'common-issues': return this._renderCommonIssues();
      default: return '';
    }
  }

  _renderConfigCheck() {
    const r = this._checkResult;
    return `
      <div class="tab-pane active" data-tab="config-check">
        <div class="info-box">
          <span class="info-icon">ℹ️</span>
          <div>${this._t.checkConfigInfo}</div>
        </div>
        ${this._checkLoading ? '<div class="loading-wrap"><div class="spinner"></div> ' + this._t.checkingConfig + '</div>' : ''}
        ${!this._checkLoading && !r ? '<div class="empty-hint">' + this._t.clickToCheck + '</div>' : ''}
        ${!this._checkLoading && r ? this._renderCheckResult(r) : ''}
        <div style="margin-top:16px;">
          <button class="btn btn-primary" id="btn-check" aria-label="${this._t.checkConfigBtn || 'Check configuration'}">✅ ${this._t.checkConfigBtn}</button>
        </div>
      </div>
    `;
  }

  _renderCheckResult(r) {
    const cls = r.ok ? 'success' : 'error';
    const icon = r.ok ? '✅' : '❌';
    const label = r.ok ? this._t.configOk : this._t.configError;
    return `
      <div class="result-header ${cls}">
        <span class="result-icon">${icon}</span>
        <div>
          <strong>${label}</strong>
          <small>${this._esc(r.ts)}${r.note ? ' · ' + this._esc(r.note) : ''}</small>
        </div>
      </div>
      ${r.errors.length ? `<div class="issue-section"><h3>${this._t.errors} (${r.errors.length})</h3>
        ${r.errors.map(e => `<div class="issue-item error"><span class="issue-icon">\u274C</span><div>${e.component ? '<strong>[' + this._esc(e.component) + ']</strong> ' : ''}${this._esc(e.detail || e.message || JSON.stringify(e))}</div></div>`).join('')}
      </div>` : ''}
      ${r.warnings.length ? `<div class="issue-section"><h3>${this._t.warnings} (${r.warnings.length})</h3>
        ${r.warnings.map(w => `<div class="issue-item warning"><span class="issue-icon">⚠️</span><div>${this._esc(w.message || JSON.stringify(w))}</div></div>`).join('')}
      </div>` : ''}
      ${r.ok && !r.errors.length && !r.warnings.length ? `<div class="all-good">✅ ${this._t.allOk}</div>` : ''}
    `;
  }

  _renderEntityValidator() {
    const r = this._entityResult;
    return `
      <div class="tab-pane active" data-tab="entity-validator">
        <div class="info-box">
          <span class="info-icon">🔗</span>
          <div>${this._t.entityCheckInfo}</div>
        </div>
        ${this._entityLoading ? '<div class="loading-wrap"><div class="spinner"></div> ' + this._t.analyzingEntities + '</div>' : ''}
        ${!this._entityLoading && !r ? '<div class="empty-hint">' + this._t.clickToScanEntities + '</div>' : ''}
        ${!this._entityLoading && r && r.error ? `<div class="error-box">❌ ${this._lang === 'pl' ? 'B\u0142\u0105d' : 'Error'}: ${r.error}</div>` : ''}
        ${!this._entityLoading && r && !r.error ? this._renderEntityResult(r) : ''}
        <div style="margin-top:16px;">
          <button class="btn btn-primary" id="btn-entity" aria-label="${this._t.scanEntitiesBtn || 'Scan Entities'}">🔗 ${this._t.scanEntitiesBtn || 'Scan Entities'}</button>
        </div>
      </div>
    `;
  }

  _renderEntityResult(r) {
    const topDomains = Object.entries(r.domainCounts)
      .sort((a,b) => b[1]-a[1]).slice(0,6);
    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${r.totalEntities}</div>
          <div class="stat-label">Encji w HA</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${r.totalAutomations}</div>
          <div class="stat-label">Automatyzacji</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${r.totalScripts}</div>
          <div class="stat-label">Skrypt\u00F3w</div>
        </div>
        <div class="stat-card ${r.broken.length ? 'stat-error' : ''}">
          <div class="stat-value ${r.broken.length ? 'error-val' : ''}">${r.broken.length}</div>
          <div class="stat-label">Uszkodz. ref.</div>
        </div>
      </div>
      ${r.dupIds.length ? `
        <div class="issue-section">
          <h3>⚠️ Duplikaty ID automatyzacji (${r.dupIds.length})</h3>
          ${r.dupIds.map(d => `<div class="issue-item warning"><span class="issue-icon">⚠️</span><div><strong>${this._esc(d.id)}</strong> — ${this._esc(d.alias)}</div></div>`).join('')}
        </div>
      ` : ''}
      ${r.broken.length ? `
        <div class="issue-section">
          <h3>❌ ${this._t.brokenRefsTitle} (${r.broken.length})</h3>
          ${r.broken.map(b => `<div class="issue-item error"><span class="issue-icon">❌</span><div><strong>${this._esc(b.entity)}</strong> <span style="color:var(--text-secondary);font-size:11px;">w ${this._esc(b.type)}: ${this._esc(b.in)}</span></div></div>`).join('')}
        </div>
      ` : '<div class="all-good">✅ ' + this._t.noRefs + '</div>'}
      ${r.problemStates?.length ? `
        <div class="issue-section">
          <h3>⚠️ ${this._t.unavailableTitle} (${r.problemStates.length})</h3>
          ${r.problemStates.slice(0, 30).map(p => `<div class="issue-item warning"><span class="issue-icon">⚠️</span><div><strong>${this._esc(p.entity)}</strong> — ${this._esc(p.name)} <span class="badge ${p.state === 'unavailable' ? 'error' : 'warning'}">${this._esc(p.state)}</span></div></div>`).join('')}
          ${r.problemStates.length > 30 ? `<div style="padding:8px;color:var(--bento-text-secondary);font-size:12px;">${this._t.moreCount.replace('{count}', r.problemStates.length - 30)}</div>` : ''}
        </div>
      ` : ''}
      ${r.autoNoDesc?.length ? `
        <div class="issue-section">
          <h3>ℹ️ ${this._t.noDescTitle} (${r.autoNoDesc.length})</h3>
          ${r.autoNoDesc.slice(0, 20).map(a => `<div class="issue-item info"><span class="issue-icon">ℹ️</span><div><strong>${this._esc(a.alias)}</strong> <span style="color:var(--bento-text-secondary);font-size:11px;">ID: ${this._esc(a.id)}</span></div></div>`).join('')}
          ${r.autoNoDesc.length > 20 ? `<div style="padding:8px;color:var(--bento-text-secondary);font-size:12px;">${this._t.moreCount.replace('{count}', r.autoNoDesc.length - 20)}</div>` : ''}
        </div>
      ` : ''}
      ${r.noFriendlyName?.length ? `
        <div class="issue-section">
          <h3>ℹ️ ${this._t.entitiesWithoutFriendlyName} (${r.noFriendlyName.length})</h3>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
            ${r.noFriendlyName.map(e => `<span class="badge warning" style="font-size:11px;">${this._esc(e)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <div style="margin-top:12px;">
        <div class="file-list-header">${this._t.topDomains}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
          ${topDomains.map(([d,n]) => `<span class="badge info">${d}: ${n}</span>`).join('')}
        </div>
      </div>
    `;
  }

  _renderFileScan() {
    const r = this._scanResult;
    return `
      <div class="tab-pane active" data-tab="file-scanner">
        <div class="info-box">
          <span class="info-icon">📁</span>
          <div>${this._t.scanSystemInfo}</div>
        </div>
        ${this._scanLoading ? '<div class="loading-wrap"><div class="spinner"></div> ' + this._t.checkingConfig + '</div>' : ''}
        ${!this._scanLoading && !r ? '<div class="empty-hint">' + this._t.clickToScanSystem + '</div>' : ''}
        ${!this._scanLoading && r ? this._renderScanResult(r) : ''}
        <div style="margin-top:16px;">
          <button class="btn btn-primary" id="btn-scan" aria-label="${this._lang === 'pl' ? 'Skanuj system' : 'Scan System'}">📁 ${this._lang === 'pl' ? 'Skanuj system' : 'Scan System'}</button>
        </div>
      </div>
    `;
  }

  _renderScanResult(r) {
    return `
      ${r.error ? `<div class="error-box">⚠️ ${this._t.partialError}: ${this._esc(r.error)}</div>` : ''}
      ${r.haVersion ? `
        <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
          <div class="stat-card"><div class="stat-value">${this._esc(r.haVersion)}</div><div class="stat-label">HA Version</div></div>
          <div class="stat-card"><div class="stat-value">${this._esc(r.entityCount)}</div><div class="stat-label">${this._t.entities}</div></div>
          <div class="stat-card"><div class="stat-value">${this._esc(r.deviceCount)}</div><div class="stat-label">${this._t.devices}</div></div>
          <div class="stat-card"><div class="stat-value">${this._esc(r.areaCount)}</div><div class="stat-label">${this._t.areas}</div></div>
          <div class="stat-card"><div class="stat-value">${this._esc(r.components)}</div><div class="stat-label">${this._t.components}</div></div>
          <div class="stat-card ${r.logErrors > 0 ? 'stat-error' : ''}">
            <div class="stat-value ${r.logErrors > 0 ? 'error-val' : ''}">${this._esc(r.logErrors)}</div>
            <div class="stat-label">${this._t.logErrors}</div>
          </div>
        </div>
        ${r.configDir ? `<div class="note-box">📁 ${this._t.configDirLabel}: <code>${this._esc(r.configDir)}</code></div>` : ''}
        ${r.logWarnings > 0 ? `<div class="note-box">⚠️ ${this._t.logWarnings}: ${this._esc(r.logWarnings)}</div>` : ''}
      ` : ''}
      <div class="file-list-header" style="margin-top:12px;">${this._t.configFilesNote}</div>
      <div class="file-list">
        ${r.files.map(f => `
          <div class="file-item">
            <span class="file-icon">📔</span>
            <div class="file-info">
              <div class="file-path">${this._esc(f.path)}${f.critical ? '<span class="badge critical">' + this._t.critical + '</span>' : ''}</div>
              <div class="file-desc">${this._esc(f.desc)}</div>
            </div>
            <span class="file-status-icon" title="${this._lang === 'pl' ? 'Nieznany (HA API nie zwraca listy plik\u00F3w YAML)' : 'Unknown (HA API does not return YAML file list)'}">\u2753</span>
          </div>
        `).join('')}
      </div>
      <div class="note-box" style="margin-top:12px;">💡 ${this._t.fileHint}</div>
    `;
  }

  _renderPasteValidate() {
    const { errors = [], warnings = [], lineCount = 0 } = this._pasteErrors || {};
    return `
      <div class="tab-pane active" data-tab="paste-validate">
        <div class="paste-wrap">
          <div class="paste-toolbar">
            <span class="paste-label">📝 ${this._t.pasteYamlLabel}</span>
            <button class="btn btn-sm" id="btn-clear-paste">${this._t.clearBtn}</button>
          </div>
          <textarea class="yaml-textarea" id="yaml-input" placeholder="# ${this._t.pasteHint}\nautomation:\n  - alias: Test\n    trigger:\n      - platform: state\n        entity_id: light.salon">${this._pasteValue}</textarea>
          <button class="btn btn-primary" id="btn-validate" aria-label="${this._t.validateBtn || 'Validate YAML'}">🔍 ${this._t.validateBtn}</button>
          ${this._pasteErrors && (errors.length || warnings.length) ? `
            <div class="paste-results">
              <div class="result-header ${errors.length ? 'error' : 'warning'}">
                <span class="result-icon">${errors.length ? '❌' : '⚠️'}</span>
                <div>
                  <strong>${errors.length} ${this._t.errors}, ${warnings.length} ${this._t.warnings}</strong>
                  <small>${lineCount} lines | ${this._t.clientValidation}</small>
                </div>
              </div>
              ${[...errors, ...warnings].map(e => `
                <div class="issue-item ${e.severity}">
                  <span class="issue-icon">${e.severity === 'error' ? '❌' : e.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                  <div><small style="color:var(--text-secondary)">Linia ${e.line}:</small> ${e.msg}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${this._pasteErrors && !errors.length && !warnings.length && this._pasteValue ? '<div class="all-good">✅ Brak wykrytych problem\u00F3w!</div>' : ''}
        </div>
      </div>
    `;
  }

  _renderTemplateTester() {
    const r = this._templateResult;
    return `
      <div class="tab-pane active" data-tab="template-tester">
        <div class="info-box">
          <span class="info-icon">🧪</span>
          <div>${this._t.templateTesterInfo}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <div class="paste-label" style="margin-bottom:6px;">${this._t.jinja2Template}</div>
            <textarea class="yaml-textarea" id="template-input" style="min-height:120px;" placeholder="{{ states('sun.sun') }}">${this._templateValue}</textarea>
          </div>
          ${this._templateLoading ? '<div class="loading-wrap"><div class="spinner"></div> ' + this._t.executingTemplate + '</div>' : ''}
          ${!this._templateLoading && r ? `
            <div class="result-header ${r.ok ? 'success' : 'error'}">
              <span class="result-icon">${r.ok ? '✅' : '❌'}</span>
              <div>
                <strong>${r.ok ? this._t.result : this._t.error}</strong>
                <small>${r.ts}</small>
              </div>
            </div>
            ${r.ok ? `<div style="background:rgba(0,0,0,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;font-family:monospace;font-size:13px;word-break:break-all;">${String(r.value)}</div>` : ''}
            ${!r.ok ? `<div class="error-box">${r.error}</div>` : ''}
          ` : ''}
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn btn-primary" id="btn-template" aria-label="${this._t.executeTemplate || 'Execute template'}">▶️ ${this._t.executeTemplate}</button>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${[
                ['{{ states("sun.sun") }}', '☀️ sun'],
                ['{{ now().strftime("%H:%M") }}', '🕐 czas'],
                ['{{ state_attr("sun.sun","elevation") | round(1) }}', '📐 atrybut'],
                ['{{ is_state("binary_sensor.motion","on") }}', '🔍 is_state'],
              ].map(([t,l]) => `<button class="btn btn-sm template-example" data-tpl="${t.replace(/"/g,'&quot;')}">${l}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderCommonIssues() {
    return `
      <div class="tab-pane active" data-tab="common-issues">
        ${HAYamlChecker.COMMON_ISSUES.map(cat => `
          <div class="issue-category">
            <h3>${cat.cat}</h3>
            ${cat.items.map(item => `
              <div class="common-item ${item.severity}">
                <div class="common-item-header">
                  <span>${item.severity === 'error' ? '❌' : item.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                  <strong>${item.title}</strong>
                  <span class="badge ${item.severity}">${item.severity}</span>
                </div>
                <div class="common-item-desc">${item.desc.replace(/\n/g,'<br>')}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  _updateTab(tab) {
    if (!this.shadowRoot) return;
    const content = this.shadowRoot.getElementById('tab-content');
    if (!content) { this._render(); return; }
    this._activeTab = tab;
    history.replaceState(null, '', location.pathname + '#' + this._toolId + '/' + this._activeTab);
    try { localStorage.setItem('ha-tools-yaml-checker-settings', JSON.stringify({ _activeTab: this._activeTab })); } catch(e) { console.debug('[ha-yaml-checker] caught:', e); }
    // Update tab buttons
    this.shadowRoot.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    content.innerHTML = this._renderTabContent();
    this._attachEventListeners();
  }

  _attachEvents() {
    this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._updateTab(btn.dataset.tab));
    });
    this._attachEventListeners();
  }

  _attachEventListeners() {
    const $ = id => this.shadowRoot.getElementById(id);
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

    on('btn-check', 'click', () => this._runConfigCheck());
    on('btn-entity', 'click', () => this._runEntityValidation());
    on('btn-scan', 'click', () => this._runFileScan());
    on('btn-validate', 'click', () => {
      const ta = this.shadowRoot.getElementById('yaml-input');
      if (ta) {
        this._pasteValue = ta.value;
        this._pasteErrors = this._validateYAML(ta.value);
        this._updateTab('paste-validate');
      }
    });
    on('btn-clear-paste', 'click', () => {
      this._pasteValue = '';
      this._pasteErrors = null;
      this._updateTab('paste-validate');
    });
    on('btn-template', 'click', () => {
      const ta = this.shadowRoot.getElementById('template-input');
      if (ta) { this._templateValue = ta.value; this._runTemplateTester(); }
    });

    // Template examples
    this.shadowRoot.querySelectorAll('.template-example').forEach(btn => {
      btn.addEventListener('click', () => {
        this._templateValue = btn.dataset.tpl;
        this._templateResult = null;
        this._updateTab('template-tester');
      });
    });

    // Live textarea tracking
    const yamlTA = this.shadowRoot.getElementById('yaml-input');
    if (yamlTA) yamlTA.addEventListener('input', e => { this._pasteValue = e.target.value; });
    const tmplTA = this.shadowRoot.getElementById('template-input');
    if (tmplTA) tmplTA.addEventListener('input', e => { this._templateValue = e.target.value; });
  }

  _css() {
    return `
      
/* ===== BENTO DESIGN SYSTEM (local fallback) ===== */

:host {
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-primary-light: rgba(59, 130, 246, 0.08);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.08);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.08);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.08);
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-text-muted: var(--disabled-text-color, #94A3B8);
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:host {
        --primary: var(--bento-primary);
        --success: var(--bento-success);
        --warning: var(--bento-warning);
        --error: var(--bento-error);
        --bg: var(--bento-card);
        --text: var(--bento-text);
        --text-secondary: var(--bento-text-secondary);
        --border: var(--bento-border);
        --radius: var(--bento-radius-sm);
        display: block;
      }
      .card { background: var(--bg); border-radius: var(--radius); overflow: visible; font-family: 'Inter', -apple-system, sans-serif; color: var(--text); }
      .card-header { display: flex; align-items: center; gap: 10px; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); }
      .card-title-icon { font-size: 22px; }
      .card-header h2 { margin: 0; font-size: 16px; font-weight: 700; flex: 1; }
      .version-badge { font-size: 11px; background: rgba(59,130,246,0.1); color: var(--primary); border: 1px solid rgba(59,130,246,0.3); border-radius: 20px; padding: 2px 8px; font-weight: 600; }
      .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; }
      .tabs::-webkit-scrollbar { display: none; }
      .tab-btn { flex: 1; min-width: fit-content; padding: 10px 10px; border: none; background: none; cursor: pointer; font-size: 11px; font-weight: 600; color: var(--text-secondary); border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap; }
      .tab-btn:hover { color: var(--text); background: rgba(0,0,0,0.03); }
      .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
      .tab-pane { padding: 16px 20px; }
      .paste-wrap { display: flex; flex-direction: column; gap: 12px; }
      .paste-toolbar { display: flex; align-items: center; justify-content: space-between; }
      .paste-label { font-size: 13px; font-weight: 600; }
      .yaml-textarea { width: 100%; min-height: 180px; font-family: 'Fira Code','Consolas',monospace; font-size: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: rgba(0,0,0,0.02); color: var(--text); resize: vertical; box-sizing: border-box; outline: none; line-height: 1.6; }
      .yaml-textarea:focus { border-color: var(--primary); }
      .loading-wrap { display: flex; align-items: center; gap: 12px; padding: 20px; justify-content: center; color: var(--text-secondary); font-size: 14px; }
      .spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .info-box { display: flex; gap: 12px; align-items: flex-start; padding: 14px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2); border-radius: 10px; margin-bottom: 14px; font-size: 13px; line-height: 1.5; }
      .info-icon { font-size: 20px; flex-shrink: 0; }
      .info-box code { background: rgba(0,0,0,0.07); padding: 1px 5px; border-radius: 4px; font-size: 11px; }
      .note-box { padding: 10px 14px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px; font-size: 12px; color: var(--text-secondary); margin: 8px 0; }
      .btn { padding: 10px 18px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
      .btn-primary { background: var(--primary); color: white; }
      .btn-primary:hover { opacity: 0.9; }
      .btn-sm { padding: 5px 10px; font-size: 12px; background: rgba(0,0,0,0.05); color: var(--text); border-radius: 6px; border: none; cursor: pointer; }
      .btn-sm:hover { background: rgba(0,0,0,0.1); }
      .result-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; margin-bottom: 12px; }
      .result-header.success { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); }
      .result-header.error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); }
      .result-header.warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); }
      .result-icon { font-size: 22px; }
      .result-header div { flex: 1; }
      .result-header strong { display: block; font-size: 14px; }
      .result-header small { color: var(--text-secondary); font-size: 12px; }
      .issue-section { margin: 10px 0; }
      .issue-section h3 { font-size: 13px; margin: 0 0 8px 0; color: var(--text-secondary); }
      .issue-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; font-size: 13px; line-height: 1.5; }
      .issue-item.error { background: rgba(239,68,68,0.06); border-left: 3px solid var(--error); }
      .issue-item.warning { background: rgba(245,158,11,0.06); border-left: 3px solid var(--warning); }
      .issue-item.info { background: rgba(59,130,246,0.06); border-left: 3px solid var(--primary); }
      .issue-icon { flex-shrink: 0; font-size: 14px; margin-top: 1px; }
      .all-good { text-align: center; padding: 20px; font-size: 15px; color: var(--success); font-weight: 600; }
      .error-box { padding: 10px 14px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; font-size: 12px; margin-top: 10px; }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
      .stat-card { background: rgba(59,130,246,0.05); border: 1px solid rgba(59,130,246,0.15); border-radius: 10px; padding: 12px; text-align: center; }
      .stat-card.stat-error { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.25); }
      .stat-value { font-size: 22px; font-weight: 700; color: var(--primary); }
      .stat-value.error-val { color: var(--error); }
      .stat-label { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
      .empty-hint { text-align: center; color: var(--text-secondary); font-size: 13px; padding: 20px; }
      .file-list-header { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
      .file-list { display: flex; flex-direction: column; gap: 6px; }
      .file-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(0,0,0,0.02); border: 1px solid var(--border); border-radius: 8px; }
      .file-icon { font-size: 16px; flex-shrink: 0; }
      .file-info { flex: 1; }
      .file-path { font-size: 13px; font-weight: 600; font-family: monospace; }
      .file-desc { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
      .file-status-icon { font-size: 14px; flex-shrink: 0; }
      .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }
      .badge.critical,.badge.error { background: rgba(239,68,68,0.15); color: var(--error); }
      .badge.warning { background: rgba(245,158,11,0.15); color: var(--warning); }
      .badge.info { background: rgba(59,130,246,0.15); color: var(--primary); }
      .issue-category { margin-bottom: 20px; }
      .issue-category h3 { font-size: 14px; font-weight: 700; margin: 0 0 10px 0; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
      .common-item { margin-bottom: 10px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
      .common-item.error { border-left: 3px solid var(--error); }
      .common-item.warning { border-left: 3px solid var(--warning); }
      .common-item.info { border-left: 3px solid var(--primary); }
      .common-item-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px 6px; font-size: 13px; }
      .common-item-header strong { flex: 1; }
      .common-item-desc { padding: 0 14px 10px; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
      .paste-results { display: flex; flex-direction: column; gap: 6px; }
    `;
  }

  _injectDiscovery() {
    if (customElements.get('ha-tools-panel')) return;
    const container = this.shadowRoot.querySelector('.card');
    if (!container) return;
    // (discovery banner removed in split — each tool ships its own donate footer)
    const _inj = () => {
      if (window.HAToolsDiscovery) {
        window.HAToolsDiscovery.inject(container, 'yaml-checker', true);
      }
    };
    if (window.HAToolsDiscovery) { _inj(); return; }
    const s = document.createElement('script');
    s.src = '/local/community/ha-tools-panel/ha-tools-discovery.js?_=' + Date.now();
    s.async = true;
    s.onload = _inj;
    document.head.appendChild(s);
  }

  disconnectedCallback() {
    // Cleanup any active event listeners or timers
  }

  setActiveTab(tabId) {
    this._activeTab = tabId;
    this._render();
  }
}

if (!customElements.get('ha-yaml-checker')) customElements.define('ha-yaml-checker', HAYamlChecker);


class HaYamlCheckerEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
            :host { display:block; padding:16px; }
            h3 { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--bento-text, var(--primary-text-color,#1e293b)); }
            input { outline:none; transition:border-color .2s; }
            input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>YAML Checker</h3>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Title</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title || 'YAML Checker')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
    `;
        const f_title = this.shadowRoot.querySelector('#cf_title');
        if (f_title) f_title.addEventListener('input', (e) => {
          this._config = { ...this._config, title: e.target.value };
          this._dispatch();
        });
  }
  connectedCallback() { this._render(); }
}
if (!customElements.get('ha-yaml-checker-editor')) { customElements.define('ha-yaml-checker-editor', HaYamlCheckerEditor); }

})();

window.customCards = window.customCards || [];
window.customCards.push({ type: 'ha-yaml-checker', name: 'YAML Checker', description: 'YAML validator: config check, entities, templates', preview: false });
