"use client";

import { Globe, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./DCLocationSelector";

type DeployType = "public" | "vpc";

interface DeploymentTypeSelectorProps {
  selected: DeployType;
  onChange: (type: DeployType) => void;
  supportsVPC: boolean;
}

export function DeploymentTypeSelector({ selected, onChange, supportsVPC }: DeploymentTypeSelectorProps) {
  const options = [
    {
      key: "public" as DeployType,
      icon: Globe,
      label: "Default (Without VPC)",
      desc: "Public IP for direct access",
      enabled: true,
    },
    {
      key: "vpc" as DeployType,
      icon: Cloud,
      label: "With VPC",
      desc: "Private network",
      enabled: supportsVPC,
    },
  ];

  return (
    <SectionCard icon={Cloud} title="Deployment Type" subtitle="Choose how you want to deploy your cloud instance">
      <div className="flex flex-wrap gap-3">
        {options.filter((o) => o.enabled).map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              disabled={!opt.enabled}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm transition-all min-w-[180px]",
                isSelected
                  ? "border-zinc-900 bg-white shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-400",
                !opt.enabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isSelected ? "bg-zinc-900" : "bg-zinc-100"
              )}>
                <opt.icon className={cn("w-4 h-4", isSelected ? "text-white" : "text-zinc-600")} />
              </div>
              <div className="text-left">
                <p className="font-medium text-zinc-900">{opt.label}</p>
                <p className="text-xs text-zinc-500">{opt.desc}</p>
              </div>
              <div className={cn(
                "w-4 h-4 rounded-full border-2 ml-auto",
                isSelected ? "border-zinc-900 bg-zinc-900" : "border-zinc-300"
              )}>
                {isSelected && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
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
