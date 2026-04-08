(function () {
    console.log("🚀 Script loaded");

    class WizardBar extends HTMLElement {
        constructor() {
            super();
            // Bug 4 fix: don't use Shadow DOM — placeAt() can't target shadow roots.
            // Use a regular light DOM container so SAP UI5 can find it by ID.
            this._containerId = "sac-wizard-bar-" + Math.random().toString(36).slice(2);
            const div = document.createElement("div");
            div.id = this._containerId;
            div.style.cssText = "width:100%;height:500px;";
            this.appendChild(div);
        }

        // Bug 1 fix: changedProps is the full widget object.
        // The data binding lives under changedProps.dataBindings.myData
        onCustomWidgetAfterUpdate(changedProps) {
            console.log("[WIDGET] Update", changedProps);
            const myData = changedProps?.dataBindings?.myData;
            if (myData) {
                this.processData(myData);
            }
        }

        processData(myData) {
            console.log("[WIDGET] processData", myData);
            if (!myData || myData.state !== "success") {
                console.log("⏳ waiting for data...");
                return;
            }

            // Bug 2 fix: SAC row keys match the feed `id` from your JSON ("dimensions", "measures"),
            // not the feed `description`. Log the first row to confirm key names in your environment.
            console.log("🔍 Sample row:", myData.data[0]);

            const data = myData.data.map(row => {
                // Dimension member: try the feed id "dimensions" first, fallback to index 0
                const dimKey   = Object.keys(row).find(k => !["measures","Call Count","callCount"].includes(k)) || "dimensions";
                const measKey  = Object.keys(row).find(k => ["measures","Call Count","callCount"].includes(k)) || "measures";

                const objectId  = row[dimKey]?.label  || row[dimKey]?.id  || row[dimKey]  || String(dimKey);
                const callCount = Number(row[measKey]?.raw ?? row[measKey] ?? 0);
                return { objectId, callCount };
            });

            console.log("✅ Data ready:", data.length, data[0]);
            this.renderChart(data);
        }

        renderChart(data) {
            const containerId = this._containerId;

            // Bug 3 fix: don't use attachInit — UI5 is already running inside SAC.
            // Call sap.ui.require directly. It fires synchronously if the modules are cached,
            // or asynchronously once loaded — either way it will not miss the boot.
            sap.ui.require([
                "sap/ui/model/json/JSONModel",
                "sap/viz/ui5/controls/VizFrame",
                "sap/viz/ui5/data/FlattenedDataset",
                "sap/viz/ui5/controls/common/feeds/FeedItem"
            ], function (JSONModel, VizFrame, FlattenedDataset, FeedItem) {
                console.log("📊 Building chart...");

                const oModel = new JSONModel({ data: data });

                const oDataset = new FlattenedDataset({
                    dimensions: [{ name: "Object ID", value: "{objectId}" }],
                    measures:   [{ name: "Call Count", value: "{callCount}" }],
                    data: { path: "/data" }
                });

                const oVizFrame = new VizFrame({
                    vizType: "column",
                    width:   "100%",
                    height:  "480px"
                });

                oVizFrame.setDataset(oDataset);
                oVizFrame.setModel(oModel);

                oVizFrame.addFeed(new FeedItem({
                    uid:    "valueAxis",
                    type:   "Measure",
                    values: ["Call Count"]
                }));
                oVizFrame.addFeed(new FeedItem({
                    uid:    "categoryAxis",
                    type:   "Dimension",
                    values: ["Object ID"]
                }));

                // Bug 4 fix: placeAt() expects a DOM element ID string.
                // Since we're in light DOM, document.getElementById finds it normally.
                oVizFrame.placeAt(containerId);
                console.log("🔥 Chart placed at:", containerId);
            });
        }
    }

    customElements.define("sac-wizard-bar", WizardBar);
})();
