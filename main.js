(function () {
  let template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host {
        display: block;
        font-family: sans-serif;
      }
      .container {
        padding: 20px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        text-align: center;
      }
      .count {
        font-size: 48px;
        font-weight: bold;
        color: #0070f2;
      }
      .label {
        color: #666;
        font-size: 14px;
        text-transform: uppercase;
      }
    </style>
    <div class="container">
      <div class="label">Total Process Types</div>
      <div id="process-count" class="count">0</div>
    </div>
  `;

  class ProcessTypeWidget extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
    }

    // This is the key method SAC calls when data arrives
    onCustomWidgetAfterUpdate(changedProperties) {
      this.render();
    }

    render() {
      const countEl = this._shadowRoot.getElementById("process-count");
      
      // 'allRows' must match the ID in your JSON file's dataBindings
      const dataBinding = this.allRows; 

      if (dataBinding && dataBinding.data) {
        // Map the rows and count unique process_type occurrences
        // or simply count the total rows if each row is a process
        const rows = dataBinding.data;
        const totalCount = rows.length;
        
        countEl.textContent = totalCount;
      } else {
        countEl.textContent = "No Data";
      }
    }
  }

  customElements.define("com-sample-process-counter", ProcessTypeWidget);
})();
