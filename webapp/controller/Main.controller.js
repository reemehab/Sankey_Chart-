sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ae.test.SACBar.controller.Main", {
        onInit: function () {
            var oChart = this.byId("barChart");
            
            // Set basic visual properties
            oChart.setVizProperties({
                plotArea: {
                    colorPalette: ["#0070f2"],
                    dataLabel: { visible: true }
                },
                title: { visible: false },
                legend: { visible: false }
            });
        }
    });
});
