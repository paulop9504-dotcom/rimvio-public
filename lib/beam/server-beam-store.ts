import fs from "node:fs";
import path from "node:path";
import type { BeamSnapshot } from "@/lib/beam/types";

const BEAM_DIR = path.join(process.cwd(), ".data", "beams");

function ensureDir() {
  fs.mkdirSync(BEAM_DIR, { recursive: true });
}

function beamPath(slug: string) {
  return path.join(BEAM_DIR, `${slug}.json`);
}

export function saveBeamSnapshot(snapshot: BeamSnapshot) {
  ensureDir();
  fs.writeFileSync(beamPath(snapshot.slug), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

export function readBeamSnapshot(slug: string): BeamSnapshot | null {
  try {
    const raw = fs.readFileSync(beamPath(slug), "utf8");
    return JSON.parse(raw) as BeamSnapshot;
  } catch {
    return null;
  }
}
