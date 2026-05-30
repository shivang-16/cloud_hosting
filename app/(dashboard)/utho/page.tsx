import Link from "next/link";
import { ArrowLeft, Zap, Globe, Clock, Activity, ArrowRight, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UthoArchitectureDiagram } from "@/components/providers/UthoArchitectureDiagram";

export default function UthoPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Providers
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-medium text-zinc-900">Utho Cloud</span>
          </div>
        </div>
      </header>

      {/* Announcement bar */}
      <div className="bg-zinc-900 text-white text-sm px-6 py-2.5 text-center">
        Looking for the classic console?{" "}
        <a href="https://console.utho.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-300 inline-flex items-center gap-1">
          Switch now <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Hero section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 mb-6">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" />
              </div>
              <Zap className="w-4 h-4 text-green-500" />
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 border border-zinc-200 text-zinc-600 text-xs px-3 py-1.5 rounded-full hover:border-zinc-400 transition-colors mb-6"
            >
              Get Started
            </Link>

            <h1 className="text-5xl font-bold text-zinc-900 leading-tight mb-4">
              Cloud Instances
            </h1>
            <p className="text-zinc-500 text-lg leading-relaxed mb-8">
              Deploy scalable virtual machines with SSD storage, dedicated CPU
              cores, and high-speed networking. Choose from a variety of
              configurations to match your workload requirements.
            </p>
            <Link href="/utho/deploy">
              <Button size="lg" className="gap-2">
                Deploy Cloud Instance <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Right – architecture diagram */}
          <div className="flex justify-center">
            <UthoArchitectureDiagram />
          </div>
        </div>
      </section>

      {/* Key features */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-6">
          <Zap className="w-4 h-4" /> Key Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: "High Performance", desc: "SSD storage and dedicated CPU" },
            { icon: Globe, label: "Global Reach", desc: "Deploy across multiple regions" },
            { icon: Activity, label: "Instant Scaling", desc: "Scale resources on demand" },
            { icon: Clock, label: "24/7 Monitoring", desc: "Real-time metrics and alerts" },
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
