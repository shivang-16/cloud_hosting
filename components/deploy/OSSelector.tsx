"use client";

import { useState } from "react";
import { HardDrive, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./DCLocationSelector";
import type { DistroGroup } from "@/lib/providers/utho/types";
import { Badge } from "@/components/ui/badge";

const OS_ICONS: Record<string, string> = {
  almalinux: "🔵",
  centos: "🎯",
  debian: "🌀",
  fedora: "🔷",
  rockylinux: "🪨",
  ubuntu: "🟠",
  windows: "🪟",
};

interface OSSelectorProps {
  distroGroups: DistroGroup[];
  selectedImage: string;
  onChange: (image: string) => void;
}

export function OSSelector({ distroGroups, selectedImage, onChange }: OSSelectorProps) {
  const [versionOpen, setVersionOpen] = useState<string | null>(null);

  const selectedGroup = distroGroups.find((g) =>
    g.images.some((img) => img.image === selectedImage)
  );

  return (
    <SectionCard
      icon={HardDrive}
      title="Select OS / Apps"
      subtitle="Choose an operating system for your instance"
      action={<Badge variant="outline">Required</Badge>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {distroGroups.map((group) => {
          const key = group.distro;
          const icon = OS_ICONS[key.toLowerCase().replace(/\s/g, "")] ?? "💿";
          const isSelected = selectedGroup?.distro === key;
          const selectedVersion = group.images.find((img) => img.image === selectedImage);
          const isOpen = versionOpen === key;

          return (
            <div key={key} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (group.images.length === 1) {
                    onChange(group.images[0].image);
                    setVersionOpen(null);
                  } else {
                    setVersionOpen(isOpen ? null : key);
                    if (!isSelected) onChange(group.images[0].image);
                  }
                }}
                className={cn(
                  "w-full flex flex-col items-center gap-2 p-4 rounded-xl border text-sm transition-all",
                  isSelected
                    ? "border-zinc-900 bg-zinc-50 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-400 bg-white"
                )}
              >
                <span className="text-3xl leading-none">{icon}</span>
                <p className="font-medium text-zinc-900 text-xs text-center">{group.distribution}</p>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <span>{isSelected && selectedVersion ? selectedVersion.version : group.images[0].version}</span>
                  {group.images.length > 1 && <ChevronDown className="w-3 h-3" />}
                </div>
              </button>

              {/* Version dropdown */}
              {isOpen && isSelected && group.images.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                  {group.images.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => { onChange(img.image); setVersionOpen(null); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 transition-colors",
                        selectedImage === img.image ? "text-zinc-900 font-medium bg-zinc-50" : "text-zinc-600"
                      )}
                    >
                      {img.distribution} {img.version}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
