processData(sacData) {
    console.log("[WIDGET LOG] Raw data received:", sacData);
    
    if (!sacData || !sacData.data || sacData.data.length === 0) {
        console.warn("[WIDGET LOG] Data is empty.");
        return;
    }

    // MAP THE CDS FIELDS HERE
    const formattedData = sacData.data.map(row => {
        // SAC usually nests these under dimensions/measures 
        // using the technical ID from your CDS/Model
        return {
            // Check your console log for the exact key name if these don't work:
            id: (row.object_id) ? row.object_id.id : "Unknown", 
            calls: (row.Call_Record) ? row.Call_Record.raw : 0
        };
    });
    
    console.log("[WIDGET LOG] Corrected Mapping:", formattedData);

    if (!this._ui5View) {
        this.initUI5(formattedData);
    } else {
        const oModel = this._ui5View.getModel("chartModel");
        if (oModel) {
            oModel.setProperty("/sales", formattedData);
        }
    }
}
