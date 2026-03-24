// ============================================================
//  CCTR Call Center KPI Custom Widget  —  SAC Web Component
//  Fields from ZBIQ_ANALYTIC_CCTR
// ============================================================

const tpl = document.createElement('template');
tpl.innerHTML = `
<style>
  :host {
    display: block;
    font-family: '72', 'SAP72', Arial, sans-serif;
    background: transparent;
    padding: 14px;
    box-sizing: border-box;
    color: #1d2d3e;
  }

  /* ── Header ── */
  .widget-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .widget-title { font-size: 15px; font-weight: 700; color: #0070f2; }
  .widget-subtitle { font-size: 11px; color: #89919a; }

  /* ── KPI Cards ── */
  .kpi-row {
    display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;
  }
  .kpi-card {
    flex: 1; min-width: 110px;
    background: #fff;
    border-radius: 8px;
    border-left: 4px solid #0070f2;
    padding: 10px 12px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    transition: transform .2s, box-shadow .2s;
    cursor: default;
  }
  .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 6px 14px rgba(0,0,0,0.12); }
  .kpi-card.green  { border-color: #188918; }
  .kpi-card.orange { border-color: #e9730c; }
  .kpi-card.red    { border-color: #bb0000; }
  .kpi-card.purple { border-color: #6a1b9a; }

  .kpi-label { font-size: 10px; color: #89919a; text-transform: uppercase; letter-spacing: .4px; }
  .kpi-value { font-size: 24px; font-weight: 700; margin: 4px 0 2px; }
  .kpi-badge {
    display: inline-block; font-size: 10px; padding: 2px 7px;
    border-radius: 10px; font-weight: 600;
  }
  .badge-green  { background: #e8f5e9; color: #188918; }
  .badge-red    { background: #ffebee; color: #bb0000; }
  .badge-orange { background: #fff3e0; color: #e9730c; }

  /* ── Tab Bar ── */
  .tab-bar { display: flex; gap: 4px; margin-bottom: 12px; }
  .tab-btn {
    padding: 5px 14px; border: none; border-radius: 20px;
    font-size: 12px; cursor: pointer; background: #f0f2f5; color: #556b82;
    transition: background .15s, color .15s;
  }
  .tab-btn.active { background: #0070f2; color: #fff; font-weight: 600; }

  /* ── Chart Area ── */
  .chart-wrap { position: relative; width: 100%; }
  canvas { width: 100% !important; max-height: 220px; }

  /* ── Status Distribution ── */
  .status-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .status-pill {
    display: flex; align-items: center; gap: 6px;
    background: #f5f6f7; border-radius: 20px;
    padding: 5px 12px; font-size: 12px;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; }

  /* ── SLA Gauge ── */
  .sla-wrap { display: flex; align-items: center; gap: 16px; padding: 6px 0; }
  .sla-bar-outer {
    flex: 1; height: 16px; background: #e8edf1;
    border-radius: 8px; overflow: hidden;
  }
  .sla-bar-inner {
    height: 100%; border-radius: 8px;
    transition: width 1s ease;
    background: linear-gradient(90deg, #188918, #56ab2f);
  }
  .sla-label { font-size: 12px; font-weight: 600; min-width: 80px; }
  .sla-pct   { font-size: 13px; font-weight: 700; min-width: 45px; text-align: right; }

  .no-data {
    text-align: center; color: #89919a; padding: 40px 20px; font-size: 13px;
  }
  .no-data .icon { font-size: 32px; display: block; margin-bottom: 8px; }
</style>

<div class="widget-header">
  <div>
    <div class="widget-title" id="widgetTitle">📞 Call Center Overview</div>
    <div class="widget-subtitle" id="widgetSub">ZBIQ_ANALYTIC_CCTR · Live Data</div>
  </div>
</div>

<div class="kpi-row" id="kpiRow"></div>

<div class="tab-bar">
  <button class="tab-btn active" data-tab="bar">By Category</button>
  <button class="tab-btn" data-tab="priority">By Priority</button>
  <button class="tab-btn" data-tab="sla">SLA Status</button>
  <button class="tab-btn" data-tab="status">Inbox Status</button>
</div>

<div class="chart-wrap" id="chartWrap">
  <canvas id="mainCanvas"></canvas>
</div>
<div class="status-grid" id="statusGrid" style="display:none"></div>
<div class="sla-wrap"    id="slaWrap"    style="display:none"></div>

<div class="no-data" id="noData" style="display:none">
  <span class="icon">📭</span>
  Bind your CCTR model to this widget.<br>
  <small>Map dimensions + measures in the Builder panel.</small>
</div>
`;

// ──────────────────────────────────────────────────────────────
class CCTRWidget extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(tpl.content.cloneNode(true));
    this._rawData    = null;   // SAC ResultSet
    this._chartLib   = null;
    this._chartInst  = null;
    this._activeTab  = 'bar';

    // Tab clicks
    this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.tab-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._activeTab = btn.dataset.tab;
        if (this._rawData) this._render();
      });
    });
  }

  connectedCallback() {
    // Load Chart.js once
    if (!window.__chartJsLoaded) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = () => {
        window.__chartJsLoaded = true;
        this._chartLib = window.Chart;
        if (this._rawData) this._render();
      };
      document.head.appendChild(s);
    } else {
      this._chartLib = window.Chart;
      if (this._rawData) this._render();
    }
  }

  // ── SAC calls this after data binding updates ──────────────
  onCustomWidgetAfterUpdate(delta) {
    // handled via setData
  }

  // ── SAC data binding pushes ResultSet here ─────────────────
  //    Expected rows: { dimension, interaction_count, Call_Record,
  //                     new_to_comp_workhours, new_to_at_workhours,
  //                     SLA_Status, priority_txt, inbox_status_text }
  setData(resultSet) {
    this._rawData = re
