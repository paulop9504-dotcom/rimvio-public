/** Short public id for Rimvio Beam URLs. */
export function createShareSlug(length = 10) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
