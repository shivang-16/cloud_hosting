"use client";

import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Datacenter } from "@/lib/providers/utho/types";

const CC_FLAGS: Record<string, string> = {
  in: "🇮🇳",
  de: "🇩🇪",
  us: "🇺🇸",
  gb: "🇬🇧",
  sg: "🇸🇬",
  nl: "🇳🇱",
  fr: "🇫🇷",
  au: "🇦🇺",
};

interface DCLocationSelectorProps {
  datacenters: Datacenter[];
  selected: string;
  onChange: (slug: string) => void;
}

export function DCLocationSelector({ datacenters, selected, onChange }: DCLocationSelectorProps) {
  const active = datacenters.filter((dc) => dc.status === "active");

  return (
    <SectionCard icon={Globe} title="DC Location" subtitle="Choose your nearest data center">
      <div className="flex flex-wrap gap-3">
        {active.map((dc) => {
          const flag = CC_FLAGS[dc.cc] ?? "🌐";
          const isSelected = selected === dc.slug;
          return (
            <button
              key={dc.slug}
              type="button"
              onClick={() => onChange(dc.slug)}
              className={cn(
                "relative flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-all",
                isSelected
                  ? "border-zinc-900 bg-white shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-400"
              )}
            >
              <span className="text-lg leading-none">{flag}</span>
              <div className="text-left">
                <p className="font-medium text-zinc-900 text-sm">{dc.city}</p>
                <p className="text-xs text-zinc-500">{dc.country}</p>
              </div>
              <span className="w-2 h-2 rounded-full ml-1 bg-green-500" />
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

export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Icon className="w-4 h-4 text-zinc-600" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
