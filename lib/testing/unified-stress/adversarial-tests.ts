import type {
  AdversarialKind,
  AdversarialTest,
} from "@/lib/testing/unified-stress/types";

const BOUNDARY_SEEDS = ["뭐하지", "추천", "어떡해", "그냥", "모르겠어"];

const NOISE_TEMPLATES = [
  (base: string) => `아 진짜 피곤한데 ${base} 근데 시간도 없고`,
  (base: string) => `${base} … 그냥 답답해`,
  (base: string) => `친구랑 얘기하다가 ${base}`,
];

const CONFLICT_TEMPLATES = [
  (base: string) => `${base} + 일정도 짜야 함 + 돈도 아까움`,
  (base: string) => `오늘 약속 있는데 ${base} + 운동도 해야 함`,
  (base: string) => `${base} 그리고 내일 회의도 있어`,
];

const DRIFT_TEMPLATES = [
  () => "그거 추천해줘",
  () => "아까 거 비슷하게",
  () => "비슷한 거 다른 거",
  (base: string) => `그거 ${base.split(/\s+/).slice(-1)[0] ?? ""}`,
];

function pickBoundary(base: string): AdversarialTest {
  const seed = BOUNDARY_SEEDS.find((s) => base.includes(s)) ?? "뭐하지";
  return {
    kind: "boundary_break",
    input: seed,
    description: `Minimal boundary input: "${seed}"`,
  };
}

function pickNoise(base: string, index: number): AdversarialTest {
  const fn = NOISE_TEMPLATES[index % NOISE_TEMPLATES.length]!;
  return {
    kind: "noise_injection",
    input: fn(base),
    description: "Emotion + background noise injected",
  };
}

function pickConflict(base: string, index: number): AdversarialTest {
  const fn = CONFLICT_TEMPLATES[index % CONFLICT_TEMPLATES.length]!;
  return {
    kind: "intent_conflict",
    input: fn(base),
    description: "2–3 intent collision (schedule + money + food)",
  };
}

function pickDrift(base: string, index: number): AdversarialTest {
  const fn = DRIFT_TEMPLATES[index % DRIFT_TEMPLATES.length]!;
  return {
    kind: "context_drift",
    input: fn(base),
    description: "Deictic / context drift reference",
  };
}

/** Generate 10 adversarial tests: boundary, noise, conflict, drift. */
export function generateAdversarialTests(baseInput: string): AdversarialTest[] {
  const tests: AdversarialTest[] = [];
  const kinds: AdversarialKind[] = [
    "boundary_break",
    "boundary_break",
    "boundary_break",
    "noise_injection",
    "noise_injection",
    "noise_injection",
    "intent_conflict",
    "intent_conflict",
    "context_drift",
    "context_drift",
  ];

  for (let i = 0; i < 10; i++) {
    const kind = kinds[i]!;
    switch (kind) {
      case "boundary_break":
        tests.push(pickBoundary(baseInput));
        break;
      case "noise_injection":
        tests.push(pickNoise(baseInput, i));
        break;
      case "intent_conflict":
        tests.push(pickConflict(baseInput, i));
        break;
      case "context_drift":
        tests.push(pickDrift(baseInput, i));
        break;
    }
  }

  return tests;
}
