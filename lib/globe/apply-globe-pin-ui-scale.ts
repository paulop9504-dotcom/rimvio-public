/** Push zoom scale onto globe.gl HTML pin nodes (CSS vars may not inherit). */
export function applyGlobePinUiScale(root: ParentNode, scale: number): void {
  const cardScale = scale.toFixed(4);
  const dotScale = Math.max(0.28, Math.min(1, scale * 1.08)).toFixed(4);

  if (root instanceof HTMLElement) {
    root.style.setProperty("--globe-pin-scale", cardScale);
  }

  root.querySelectorAll<HTMLElement>(".rimvio-globe-3d-pin__card").forEach((el) => {
    el.style.transform = `scale(${cardScale})`;
    el.style.transformOrigin = "center bottom";
  });
  root.querySelectorAll<HTMLElement>(".rimvio-globe-3d-pin__dot").forEach((el) => {
    el.style.transform = `scale(${dotScale})`;
    el.style.transformOrigin = "center bottom";
  });
}
