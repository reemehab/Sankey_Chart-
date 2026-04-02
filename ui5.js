(function () {
    console.log("🚀 Script loaded");

    class WizardBar extends HTMLElement {
        constructor() {
            super();

            this._shadowRoot = this.attachShadow({ mode: "open" });

            this._shadowRoot.innerHTML = `
                <div id="container" style="width:100%; height:500px;"></div>
            `;
        }

        onCustomWidgetAfterUpdate(changedProps) {
            console.log("[WIDGET] Update", changedProps);

            if (changedProps.myData) {
                this.processData(changedProps.myData);
            }
        }

        processData(myData) {
            console.log("[WIDGET] processData", myData);

            if (!myData || myData.state !== "success") {
                console.log("⏳ waiting for data...");
                return;
            }

            const data = myData.data.map(row => ({
                objectId: row["Object ID"]?.id || row["Object ID"],
                callCount: Number(row["Call Count"]?.raw || row["Call Count"])
            }));

            console.log("✅ Data ready:", data.length);

            this.renderChart(data);
        }

        renderChart(data) {
            const that = this;

            sap.ui.getCore().attachInit(() => {
                sap.ui.require([
                    "sap/ui/model/json/JSONModel",
                    "sap/viz/ui5/controls/VizFrame",
                    "sap/viz/ui5/data/FlattenedDataset",
                    "sap/viz/ui5/controls/common/feeds/FeedItem"
                ], function (JSONModel, VizFrame, FlattenedDataset, FeedItem) {

                    console.log("📊 Building chart...");

                    const oModel = new JSONModel({
                        data: data
                    });

                    const oDataset = new FlattenedDataset({
                        dimensions: [{
                            name: "Object ID",
                            value: "{objectId}"
                        }],
                        measures: [{
                            name: "Call Count",
                            value: "{callCount}"
                        }],
                        data: {
                            path: "/data"
                        }
                    });

                    const oVizFrame = new VizFrame({
                        vizType: "column",
                        width: "100%",
                        height: "500px"
                    });

                    oVizFrame.setDataset(oDataset);
                    oVizFrame.setModel(oModel);

                    oVizFrame.addFeed(new FeedItem({
                        uid: "valueAxis",
                        type: "Measure",
                        values: ["Call Count"]
                    }));

                    oVizFrame.addFeed(new FeedItem({
                        uid: "categoryAxis",
                        type: "Dimension",
                        values: ["Object ID"]
                    }));

                    // 💥 الحل السحري هنا
                    setTimeout(() => {
                        oVizFrame.placeAt(that._shadowRoot.getElementById("container"));
                        oVizFrame.rerender();
                        console.log("🔥 Chart FORCED to render");
                    }, 0);

                });
            });
        }
    }

    customElements.define("sac-wizard-bar", WizardBar);
})();
