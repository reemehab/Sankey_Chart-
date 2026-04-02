(function () {
    console.log("[WIDGET LOG] Script execution started.");

    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; width: 100%; height: 100%; }
        </style>
        <div id="ui5_content" style="width: 100%; height: 100%;"></div>
    `;

    class SACWizardBar extends HTMLElement {
        constructor() {
            super();
            console.log("[WIDGET LOG] Constructor called.");
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._ui5View = null;
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            console.log("[WIDGET LOG] onCustomWidgetAfterUpdate triggered.", changedProperties);
            if ("myData" in changedProperties) {
                console.log("[WIDGET LOG] 'myData' changed. Processing...");
                this.processData(this.myData);
            }
        }

        processData(sacData) {
            console.log("[WIDGET LOG] processData started. Raw data:", sacData);
            
            if (!sacData || !sacData.data || sacData.data.length === 0) {
                console.warn("[WIDGET LOG] Data is empty or malformed.");
                return;
                        }
                const formattedData = sacData.data.map((row, index) => {
                const mappedRow = {
                    objectId: row.dimensions_0?.id || "Unknown",
                    callCount: row.measures_0?.raw || 0
                };
                
                if(index === 0) console.log("[WIDGET LOG] Sample mapped row:", mappedRow);
                return mappedRow;
                });

            if (!this._ui5View) {
                console.log("[WIDGET LOG] No UI5 View found. Initializing...");
                this.initUI5(formattedData);
            } else {
                console.log("[WIDGET LOG] Updating existing model with new data.");
                const oModel = this._ui5View.getModel("chartModel");
                if (oModel) {
                    oModel.setProperty("/sales", formattedData);
                } else {
                    console.error("[WIDGET LOG] Could not find 'chartModel' to update.");
                }
            }
        }

        initUI5(data) {
            console.log("[WIDGET LOG] initUI5 started.");
            const container = this._shadowRoot.getElementById("ui5_content");
            
            sap.ui.getCore().attachInit(() => {
                console.log("[WIDGET LOG] sap.ui.getCore Init triggered.");
                sap.ui.require([
                    "sap/ui/core/mvc/XMLView",
                    "sap/ui/model/json/JSONModel",
                    "sap/ui/core/mvc/Controller"
                ], (XMLView, JSONModel, Controller) => {
                    console.log("[WIDGET LOG] SAPUI5 libraries loaded.");

                    // 1. Define Controller inside the file to avoid loading errors
                    if (!Controller.getMetadata("ae.test.SACBar.controller.Main")) {
                        Controller.extend("ae.test.SACBar.controller.Main", {
                            onInit: function () {
                                console.log("[CONTROLLER LOG] Main Controller initialized.");
                                var oChart = this.byId("barChart");
                                if (oChart) {
                                    console.log("[CONTROLLER LOG] VizFrame found. Applying properties.");
                                    oChart.setVizProperties({
                                        plotArea: { colorPalette: ["#0070f2"], dataLabel: { visible: true } },
                                        title: { visible: false }
                                    });
                                } else {
                                    console.error("[CONTROLLER LOG] Error: VizFrame 'barChart' not found.");
                                }
                            }
                        });
                    }

                    // 2. Create the View from the XML string
                    XMLView.create({
                        definition: `
<mvc:View 
    height="100%" 
    xmlns:mvc="sap.ui.core.mvc" 
    xmlns:viz="sap.viz.ui5.controls"
    xmlns:viz.feeds="sap.viz.ui5.controls.common.feeds"
    xmlns:viz.data="sap.viz.ui5.data"
    xmlns="sap.m">
    <VBox displayInline="true" width="100%" height="100%">
        <Title text="Call Records by Object" level="H3" class="sapUiSmallMargin"/>
        <viz:VizFrame id="barChart" vizType="bar" width="100%" height="400px">
            <viz:dataset>
                <viz.data:FlattenedDataset data="{chartModel>/sales}">
                    <viz.data:dimensions>
                        <viz.data:DimensionDefinition name="Object ID" value="{chartModel>objectId}"/>
                    </viz.data:dimensions>
                    <viz.data:measures>
                        <viz.data:MeasureDefinition name="Call Records" value="{chartModel>callCount}"/>
                    </viz.data:measures>
                </viz.data:FlattenedDataset>
            </viz:dataset>
            <viz:feeds>
                <viz.feeds:FeedItem uid="categoryAxis" type="Dimension" values="Object ID"/>
                <viz.feeds:FeedItem uid="valueAxis" type="Measure" values="Call Records"/>
            </viz:feeds>
        </viz:VizFrame>
    </VBox>
</mvc:View>`
                    }).then((oView) => {
                        console.log("[WIDGET LOG] XMLView created successfully.");
                        this._ui5View = oView;
                        const oModel = new JSONModel({ sales: data });
                        oView.setModel(oModel, "chartModel");
                        console.log("[WIDGET LOG] Model set on view. Placing in container...");
                        oView.placeAt(container);
                    }).catch(err => {
                        console.error("[WIDGET LOG] XMLView creation FAILED:", err);
                    });
                });
            });
        }
    }

    console.log("[WIDGET LOG] Defining custom element 'sac-wizard-bar'.");
    customElements.define("sac-wizard-bar", SACWizardBar);
})();
