processData(sacData) {
    console.log("[WIDGET LOG] Raw data received:", sacData);
    
    if (!sacData || !sacData.data || sacData.data.length === 0) {
        console.warn("[WIDGET LOG] Data is empty.");
        return;
    }

    const formattedData = sacData.data.map(row => {
        return {
            // Mapping CDS fields to internal model keys
            objectId: (row.object_id) ? row.object_id.id : "Unknown", 
            callCount: (row.Call_Record) ? row.Call_Record.raw : 0
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
