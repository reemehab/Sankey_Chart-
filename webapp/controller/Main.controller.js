sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("ae.test.SACBar.controller.Main", {

        onInit: function () {
            var oChart = this.byId("barChart");

            // Set vizProperties safely in controller — avoids XML quoting issues
            oChart.setVizProperties({
                plotArea: {
                    colorPalette: ["#0070f2", "#0040b0"],
                    dataLabel: { visible: true }
                },
                title:  { visible: false },
                legend: { visible: false },
                categoryAxis: {
                    title: { visible: true, text: "Month" }
                },
                valueAxis: {
                    title: { visible: true, text: "Revenue (SAR)" }
                }
            });

            // Attach bar click event
            oChart.attachSelectData(this.onBarSelect.bind(this));
        },

        onBarSelect: function (oEvent) {
            var aData = oEvent.getParameter("data");
            if (!aData || aData.length === 0) return;

            var oSelected = aData[0].data;
            var sMonth    = oSelected["Month"];
            var nRevenue  = oSelected["Revenue"];

            this.byId("selectionPanel").setVisible(true);
            this.byId("selectedMonth").setText(sMonth);
            this.byId("selectedRevenue").setText(
                new Intl.NumberFormat("en-US", {
                    style: "currency", currency: "USD", maximumFractionDigits: 0
                }).format(nRevenue)
            );
            MessageToast.show("Selected: " + sMonth + " — " + nRevenue.toLocaleString());
        },

        onClearSelection: function () {
            this.byId("barChart").vizSelection([], { clearSelection: true });
            this.byId("selectionPanel").setVisible(false);
        },

        onRefresh: function () {
            var oModel  = this.getView().getModel("chartModel");
            var months  = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
            var aNewData = months.map(function (m) {
                return { month: m, revenue: Math.floor(Math.random() * 80000) + 40000 };
            });
            oModel.setProperty("/sales", aNewData);
            MessageToast.show("Data refreshed!");
        },

        onExport: function () {
            MessageToast.show("Export feature — connect sap.ui.export here.");
        }
    });
});
