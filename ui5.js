(function () {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host {
                display: block;
                width: 100%;
                height: 100%;
            }
        </style>
        <div id="ui5_content" style="width: 100%; height: 100%;"></div>
    `;

    class SACWizardBar extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._ui5View = null;
        }

        // SAC calls this when data changes
        onCustomWidgetAfterUpdate(changedProperties) {
            if ("myData" in changedProperties) {
                this.processData(this.myData);
            }
        }

        processData(sacData) {
            console.log("[WIDGET LOG] Raw data received:", sacData);
            if (!sacData || !sacData.data || sacData.data.length === 0) return;

            const formattedData = sacData.data.map(row => {
                return {
                    objectId: (row.object_id) ? row.object_id.id : "Unknown", 
                    callCount: (row.Call_Record) ? row.Call_Record.raw : 0
                };
            });

            if (!this._ui5View) {
                this.initUI5(formattedData);
            } else {
                const oModel = this._ui5View.getModel("chartModel");
                if (oModel) {
                    oModel.setProperty("/sales", formattedData);
                }
            }
        }

        initUI5(data) {
            const container = this._shadowRoot.getElementById("ui5_content");
            
            sap.ui.getCore().attachInit(() => {
                sap.ui.require([
                    "sap/ui/core/mvc/XMLView",
                    "sap/ui/model/json/JSONModel"
                ], (XMLView, JSONModel) => {
                    XMLView.create({
                        viewName: "ae.test.SACBar.view.Main", // Ensure this matches your namespace
                        definition: `...PASTE YOUR XML CONTENT HERE...`
                    }).then((oView) => {
                        this._ui5View = oView;
                        const oModel = new JSONModel({ sales: data });
                        oView.setModel(oModel, "chartModel");
                        oView.placeAt(container);
                    });
                });
            });
        }
    }

    customElements.define("sac-wizard-bar", SACWizardBar);
})();
