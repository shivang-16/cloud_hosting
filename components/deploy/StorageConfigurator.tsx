"use client";

import { HardDrive, Plus, Trash2 } from "lucide-react";
import { SectionCard } from "./DCLocationSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface StorageVolume {
  size: number;
  type: string;
  isRoot: boolean;
}

const VOLUME_TYPES = [
  { value: "nvme", label: "High Performance (NVME)" },
  { value: "ssd", label: "Standard SSD" },
  { value: "hdd", label: "Standard HDD" },
];

interface StorageConfiguratorProps {
  volumes: StorageVolume[];
  onChange: (volumes: StorageVolume[]) => void;
  pricePerGB?: number;
}

function calcCost(size: number) {
  return (size * 48).toFixed(2);
}

export function StorageConfigurator({ volumes, onChange }: StorageConfiguratorProps) {
  function updateVolume(index: number, patch: Partial<StorageVolume>) {
    onChange(volumes.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVolume() {
    onChange([...volumes, { size: 20, type: "ssd", isRoot: false }]);
  }

  function removeVolume(index: number) {
    onChange(volumes.filter((_, i) => i !== index));
  }

  return (
    <SectionCard
      icon={HardDrive}
      title="Configure Storage"
      subtitle="Elastic block storage for the instance"
      action={
        <Button type="button" variant="outline" size="sm" onClick={addVolume} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Volume
        </Button>
      }
    >
      <div>
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 mb-2 px-1">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Size</span>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Volume Type</span>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Cost</span>
          <span className="w-8" />
        </div>

        <div className="space-y-2">
          {volumes.map((vol, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 items-center">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={10}
                  max={2000}
                  value={vol.size}
                  onChange={(e) => updateVolume(i, { size: Number(e.target.value) })}
                  className="text-sm"
                />
                <span className="text-xs text-zinc-500 whitespace-nowrap">GB</span>
              </div>

              <select
                value={vol.type}
                onChange={(e) => updateVolume(i, { type: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
              >
                {VOLUME_TYPES.map((vt) => (
                  <option key={vt.value} value={vt.value}>
                    {vt.label}{vol.isRoot ? " - Root volume" : ""}
                  </option>
                ))}
              </select>

              <div className="bg-zinc-100 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 text-center">
                Rs.{calcCost(vol.size)}
              </div>

              <div className="w-8 flex justify-center">
                {vol.isRoot ? (
                  <span className="text-[10px] text-zinc-400 font-medium uppercase">ROOT</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeVolume(i)}
                    className="text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
