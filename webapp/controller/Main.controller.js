sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("ae.test.SACBar.controller.Main", {
        onInit: function () {
            var oChart = this.byId("barChart");
            oChart.setVizProperties({
                plotArea: {
                    colorPalette: ["#0070f2"],
                    dataLabel: { visible: true }
                },
                title: { visible: false },
                legend: { visible: false }
            });

            oChart.attachSelectData(this.onBarSelect.bind(this));
        },

        onBarSelect: function (oEvent) {
            var aData = oEvent.getParameter("data");
            if (!aData || aData.length === 0) return;

            var oSelected = aData[0].data;
            this.byId("selectedMonth").setText(oSelected["Month"]);
            this.byId("selectedRevenue").setText(oSelected["Revenue"].toLocaleString());
            
            // Auto-move to next step on selection
            this.byId("CreateProductWizard").nextStep();
        },

        onNextStep: function () {
            this.byId("CreateProductWizard").nextStep();
        }
    });
});
