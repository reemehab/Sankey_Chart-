(function () {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; width: 100%; height: 500px; }
            #ui5_container { width: 100%; height: 100%; min-height: 500px; background-color: #f4f4f4; }
        </style>
        <div id="ui5_container" class="sapUiSizeCompact"></div>
    `;

    class SACBarOnly extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._ui5View = null;
            console.log("[WIDGET LOG] Constructor: Shadow DOM attached.");
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            console.log("[WIDGET LOG] onCustomWidgetAfterUpdate triggered.", changedProperties);
            if (changedProperties["myData"]) {
                this.processData(changedProperties["myData"]);
            }
        }

        processData(sacData) {
            console.log("[WIDGET LOG] Raw data received from SAC:", sacData);
            
            if (!sacData || !sacData.data || sacData.data.length === 0) {
                console.warn("[WIDGET LOG] Data is empty. Check your Builder panel in SAC.");
                return;
            }

            const formattedData = sacData.data.map(row => ({
                month: (row.dimensions && row.dimensions[0]) ? row.dimensions[0].label : "Unknown",
                revenue: (row.measures && row.measures[0]) ? row.measures[0].raw : 0
            }));
            
            console.log("[WIDGET LOG] Formatted data for UI5:", formattedData);

            if (!this._ui5View) {
                console.log("[WIDGET LOG] First run: Initializing UI5...");
                setTimeout(() => { this.initUI5(formattedData); }, 100);
            } else {
                console.log("[WIDGET LOG] Updating existing model with new data.");
                const oModel = this._ui5View.getModel("chartModel");
                if (oModel) {
                    oModel.setProperty("/sales", formattedData);
                } else {
                    console.error("[WIDGET LOG] Model 'chartModel' not found on view.");
                }
            }
        }

        initUI5(initialData) {
            const container = this._shadowRoot.getElementById("ui5_container");
            if (!container) {
                console.error("[WIDGET LOG] Critical: Container #ui5_container not found in Shadow DOM.");
                return;
            }

            if (typeof sap === "undefined") {
                console.error("[WIDGET LOG] Critical: SAP UI5 library (sap-ui-core.js) is not loaded in the environment.");
                return;
            }

            sap.ui.getCore().attachInit(() => {
                console.log("[WIDGET LOG] UI5 Core initialized. Configuring paths...");
                
                sap.ui.loader.config({
                    paths: { "ae/test/SACBar": "https://reemehab.github.io/Sankey_Chart-/webapp" }
                });

                sap.ui.require([
                    "sap/ui/core/mvc/XMLView",
                    "sap/ui/model/json/JSONModel"
                ], (XMLView, JSONModel) => {
                    console.log("[WIDGET LOG] Required UI5 modules loaded. Creating View...");
                    
                    const oModel = new JSONModel({ sales: initialData });

                    XMLView.create({
                        viewName: "ae.test.SACBar.view.Main"
                    }).then((oView) => {
                        console.log("[WIDGET LOG] Success: XML View created.");
                        this._ui5View = oView;
                        oView.setModel(oModel, "chartModel");
                        oView.placeAt(container);
                        console.log("[WIDGET LOG] View placed at container.");
                    }).catch(err => {
                        console.error("[WIDGET LOG] Failed to load XML View. Check GitHub URL and folder structure.", err);
                    });
                });
            });
        }
    }
    customElements.define("sac-wizard-bar", SACBarOnly);
})();
