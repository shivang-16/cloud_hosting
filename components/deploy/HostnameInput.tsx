"use client";

import { Server, RefreshCw } from "lucide-react";
import { SectionCard } from "./DCLocationSelector";
import { Input } from "@/components/ui/input";

interface HostnameInputProps {
  hostname: string;
  onChange: (h: string) => void;
}

function generateHostname(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `cloudserver-${rand}.mhc`;
}

export function HostnameInput({ hostname, onChange }: HostnameInputProps) {
  return (
    <SectionCard icon={Server} title="Hostname & Label" subtitle="Name for the server instance">
      <div className="flex gap-2">
        <Input
          value={hostname}
          onChange={(e) => onChange(e.target.value)}
          placeholder="cloudserver-ab12cd34.mhc"
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => onChange(generateHostname())}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 border border-zinc-200 rounded-lg hover:border-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </SectionCard>
  );
}
