"use client";

import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./DCLocationSelector";

type CPUModel = "amd" | "intel";

interface CPUModelSelectorProps {
  selected: CPUModel;
  onChange: (model: CPUModel) => void;
}

const CPU_OPTIONS = [
  {
    key: "amd" as CPUModel,
    label: "AMD",
    desc: "High-performance multi-thread",
    color: "bg-red-600",
  },
  {
    key: "intel" as CPUModel,
    label: "Intel",
    desc: "Superior single-thread performance",
    color: "bg-blue-600",
  },
];

export function CPUModelSelector({ selected, onChange }: CPUModelSelectorProps) {
  return (
    <SectionCard icon={Cpu} title="CPU Model" subtitle="Select CPU for the server">
      <div className="flex flex-wrap gap-3">
        {CPU_OPTIONS.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm transition-all min-w-[160px]",
                isSelected
                  ? "border-zinc-900 bg-white shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-400"
              )}
            >
              <div className={cn(
                "w-10 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold tracking-tight",
                opt.color
              )}>
                {opt.label}
              </div>
              <div className="text-left">
                <p className="font-medium text-zinc-900">{opt.label}</p>
                <p className="text-xs text-zinc-500">{opt.desc}</p>
              </div>
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

export type { CPUModel };
