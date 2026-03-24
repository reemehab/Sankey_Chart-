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
    this._rawData = resultSet;
    if (this._chartLib) this._render();
  }

  // ── Main render ────────────────────────────────────────────
  _render() {
    const rs = this._rawData;
    if (!rs || !rs.length) {
      this.shadowRoot.getElementById('noData').style.display = 'block';
      return;
    }
    this.shadowRoot.getElementById('noData').style.display = 'none';

    // ── Aggregate totals ──
    let totalInteractions = 0, totalCalls = 0, totalResHrs = 0, totalAtHrs = 0;
    const catMap = {}, priorityMap = {}, slaMap = {}, statusMap = {};

    rs.forEach(row => {
      const interactions = +( row.interaction_count   || row.Interaction_Count   || 0 );
      const calls        = +( row.Call_Record         || row.call_record         || 0 );
      const resHrs       = +( row.new_to_comp_workhours|| 0 );
      const atHrs        = +( row.new_to_at_workhours  || 0 );
      const cat          =    row.category_txt         || row.dimension           || 'Unknown';
      const prio         =    row.priority_txt         || 'Unknown';
      const sla          =    row.SLA_Status           || 'Unknown';
      const inboxSt      =    row.inbox_status_text    || 'Unknown';

      totalInteractions += interactions;
      totalCalls        += calls;
      totalResHrs       += resHrs;
      totalAtHrs        += atHrs;

      catMap[cat]      = (catMap[cat]      || 0) + interactions;
      priorityMap[prio]= (priorityMap[prio]|| 0) + interactions;
      slaMap[sla]      = (slaMap[sla]      || 0) + interactions;
      statusMap[inboxSt]=(statusMap[inboxSt]|| 0) + interactions;
    });

    const avgRes = totalInteractions ? (totalResHrs / totalInteractions).toFixed(1) : 0;
    const slaOK  = slaMap['Met'] || slaMap['On Time'] || slaMap['Green'] || 0;
    const slaPct = totalInteractions ? Math.round((slaOK / totalInteractions) * 100) : 0;

    // ── KPI Cards ──
    this.shadowRoot.getElementById('kpiRow').innerHTML = `
      ${this._kpiCard('Total Interactions', this._fmt(totalInteractions), '', 'blue')}
      ${this._kpiCard('Total Calls',        this._fmt(totalCalls),        '', 'green')}
      ${this._kpiCard('Avg Resolution',     avgRes + ' hrs',              '', 'orange')}
      ${this._kpiCard('SLA Met',            slaPct + '%',
          slaPct >= 80
            ? '<span class="kpi-badge badge-green">✔ On Track</span>'
            : '<span class="kpi-badge badge-red">⚠ Below Target</span>',
          slaPct >= 80 ? 'green' : 'red'
      )}
    `;

    // ── Tabs ──
    const chartWrap  = this.shadowRoot.getElementById('chartWrap');
    const statusGrid = this.shadowRoot.getElementById('statusGrid');
    const slaWrap    = this.shadowRoot.getElementById('slaWrap');

    chartWrap.style.display  = 'none';
    statusGrid.style.display = 'none';
    slaWrap.style.display    = 'none';

    switch (this._activeTab) {
      case 'bar':
        chartWrap.style.display = 'block';
        this._barChart(catMap, 'Interactions by Category', '#0070f2');
        break;

      case 'priority':
        chartWrap.style.display = 'block';
        this._barChart(priorityMap, 'Interactions by Priority', '#e9730c');
        break;

      case 'sla':
        slaWrap.style.display = 'flex';
        this._slaGauge(slaMap, totalInteractions);
        break;

      case 'status':
        statusGrid.style.display = 'flex';
        this._statusPills(statusMap);
        break;
    }
  }

  // ── Bar Chart ──────────────────────────────────────────────
  _barChart(mapData, label, color) {
    const canvas = this.shadowRoot.getElementById('mainCanvas');
    if (this._chartInst) { this._chartInst.destroy(); this._chartInst = null; }

    const sorted = Object.entries(mapData).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(e => e[0]);
    const values = sorted.map(e => e[1]);

    this._chartInst = new this._chartLib(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data: values,
          backgroundColor: color + 'cc',
          borderColor: color,
          borderWidth: 1,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y.toLocaleString()} interactions`
            }
          }
        },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 30 } },
          y: { beginAtZero: true, ticks: { font: { size: 10 } } }
        },
        animation: { duration: 700, easing: 'easeOutQuart' }
      }
    });
  }

  // ── SLA Gauge Bars ─────────────────────────────────────────
  _slaGauge(slaMap, total) {
    const wrap = this.shadowRoot.getElementById('slaWrap');
    if (!total) { wrap.innerHTML = '<div class="no-data">No SLA data</div>'; return; }

    const colors = { Met: '#188918', 'On Time': '#188918', Green: '#188918',
                     Breached: '#bb0000', Red: '#bb0000', Pending: '#e9730c' };
    wrap.innerHTML = '';

    const entries = Object.entries(slaMap).sort((a, b) => b[1] - a[1]);
    entries.forEach(([status, count]) => {
      const pct   = Math.round((count / total) * 100);
      const color = colors[status] || '#0070f2';
      wrap.innerHTML += `
        <div style="width:100%; display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div class="sla-label">${status}</div>
          <div class="sla-bar-outer" style="flex:1">
            <div class="sla-bar-inner" style="width:${pct}%; background:${color}"></div>
          </div>
          <div class="sla-pct">${pct}%</div>
        </div>`;
    });
  }

  // ── Status Pills ───────────────────────────────────────────
  _statusPills(statusMap) {
    const palette = ['#0070f2','#188918','#e9730c','#6a1b9a','#bb0000','#00838f','#ef6c00'];
    const grid = this.shadowRoot.getElementById('statusGrid');
    grid.innerHTML = '';
    Object.entries(statusMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count], i) => {
        grid.innerHTML += `
          <div class="status-pill">
            <div class="dot" style="background:${palette[i % palette.length]}"></div>
            <span>${status}</span>
            <strong>${count.toLocaleString()}</strong>
          </div>`;
      });
  }

  // ── Helpers ────────────────────────────────────────────────
  _kpiCard(label, value, badge = '', color = 'blue') {
    return `
      <div class="kpi-card ${color}">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${value}</div>
        ${badge}
      </div>`;
  }

  _fmt(n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }
}

customElements.define('com-cctr-kpi-widget', CCTRWidget);
