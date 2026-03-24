(function () {
    // This fires the second the browser reads this file
    console.log("1. 🚀 Script file detected by browser");

    const template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; padding: 20px; font-family: sans-serif; }
            .card { background: #fff; border: 1px solid #0070f2; border-radius: 8px; text-align: center; }
            .num { font-size: 40px; font-weight: bold; color: #0070f2; }
        </style>
        <div class="card">
            <div id="title">Process Count</div>
            <div id="count" class="num">0</div>
        </div>
    `;

    class ProcessCounter extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            // This tells us the widget is physically placed on the page
            console.log("2. 🏗️ Widget component initialized");
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            // This is the most important log! It shows the data SAC is sending
            console.log("3. 📊 Data received from SAC:", this.myData);
            
            this.render();
        }

        render() {
            const display = this._shadowRoot.getElementById("count");
            if (this.myData && this.myData.data) {
                display.textContent = this.myData.data.length;
            }
        }
    }

    customElements.define("com-sap-sample-processcounter", ProcessCounter);
})();
