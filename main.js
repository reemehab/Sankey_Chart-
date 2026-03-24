const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: block; font-family: '72', Arial, sans-serif; padding: 12px; box-sizing: border-box; }
    .header { font-size: 14px; font-weight: bold; color: #0070f2; margin-bottom: 10px; }
    .kpi-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .kpi-card {
      flex: 1; min-width: 120px; background: #f5f6f7; border-left: 4px solid #0070f2;
      border-radius: 6px; padding: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-label { font-size: 11px; color: #6a6d70; text-transform: uppercase; }
    .kpi-value { font-size: 22px; font-weight: bold; color: #1d2d3e; margin-top: 4px; }
    .kpi-delta { font-size: 11px; margin-top: 2px; }
    .positive { color: #188918; } .negative { color: #bb0000; }
    canvas { width: 100% !important; max-height: 200px; }
    .no-data { color: #aaa; font-size: 13px; text-align: center; padding: 20px; }
  </style>
  <div class="header" id="title">📊 Cost Center Overview</div>
  <div class="kpi-grid" id="kpiGrid"></div>
  <canvas id="barChart"></canvas>
  <div class="no-data" id="noData" style="display:none">No data bound yet.</div>
`;

class CCTRWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._data = [];
    this._chartLib = null;
    this._chartInstance = null;
  }

  connectedCallback() {
    // Dynamically load Chart.js
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => {
      this._chartLib = window.Chart;
      if (this._data.length) this._render();
    };
    document.head.appendChild(script);
  }

  // SAC calls this when data binding updates
  onCustomWidgetAfterUpdate(changedProps) {}

  // Called by SAC data binding — receives the model data
  setData(data) {
    this._data = data;
    if (this._chartLib) this._render();
  }

  _render() {
    const data = this._data;
    if (!data || data.length === 0) {
      this.shadowRoot.getElementById('noData').style.display = 'block';
      return;
    }
    this.shadowRoot.getElementById('noData').style.display = 'none';

    // Aggregate KPIs
    let totalActual = 0, totalPlan = 0;
    const labels = [], actuals = [], plans = [];

    data.forEach(row => {
      const actual = parseFloat(row.actual || 0);
      const plan   = parseFloat(row.plan || 0);
      totalActual += actual;
      totalPlan   += plan;
      labels.push(row.cctr || row.label || 'CC');
      actuals.push(actual);
      plans.push(plan);
    });

    const variance = totalActual - totalPlan;
    const variancePct = totalPlan ? ((variance / totalPlan) * 100).toFixed(1) : 0;

    // KPI Cards
    const grid = this.shadowRoot.getElementById('kpiGrid');
    grid.innerHTML = `
      ${this._card('Total Actual', this._fmt(totalActual))}
      ${this._card('Total Plan',   this._fmt(totalPlan))}
      ${this._card('Variance',     this._fmt(variance),
        variance < 0 ? `▲ ${Math.abs(variancePct)}% under budget` : `▼ ${variancePct}% over budget`,
        variance < 0 ? 'positive' : 'negative'
      )}
    `;

    // Bar Chart
    const canvas = this.shadowRoot.getElementById('barChart');
    if (this._chartInstance) this._chartInstance.destroy();
    this._chartInstance = new this._chartLib(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Actual', data: actuals, backgroundColor: '#0070f2', borderRadius: 4 },
          { label: 'Plan',   data: plans,   backgroundColor: '#e8f1fc', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } },
        animation: { duration: 800, easing: 'easeOutBounce' }
      }
    });
  }

  _card(label, value, delta = '', deltaClass = '') {
    return `
      <div class="kpi-card">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${value}</div>
        ${delta ? `<div class="kpi-delta ${deltaClass}">${delta}</div>` : ''}
      </div>`;
  }

  _fmt(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
      notation: 'compact', maximumFractionDigits: 1 }).format(n);
  }
}

customElements.define('com-cctr-kpi-widget', CCTRWidget);
