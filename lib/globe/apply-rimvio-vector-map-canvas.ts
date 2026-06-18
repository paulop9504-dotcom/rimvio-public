import type { Map as MapLibreMap } from "maplibre-gl";
import {
  isRimvioVectorRoadLayerId,
  RIMVIO_VECTOR_GREEN_FILL_LAYERS,
  RIMVIO_VECTOR_HIDDEN_LAYERS,
  RIMVIO_VECTOR_MAP_CANVAS,
  RIMVIO_VECTOR_MUTED_LABEL_LAYERS,
  RIMVIO_VECTOR_WATER_LINE_LAYERS,
  resolveRimvioVectorRoadLineColor,
} from "@/lib/globe/rimvio-vector-map-canvas-theme";

function hideLayer(map: MapLibreMap, layerId: string): void {
  if (!map.getLayer(layerId)) {
    return;
  }
  map.setLayoutProperty(layerId, "visibility", "none");
}

function setPaint(
  map: MapLibreMap,
  layerId: string,
  property: string,
  value: unknown,
): void {
  if (!map.getLayer(layerId)) {
    return;
  }
  map.setPaintProperty(layerId, property, value);
}

function applyWaterCanvas(map: MapLibreMap): void {
  setPaint(map, "water", "fill-color", RIMVIO_VECTOR_MAP_CANVAS.waterFill);
  setPaint(map, "water", "fill-outline-color", "rgba(0,0,0,0)");

  for (const layerId of RIMVIO_VECTOR_WATER_LINE_LAYERS) {
    setPaint(map, layerId, "line-color", RIMVIO_VECTOR_MAP_CANVAS.waterFill);
    setPaint(map, layerId, "line-opacity", 0.88);
  }
}

function applyGreenCanvas(map: MapLibreMap): void {
  for (const layerId of RIMVIO_VECTOR_GREEN_FILL_LAYERS) {
    setPaint(map, layerId, "fill-color", RIMVIO_VECTOR_MAP_CANVAS.parkFill);
    setPaint(map, layerId, "fill-opacity", RIMVIO_VECTOR_MAP_CANVAS.parkOpacity);
    setPaint(map, layerId, "fill-outline-color", "rgba(0,0,0,0)");
  }
}

function applyRoadAndBuildingCanvas(map: MapLibreMap): void {
  setPaint(
    map,
    "landuse_residential",
    "fill-color",
    RIMVIO_VECTOR_MAP_CANVAS.residentialFill,
  );

  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "line" || !isRimvioVectorRoadLayerId(layer.id)) {
      continue;
    }
    setPaint(
      map,
      layer.id,
      "line-color",
      resolveRimvioVectorRoadLineColor(layer.id),
    );
  }

  setPaint(map, "building", "fill-color", RIMVIO_VECTOR_MAP_CANVAS.buildingFill);
  setPaint(map, "building", "fill-outline-color", "rgba(0,0,0,0)");
  setPaint(
    map,
    "building-3d",
    "fill-extrusion-color",
    RIMVIO_VECTOR_MAP_CANVAS.buildingFill,
  );
  setPaint(
    map,
    "building-3d",
    "fill-extrusion-opacity",
    RIMVIO_VECTOR_MAP_CANVAS.buildingOpacity,
  );
}

function applyMutedLabels(map: MapLibreMap): void {
  for (const layerId of RIMVIO_VECTOR_MUTED_LABEL_LAYERS) {
    if (layerId.startsWith("water")) {
      setPaint(map, layerId, "text-color", RIMVIO_VECTOR_MAP_CANVAS.waterLabel);
    } else {
      setPaint(map, layerId, "text-color", RIMVIO_VECTOR_MAP_CANVAS.labelMuted);
    }
    setPaint(map, layerId, "text-halo-color", "rgba(255,255,255,0.88)");
    setPaint(map, layerId, "text-halo-width", 1);
  }
}

/** Paint Liberty vector tiles as a quiet grayscale canvas for Me + pins. */
export function applyRimvioVectorMapCanvas(map: MapLibreMap): void {
  setPaint(map, "background", "background-color", RIMVIO_VECTOR_MAP_CANVAS.background);

  applyWaterCanvas(map);
  applyGreenCanvas(map);
  applyRoadAndBuildingCanvas(map);
  applyMutedLabels(map);

  for (const layerId of RIMVIO_VECTOR_HIDDEN_LAYERS) {
    hideLayer(map, layerId);
  }
}
