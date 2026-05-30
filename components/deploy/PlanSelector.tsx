"use client";

import { useState } from "react";
import { Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./DCLocationSelector";
import { Badge } from "@/components/ui/badge";
import type { Plan } from "@/lib/providers/utho/types";
import { BILLING_OPTIONS, type BillingCycle } from "./BillingCycleSelector";

type PlanTab = "basic" | "dedicated-cpu" | "dedicated-memory";

const TAB_CONFIG: { key: PlanTab; label: string; icon: string }[] = [
  { key: "basic",            label: "Basic",           icon: "⚡" },
  { key: "dedicated-cpu",    label: "CPU Optimized",   icon: "🖥" },
  { key: "dedicated-memory", label: "Memory Optimized", icon: "🗄" },
];

interface PlanSelectorProps {
  plans: Plan[];
  selected: string;
  billingCycle: BillingCycle;
  onChange: (planId: string) => void;
}

function formatRam(mb: string) {
  const n = parseInt(mb);
  return n >= 1024 ? `${n / 1024} GB` : `${n} MB`;
}

function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => {
    const ramDiff = parseInt(a.ram) - parseInt(b.ram);
    if (ramDiff !== 0) return ramDiff;
    return parseInt(a.cpu) - parseInt(b.cpu);
  });
}

export function PlanSelector({ plans, selected, billingCycle, onChange }: PlanSelectorProps) {
  const [tab, setTab] = useState<PlanTab>("basic");

  const billingOpt = BILLING_OPTIONS.find((o) => o.key === billingCycle) ?? BILLING_OPTIONS[1];
  const filtered = sortPlans(
    plans.filter((p) => p.slug === tab && p.is_available === "YES")
  );

  return (
    <SectionCard
      icon={Server}
      title="Select Plan"
      subtitle="Choose resources for your instance"
      action={<Badge className="bg-red-500 text-white">Required</Badge>}
    >
      {/* Plan type tabs */}
      <div className="flex gap-1 border-b border-zinc-100 mb-4 -mx-1">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "text-zinc-900 border-b-2 border-zinc-900 -mb-px"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">RAM</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">vCPU</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">SSD Disk</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Bandwidth</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Price{" "}
                <span className="normal-case font-normal text-zinc-400">({billingOpt.label})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((plan) => {
              const isSelected = selected === plan.id;
              const price = plan.price * billingOpt.multiplier;
              const prefix = plan.currencyprefix ?? "Rs.";
              return (
                <tr
                  key={plan.id}
                  onClick={() => onChange(plan.id)}
                  className={cn(
                    "border-b border-zinc-100 last:border-0 cursor-pointer transition-colors relative",
                    isSelected ? "bg-zinc-50" : "hover:bg-zinc-50/50"
                  )}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <div className="w-0.5 h-5 bg-zinc-900 rounded absolute left-0" />
                      )}
                      <span className="font-medium text-zinc-900">{formatRam(plan.ram)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-700">{plan.cpu} vCPU</td>
                  <td className="px-4 py-3.5 text-zinc-700">
                    {plan.disk && plan.disk !== "0" ? `${plan.disk} GB` : "EBS"}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-700">{plan.bandwidth} GB</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold text-zinc-900">
                        {prefix}{price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}{billingOpt.suffix}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-900 flex items-center justify-center flex-shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 text-sm">
                  No plans available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
