console.log("🔥 Widget JS Loaded");

class TestWidget extends HTMLElement {
  connectedCallback() {
    console.log("✅ Widget Rendered");
    this.innerHTML = `
      <div style="padding:20px">
        <h2>It works 🎉</h2>
      </div>
    `;
  }
}

customElements.define("com-reem-test-widget", TestWidget);
