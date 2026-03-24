(function () {
  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host {
        display: block;
        font-family: "72", "SAP72", Arial, sans-serif;
      }
      .card {
        background: #ffffff;
        border-radius: 0.5rem;
        border: 1px solid #e2e2e2;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        text-align: center;
        transition: all 0.3s ease;
      }
      .card:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      .title {
        font-size: 0.875rem;
        color: #6a6d70;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
      }
      .value {
        font-size: 3rem;
        font-weight: 700;
        color: #0070f2;
        margin: 0;
      }
      .status {
        font-size: 0.75rem;
        color: #188918;
        margin-top: 0.5rem;
        font-weight: 600;
      }
      .no-data {
        color: #bb0000;
        font-style: italic;
      }
    </style>
    <div class="card">
      <div id="widget-title" class="title">Process Counter</div>
      <div id="count-display" class="value">0</div>
      <div id="status-text" class="status">Live from CDS</div>
    </div>
  `;

  class ProcessCounter extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._props = {};
    }

    // Called when the widget is added or properties change
    onCustomWidgetAfterUpdate(changedProperties) {
      if (changedProperties["title"]) {
        this._shadowRoot.getElementById("widget-title").textContent = changedProperties["title"];
      }
      this.render();
    }

    render() {
      const display = this._shadowRoot.getElementById("count-display");
      const status = this._shadowRoot.getElementById("status-text");

      // SAC binds the data to this.myData based on your JSON structure
      const dataBinding = this.myData;

      if (dataBinding && dataBinding.data) {
        // Each entry in dataBinding.data represents a record from your CDS view
        const totalRows = dataBinding.data.length;
        
        display.textContent = totalRows.toLocaleString();
        status.textContent = "Total Records Loaded";
        status.classList.remove("no-data");
      } else {
        display.textContent = "0";
        status.textContent = "Waiting for data...";
        status.classList.add("no-data");
      }
    }
  }

  customElements.define("com-sap-sample-processcounter", ProcessCounter);
})();
