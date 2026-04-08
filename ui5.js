(function () {
    console.log("🚀 Script loaded");

    class WizardBar extends HTMLElement {
        constructor() {
            super();
            // Light DOM — SAP UI5 placeAt() needs document.getElementById to work
            this._containerId = "sac-wbar-" + Math.random().toString(36).slice(2, 9);
            const div = document.createElement("div");
            div.id = this._containerId;
            div.style.cssText = "width:100%;height:500px;";
            this.appendChild(div);
            this._chartBuilt = false;
        }

        onCustomWidgetAfterUpdate(changedProps) {
            console.log("[WIDGET] Update — full changedProps:", JSON.stringify({
                keys: Object.keys(changedProps),
                myData_direct: changedProps.myData
                    ? { state: changedProps.myData.state }
                    : "absent",
                dataBindings_myData: changedProps.dataBindings?.myData
                    ? { state: changedProps.dataBindings.myData.state }
                    : "absent"
            }));

            // SAC passes myData DIRECTLY on changedProps (not nested under dataBindings)
            // dataBindings is an internal SAC proxy — do not read data from it
            const myData = changedProps.myData;
            if (myData) {
                this.processData(myData);
            }
        }

        processData(myData) {
            const container = document.getElementById(this._containerId);

            // Always show state for debugging
            console.log("[WIDGET] processData — state:", myData?.state);

            if (!myData || myData.state === "loading") {
                if (container) container.innerHTML =
                    '<div style="padding:20px;color:#666;font-family:sans-serif">⏳ Loading data...</div>';
                return;
            }

            // Visible error — show the message so you can diagnose the model issue
            if (myData.state === "error") {
                const msgs = (myData.messages || []).map(m => m.message || JSON.stringify(m)).join("; ");
                console.error("[WIDGET] Data error:", msgs, myData);
                if (container) container.innerHTML =
                    `<div style="padding:20px;color:#c00;font-family:sans-serif;font-size:13px">
                        <b>Data binding error</b><br>${msgs || "Unknown error — check model connection and dimension/measure assignment in SAC"}
                    </div>`;
                return;
            }

            if (myData.state !== "success") {
                console.warn("[WIDGET] Unexpected state:", myData.state);
                return;
            }

            if (!myData.data || myData.data.length === 0) {
                if (container) container.innerHTML =
                    '<div style="padding:20px;color:#666;font-family:sans-serif">No data returned.</div>';
                return;
            }

            // Log first row so you can see the EXACT key names SAC uses
            console.log("[WIDGET] First row keys:", Object.keys(myData.data[0]));
            console.log("[WIDGET] First row sample:", myData.data[0]);

            /*
             * SAC row keys: SAC uses the feed `id` from your JSON as the key.
             * Your JSON has:
             *   { "id": "dimensions", "type": "dimension" }
             *   { "id": "measures",   "type": "mainStructureMember" }
             *
             * So row keys will be something like:
             *   row["dimensions_0"] or row["dimensions"] → dimension member object
             *   row["measures_0"]   or row["measures"]   → measure value object
             *
             * The console log above will tell you the EXACT keys.
             * Update the two lines below if needed.
             */
            const firstRow = myData.data[0];
            const allKeys  = Object.keys(firstRow);

            // Heuristic: dimension member objects have a `.label` or `.id` property
            const dimKey   = allKeys.find(k => firstRow[k]?.label !== undefined || firstRow[k]?.id !== undefined);
            // Heuristic: measure value objects have a `.raw` number property
            const measKey  = allKeys.find(k => typeof firstRow[k]?.raw === "number" || typeof firstRow[k] === "number");

            console.log("[WIDGET] Detected dimKey:", dimKey, "measKey:", measKey);

            if (!dimKey || !measKey) {
                container.innerHTML =
                    `<div style="padding:20px;color:#c00;font-family:sans-serif;font-size:13px">
                        Could not detect dimension/measure keys.<br>
                        Row keys found: <b>${allKeys.join(", ")}</b><br>
                        Check the console for the full first-row dump.
                    </div>`;
                return;
            }

            const data = myData.data.map(row => ({
                objectId:  row[dimKey]?.label  || row[dimKey]?.id  || String(row[dimKey]),
                callCount: typeof row[measKey] === "number"
                    ? row[measKey]
                    : Number(row[measKey]?.raw ?? row[measKey]?.formatted ?? 0)
            }));

            console.log("✅ Data ready:", data.length, "rows. Sample:", data[0]);
            this.renderChart(data);
        }

        renderChart(data) {
            const containerId = this._containerId;

            // Prevent duplicate charts on repeated updates
            if (this._vizFrame) {
                try { this._vizFrame.destroy(); } catch (e) {}
                this._vizFrame = null;
            }

            sap.ui.require([
                "sap/ui/model/json/JSONModel",
                "sap/viz/ui5/controls/VizFrame",
                "sap/viz/ui5/data/FlattenedDataset",
                "sap/viz/ui5/controls/common/feeds/FeedItem"
            ], (JSONModel, VizFrame, FlattenedDataset, FeedItem) => {
                console.log("📊 Building VizFrame...");

                const oModel = new JSONModel({ data });

                const oDataset = new FlattenedDataset({
                    dimensions: [{ name: "Object ID",   value: "{objectId}"  }],
                    measures:   [{ name: "Call Count",  value: "{callCount}" }],
                    data: { path: "/data" }
                });

                const oVizFrame = new VizFrame({
                    vizType: "column",
                    width:   "100%",
                    height:  "480px"
                });

                oVizFrame.setDataset(oDataset);
                oVizFrame.setModel(oModel);
                oVizFrame.addFeed(new FeedItem({ uid: "valueAxis",    type: "Measure",    values: ["Call Count"] }));
                oVizFrame.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension",  values: ["Object ID"]  }));

                this._vizFrame = oVizFrame;
                oVizFrame.placeAt(containerId);
                console.log("🔥 Chart placed at #" + containerId);
            });
        }
    }

    customElements.define("sac-wizard-bar", WizardBar);
})();
