"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DCLocationSelector } from "@/components/deploy/DCLocationSelector";
import { OSSelector } from "@/components/deploy/OSSelector";
import { BillingCycleSelector, type BillingCycle } from "@/components/deploy/BillingCycleSelector";
import { StorageConfigurator, type StorageVolume } from "@/components/deploy/StorageConfigurator";
import { PlanSelector } from "@/components/deploy/PlanSelector";
import { DeploymentTypeSelector } from "@/components/deploy/DeploymentTypeSelector";
import { SecurityGroupSelector } from "@/components/deploy/SecurityGroupSelector";
import { CPUModelSelector, type CPUModel } from "@/components/deploy/CPUModelSelector";
import { AuthConfigurator } from "@/components/deploy/AuthConfigurator";
import { HostnameInput } from "@/components/deploy/HostnameInput";
import { CostSummary } from "@/components/deploy/CostSummary";
import type { DeployOptions, Plan, Datacenter } from "@/lib/providers/utho/types";

function generateHostname() {
  const rand = Math.random().toString(36).substring(2, 10);
  return `cloudserver-${rand}.mhc`;
}

export default function UthoDeployPage() {
  const router = useRouter();

  const [deployOptions, setDeployOptions] = useState<DeployOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [dcslug, setDcslug] = useState("inmumbaizone2");
  const [image, setImage] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [volumes, setVolumes] = useState<StorageVolume[]>([
    { size: 80, type: "nvme", isRoot: true },
  ]);
  const [planId, setPlanId] = useState("");
  const [deployType, setDeployType] = useState<"public" | "vpc">("public");
  const [firewallId, setFirewallId] = useState("");
  const [cpuModel, setCpuModel] = useState<CPUModel>("amd");
  const [authMethod, setAuthMethod] = useState<"option1" | "option2">("option1");
  const [password, setPassword] = useState("");
  const [sshKeyIds, setSshKeyIds] = useState<string[]>([]);
  const [hostname, setHostname] = useState(generateHostname);

  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState("");

  async function fetchOptions(slug: string) {
    setLoadingOptions(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/utho/cloud/getdeploy?dcslug=${slug}`);
      if (!res.ok) throw new Error("Failed to load options");
      const data: DeployOptions = await res.json();
      setDeployOptions(data);

      // Auto-select CPU model from DC default
      const dc: Datacenter | undefined = data.dczones?.find((d) => d.slug === slug);
      if (dc?.default_cpu) setCpuModel(dc.default_cpu as CPUModel);

      // Auto-select first available basic plan
      const firstPlan = data.plans?.find((p) => p.slug === "basic" && p.is_available === "YES");
      if (firstPlan) setPlanId(firstPlan.id);

      // Auto-select first distro image
      if (data.distro?.length) {
        const firstImg = data.distro[0].images[0];
        if (firstImg) setImage(firstImg.image);
      }
    } catch {
      setError("Failed to load deployment options. Check your API key.");
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      void fetchOptions(dcslug);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [dcslug]);

  function handleDCChange(slug: string) {
    setDcslug(slug);
    setPlanId("");
    setImage("");
  }

  async function handleDeploy(qty: number) {
    setError("");
    if (!image) { setError("Please select an operating system."); return; }
    if (!planId) { setError("Please select a plan."); return; }
    if (authMethod === "option1" && !password) { setError("Please enter a root password."); return; }

    setDeploying(true);
    try {
      const payload = {
        dcslug,
        planid: planId,
        billingcycle: billingCycle,
        auth: authMethod,
        ...(authMethod === "option1" ? { root_password: password } : { sshkeys: sshKeyIds.join(",") }),
        enable_publicip: deployType === "public" ? "true" : "false",
        cpumodel: cpuModel,
        firewall: firewallId,
        enablebackup: "false",
        image,
        cloud: Array.from({ length: qty }, () => ({ hostname })),
      };

      const res = await fetch("/api/proxy/utho/cloud/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // Utho returns HTTP 200 even for errors — check the status field
      if (!res.ok || data?.status === "error") {
        throw new Error(data?.message ?? data?.error ?? "Deploy failed");
      }

      router.push("/utho");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }

  const selectedPlan: Plan | undefined = deployOptions?.plans?.find((p) => p.id === planId);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link
            href="/utho"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Deploy Cloud Instance</h1>
            <p className="text-xs text-zinc-500">Configure and launch your cloud infrastructure</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            {loadingOptions ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 flex flex-col items-center gap-3 text-zinc-400">
                <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
                <p className="text-sm">Loading deployment options…</p>
              </div>
            ) : deployOptions ? (
              <>
                <DCLocationSelector
                  datacenters={deployOptions.dczones ?? []}
                  selected={dcslug}
                  onChange={handleDCChange}
                />

                <OSSelector
                  distroGroups={deployOptions.distro ?? []}
                  selectedImage={image}
                  onChange={setImage}
                />

                <BillingCycleSelector selected={billingCycle} onChange={setBillingCycle} />

                <StorageConfigurator volumes={volumes} onChange={setVolumes} />

                <PlanSelector
                  plans={deployOptions.plans ?? []}
                  selected={planId}
                  billingCycle={billingCycle}
                  onChange={setPlanId}
                />

                <DeploymentTypeSelector
                  selected={deployType}
                  onChange={setDeployType}
                  supportsVPC={!!deployOptions.dczones?.find((d) => d.slug === dcslug)?.product_vpc}
                />

                <SecurityGroupSelector
                  firewalls={deployOptions.firewalls ?? []}
                  selected={firewallId}
                  onChange={setFirewallId}
                />

                <CPUModelSelector selected={cpuModel} onChange={setCpuModel} />

                <AuthConfigurator
                  method={authMethod}
                  password={password}
                  sshKeyIds={sshKeyIds}
                  sshKeys={deployOptions.keys ?? []}
                  onMethodChange={setAuthMethod}
                  onPasswordChange={setPassword}
                  onSshKeysChange={setSshKeyIds}
                />

                <HostnameInput hostname={hostname} onChange={setHostname} />
              </>
            ) : (
              <div className="bg-white border border-red-100 rounded-2xl p-8 text-center text-red-500 text-sm">
                Failed to load deployment options. Check your API key and try again.
              </div>
            )}
          </div>

          <div className="w-72 flex-shrink-0">
            <CostSummary
              plan={selectedPlan}
              volumes={volumes}
              billingCycle={billingCycle}
              onDeploy={handleDeploy}
              deploying={deploying}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
