(function () {
    console.log("🚀 Script loaded");

    class WizardBar extends HTMLElement {
        constructor() {
            super();
            this._containerId = "sac-wbar-" + Math.random().toString(36).slice(2, 9);
            this._chartId     = "sac-chart-" + Math.random().toString(36).slice(2, 9);

            // Inject styles into document head (once)
            if (!document.getElementById("sac-wizard-styles")) {
                const style = document.createElement("style");
                style.id = "sac-wizard-styles";
                style.textContent = `
                    .sac-widget-wrap    { font-family: Arial, sans-serif; width: 100%; }
                    .sac-navbar         { display: flex; align-items: center; gap: 8px;
                                          background: #0a6ed1; padding: 10px 16px;
                                          border-radius: 6px 6px 0 0; }
                    .sac-navbar-title   { color: #fff; font-size: 15px; font-weight: 600;
                                          flex: 1; margin: 0; }
                    .sac-navbar-btn     { background: rgba(255,255,255,0.15); border: none;
                                          color: #fff; padding: 5px 12px; border-radius: 4px;
                                          cursor: pointer; font-size: 12px; }
                    .sac-navbar-btn:hover { background: rgba(255,255,255,0.28); }
                    .sac-navbar-badge   { background: #fff; color: #0a6ed1; border-radius: 10px;
                                          padding: 2px 8px; font-size: 11px; font-weight: 700; }
                    .sac-chart-area     { width: 100%; height: 460px; }
                `;
                document.head.appendChild(style);
            }

            // Build the HTML structure
            this.innerHTML = `
                <div class="sac-widget-wrap" id="${this._containerId}">

                    <!-- ① Navbar -->
                    <nav class="sac-navbar">
                        <span class="sac-navbar-title">Object Call Analysis</span>
                        <span class="sac-navbar-badge" id="${this._containerId}-count">0 records</span>
                        <button class="sac-navbar-btn" id="${this._containerId}-refresh">↻ Refresh</button>
                        <button class="sac-navbar-btn" id="${this._containerId}-export">↓ Export</button>
                    </nav>

                    <!-- ② Chart container (UI5 renders here) -->
                    <div class="sac-chart-area" id="${this._chartId}"></div>

                </div>
            `;

            // Wire up navbar button events
            this.querySelector(`#${this._containerId}-refresh`)
                .addEventListener("click", () => this._onRefresh());
            this.querySelector(`#${this._containerId}-export`)
                .addEventListener("click", () => this._onExport());
        }

        // ─── Navbar button handlers ───────────────────────────────────────────
        _onRefresh() {
            const chartArea = document.getElementById(this._chartId);
            if (chartArea) chartArea.innerHTML =
                '<div style="padding:20px;color:#666">↻ Refreshing...</div>';
            // SAC will call onCustomWidgetAfterUpdate again automatically
            // when filters/data change — this button is just a visual cue.
            // If you want to force a re-render, call this._lastData and re-render:
            if (this._lastData) this.renderChart(this._lastData);
        }

        _onExport() {
            if (!this._lastData || !this._lastData.length) return;
            // Build a simple CSV and trigger download
            const csv = "Object ID,Call Count\n" +
                this._lastData.map(r => `"${r.objectId}",${r.callCount}`).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href = url; a.download = "call_analysis.csv"; a.click();
            URL.revokeObjectURL(url);
        }

        // ─── SAC lifecycle hook ───────────────────────────────────────────────
        onCustomWidgetAfterUpdate(changedProps) {
            console.log("[WIDGET] Update — state:",
                changedProps.myData?.state ?? "no myData");
            const myData = changedProps.myData;
            if (myData) this.processData(myData);
        }

        // ─── Data processing ──────────────────────────────────────────────────
        processData(myData) {
            const chartArea = document.getElementById(this._chartId);
            const badge     = document.getElementById(`${this._containerId}-count`);

            if (!myData || myData.state === "loading") {
                if (chartArea) chartArea.innerHTML =
                    '<div style="padding:20px;color:#666">⏳ Loading data...</div>';
                return;
            }

            if (myData.state === "error") {
                const msgs = (myData.messages || [])
                    .map(m => m.message || JSON.stringify(m)).join("; ");
                console.error("[WIDGET] Data error:", msgs);
                if (chartArea) chartArea.innerHTML =
                    `<div style="padding:20px;color:#c00;font-size:13px">
                        <b>Data binding error</b><br>
                        ${msgs || "Check model connection and dimension/measure feeds in SAC"}
                    </div>`;
                return;
            }

            if (myData.state !== "success" || !myData.data?.length) {
                if (chartArea) chartArea.innerHTML =
                    '<div style="padding:20px;color:#666">No data returned.</div>';
                return;
            }

            // Log keys so you can verify what SAC sends
            console.log("[WIDGET] First row:", myData.data[0]);

            const firstRow = myData.data[0];
            const allKeys  = Object.keys(firstRow);
            const dimKey   = allKeys.find(k =>
                firstRow[k]?.label !== undefined || firstRow[k]?.id !== undefined);
            const measKey  = allKeys.find(k =>
                typeof firstRow[k]?.raw === "number" || typeof firstRow[k] === "number");

            if (!dimKey || !measKey) {
                if (chartArea) chartArea.innerHTML =
                    `<div style="padding:20px;color:#c00;font-size:13px">
                        Could not detect keys.<br>Keys found: <b>${allKeys.join(", ")}</b>
                    </div>`;
                return;
            }

            const data = myData.data.map(row => ({
                objectId:  row[dimKey]?.label || row[dimKey]?.id || String(row[dimKey]),
                callCount: typeof row[measKey] === "number"
                    ? row[measKey]
                    : Number(row[measKey]?.raw ?? row[measKey]?.formatted ?? 0)
            }));

            // Update badge with record count
            if (badge) badge.textContent = `${data.length} records`;

            // Cache data for export and refresh
            this._lastData = data;
            console.log("✅ Data ready:", data.length, "rows");
            this.renderChart(data);
        }

        // ─── UI5 chart rendering ──────────────────────────────────────────────
        renderChart(data) {
            const chartId = this._chartId;

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
                    dimensions: [{ name: "Object ID",  value: "{objectId}"  }],
                    measures:   [{ name: "Call Count", value: "{callCount}" }],
                    data: { path: "/data" }
                });

                const oVizFrame = new VizFrame({
                    vizType: "column",
                    width:   "100%",
                    height:  "450px"
                });

                oVizFrame.setDataset(oDataset);
                oVizFrame.setModel(oModel);
                oVizFrame.addFeed(new FeedItem({
                    uid: "valueAxis", type: "Measure", values: ["Call Count"]
                }));
                oVizFrame.addFeed(new FeedItem({
                    uid: "categoryAxis", type: "Dimension", values: ["Object ID"]
                }));

                this._vizFrame = oVizFrame;
                oVizFrame.placeAt(chartId);
                console.log("🔥 Chart placed at #" + chartId);
            });
        }
    }

    customElements.define("sac-wizard-bar", WizardBar);
})();
