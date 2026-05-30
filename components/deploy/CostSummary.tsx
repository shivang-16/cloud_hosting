"use client";

import { Minus, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/providers/utho/types";
import type { StorageVolume } from "./StorageConfigurator";
import { BILLING_OPTIONS, type BillingCycle } from "./BillingCycleSelector";

interface CostSummaryProps {
  plan: Plan | undefined;
  volumes: StorageVolume[];
  billingCycle: BillingCycle;
  onDeploy: (qty: number) => void;
  deploying: boolean;
}

export function CostSummary({ plan, volumes, billingCycle, onDeploy, deploying }: CostSummaryProps) {
  const [qty, setQty] = useState(1);

  const billingOpt = BILLING_OPTIONS.find((o) => o.key === billingCycle) ?? BILLING_OPTIONS[1];
  const prefix = plan?.currencyprefix ?? "Rs.";
  const instanceCost = (plan?.price ?? 0) * billingOpt.multiplier;
  const storageCost = volumes.reduce((sum, v) => sum + v.size * 48, 0) * billingOpt.multiplier;
  const subtotal = instanceCost + storageCost;
  const total = subtotal * qty;

  function fmt(n: number) {
    return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 sticky top-6 space-y-5">
      {/* Quantity */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Quantity</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:border-zinc-400 transition-colors"
          >
            <Minus className="w-3.5 h-3.5 text-zinc-700" />
          </button>
          <span className="w-6 text-center text-sm font-medium text-zinc-900">{qty}</span>
          <button
            type="button"
            onClick={() => setQty(qty + 1)}
            className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:border-zinc-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-700" />
          </button>
        </div>
      </div>

      {/* Cost breakdown */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Cost Summary</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Billing Cycle</span>
            <span className="text-xs font-medium text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-full">
              {billingOpt.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Instance</span>
            <span className="text-zinc-900">{prefix}{fmt(instanceCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">EBS Storage</span>
            <span className="text-zinc-900">{prefix}{fmt(storageCost)}</span>
          </div>
          <div className="h-px bg-zinc-100 my-1" />
          <div className="flex justify-between">
            <span className="text-zinc-500">Subtotal</span>
            <span className="text-zinc-900">{prefix}{fmt(subtotal)}</span>
          </div>
          {qty > 1 && (
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{prefix}{fmt(subtotal)} × {qty}</span>
            </div>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-baseline pt-1 border-t border-zinc-100">
        <span className="text-sm font-semibold text-zinc-900">Total{billingOpt.suffix}</span>
        <span className="text-2xl font-bold text-blue-600">{prefix}{fmt(total)}</span>
      </div>

      {/* Deploy button */}
      <Button
        type="button"
        className="w-full"
        size="lg"
        onClick={() => onDeploy(qty)}
        disabled={deploying}
      >
        {deploying ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</>
        ) : (
          "Deploy Now"
        )}
      </Button>
    </div>
  );
}
