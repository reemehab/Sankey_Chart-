(function () {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; width: 100%; height: 500px; }
            #ui5_container { width: 100%; height: 100%; min-height: 500px; }
        </style>
        <div id="ui5_container" class="sapUiSizeCompact"></div>
    `;

    class SACBarOnly extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._ui5View = null;
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if (changedProperties["myData"]) {
                this.processData(changedProperties["myData"]);
            }
        }

        processData(sacData) {
            if (!sacData || !sacData.data) return;

            const formattedData = sacData.data.map(row => ({
                month: (row.dimensions && row.dimensions[0]) ? row.dimensions[0].label : "Unknown",
                revenue: (row.measures && row.measures[0]) ? row.measures[0].raw : 0
            }));

            if (!this._ui5View) {
                // Delay initialization slightly to ensure Shadow DOM is ready
                setTimeout(() => { this.initUI5(formattedData); }, 100);
            } else {
                const oModel = this._ui5View.getModel("chartModel");
                if (oModel) oModel.setProperty("/sales", formattedData);
            }
        }

        initUI5(initialData) {
            const container = this._shadowRoot.getElementById("ui5_container");
            if (!container || typeof sap === "undefined") return;

            sap.ui.getCore().attachInit(() => {
                sap.ui.loader.config({
                    paths: { "ae/test/SACBar": "https://reemehab.github.io/Sankey_Chart-/webapp" }
                });

                sap.ui.require([
                    "sap/ui/core/mvc/XMLView",
                    "sap/ui/model/json/JSONModel"
                ], (XMLView, JSONModel) => {
                    const oModel = new JSONModel({ sales: initialData });

                    XMLView.create({
                        viewName: "ae.test.SACBar.view.Main"
                    }).then((oView) => {
                        this._ui5View = oView;
                        oView.setModel(oModel, "chartModel");
                        oView.placeAt(container);
                    }).catch(err => console.error("UI5 View Load Error:", err));
                });
            });
        }
    }
    customElements.define("sac-wizard-bar", SACBarOnly);
})();
