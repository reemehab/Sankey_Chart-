// ============================================================
//  CCTR Call Center KPI Custom Widget  —  SAC Web Component
//  Fixed for Optimized Stories (no setData needed)
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
  .widget-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .widget-title { font-size: 15px; font-weight: 700; color: #0070f2; }
  .widget-subtitle { font-size: 11px; color: #89919a; }
  .kpi-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .kpi-card {
    flex: 1; min-width: 110px; background: #fff;
    border-radius: 8px; border-left: 4px solid #0070f2;
    padding: 10px 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    transition: transform .2s, box-shadow .2s; cursor: default;
  }
  .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 6px 14px rgba(0,0,0,0.12); }
  .kpi-card.green  { border-color: #188918; }
  .kpi-card.orange { border-color: #e9730c; }
  .kpi-card.red    { border-color: #bb0000; }
  .kpi-label { font-size: 10px; color: #89919a; text-transform: uppercase; letter-spacing: .4px; }
  .kpi-value { font-size: 24px; font-weight: 700; margin: 4px 0 2px; }
  .kpi-badge { display: inline-block; font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 600; }
  .badge-green  { background: #e8f5e9; color: #188918; }
  .badge-red    { background: #ffebee; color: #bb0000; }
  .tab-bar { display: flex; gap: 4px; margin-bottom: 12px; }
  .tab-btn {
    padding: 5px 14px; border: none; border-radius: 20px;
    font-size: 12px; cursor: pointer; background: #f0f2f5; color: #556b82;
    transition: background .15s, color .15s;
  }
  .tab-btn.active { background: #0070f2; color: #fff; font-weight: 600; }
  .chart-wrap { position: relative; width: 100%; }
  canvas { width: 100% !important; max-height: 220px; }
  .status-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .status-pill {
    display: flex; align-items: center; gap: 6px;
    background: #f5f6f7; border-radius: 20px; padding: 5px 12px; font-size: 12px;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .sla-bar-outer { flex: 1; height: 16px; background: #e8edf1; border-radius: 8px; overflow: hidden; }
  .sla-bar-inner { height: 100%; border-radius: 8px; transition: width 1s ease; }
  .sla-label { font-size: 12px; font-weight: 600; min-width: 80px; }
  .sla-pct   { font-size: 13px; font-weight: 700; min-width: 45px; text-align: right; }
  .no-data { text-align: center; color: #89919a; padding: 40px 20px; font-size: 13px; }
  .no-data .icon { font-size: 32px; display: block; margin-bottom: 8px; }
  .debug { font-size: 10px; color: #aaa; padding: 4px; word-break: break-all; }
</style>

<div class="widget-header">
  <div>
    <div class="widget-title">📞 Call Center Overview</div>
    <div class="widget-subtitle">ZBIQ_ANALYTIC_CCTR · Live Data</div>
  </div>
</div>
<div class="kpi-row" id="kpiRow"></div>
<div class="tab-bar">
  <button class="tab-btn active" data-tab="bar">By Category</button>
  <button class="tab-btn" data-tab="priority">By Priority</button>
  <button class="tab-btn" data-tab="sla">SLA Status</button>
  <button class="tab-btn" data-tab="status">Inbox Status</button>
</div>
<div class="chart-wrap" id="chartWrap"><canvas id="mainCanvas"></canvas></div>
<div class="status-grid" id="statusGrid" style="display:none"></div>
<div id="slaWrap"        style="display:none; flex-direction:column; gap:8px; padding:6px 0;"></div>
<div class="no-data"    id="noData">
  <span class="icon">⏳</span>Loading data...
</div>
<div class="debug" id="debugLog"></div>
`;

class CCTRWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(tpl.content.cloneNode(true));
    this._chartLib  = null;
    this._chartInst = null;
    this._activeTab = 'bar';
    this._dataStore = null;   // SAC dataBinding object

    this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._activeTab = btn.dataset.tab;
        this._renderFromStore();
      });
    });
  }

  connectedCallback() {
    this._loadChartJs();
  }

  _loadChartJs() {
    if (window.Chart) { this._chartLib = window.Chart; return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => { this._chartLib = window.Chart; this._renderFromStore(); };
    document.head.appendChild(s);
  }

  // ── KEY METHOD: SAC calls this automatically when data changes ──
  onCustomWidgetAfterUpdate(changedProperties) {
    this._log('onCustomWidgetAfterUpdate called');
    this._renderFromStore();
  }

  // ── SAC calls this when the widget is ready with data ──
  onCustomWidgetResize(width, height) {
    this._renderFromStore();
  }

  // ── This is how Optimized Stories pass data ──
  // SAC exposes the dataBinding via this.myData (matches id in JSON feeds)
  _renderFromStore() {
    if (!this._chartLib) { this._loadChartJs(); return; }

    // Try to get data from SAC data binding
    let rows = [];

    try {
      // Method 1: SAC Optimized Story data binding (most common)
      const binding = this.myData;
      if (binding) {
        this._log('binding found: ' + JSON.stringify(Object.keys(binding)));
        const result = binding.data || binding;
        if (Array.isArray(result)) {
          rows = result;
        } else if (result && result.rows) {
          rows = result.rows;
        }
      }

      // Method 2: fallback — check all properties for array data
      if (!rows.length) {
        for (const key of Object.keys(this)) {
          if (Array.isArray(this[key]) && this[key].length > 0) {
            rows = this[key];
            this._log('data found on property: ' + key);
            break;
          }
        }
      }

      // Method 3: getAttribute fallback
      if (!rows.length && this.getAttribute('data')) {
        try { rows = JSON.parse(this.getAttribute('data')); } catch(e) {}
      }

    } catch(e) {
      this._log('Error reading data: ' + e.message);
    }

    this._log('rows count: ' + rows.length);

    if (!rows.length) {
      // Show demo data so you can verify the widget renders correctly
      rows = this._demoData();
      this._log('using demo data');
    }

    this._render(rows);
  }

  // ── Demo data using your actual field names ──
  _demoData() {
    return [
      { category_txt: 'Billing Issue',    priority_txt: 'High',   SLA_Status: 'Met',      inbox_status_text: 'Completed',   interaction_count: 320, Call_Record: 120, new_to_comp_workhours: 4.2, new_to_at_workhours: 1.1 },
      { category_txt: 'Technical Support',priority_txt: 'Medium', SLA_Status: 'Breached', inbox_status_text: 'In Process',  interaction_count: 210, Call_Record: 85,  new_to_comp_workhours: 8.5, new_to_at_workhours: 2.3 },
      { category_txt: 'Account Query',    priority_txt: 'Low',    SLA_Status: 'Met',      inbox_status_text: 'New',         interaction_count: 180, Call_Record: 60,  new_to_comp_workhours: 3.1, new_to_at_workhours: 0.8 },
      { category_txt: 'Contract Renewal', priority_txt: 'High',   SLA_Status: 'Met',      inbox_status_text: 'Completed',   interaction_count: 95,  Call_Record: 40,  new_to_comp_workhours: 5.0, new_to_at_workhours: 1.5 },
      { category_txt: 'Complaint',        priority_txt: 'Urgent', SLA_Status: 'Breached', inbox_status_text: 'Forwarded',   interaction_count: 55,  Call_Record: 30,  new_to_comp_workhours: 12.0,new_to_at_workhours: 3.2 },
    ];
  }

  _render(rows) {
    const noData = this.shadowRoot.getElementById('noData');
    noData.style.display = 'none';

    let totalInteractions = 0, totalCalls = 0, totalResHrs = 0;
    const catMap = {}, priorityMap = {}, slaMap = {}, statusMap = {};

    rows.forEach(row => {
      const interactions = +(row.interaction_count || row.Interaction_Count || row['Number of Interactions'] || 0);
      const calls        = +(row.Call_Record       || row.call_record       || row['Call Record']           || 0);
      const resHrs       = +(row.new_to_comp_workhours || row['NEW_TO_COMP_WORKHOURS'] || 0);
      const cat          =   row.category_txt      || row.Category          || row.dimension                || 'Other';
      const prio         =   row.priority_txt      || row.Priority          || 'Unknown';
      const sla          =   row.SLA_Status        || row.sla_status        || 'Unknown';
      const inbox        =   row.inbox_status_text || row.inbox_status      || 'Unknown';

      totalInteractions += interactions;
      totalCalls        += calls;
      totalResHrs       += resHrs;
      catMap[cat]        = (catMap[cat]       || 0) + interactions;
      priorityMap[prio]  = (priorityMap[prio] || 0) + interactions;
      slaMap[sla]        = (slaMap[sla]       || 0) + interactions;
      statusMap[inbox]   = (statusMap[inbox]  || 0) + interactions;
    });

    const avgRes = totalInteractions ? (totalResHrs / totalInteractions).toFixed(1) : 0;
    const slaOK  = slaMap['Met'] || slaMap['On Time'] || slaMap['Green'] || 0;
    const slaPct = totalInteractions ? Math.round((slaOK / totalInteractions) * 100) : 0;

    // KPI Cards
    this.shadowRoot.getElementById('kpiRow').innerHTML = `
      ${this._kpiCard('Total Interactions', this._fmt(totalInteractions), '', 'blue')}
      ${this._kpiCard('Total Calls',        this._fmt(totalCalls),        '', 'green')}
      ${this._kpiCard('Avg Resolution',     avgRes + ' hrs',              '', 'orange')}
      ${this._kpiCard('SLA Met', slaPct + '%',
          slaPct >= 80
            ? '<span class="kpi-badge badge-green">✔ On Track</span>'
            : '<span class="kpi-badge badge-red">⚠ Below Target</span>',
          slaPct >= 80 ? 'green' : 'red'
      )}
    `;

    const chartWrap  = this.shadowRoot.getElementById('chartWrap');
    const statusGrid = this.shadowRoot.getElementById('statusGrid');
    const slaWrap    = this.shadowRoot.getElementById('slaWrap');
    chartWrap.style.display  = 'none';
    statusGrid.style.display = 'none';
    slaWrap.style.display    = 'none';

    switch (this._activeTab) {
      case 'bar':      chartWrap.style.display = 'block';  this._barChart(catMap,      'Interactions by Category', '#0070f2'); break;
      case 'priority': chartWrap.style.display = 'block';  this._barChart(priorityMap, 'By Priority',              '#e9730c'); break;
      case 'sla':      slaWrap.style.display   = 'flex';   this._slaGauge(slaMap, totalInteractions);                          break;
      case 'status':   statusGrid.style.display= 'flex';   this._statusPills(statusMap);                                       break;
    }
  }

  _barChart(mapData, label, color) {
    const canvas = this.shadowRoot.getElementById('mainCanvas');
    if (this._chartInst) { this._chartInst.destroy(); this._chartInst = null; }
    const sorted = Object.entries(mapData).sort((a,b) => b[1]-a[1]).slice(0,10);
    this._chartInst = new this._chartLib(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(e => e[0]),
        datasets: [{ label, data: sorted.map(e => e[1]), backgroundColor: color+'cc', borderColor: color, borderWidth:1, borderRadius:5 }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { font:{size:10}, maxRotation:30 } }, y: { beginAtZero:true } },
        animation: { duration: 700, easing: 'easeOutQuart' }
      }
    });
  }

  _slaGauge(slaMap, total) {
    const wrap = this.shadowRoot.getElementById('slaWrap');
    wrap.innerHTML = '';
    if (!total) return;
    const colors = { Met:'#188918','On Time':'#188918',Green:'#188918',Breached:'#bb0000',Red:'#bb0000',Pending:'#e9730c' };
    Object.entries(slaMap).sort((a,b)=>b[1]-a[1]).forEach(([status,count]) => {
      const pct = Math.round((count/total)*100);
      const col = colors[status] || '#0070f2';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%';
      row.innerHTML = `
        <div class="sla-label">${status}</div>
        <div class="sla-bar-outer" style="flex:1">
          <div class="sla-bar-inner" style="width:${pct}%;background:${col}"></div>
        </div>
        <div class="sla-pct">${pct}%</div>`;
      wrap.appendChild(row);
    });
  }

  _statusPills(statusMap) {
    const palette = ['#0070f2','#188918','#e9730c','#6a1b9a','#bb0000','#00838f','#ef6c00'];
    const grid = this.shadowRoot.getElementById('statusGrid');
    grid.innerHTML = '';
    Object.entries(statusMap).sort((a,b)=>b[1]-a[1]).forEach(([status,count],i) => {
      grid.innerHTML += `
        <div class="status-pill">
          <div class="dot" style="background:${palette[i%palette.length]}"></div>
          <span>${status}</span><strong>${count.toLocaleString()}</strong>
        </div>`;
    });
  }

  _kpiCard(label, value, badge='', color='blue') {
    return `<div class="kpi-card ${color}">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>${badge}
    </div>`;
  }

  _fmt(n) { return n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n); }

  _log(msg) {
    const el = this.shadowRoot.getElementById('debugLog');
    if (el) el.textContent = msg;
    console.log('[CCTRWidget]', msg);
  }
}

customElements.define('com-cctr-kpi-widget', CCTRWidget);
