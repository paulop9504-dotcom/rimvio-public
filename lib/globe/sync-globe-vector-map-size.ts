import type { Map as MapLibreMap } from "maplibre-gl";

/** MapLibre canvas must match container after layout — fixes half-viewport glitches. */
export function syncGlobeVectorMapSize(
  map: MapLibreMap,
  container: HTMLElement,
): void {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width > 0 && height > 0) {
    map.resize();
  }
}

export function bindGlobeVectorMapResize(
  map: MapLibreMap,
  container: HTMLElement,
): () => void {
  const resize = () => {
    syncGlobeVectorMapSize(map, container);
  };

  resize();
  requestAnimationFrame(resize);

  const observer =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          resize();
        })
      : null;
  observer?.observe(container);

  map.on("load", resize);

  return () => {
    observer?.disconnect();
    map.off("load", resize);
  };
}
