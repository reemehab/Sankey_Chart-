(function () {
    // 1. This logs as soon as the file is loaded by the browser
    console.log("🚀 [ProcessCounter] Widget script loaded and starting...");

    const template = document.createElement("template");
    // ... (template content)

    class ProcessCounter extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            // 2. This logs when the widget instance is created
            console.log("🏗️ [ProcessCounter] Widget instance created in DOM");
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            // 3. This logs every time SAC sends new data or properties
            console.log("update [ProcessCounter] Data received:", this.myData);
            this.render();
        }

        render() {
            // ... (render logic)
        }
    }

    // ... (customElements.define)
})();
