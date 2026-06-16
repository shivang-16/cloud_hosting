"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Zap, Plus, Terminal, Square, Trash2, RotateCcw, ChevronDown, Globe, HardDrive, Cpu, Network, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_PROJECT_ID = 54565;
const LOCATIONS = ["Delhi", "Chennai"] as const;

interface Node {
  id: number;
  name: string;
  status: string;
  location: string;
  public_ip_address?: string;
  private_ip_address?: string;
  plan?: string;
  series?: string;
  memory?: string;
  vcpus?: string;
  is_locked?: boolean;
}

function StatusDot({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const color =
    s === "running" ? "bg-green-500" :
    s === "stopped" || s === "off" ? "bg-zinc-400" :
    s === "building" || s === "pending" ? "bg-yellow-400" :
    "bg-zinc-300";
  return <span className={cn("inline-block w-2 h-2 rounded-full", color)} />;
}

function ActionsMenu({ node, onAction }: { node: Node; onAction: (action: string, id: number) => void }) {
  const [open, setOpen] = useState(false);
  const isRunning = node.status?.toLowerCase() === "running";

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 transition-colors"
      >
        Actions <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {isRunning ? (
              <button
                type="button"
                onClick={() => { setOpen(false); onAction("power_off", node.id); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Square className="w-3.5 h-3.5 text-zinc-500" /> Stop Node
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setOpen(false); onAction("power_on", node.id); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-zinc-500" /> Start Node
              </button>
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); onAction("reboot", node.id); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" /> Reboot
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onAction("terminal", node.id); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-500" /> Console
            </button>
            <div className="h-px bg-zinc-100 mx-3" />
            <button
              type="button"
              onClick={() => { setOpen(false); onAction("delete", node.id); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Node
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NodeDetailCard({ node }: { node: Node }) {
  return (
    <tr className="bg-zinc-50 border-b border-zinc-100">
      <td colSpan={6} className="px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide"><Globe className="w-3 h-3" /> Public IP</span>
            <span className="text-sm font-mono font-medium text-zinc-900">{node.public_ip_address ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide"><Network className="w-3 h-3" /> Private IP</span>
            <span className="text-sm font-mono font-medium text-zinc-900">{node.private_ip_address ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide"><Cpu className="w-3 h-3" /> Compute</span>
            <span className="text-sm font-medium text-zinc-900">
              {node.vcpus ? `${node.vcpus} vCPU` : "—"}{node.memory ? ` · ${node.memory}` : ""}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide"><HardDrive className="w-3 h-3" /> Series</span>
            <span className="text-sm font-medium text-zinc-900">{node.series ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide"><MapPin className="w-3 h-3" /> Location</span>
            <span className="text-sm font-medium text-zinc-900">{node.location ?? "—"}</span>
          </div>
          {node.plan && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Plan</span>
              <span className="text-sm font-medium text-zinc-900">{node.plan}</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function E2EPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function loadNodes() {
    setLoading(true);
    try {
      const results = await Promise.all(
        LOCATIONS.map(async (loc) => {
          const res = await fetch(`/api/proxy/e2e/nodes?location=${loc}&project_id=${DEFAULT_PROJECT_ID}`);
          if (!res.ok) return [];
          const data = await res.json();
          const list = Array.isArray(data?.data) ? data.data : [];
          return list.map((n: Record<string, unknown>) => ({ ...n, location: loc }));
        })
      );
      setNodes(results.flat());
    } catch {
      toast.error("Failed to load nodes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      void loadNodes();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAction(action: string, nodeId: number) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (action === "delete") {
      setConfirmDelete(nodeId);
      return;
    }

    if (action === "terminal") {
      window.open(`https://my.e2enetworks.com/node/${nodeId}/console`, "_blank");
      return;
    }

    setActionLoading(nodeId);
    try {
      const res = await fetch(`/api/proxy/e2e/nodes/${nodeId}/actions?location=${node.location}&project_id=${DEFAULT_PROJECT_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? data?.errors ?? "Action failed");
      const label = action === "power_off" ? "Node stopped" : action === "power_on" ? "Node started" : "Node rebooted";
      toast.success(label);
      await loadNodes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function confirmDeleteNode(nodeId: number) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setConfirmDelete(null);
    setActionLoading(nodeId);
    try {
      const res = await fetch(`/api/proxy/e2e/nodes/${nodeId}?location=${node.location}&project_id=${DEFAULT_PROJECT_ID}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? "Delete failed");
      }
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(nodeId); return next; });
      toast.success(`Node "${node.name}" deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setActionLoading(null);
    }
  }

  const allSelected = nodes.length > 0 && nodes.every((n) => selectedIds.has(n.id));

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Delete confirm modal */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <p className="font-semibold text-zinc-900 mb-1">Delete node?</p>
            <p className="text-sm text-zinc-500 mb-5">
              This will permanently destroy <span className="font-medium text-zinc-900">{nodes.find((n) => n.id === confirmDelete)?.name}</span> and all its data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => confirmDeleteNode(confirmDelete)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Providers
            </Link>
            <span className="text-zinc-300">/</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-zinc-900 rounded-md flex items-center justify-center text-white text-[10px] font-bold">E2</div>
              <span className="text-sm font-medium text-zinc-900">E2E Networks</span>
            </div>
          </div>
          <Link href="/e2e/deploy">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Deploy Node
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 flex flex-col items-center gap-3 text-zinc-400">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
            <p className="text-sm">Loading nodes…</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900 mb-1">No nodes yet</p>
              <p className="text-sm text-zinc-400">Deploy your first cloud node to get started.</p>
            </div>
            <Link href="/e2e/deploy">
              <Button className="gap-2 mt-1">Deploy Cloud Node <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-visible">
            <table className="w-full text-sm overflow-visible">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) setSelectedIds(new Set());
                        else setSelectedIds(new Set(nodes.map((n) => n.id)));
                      }}
                      className="w-4 h-4 rounded border-zinc-300 accent-zinc-900"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-500 text-xs uppercase tracking-wide">Node Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-500 text-xs uppercase tracking-wide">Public IP</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-500 text-xs uppercase tracking-wide">Private IP</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-500 text-xs uppercase tracking-wide">State</th>
                  <th className="text-right px-4 py-3 font-semibold text-zinc-500 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => {
                  const isSelected = selectedIds.has(node.id);
                  const isActing = actionLoading === node.id;
                  return (
                    <>
                      <tr
                        key={node.id}
                        className={cn(
                          "border-b border-zinc-100 last:border-0 transition-colors",
                          isSelected ? "bg-zinc-50" : "hover:bg-zinc-50/50"
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(node.id)}
                            className="w-4 h-4 rounded border-zinc-300 accent-zinc-900"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="1" y="3" width="14" height="10" rx="1.5" />
                                <path d="M5 7h6M5 9.5h4" strokeLinecap="round" />
                              </svg>
                            </div>
                            <span className="font-medium text-zinc-900">{node.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-zinc-700 text-xs">{node.public_ip_address ?? "—"}</td>
                        <td className="px-4 py-3.5 font-mono text-zinc-500 text-xs">{node.private_ip_address ?? "—"}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700">
                            <StatusDot status={node.status} />
                            {isActing ? "Processing…" : (node.status ?? "Unknown")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <ActionsMenu node={node} onAction={handleAction} />
                        </td>
                      </tr>
                      {isSelected && <NodeDetailCard key={`detail-${node.id}`} node={node} />}
                    </>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
              <span>{nodes.length} node{nodes.length !== 1 ? "s" : ""}</span>
              <button type="button" onClick={loadNodes} className="hover:text-zinc-700 transition-colors">Refresh</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
