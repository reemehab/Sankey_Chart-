(function () {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; width: 100%; height: 100%; }
            #ui5_container { width: 100%; height: 100%; min-height: 500px; }
        </style>
        <div id="ui5_container"></div>
    `;

    class SACWizardBar extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._ui5View = null;
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            // FIXED: Matches "myData" from your JSON
            if (changedProperties["myData"]) {
                this.updateUI5Data(changedProperties["myData"]);
            }
        }

        updateUI5Data(sacData) {
            if (!sacData || !sacData.data) return;

            const formattedData = sacData.data.map(row => ({
                month: row.dimensions[0].label, 
                revenue: row.measures[0].raw
            }));

            if (!this._ui5View) {
                this.initUI5(formattedData);
            } else {
                const oModel = this._ui5View.getModel("chartModel");
                if (oModel) {
                    oModel.setProperty("/sales", formattedData);
                }
            }
        }

        initUI5(initialData) {
            const container = this._shadowRoot.getElementById("ui5_container");

            sap.ui.getCore().attachInit(() => {
                sap.ui.loader.config({
                    paths: {
                        "ae/test/SACBar": "https://reemehab.github.io/Sankey_Chart-/webapp"
                    }
                });
                
                sap.ui.require([
                    "sap/ui/core/mvc/XMLView",
                    "sap/ui/model/json/JSONModel",
                    "sap/viz/ui5/controls/VizFrame", // FORCE LOAD VIZ
                    "sap/viz/ui5/data/FlattenedDataset" // FORCE LOAD DATASET
                ], (XMLView, JSONModel) => {
                    const oModel = new JSONModel({ sales: initialData });

                    XMLView.create({
                        viewName: "ae.test.SACBar.view.Main" 
                    }).then((oView) => {
                        this._ui5View = oView;
                        oView.setModel(oModel, "chartModel");
                        oView.placeAt(container);
                    }).catch(err => console.error("Error loading UI5 View:", err));
                });
            });
        }
    }

    customElements.define("sac-wizard-bar", SACWizardBar);
})();
