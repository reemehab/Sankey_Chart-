(function () {
  let template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host {
        display: block;
        padding: 1rem;
      }
      .card {
        background: #ffffff;
        border-radius: 4px;
        border: 1px solid #d9d9d9;
        text-align: center;
        padding: 20px;
        font-family: "72", Arial, Helvetica, sans-serif;
      }
      .title {
        font-size: 14px;
        color: #6a6d70;
        margin-bottom: 10px;
      }
      .value {
        font-size: 36px;
        font-weight: bold;
        color: #0070f2;
      }
    </style>
    <div class="card">
      <div class="title">Total Process Count</div>
      <div id="count-display" class="value">0</div>
    </div>
  `;

  class ProcessCounter extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
    }

    // SAC calls this whenever the data in the story changes
    onCustomWidgetAfterUpdate(changedProperties) {
      this.render();
    }

    render() {
      const display = this._shadowRoot.getElementById("count-display");
      
      // 'myDataBinding' refers to the ID set in the JSON file
      const binding = this.myDataBinding;

      if (binding && binding.data) {
        // This counts every row returned by the CDS query
        const rowCount = binding.data.length;
        display.textContent = rowCount.toLocaleString();
      } else {
        display.textContent = "0";
      }
    }
  }

  customElements.define("com-sap-sample-processcounter", ProcessCounter);
})();
