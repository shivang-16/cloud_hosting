import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderConfig } from "@/lib/providers/types";

interface ProviderCardProps {
  provider: ProviderConfig;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const content = (
    <div
      className={cn(
        "group relative bg-white border border-zinc-200 rounded-2xl p-6 transition-all duration-200",
        provider.available
          ? "hover:border-zinc-400 hover:shadow-md cursor-pointer"
          : "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-2xl font-bold text-zinc-700">
          {provider.name.charAt(0)}
        </div>
        {!provider.available && (
          <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">
            <Lock className="w-3 h-3" /> Coming soon
          </span>
        )}
        {provider.available && (
          <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-700 group-hover:translate-x-0.5 transition-all" />
        )}
      </div>

      <h3 className="font-semibold text-zinc-900 mb-1">{provider.name}</h3>
      <p className="text-sm text-zinc-500">{provider.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {provider.capabilities.vpc && <Cap label="VPC" />}
        {provider.capabilities.snapshots && <Cap label="Snapshots" />}
        {provider.capabilities.backups && <Cap label="Backups" />}
        {provider.capabilities.marketplace && <Cap label="Marketplace" />}
      </div>
    </div>
  );

  if (!provider.available) return content;

  return <Link href={`/${provider.id}`}>{content}</Link>;
}

function Cap({ label }: { label: string }) {
  return (
    <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}
