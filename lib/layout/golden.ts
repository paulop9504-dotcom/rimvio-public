/** Golden ratio (φ) layout constants — spacing & proportion tokens. */
export const PHI = 1.6180339887;
export const PHI_INVERSE = 1 / PHI; // ≈ 0.618
export const PHI_COMPLEMENT = 1 - PHI_INVERSE; // ≈ 0.382

/** Minor : major split as percentage strings for CSS. */
export const GOLDEN_MINOR_PERCENT = `${PHI_COMPLEMENT * 100}%`;
export const GOLDEN_MAJOR_PERCENT = `${PHI_INVERSE * 100}%`;
