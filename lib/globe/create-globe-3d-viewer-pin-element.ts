/** Live viewer position — pulsing dot + accuracy halo, not an experience pin. */
export function createGlobe3dViewerPinElement(
  accuracyM: number | null = null,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "rimvio-globe-3d-viewer-pin";
  root.setAttribute("aria-label", "현재 위치");
  root.dataset.globeViewerPin = "true";

  if (accuracyM != null && accuracyM > 0) {
    const accuracy = document.createElement("span");
    accuracy.className = "rimvio-globe-3d-viewer-pin__accuracy";
    const scale = Math.min(2.4, Math.max(1, accuracyM / 28));
    accuracy.style.setProperty("--accuracy-scale", String(scale));
    accuracy.setAttribute("aria-hidden", "true");
    root.appendChild(accuracy);
  }

  const ring = document.createElement("span");
  ring.className = "rimvio-globe-3d-viewer-pin__ring";
  ring.setAttribute("aria-hidden", "true");

  const dot = document.createElement("span");
  dot.className = "rimvio-globe-3d-viewer-pin__dot";
  dot.setAttribute("aria-hidden", "true");

  root.appendChild(ring);
  root.appendChild(dot);
  return root;
}
