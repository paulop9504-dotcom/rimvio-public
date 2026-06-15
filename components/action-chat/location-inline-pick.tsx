"use client";



import type { LocationSuggestion } from "@/lib/action-chat/confirmation-types";

import { rimvioListPickBtnClass } from "@/lib/brand/rimvio-neon-theme";

import { cn } from "@/lib/utils";



type LocationInlinePickProps = {

  prompt: string;

  suggestions: LocationSuggestion[];

  recommendedId?: string;

  onSelect: (suggestion: LocationSuggestion) => void;

  onSearchMore?: () => void;

  className?: string;

};



function shortAddress(address: string): string {

  const trimmed = address.trim();

  if (trimmed.length <= 36) {

    return trimmed;

  }

  return `${trimmed.slice(0, 35)}…`;

}



/** One-tap branch chips — no yes/no gate. */

export function LocationInlinePick({

  prompt,

  suggestions,

  recommendedId,

  onSelect,

  onSearchMore,

  className,

}: LocationInlinePickProps) {

  return (

    <div className={cn("space-y-2.5", className)}>

      <p className="text-[13px] font-medium text-foreground">{prompt}</p>

      <ul className="space-y-1.5">

        {suggestions.map((item, index) => {

          const isRecommended = item.id === recommendedId || index === 0;

          return (

            <li key={item.id}>

              <button

                type="button"

                onClick={() => onSelect(item)}

                className={rimvioListPickBtnClass(isRecommended)}

              >

                <span className="text-[13px] font-semibold text-foreground">

                  {item.branch?.trim() || item.label}

                </span>

                {item.address ? (

                  <span className="mt-0.5 text-[11px] text-muted-foreground">

                    {shortAddress(item.address)}

                  </span>

                ) : null}

              </button>

            </li>

          );

        })}

      </ul>

      {onSearchMore ? (

        <button

          type="button"

          onClick={onSearchMore}

          className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:text-rimvio-neon-cyan hover:underline"

        >

          직접 검색

        </button>

      ) : null}

    </div>

  );

}

