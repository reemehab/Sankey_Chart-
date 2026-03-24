(function () {
  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host { display: block; font-family: sans-serif; }
      .card { 
        background: #fff; border: 1px solid #ccc; 
        padding: 20px; text-align: center; border-radius: 8px;
      }
      .value { font-size: 32px; font-weight: bold; color: #0070f2; }
    </style>
    <div class="card">
      <div id="title">Process Count</div>
      <div id="count" class="value">0</div>
    </div>
  `;

  class ProcessCounter extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
    }

    // This is called by SAC after the widget is defined
    onCustomWidgetAfterUpdate(changedProperties) {
      this.render();
    }

    render() {
      const display = this._shadowRoot.getElementById("count");
      // Accessing myData as defined in your JSON dataBindings
      if (this.myData && this.myData.data) {
        display.textContent = this.myData.data.length;
      }
    }
  }

  // CRITICAL: This MUST match the "tag" in your JSON exactly
  const tagName = "com-sap-sample-processcounter";
  
  // Check if already defined to avoid errors on refresh
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ProcessCounter);
  }
})();
