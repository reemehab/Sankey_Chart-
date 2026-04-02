sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ae.test.SACBar.controller.Main", {
        onInit: function () {
            const oChart = this.byId("barChart");
            if (oChart) {
                oChart.setVizProperties({
                    plotArea: {
                        colorPalette: ["#2b7d2b"], // Forest green bars
                        dataLabel: { visible: true }
                    },
                    title: { visible: false }
                });
            }
        }
    });
});
