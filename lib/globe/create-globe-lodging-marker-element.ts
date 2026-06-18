import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";

export type GlobeLodgingMarkerHandlers = {
  onPress: (resourceId: string, carouselIndex: number) => void;
};

export function createGlobeLodgingMarkerElement(
  marker: GlobeLodgingMapMarker,
  handlers: GlobeLodgingMarkerHandlers,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "rimvio-globe-lodging-marker";
  root.dataset.globeLodgingMarker = marker.resourceId;
  if (marker.isMain) {
    root.classList.add("rimvio-globe-lodging-marker--main");
  }
  if (marker.displayVariant === "situational_label") {
    root.classList.add("rimvio-globe-lodging-marker--situational");
  }
  root.setAttribute("aria-label", marker.label);

  if (marker.displayVariant === "situational_label") {
    const pill = document.createElement("span");
    pill.className = "rimvio-globe-lodging-marker__situational-pill";
    pill.textContent = marker.label;
    root.appendChild(pill);

    const dot = document.createElement("span");
    dot.className = "rimvio-globe-lodging-marker__dot";
    root.appendChild(dot);

    root.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      handlers.onPress(marker.resourceId, marker.carouselIndex);
    });
    return root;
  }

  const card = document.createElement("span");
  card.className = "rimvio-globe-lodging-marker__card";

  if (marker.thumbnailUrl) {
    const image = document.createElement("img");
    image.src = marker.thumbnailUrl;
    image.alt = "";
    image.className = "rimvio-globe-lodging-marker__thumb";
    image.draggable = false;
    card.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "rimvio-globe-lodging-marker__fallback";
    fallback.textContent = "숙";
    card.appendChild(fallback);
  }

  const title = document.createElement("span");
  title.className = "rimvio-globe-lodging-marker__title";
  title.textContent = marker.label;

  root.appendChild(card);
  root.appendChild(title);
  const dot = document.createElement("span");
  dot.className = "rimvio-globe-lodging-marker__dot";
  root.appendChild(dot);

  root.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  root.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    handlers.onPress(marker.resourceId, marker.carouselIndex);
  });

  return root;
}
