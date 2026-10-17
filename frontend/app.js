const fields = [
  { key: "N", label: "Nitrogen", unit: "kg/ha", min: 0, max: 300, step: 1 },
  { key: "P", label: "Phosphorus", unit: "kg/ha", min: 0, max: 300, step: 1 },
  { key: "K", label: "Potassium", unit: "kg/ha", min: 0, max: 300, step: 1 },
  { key: "temperature", label: "Temperature", unit: "°C", min: 0, max: 55, step: 0.1 },
  { key: "humidity", label: "Humidity", unit: "%", min: 0, max: 100, step: 0.1 },
  { key: "ph", label: "Soil pH", unit: "pH", min: 0, max: 14, step: 0.1 },
  { key: "rainfall", label: "Rainfall", unit: "mm", min: 0, max: 500, step: 0.1 },
];

const form = document.querySelector("#recommend-form");
const errorBox = document.querySelector("#form-error");
const button = document.querySelector("#submit-button");
const result = document.querySelector("#result-content");

document.querySelector("#fields").innerHTML = fields.map((field) => `
  <div class="field">
    <label for="${field.key}">${field.label} <span class="unit">(${field.unit})</span></label>
    <div class="input-wrap">
      <input id="${field.key}" name="${field.key}" type="number" min="${field.min}" max="${field.max}" step="${field.step}" placeholder="Enter value" required>
      <span class="suffix">${field.unit}</span>
    </div>
    <div class="field-help">Range ${field.min}–${field.max}</div>
  </div>`).join("");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  if (!form.reportValidity()) return;
  const payload = Object.fromEntries(new FormData(form));
  for (const field of fields) payload[field.key] = Number(payload[field.key]);
  button.disabled = true;
  button.querySelector("span:first-child").textContent = "Finding your best crop…";
  try {
    const response = await fetch("/v1/recommend", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not generate a recommendation. Please check your values.");
    showResult(data);
  } catch (error) {
    errorBox.textContent = error.message || "The recommendation service is unavailable. Please try again.";
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.querySelector("span:first-child").textContent = "Get recommendation";
  }
});

function showResult(data) {
  const confidence = Math.round(data.confidence * 100);
  const predictions = data.top_predictions.map((item) => `
    <div class="prediction"><span>${escapeHtml(item.crop)}</span><span class="bar"><i style="width:${Math.max(0, Math.min(100, item.probability * 100))}%"></i></span><b>${Math.round(item.probability * 100)}%</b></div>`).join("");
  result.classList.add("has-result");
  result.innerHTML = `<div class="result-label">BEST MATCH</div><div class="crop-name">${escapeHtml(data.recommended_crop)}</div><p class="confidence-line"><strong>${confidence}% confidence</strong> · based on your field conditions</p><div class="rank-title">OTHER STRONG OPTIONS</div>${predictions}<p class="result-foot">Recommendations are model estimates; local growing conditions may vary.</p>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
