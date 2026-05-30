"use client";

import { Shield, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./DCLocationSelector";
import { Button } from "@/components/ui/button";
import type { Firewall } from "@/lib/providers/utho/types";

interface SecurityGroupSelectorProps {
  firewalls: Firewall[];
  selected: string;
  onChange: (id: string) => void;
}

export function SecurityGroupSelector({ firewalls, selected, onChange }: SecurityGroupSelectorProps) {
  return (
    <SectionCard
      icon={Shield}
      title="Security Group"
      subtitle="Control traffic rules"
      action={
        <Button type="button" variant="default" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Create
        </Button>
      }
    >
      {firewalls.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 text-sm">
          No security groups found
        </div>
      ) : (
        <div className="space-y-2">
          {/* None option */}
          <button
            type="button"
            onClick={() => onChange("")}
            className={cn(
              "w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
              selected === ""
                ? "border-zinc-900 bg-zinc-50"
                : "border-zinc-200 hover:border-zinc-400"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded-full border-2",
              selected === "" ? "border-zinc-900 bg-zinc-900" : "border-zinc-300"
            )} />
            <span className="text-zinc-700">No security group</span>
          </button>
          {firewalls.map((fw) => (
            <button
              key={fw.id}
              type="button"
              onClick={() => onChange(fw.id)}
              className={cn(
                "w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
                selected === fw.id
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-400"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2",
                selected === fw.id ? "border-zinc-900 bg-zinc-900" : "border-zinc-300"
              )} />
              <span className="text-zinc-700">{fw.name}</span>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
