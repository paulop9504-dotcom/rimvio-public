import type { GlobeInstance } from "globe.gl";
import type { Material, Mesh, Object3D, Texture } from "three";

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && typeof value === "object" && "isTexture" in value && value.isTexture) {
      (value as Texture).dispose();
    }
  }
  material.dispose();
}

function disposeObject3D(node: Object3D): void {
  const mesh = node as Mesh;
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }
  const material = mesh.material;
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
  } else if (material) {
    disposeMaterial(material);
  }
}

/** Best-effort GPU cleanup before globe.gl destructor — reduces leaked tile textures. */
export function disposeGlobeGpuResources(globe: GlobeInstance | null | undefined): void {
  if (!globe) {
    return;
  }
  try {
    globe.scene().traverse((node) => {
      if ((node as Mesh).isMesh) {
        disposeObject3D(node);
      }
    });
  } catch {
    // Globe may already be partially torn down.
  }
}
