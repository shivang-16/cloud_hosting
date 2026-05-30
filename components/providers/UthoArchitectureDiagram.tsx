import { Monitor, HardDrive, Database, Activity } from "lucide-react";

export function UthoArchitectureDiagram() {
  return (
    <div className="w-full max-w-md bg-zinc-100 rounded-2xl p-6 relative">
      <p className="text-xs text-zinc-400 mb-6 font-medium">Availability Zone</p>

      <div className="flex items-center justify-between gap-4">
        {/* Users */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 bg-white border border-zinc-200 rounded-xl flex items-center justify-center shadow-sm">
            <Monitor className="w-5 h-5 text-zinc-600" />
          </div>
          <span className="text-[10px] text-zinc-500">Users</span>
        </div>

        {/* Arrow */}
        <Arrow />

        {/* Load Balancer */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[10px] text-zinc-500">Load Balancer</span>
        </div>

        {/* Arrow */}
        <Arrow />

        {/* Compute + Storage column */}
        <div className="flex flex-col gap-3">
          {/* Compute box */}
          <div className="border border-zinc-200 bg-white rounded-xl p-3">
            <p className="text-[9px] text-zinc-400 font-medium mb-2 text-center">Compute</p>
            <div className="space-y-1.5">
              {["Instance 1", "Instance 2"].map((inst) => (
                <div key={inst} className="flex items-center gap-1.5 bg-zinc-100 rounded-lg px-2 py-1">
                  <div className="w-2 h-2 bg-zinc-400 rounded-sm" />
                  <span className="text-[9px] text-zinc-600">{inst}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <Arrow />

        {/* Right column: Storage, Database, Cache */}
        <div className="flex flex-col gap-2">
          {[
            { icon: HardDrive, label: "Storage" },
            { icon: Database, label: "Database" },
            { icon: Activity, label: "Cache" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="w-12 h-10 bg-zinc-900 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[9px] text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* VPC footer */}
      <div className="mt-6 flex items-center gap-2 border-t border-zinc-200 pt-3">
        <div className="w-4 h-4 rounded-full border-2 border-zinc-400 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
        </div>
        <span className="text-[10px] text-zinc-500 font-medium">VPC</span>
        <span className="text-[10px] text-zinc-400">• Private Subnet • Security Groups • Encryption</span>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
