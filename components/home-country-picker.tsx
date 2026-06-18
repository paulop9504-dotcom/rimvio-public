"use client";

import {
  getCountryLabelKo,
  listHomeCountryOptions,
  type CountryCode,
} from "@/lib/links/spark-locale";
import { cn } from "@/lib/utils";

type HomeCountryPickerProps = {
  value: CountryCode;
  suggested?: CountryCode;
  onChange: (code: CountryCode) => void;
  compact?: boolean;
};

export function HomeCountryPicker({
  value,
  suggested,
  onChange,
  compact = false,
}: HomeCountryPickerProps) {
  const options = listHomeCountryOptions();

  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"
      )}
      role="listbox"
      aria-label="???�라 ?�택"
    >
      {options.map((option) => {
        const selected = option.code === value;
        const isSuggested = suggested === option.code && !selected;

        return (
          <button
            key={option.code}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(option.code)}
            className={cn(
              "rounded-2xl px-3 py-3 text-left transition-colors",
              "ring-1 ring-rimvio-neon-purple/15",
              selected
                ? "bg-rimvio-neon-purple text-white ring-[#007AFF]"
                : "bg-rimvio-surface active:bg-rimvio-surface-muted",
              compact ? "py-2.5" : "py-3"
            )}
          >
            <span className="block text-[14px] font-semibold leading-tight">
              {option.labelKo}
            </span>
            {isSuggested ? (
              <span className="mt-1 block text-[10px] font-medium text-rimvio-neon-cyan">
                추천
              </span>
            ) : selected ? (
              <span className="mt-1 block text-[10px] font-medium text-white/80">
                ?�택??
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function HomeCountrySummary({ code }: { code: CountryCode }) {
  return (
    <p className="text-sm text-muted-foreground">
      ?�재:{" "}
      <strong className="font-medium text-foreground">
        {getCountryLabelKo(code)}
      </strong>
    </p>
  );
}
