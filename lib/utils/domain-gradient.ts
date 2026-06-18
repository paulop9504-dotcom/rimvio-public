const GRADIENTS = [
  "from-sky-400/90 via-blue-500/80 to-indigo-600/90",
  "from-violet-400/90 via-purple-500/80 to-fuchsia-600/90",
  "from-rose-400/90 via-pink-500/80 to-orange-500/90",
  "from-emerald-400/90 via-teal-500/80 to-cyan-600/90",
  "from-amber-400/90 via-orange-500/80 to-red-500/90",
  "from-lime-400/90 via-green-500/80 to-emerald-600/90",
] as const;

function hashDomain(domain: string) {
  let hash = 0;
  for (let i = 0; i < domain.length; i += 1) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getDomainGradient(domain: string) {
  return GRADIENTS[hashDomain(domain) % GRADIENTS.length];
}

export function getDomainInitial(domain: string) {
  const label = domain.replace(/^www\./, "").split(".")[0] ?? domain;
  return label.charAt(0).toUpperCase();
}

export function getDomainTitle(domain: string) {
  const label = domain.replace(/^www\./, "").split(".")[0] ?? domain;
  if (!label) {
    return domain;
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildDomainFallback(domain: string) {
  const cleanDomain = domain.replace(/^www\./, "");

  return {
    domain: cleanDomain,
    title: getDomainTitle(cleanDomain),
    gradient: getDomainGradient(cleanDomain),
    initial: getDomainInitial(cleanDomain),
  };
}
