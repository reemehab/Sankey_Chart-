class TestWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<h1>It works 🎉</h1>`;
  }
}
customElements.define("com-sap-sac-sample-echarts-sankeyyg", TestWidget);
