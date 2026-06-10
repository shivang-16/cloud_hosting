"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Cloud, Zap, LogOut, Rocket, Server, Database, Globe, Shield,
  ArrowRight, Activity, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-900">CloudConsole</span>
            <Zap className="w-3.5 h-3.5 text-green-500" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loggingOut}
            className="text-zinc-500 gap-1.5">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-600 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Multi-cloud ready
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 mb-4 tracking-tight">
            Deploy infrastructure<br />across any cloud
          </h1>
          <p className="text-zinc-500 text-lg max-w-md mx-auto mb-10">
            Configure once, compare providers, deploy anywhere — Utho Cloud and E2E Networks from a single console.
          </p>
          <Link href="/deploy">
            <Button size="lg" className="gap-2.5 px-8 h-12 text-base">
              <Rocket className="w-5 h-5" />
              Deploy an Instance
              <ArrowRight className="w-4 h-4 opacity-60" />
            </Button>
          </Link>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest text-center mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Configure",
                desc: "Set your OS, resources, region and auth — provider-agnostic.",
              },
              {
                step: "02",
                title: "Choose Cloud",
                desc: "Compare Utho Cloud and E2E Networks with live pricing for your spec.",
              },
              {
                step: "03",
                title: "Fine-tune & Deploy",
                desc: "Set provider-specific options, review cost, and launch.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white border border-zinc-200 rounded-2xl p-6 relative overflow-hidden">
                <span className="absolute top-4 right-5 text-5xl font-black text-zinc-50 select-none leading-none">
                  {step}
                </span>
                <p className="text-xs font-bold text-zinc-400 mb-2">Step {step}</p>
                <p className="font-semibold text-zinc-900 mb-1">{title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What you can manage */}
        <div className="border-t border-zinc-200 pt-12">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6">
            What you can manage
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Server,   label: "Cloud Instances", desc: "VMs with SSD and dedicated vCPU" },
              { icon: Database, label: "Storage",          desc: "EBS volumes and object storage" },
              { icon: Globe,    label: "Networking",       desc: "VPC, load balancers, DNS" },
              { icon: Shield,   label: "Security",         desc: "Firewalls, SSH keys, IAM" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4">
                <Icon className="w-5 h-5 text-zinc-400 mb-3" />
                <p className="text-sm font-medium text-zinc-900">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
