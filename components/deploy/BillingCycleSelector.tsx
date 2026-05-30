"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./DCLocationSelector";

export type BillingCycle = "hourly" | "monthly" | "3month" | "6month" | "12month" | "36month";

export const BILLING_OPTIONS: {
  key: BillingCycle;
  label: string;
  sublabel: string;
  badge?: string;
  multiplier: number;
  suffix: string;
}[] = [
  { key: "hourly",   label: "Hourly",   sublabel: "Pay as you go",    multiplier: 1 / (24 * 30), suffix: "/hr" },
  { key: "monthly",  label: "Monthly",  sublabel: "Month to month",   multiplier: 1,             suffix: "/mo" },
  { key: "3month",   label: "3 Months", sublabel: "Quarterly",        multiplier: 3,             suffix: "/3mo" },
  { key: "6month",   label: "6 Months", sublabel: "Semi-annual",      multiplier: 6,             suffix: "/6mo" },
  { key: "12month",  label: "Annual",   sublabel: "Best value",       multiplier: 12,            suffix: "/yr" },
  { key: "36month",  label: "3 Years",  sublabel: "Maximum savings",  multiplier: 36,            suffix: "/3yr", badge: "20% OFF" },
];

interface BillingCycleSelectorProps {
  selected: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}

export function BillingCycleSelector({ selected, onChange }: BillingCycleSelectorProps) {
  return (
    <SectionCard icon={Clock} title="Billing Cycle" subtitle="Hourly, monthly, or multi-year billing">
      <div className="flex flex-wrap gap-3">
        {BILLING_OPTIONS.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={cn(
                "relative flex flex-col items-start gap-1 px-5 py-3.5 rounded-xl border text-sm transition-all min-w-[110px]",
                isSelected
                  ? "border-zinc-900 bg-white shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-400"
              )}
            >
              {opt.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                  {opt.badge}
                </span>
              )}
              <div className="flex items-center gap-2">
                {isSelected ? (
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="#18181b" strokeWidth="1.5" />
                    <circle cx="8" cy="8" r="3" fill="#18181b" />
                  </svg>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-300 flex-shrink-0" />
                )}
                <span className="font-medium text-zinc-900">{opt.label}</span>
              </div>
              <span className="text-xs text-zinc-500 ml-6">{opt.sublabel}</span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
