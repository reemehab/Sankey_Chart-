(function () {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { 
                display: block; 
                width: 100%; 
                height: 800px; /* Fixed height helps VizFrame calculate layout */
                overflow: hidden; 
            }
            #ui5_container { 
                width: 100%; 
                height: 100%; 
            }
            /* Ensure the SAPUI5 focus outline doesn't look broken in SAC */
            .sapUiSizeCompact { 
                height: 100%; 
            }
        </style>
        <div id="ui5_container" class="sapUiSizeCompact"></div>
    `;

    class SACWizardBar extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._ui5View = null;
        }

        // Called by SAC whenever data or properties change
        onCustomWidgetAfterUpdate(changedProperties) {
            // Check if "myData" (from your JSON) has arrived
            if (changedProperties["myData"] && changedProperties["myData"].data) {
                this.processData(changedProperties["myData"]);
            }
        }

        processData(sacData) {
            // Defensive check: If SAC sends an empty array, don't crash
            if (!sacData.data || sacData.data.length === 0) {
                console.warn("SAC Wizard: No data rows received yet.");
                return;
            }

            // Safe Mapping: Check if dimensions/measures exist before accessing [0]
            const formattedData = sacData.data.map(row => {
                return {
                    month: (row.dimensions && row.dimensions[0]) ? row.dimensions[0].label : "Unknown",
                    revenue: (row.measures && row.measures[0]) ? row.measures[0].raw : 0
                };
            });

            if (!this._ui5View) {
                // First time: Initialize the UI5 View
                this.initUI5(formattedData);
            } else {
                // Subsequent times: Update the existing model
                const oModel = this._ui5View.getModel("chartModel");
                if (oModel) {
                    oModel.setProperty("/sales", formattedData);
                }
            }
        }

        initUI5(initialData) {
            const container = this._shadowRoot.getElementById("ui5_container");
            if (!container) return;

            // Wait for the UI5 Core to be ready
            sap.ui.getCore().attachInit(() => {
                sap.ui.loader.config({
                    paths: {
                        "ae/test/SACBar": "https://reemehab.github.io/Sankey_Chart-/webapp"
                    }
                });

                // IMPORTANT: Explicitly require VizFrame and FlattenedDataset 
                // This fixes the "Blank Chart" issue by forcing the libs to load
                sap.ui.require([
                    "sap/ui/core/mvc/XMLView",
                    "sap/ui/model/json/JSONModel",
                    "sap/viz/ui5/controls/VizFrame",
                    "sap/viz/ui5/data/FlattenedDataset"
                ], (XMLView, JSONModel) => {
                    
                    const oModel = new JSONModel({ sales: initialData });

                    XMLView.create({
                        viewName: "ae.test.SACBar.view.Main"
                    }).then((oView) => {
                        this._ui5View = oView;
                        oView.setModel(oModel, "chartModel");
                        
                        // Place the view into our Shadow DOM container
                        oView.placeAt(container);

                    }).catch(err => {
                        console.error("SAC Wizard: Error loading XML View:", err);
                    });
                });
            });
        }
    }

    customElements.define("sac-wizard-bar", SACWizardBar);
})();
