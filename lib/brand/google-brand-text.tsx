/** Google wordmark letter colors (official palette). */

const GOOGLE_LETTERS: Record<string, string> = {
  G: "#4285F4",
  g: "#4285F4",
  o: "#EA4335",
  l: "#34A853",
  e: "#EA4335",
};

const GOOGLE_WORD = "google";

function googleLetterColor(char: string, indexInWord: number): string {
  if (char === "o") {
    return indexInWord === 1 ? "#EA4335" : "#FBBC05";
  }
  return GOOGLE_LETTERS[char] ?? "#FFFFFF";
}

export function isGoogleBrandText(input: {
  id?: string;
  label?: string;
  href?: string | null;
}): boolean {
  const blob = [input.id ?? "", input.label ?? "", input.href ?? ""].join(" ").toLowerCase();
  return input.id === "google" || /\bgoogle\b|구글\s*지도|google\.com\/maps|maps\.google/u.test(blob);
}

type GoogleBrandTextProps = {
  text: string;
  className?: string;
  /** Suffix after "Google" (e.g. " Maps") — rendered in muted white. */
  suffixClassName?: string;
};

export function GoogleBrandText({
  text,
  className,
  suffixClassName = "text-white/75",
}: GoogleBrandTextProps) {
  const match = text.match(/^(.*?)(google)(.*)$/iu);

  if (!match) {
    return <span className={className}>{text}</span>;
  }

  const [, prefix, googleWord, suffix] = match;
  let googleIndex = 0;

  return (
    <span className={className}>
      {prefix ? <span className="text-white">{prefix}</span> : null}
      {googleWord.split("").map((char, index) => {
        const color = googleLetterColor(char, googleIndex);
        if (char.toLowerCase() === "o") {
          googleIndex += 1;
        }
        return (
          <span key={`${char}-${index}`} style={{ color }}>
            {char}
          </span>
        );
      })}
      {suffix ? <span className={suffixClassName}>{suffix}</span> : null}
    </span>
  );
}
