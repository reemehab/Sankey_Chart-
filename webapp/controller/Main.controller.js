sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ae.test.SACBar.controller.Main", {
        onInit: function () {
            console.log("[CONTROLLER LOG] Main Controller initialized.");
            
            var oChart = this.byId("barChart");
            if (oChart) {
                console.log("[CONTROLLER LOG] VizFrame found. Setting properties...");
                oChart.setVizProperties({
                    plotArea: {
                        colorPalette: ["#0070f2"],
                        dataLabel: { visible: true }
                    },
                    title: { visible: false }
                });
            } else {
                console.error("[CONTROLLER LOG] Error: VizFrame with ID 'barChart' not found in view.");
            }
        },

        onAfterRendering: function() {
            console.log("[CONTROLLER LOG] View has been rendered to the DOM.");
        }
    });
});
