class TestWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div style="padding:20px; font-family:Arial;">
        <h2>✅ SAC Widget Works!</h2>
        <p>If you see this, everything is configured correctly 🎉</p>
      </div>
    `;
  }
}

customElements.define("com-reem-test-widget", TestWidget);
