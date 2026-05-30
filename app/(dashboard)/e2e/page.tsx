import Link from "next/link";
import { ArrowLeft, ArrowRight, Zap, Globe, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function E2EPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Providers
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="text-sm font-medium text-zinc-900">E2E Networks</span>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 mb-6">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white text-xs font-bold">E2</div>
              <Zap className="w-4 h-4 text-green-500" />
            </div>

            <h1 className="text-5xl font-bold text-zinc-900 leading-tight mb-4">
              Cloud Nodes
            </h1>
            <p className="text-zinc-500 text-lg leading-relaxed mb-8">
              Deploy high-performance virtual machines on E2E Networks — India's
              GPU-first cloud platform with CPU-intensive and memory-optimized
              instances across Delhi and Chennai.
            </p>
            <Link href="/e2e/deploy">
              <Button size="lg" className="gap-2">
                Deploy Cloud Node <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Simple architecture diagram */}
          <div className="bg-zinc-100 rounded-2xl p-8 flex flex-col gap-4">
            <p className="text-xs text-zinc-400 font-medium">E2E Infrastructure</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "C3 – CPU Intensive", desc: "3rd Gen Intel/AMD" },
                { label: "E1 – General Purpose", desc: "Cost-effective VMs" },
                { label: "M3 – High Memory", desc: "In-memory workloads" },
                { label: "GPU Nodes", desc: "AI/ML accelerated" },
              ].map(({ label, desc }) => (
                <div key={label} className="bg-white border border-zinc-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-zinc-900">{label}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-zinc-200 pt-3 mt-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-[10px] text-zinc-500">Delhi • Chennai — Active</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-6">
          <Zap className="w-4 h-4" /> Key Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: "CPU Intensive", desc: "C3 series with dedicated vCPU" },
            { icon: Globe, label: "2 Locations", desc: "Delhi and Chennai DCs" },
            { icon: Activity, label: "On-Demand & Committed", desc: "Flexible billing plans" },
            { icon: Clock, label: "Per-Hour Billing", desc: "Pay only for what you use" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white border border-zinc-200 rounded-2xl p-5">
              <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="font-medium text-zinc-900 text-sm">{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
