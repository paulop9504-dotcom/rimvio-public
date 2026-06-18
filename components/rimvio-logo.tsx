import { RIMVIO } from "@/lib/brand/rimvio";
import { RimvioBrandMark } from "@/lib/brand/rimvio-brand-mark";
import {
  rimvioLogoFrameClass,
  rimvioNeonWordmarkClass,
} from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";

const SIZE = {
  xs: 22,
  sm: 32,
  md: 40,
  lg: 58,
  xl: 80,
} as const;

type RimvioLogoProps = {
  size?: keyof typeof SIZE;
  className?: string;
  framed?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  showKo?: boolean;
  /** `white` = white on dark chrome; `light` = black on white chrome. */
  appearance?: "dark" | "white" | "light";
};

function RimvioWordmark({
  className,
  showKo = false,
}: {
  className?: string;
  showKo?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className={cn("text-sm font-bold tracking-tight", rimvioNeonWordmarkClass)}>
        {RIMVIO.name}
      </span>
      {showKo ? (
        <span className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
          {RIMVIO.nameKo}
        </span>
      ) : null}
    </span>
  );
}

export function RimvioLogo({
  size = "sm",
  className,
  framed = false,
  showWordmark = false,
  wordmarkClassName,
  showKo = false,
  appearance = "dark",
}: RimvioLogoProps) {
  const pixels = SIZE[size];

  const mark = (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        framed && rimvioLogoFrameClass,
        className
      )}
    >
      <RimvioBrandMark size={pixels} crisp={pixels <= 32} appearance={appearance} />
    </span>
  );

  if (!showWordmark) {
    return mark;
  }

  return (
    <span className="inline-flex items-center gap-2">
      {mark}
      <RimvioWordmark className={wordmarkClassName} showKo={showKo} />
    </span>
  );
}

/** @deprecated use RimvioLogo */
export const BlinkEyeLogo = RimvioLogo;
