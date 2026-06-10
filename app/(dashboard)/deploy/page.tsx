"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Loader2,
  Globe, HardDrive, Server, Shield, Key, Cpu, Network, Clock, Database,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BILLING_OPTIONS, type BillingCycle } from "@/components/deploy/BillingCycleSelector";
import type { UnifiedDeployConfig, ProviderOffer } from "@/lib/deploy/types";
import type { DeployOptions, Plan } from "@/lib/providers/utho/types";
import type { E2EImage, E2EOSCategory, E2ESshKey, E2ESecurityGroup, E2EVPC, E2ELocation } from "@/lib/providers/e2e/types";
import {
  KRUTRIM_INSTANCE_TYPES, KRUTRIM_IMAGES,
  type KrutrimInstanceType, type KrutrimSshKey, type KrutrimVpc, type KrutrimSubnet, type KrutrimRegion,
} from "@/lib/providers/krutrim/types";

// ─── constants ────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT_ID = 54565;
const DEFAULT_DISPLAY_CAT = "Linux Virtual Node";

const OS_ICONS: Record<string, string> = {
  Ubuntu: "logos:ubuntu",
  RockyLinux: "logos:rocky-linux",
  AlmaLinux: "logos:almalinux",
  CentOS: "logos:centos-icon",
  Debian: "logos:debian",
  OpenSUSE: "logos:opensuse",
  RedHat: "logos:redhat-icon",
  Windows: "logos:microsoft-windows-icon",
};

// Regions: each entry maps to the DC slugs / location names for each provider
const REGIONS = [
  {
    label: "Mumbai",
    uthoSlug: "inmumbaizone2" as string | null,
    e2eLoc: null as E2ELocation | null,
    krutrimRegion: null as KrutrimRegion | null,
  },
  {
    label: "Delhi NCR",
    uthoSlug: "innoidazone1" as string | null,
    e2eLoc: "Delhi" as E2ELocation | null,
    krutrimRegion: null as KrutrimRegion | null,
  },
  {
    label: "Chennai",
    uthoSlug: "inchennaizone1" as string | null,
    e2eLoc: "Chennai" as E2ELocation | null,
    krutrimRegion: null as KrutrimRegion | null,
  },
  {
    label: "Bangalore",
    uthoSlug: "inbangalorezone1" as string | null,
    e2eLoc: null as E2ELocation | null,
    krutrimRegion: "In-Bangalore-1" as KrutrimRegion | null,
  },
  {
    label: "Hyderabad",
    uthoSlug: null as string | null,
    e2eLoc: null as E2ELocation | null,
    krutrimRegion: "In-Hyderabad-1" as KrutrimRegion | null,
  },
];

const CPU_OPTIONS  = [1, 2, 4, 8, 16, 32];
const RAM_OPTIONS  = [1, 2, 4, 8, 16, 32, 64];
const DISK_OPTIONS = [20, 40, 80, 160, 320, 640];

function generateHostname() {
  return `node-${Math.random().toString(36).substring(2, 8)}`;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function matchUthoPlans(plans: Plan[], config: UnifiedDeployConfig): Plan[] {
  const desiredRamMb = config.ramGb * 1024;
  return [...plans]
    .filter((p) => p.is_available === "YES")
    .sort((a, b) => Math.abs(parseInt(a.ram) - desiredRamMb) - Math.abs(parseInt(b.ram) - desiredRamMb))
    .slice(0, 1);
}

function matchE2EImages(images: E2EImage[], config: UnifiedDeployConfig): E2EImage[] {
  return [...images]
    .sort((a, b) => {
      const da = Math.abs(parseFloat(a.specs.ram) - config.ramGb) * 100 + Math.abs(a.specs.cpu - config.cpu);
      const db = Math.abs(parseFloat(b.specs.ram) - config.ramGb) * 100 + Math.abs(b.specs.cpu - config.cpu);
      return da - db;
    })
    .slice(0, 1);
}

function matchKrutrimType(config: UnifiedDeployConfig): KrutrimInstanceType | null {
  const sorted = [...KRUTRIM_INSTANCE_TYPES].sort((a, b) => {
    const da = Math.abs(a.ramGb - config.ramGb) * 100 + Math.abs(a.cpu - config.cpu);
    const db = Math.abs(b.ramGb - config.ramGb) * 100 + Math.abs(b.cpu - config.cpu);
    return da - db;
  });
  return sorted[0] ?? null;
}

function findKrutrimImage(osName: string, osVersion: string) {
  return KRUTRIM_IMAGES.find(
    (img) => img.os.toLowerCase() === osName.toLowerCase() && img.version === osVersion
  ) ?? KRUTRIM_IMAGES.find((img) => img.os.toLowerCase() === osName.toLowerCase())
    ?? KRUTRIM_IMAGES[0];
}

async function safeFetch(url: string, opts?: RequestInit) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
    return res.json();
  } catch { return null; }
}

function krutrimHeaders(region: KrutrimRegion): Record<string, string> {
  return { "x-region": region };
}

// ─── stepper ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Configure" },
  { id: 2, label: "Choose Cloud" },
  { id: 3, label: "Finalise & Deploy" },
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done   = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                done   ? "bg-zinc-900 text-white" :
                active ? "bg-zinc-900 text-white ring-4 ring-zinc-900/10" :
                         "bg-zinc-100 text-zinc-400"
              )}>
                {done ? <Check className="w-3.5 h-3.5" /> : s.id}
              </div>
              <span className={cn("text-sm font-medium hidden sm:block",
                active ? "text-zinc-900" : done ? "text-zinc-500" : "text-zinc-400")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-10 sm:w-14 h-px mx-3 transition-colors",
                s.id < current ? "bg-zinc-900" : "bg-zinc-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── page root ────────────────────────────────────────────────────────────────

export default function DeployPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [config, setConfig] = useState<UnifiedDeployConfig>({
    region: "Mumbai",
    osName: "Ubuntu", osVersion: "22.04",
    cpu: 2, ramGb: 4, diskGb: 80,
    billingCycle: "monthly",
    enablePublicIp: true,
    firewallId: "", vpcId: "", subnetId: "",
    cpuModel: "amd",
    authMethod: "password", password: "", sshKeyIds: [], sshKeyName: "",
    hostname: generateHostname(),
    volumes: [{ size: 80, type: "nvme", isRoot: true }],
  });

  // Region data
  const [e2eCategories, setE2eCategories] = useState<E2EOSCategory[]>([]);
  const [uthoOptions, setUthoOptions]     = useState<DeployOptions | null>(null);
  const [loadingOS, setLoadingOS]         = useState(true);
  const [sshKeys, setSshKeys]             = useState<{
    utho: { id: string; name: string }[];
    e2e: E2ESshKey[];
    krutrim: KrutrimSshKey[];
  }>({ utho: [], e2e: [], krutrim: [] });
  const [securityGroups, setSecurityGroups] = useState<E2ESecurityGroup[]>([]);
  const [vpcs, setVpcs]                     = useState<E2EVPC[]>([]);
  // Krutrim
  const [krutrimVpcs, setKrutrimVpcs]       = useState<KrutrimVpc[]>([]);
  const [krutrimSubnets, setKrutrimSubnets] = useState<KrutrimSubnet[]>([]);

  // Step 2
  const [offers, setOffers]               = useState<ProviderOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<ProviderOffer | null>(null);

  // Step 3
  const [committedSkuId, setCommittedSkuId] = useState<number | null>(null);
  const [deploying, setDeploying]           = useState(false);

  const regionObj = REGIONS.find((r) => r.label === config.region) ?? REGIONS[0];

  // ── Load region data ──────────────────────────────────────────────────────

  const loadRegionData = useCallback(async (region: typeof REGIONS[0]) => {
    setLoadingOS(true);
    const tasks: Promise<unknown>[] = [];

    if (region.e2eLoc) {
      tasks.push(
        safeFetch(`/api/proxy/e2e/images/os-category/?location=${region.e2eLoc}&active=true`).then((d) => {
          setE2eCategories(Array.isArray(d?.data?.category_list) ? d.data.category_list : []);
        }),
        Promise.all([
          safeFetch(`/api/proxy/e2e/ssh-keys?location=${region.e2eLoc}&project_id=${DEFAULT_PROJECT_ID}`),
          safeFetch(`/api/proxy/e2e/security-groups?location=${region.e2eLoc}&project_id=${DEFAULT_PROJECT_ID}`),
          safeFetch(`/api/proxy/e2e/vpc/list?location=${region.e2eLoc}&project_id=${DEFAULT_PROJECT_ID}`),
        ]).then(([keysD, sgD, vpcD]) => {
          setSshKeys((p) => ({ ...p, e2e: Array.isArray(keysD?.data) ? keysD.data : [] }));
          setSecurityGroups(Array.isArray(sgD?.data) ? sgD.data : []);
          setVpcs(Array.isArray(vpcD?.data) ? vpcD.data : []);
        })
      );
    } else {
      setE2eCategories([]);
      setSshKeys((p) => ({ ...p, e2e: [] }));
      setSecurityGroups([]);
      setVpcs([]);
    }

    if (region.uthoSlug) {
      tasks.push(
        fetch(`/api/proxy/utho/cloud/getdeploy?dcslug=${region.uthoSlug}`)
          .then((r) => r.ok ? r.json() : null)
          .then((d: DeployOptions | null) => {
            setUthoOptions(d);
            setSshKeys((p) => ({ ...p, utho: d?.keys ?? [] }));
          })
          .catch(() => setUthoOptions(null))
      );
    } else {
      setUthoOptions(null);
      setSshKeys((p) => ({ ...p, utho: [] }));
    }

    if (region.krutrimRegion) {
      tasks.push(
        Promise.all([
          safeFetch("/api/proxy/krutrim/v1/highlvlvpc/search_vpc", {
            headers: krutrimHeaders(region.krutrimRegion),
          }),
          safeFetch("/api/proxy/krutrim/v2/sshkeys/search", {
            headers: krutrimHeaders(region.krutrimRegion),
          }).catch(() => null),
        ]).then(([vpcD, keysD]) => {
          // vpcs can be array directly, under .vpcs, under .data, or error (empty)
          const kVpcs: KrutrimVpc[] =
            Array.isArray(vpcD) ? vpcD :
            Array.isArray(vpcD?.vpcs) ? vpcD.vpcs :
            Array.isArray(vpcD?.data) ? vpcD.data : [];
          setKrutrimVpcs(kVpcs);

          const keys: KrutrimSshKey[] =
            Array.isArray(keysD?.items) ? keysD.items :
            Array.isArray(keysD?.ssh_keys) ? keysD.ssh_keys :
            Array.isArray(keysD?.keys) ? keysD.keys :
            Array.isArray(keysD?.data) ? keysD.data :
            Array.isArray(keysD) ? keysD : [];
          setSshKeys((p) => ({ ...p, krutrim: keys }));
        }).catch(() => {
          setKrutrimVpcs([]);
          setSshKeys((p) => ({ ...p, krutrim: [] }));
        })
      );
    } else {
      setKrutrimVpcs([]);
      setKrutrimSubnets([]);
      setSshKeys((p) => ({ ...p, krutrim: [] }));
    }

    await Promise.all(tasks);
    setLoadingOS(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadRegionData(regionObj);
  }, [regionObj.label]); // eslint-disable-line react-hooks/exhaustive-deps

  // When Krutrim VPC is selected load its subnets
  useEffect(() => {
    if (!config.vpcId || !regionObj.krutrimRegion) { setKrutrimSubnets([]); return; }
    safeFetch(`/api/proxy/krutrim/v1/highlvlvpc/search_subnet?vpc_id=${config.vpcId}`, {
      headers: krutrimHeaders(regionObj.krutrimRegion),
    }).then((d) => {
      const subnets: KrutrimSubnet[] = Array.isArray(d?.networks) ? d.networks
        : Array.isArray(d?.data) ? d.data : [];
      setKrutrimSubnets(subnets);
      if (subnets.length && !config.subnetId) patch({ subnetId: subnets[0].krn });
    }).catch(() => setKrutrimSubnets([]));
  }, [config.vpcId, regionObj.krutrimRegion]); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(partial: Partial<UnifiedDeployConfig>) {
    setConfig((p) => ({ ...p, ...partial }));
  }

  function handleOSChange(osName: string) {
    const cat = e2eCategories.find((c) => c.OS === osName);
    patch({ osName, osVersion: cat?.version[0]?.version ?? "" });
  }

  // Merged OS list (E2E canonical + Utho distros + Krutrim images)
  const osOptions: string[] = [];
  e2eCategories.forEach((c) => {
    if (!["SQLWEB", "SQLSTANDARD"].includes(c.OS) && !osOptions.includes(c.OS)) osOptions.push(c.OS);
  });
  uthoOptions?.distro?.forEach((d) => {
    if (!osOptions.includes(d.distribution)) osOptions.push(d.distribution);
  });
  KRUTRIM_IMAGES.forEach((img) => {
    if (!osOptions.includes(img.os)) osOptions.push(img.os);
  });
  const versionsForOS = e2eCategories.find((c) => c.OS === config.osName)?.version ?? [];

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────

  async function goToStep2() {
    if (!config.hostname.trim())                              { toast.error("Please enter a hostname."); return; }
    if (!config.osName)                                       { toast.error("Please select an OS."); return; }
    if (config.authMethod === "password" && !config.password) { toast.error("Please enter a root password."); return; }

    setStep(2);
    setLoadingOffers(true);
    setOffers([]);
    setSelectedOffer(null);
    setCommittedSkuId(null);

    const results: ProviderOffer[] = [];

    // Utho
    if (regionObj.uthoSlug) {
      try {
        const opts: DeployOptions = uthoOptions ??
          await fetch(`/api/proxy/utho/cloud/getdeploy?dcslug=${regionObj.uthoSlug}`).then((r) => r.json());
        for (const plan of matchUthoPlans(opts.plans ?? [], config)) {
          const ramGb = parseInt(plan.ram) / 1024;
          results.push({
            providerId: "utho",
            providerName: "Utho Cloud",
            planId: plan.id,
            planLabel: `${plan.cpu} vCPU · ${ramGb} GB RAM · ${plan.disk && plan.disk !== "0" ? plan.disk + " GB SSD" : "EBS"}`,
            cpu: parseInt(plan.cpu), ramGb,
            diskGb: parseInt(plan.disk) || config.diskGb,
            priceMonthly: plan.price,
            priceHourly: plan.price / (24 * 30),
            currency: plan.currencyprefix ?? "Rs.",
            raw: { plan, opts },
          });
        }
      } catch { /* unavailable */ }
    }

    // E2E
    if (regionObj.e2eLoc) {
      try {
        const q = new URLSearchParams({
          category: config.osName, os: config.osName, osversion: config.osVersion,
          display_category: DEFAULT_DISPLAY_CAT, location: regionObj.e2eLoc,
        });
        const d = await fetch(`/api/proxy/e2e/images/?${q}`).then((r) => r.json());
        const imgs: E2EImage[] = d?.data ?? [];
        for (const img of matchE2EImages(imgs, config)) {
          results.push({
            providerId: "e2e",
            providerName: "E2E Networks",
            planId: img.plan,
            planLabel: `${img.specs.cpu} vCPU · ${img.specs.ram} GB RAM · ${img.specs.disk_space} GB SSD`,
            cpu: img.specs.cpu, ramGb: parseFloat(img.specs.ram),
            diskGb: img.specs.disk_space,
            priceMonthly: img.specs.price_per_month,
            priceHourly: img.specs.price_per_hour,
            currency: "Rs.",
            committedOptions: img.specs.committed_sku?.map((sku) => ({
              skuId: sku.committed_sku_id,
              days: sku.committed_days,
              price: sku.committed_sku_price,
              savings: Math.round((1 - sku.committed_sku_price / (img.specs.price_per_month * sku.committed_days / 30)) * 100),
            })),
            raw: { image: img, location: regionObj.e2eLoc },
          });
        }
      } catch { /* unavailable */ }
    }

    // Krutrim
    if (regionObj.krutrimRegion) {
      const matched = matchKrutrimType(config);
      if (matched) {
        const kImage = findKrutrimImage(config.osName, config.osVersion);
        results.push({
          providerId: "krutrim",
          providerName: "Krutrim Cloud",
          planId: matched.id,
          planLabel: `${matched.cpu} vCPU · ${matched.ramGb} GB RAM · ${matched.diskGb} GB SSD`,
          cpu: matched.cpu, ramGb: matched.ramGb, diskGb: matched.diskGb,
          priceMonthly: matched.priceMonthly,
          priceHourly: matched.priceHourly,
          currency: "Rs.",
          raw: { instanceType: matched, image: kImage, region: regionObj.krutrimRegion },
        });
      }
    }

    setOffers(results);
    if (results.length) setSelectedOffer(results[0]);
    setLoadingOffers(false);
  }

  // ── Step 2 → 3 ───────────────────────────────────────────────────────────

  function goToStep3() {
    if (!selectedOffer) { toast.error("Please select a cloud provider."); return; }
    setStep(3);
  }

  // ── Deploy ────────────────────────────────────────────────────────────────

  async function handleDeploy() {
    if (!selectedOffer) return;
    setDeploying(true);
    try {
      if (selectedOffer.providerId === "utho") {
        const { plan, opts } = selectedOffer.raw as { plan: Plan; opts: DeployOptions };
        const distroGroup = opts.distro?.find((d) => d.distribution === config.osName);
        const image = distroGroup?.images.find((i) => i.version === config.osVersion)?.image
          ?? opts.distro?.[0]?.images?.[0]?.image ?? "";
        const payload = {
          dcslug: regionObj.uthoSlug,
          planid: plan.id,
          billingcycle: config.billingCycle,
          auth: config.authMethod === "password" ? "option1" : "option2",
          ...(config.authMethod === "password" ? { root_password: config.password } : { sshkeys: config.sshKeyIds.join(",") }),
          enable_publicip: config.enablePublicIp ? "true" : "false",
          cpumodel: config.cpuModel,
          ...(config.firewallId ? { firewall: config.firewallId } : {}),
          enablebackup: "false", image,
          cloud: [{ hostname: config.hostname }],
        };
        const res = await fetch("/api/proxy/utho/cloud/deploy", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data?.status === "error") throw new Error(data?.message ?? "Deploy failed");
        toast.success("Instance deployed on Utho Cloud!");
        router.push("/utho");

      } else if (selectedOffer.providerId === "e2e") {
        const { image, location } = selectedOffer.raw as { image: E2EImage; location: E2ELocation };
        const billingType = committedSkuId ? "committed" : "on_demand";
        const payload = {
          name: config.hostname, plan: image.plan, image: image.image, location,
          project_id: DEFAULT_PROJECT_ID,
          ssh_keys: config.sshKeyIds.map(Number).filter(Boolean),
          disable_password: config.sshKeyIds.length > 0,
          default_public_ip: config.enablePublicIp, reserve_ip: "", is_ipv6_availed: false,
          ...(config.firewallId ? { security_group_id: Number(config.firewallId) } : {}),
          ...(config.vpcId ? { vpc_id: Number(config.vpcId) } : {}),
          number_of_instances: 1, label: "default", backups: false,
          start_scripts: [], is_saved_image: false, enable_bitninja: false,
          billing_type: billingType,
          ...(billingType === "committed" && committedSkuId ? { committed_sku_id: committedSkuId } : {}),
        };
        const res = await fetch(`/api/proxy/e2e/nodes?location=${location}&project_id=${DEFAULT_PROJECT_ID}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.code !== 200 && data?.code !== 201) throw new Error(data?.errors ?? data?.message ?? "Deploy failed");
        toast.success("Node deployed on E2E Networks!");
        router.push("/e2e");

      } else {
        // Krutrim
        const { instanceType, image, region: kRegion } = selectedOffer.raw as {
          instanceType: KrutrimInstanceType;
          image: { krn: string };
          region: KrutrimRegion;
        };
        if (!config.vpcId)    throw new Error("Please select a VPC for Krutrim.");
        if (!config.subnetId) throw new Error("Please select a subnet for Krutrim.");

        const payload = {
          instanceName: config.hostname,
          image_krn: image.krn,
          instanceType: instanceType.id,
          network_id: config.vpcId,
          security_groups: config.firewallId ? [config.firewallId] : [],
          sshkey_name: config.sshKeyName,
          subnet_id: config.subnetId,
          vpc_id: config.vpcId,
          region: kRegion,
          volumetype: "standard",
          volume_size: config.diskGb,
          floating_ip: config.enablePublicIp,
          delete_on_termination: true,
        };
        const res = await fetch("/api/proxy/krutrim/vm/v1/create_instance", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-region": kRegion },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.message ?? data?.error ?? "Deploy failed");
        toast.success("Instance deployed on Krutrim Cloud!");
        router.push("/");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }

  const billingOpt = BILLING_OPTIONS.find((o) => o.key === config.billingCycle) ?? BILLING_OPTIONS[1];

  function fmtPrice(offer: ProviderOffer) {
    if (billingOpt.key === "hourly") return `Rs.${offer.priceHourly.toFixed(3)}/hr`;
    return `Rs.${(offer.priceMonthly * billingOpt.multiplier).toLocaleString("en-IN", { maximumFractionDigits: 0 })}${billingOpt.suffix}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
          <Link href="/" className="text-zinc-400 hover:text-zinc-900 transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <Stepper current={step} />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {step === 1 && (
          <Step1
            config={config} patch={patch} loadingOS={loadingOS}
            osOptions={osOptions} versionsForOS={versionsForOS}
            sshKeys={sshKeys} onOSChange={handleOSChange} onNext={goToStep2}
          />
        )}
        {step === 2 && (
          <Step2
            config={config} offers={offers} loading={loadingOffers}
            selected={selectedOffer}
            onSelect={(o) => { setSelectedOffer(o); setCommittedSkuId(null); }}
            onBack={() => setStep(1)} onNext={goToStep3}
          />
        )}
        {step === 3 && selectedOffer && (
          <Step3
            config={config} patch={patch} offer={selectedOffer}
            billingOpt={billingOpt} fmtPrice={fmtPrice}
            committedSkuId={committedSkuId} onCommittedSkuChange={setCommittedSkuId}
            securityGroups={securityGroups} vpcs={vpcs}
            krutrimVpcs={krutrimVpcs} krutrimSubnets={krutrimSubnets}
            sshKeys={sshKeys}
            uthoFirewalls={uthoOptions?.firewalls ?? []}
            onBack={() => setStep(2)} onDeploy={handleDeploy} deploying={deploying}
          />
        )}
      </div>
    </div>
  );
}

// ─── shared UI primitives ─────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-white border border-zinc-200 rounded-2xl p-6", className)}>{children}</div>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-zinc-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
        selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:border-zinc-500"
      )}>
      {label}
    </button>
  );
}

function NavRow({ onBack, onNext, nextLabel, nextDisabled, loading }: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-6 mt-2 border-t border-zinc-100">
      {onBack ? (
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      ) : <div />}
      <Button type="button" onClick={onNext} disabled={nextDisabled || loading} className="gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {nextLabel}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  );
}

function SpecPill({ label }: { label: string }) {
  return <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg">{label}</span>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-400 flex-shrink-0 text-sm">{label}</span>
      <span className="text-zinc-900 font-medium text-right truncate max-w-[130px] text-sm">{value}</span>
    </div>
  );
}

// Provider badge colours
const PROVIDER_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  utho:    { bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  e2e:     { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400"   },
  krutrim: { bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-400" },
};

// ─── Step 1: Configure ────────────────────────────────────────────────────────

function Step1({
  config, patch, loadingOS, osOptions, versionsForOS, sshKeys, onOSChange, onNext,
}: {
  config: UnifiedDeployConfig;
  patch: (p: Partial<UnifiedDeployConfig>) => void;
  loadingOS: boolean;
  osOptions: string[];
  versionsForOS: { version: string }[];
  sshKeys: { utho: { id: string; name: string }[]; e2e: E2ESshKey[]; krutrim: KrutrimSshKey[] };
  onOSChange: (os: string) => void;
  onNext: () => void;
}) {
  const allSshKeys = [
    ...sshKeys.utho.map((k) => ({ id: k.id, name: `${k.name} (Utho)` })),
    ...sshKeys.e2e.map((k) => ({ id: String(k.id), name: `${k.name} (E2E)` })),
    ...sshKeys.krutrim.map((k) => ({ id: k.key_name, name: `${k.key_name} (Krutrim)` })),
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-zinc-900">Configure your instance</h1>
        <p className="text-zinc-500 text-sm mt-1">Fill in your requirements — we'll match the best plan across all clouds.</p>
      </div>

      {/* Region */}
      <Card>
        <SectionTitle icon={Globe} title="Region" subtitle="Choose your data center location" />
        <div className="flex flex-wrap gap-3">
          {REGIONS.map((r) => {
            const sel = config.region === r.label;
            const providers = [r.uthoSlug && "Utho", r.e2eLoc && "E2E", r.krutrimRegion && "Krutrim"].filter(Boolean).join(", ");
            return (
              <button key={r.label} type="button"
                onClick={() => patch({ region: r.label, firewallId: "", vpcId: "", subnetId: "" })}
                className={cn(
                  "relative flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-all",
                  sel ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-400"
                )}>
                <Icon icon="twemoji:flag-india" className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-zinc-900 leading-tight">{r.label}</p>
                  <p className="text-[10px] text-zinc-400 leading-tight">{providers}</p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" />
                {sel && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* OS */}
      <Card>
        <SectionTitle icon={HardDrive} title="Operating System" subtitle="Select OS and version" />
        {loadingOS ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : osOptions.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">No OS options for this region.</p>
        ) : (
          <>
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 mb-5">
              {osOptions.map((os) => (
                <button key={os} type="button" onClick={() => onOSChange(os)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-sm transition-all",
                    config.osName === os ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400 bg-white"
                  )}>
                  <Icon icon={OS_ICONS[os] ?? "mdi:disc"} className="w-7 h-7" />
                  <p className="text-[10px] font-medium text-zinc-900 text-center leading-tight">{os}</p>
                </button>
              ))}
            </div>
            {versionsForOS.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Version</span>
                {versionsForOS.map((v) => (
                  <Pill key={v.version} label={v.version}
                    selected={config.osVersion === v.version}
                    onClick={() => patch({ osVersion: v.version })} />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Resources */}
      <Card>
        <SectionTitle icon={Server} title="Resources" subtitle="Desired specs — closest plan matched per provider" />
        <div className="space-y-5">
          {([
            { label: "vCPU", key: "cpu" as const, opts: CPU_OPTIONS, fmt: (v: number) => String(v) },
            { label: "RAM (GB)", key: "ramGb" as const, opts: RAM_OPTIONS, fmt: (v: number) => `${v} GB` },
            { label: "Disk (GB)", key: "diskGb" as const, opts: DISK_OPTIONS, fmt: (v: number) => `${v} GB` },
          ] as const).map(({ label, key, opts, fmt }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {opts.map((v) => (
                  <Pill key={v} label={fmt(v)} selected={config[key] === v} onClick={() => patch({ [key]: v })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Auth */}
      <Card>
        <SectionTitle icon={Key} title="Authentication" subtitle="How you'll access the instance" />
        <div className="flex gap-2 mb-4">
          {(["password", "sshkeys"] as const).map((m) => (
            <button key={m} type="button" onClick={() => patch({ authMethod: m })}
              className={cn(
                "px-5 py-2.5 rounded-xl border text-sm font-medium transition-all",
                config.authMethod === m ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:border-zinc-500"
              )}>
              {m === "password" ? "Root Password" : "SSH Keys"}
            </button>
          ))}
        </div>
        {config.authMethod === "password" ? (
          <Input type="password" placeholder="Enter root password"
            value={config.password} onChange={(e) => patch({ password: e.target.value })} className="max-w-sm" />
        ) : allSshKeys.length === 0 ? (
          <p className="text-sm text-zinc-400">No SSH keys found — add keys in your provider account.</p>
        ) : (
          <div className="space-y-2">
            {allSshKeys.map((k) => (
              <label key={k.id} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={config.sshKeyIds.includes(k.id)}
                  onChange={() => patch({
                    sshKeyIds: config.sshKeyIds.includes(k.id)
                      ? config.sshKeyIds.filter((id) => id !== k.id)
                      : [...config.sshKeyIds, k.id],
                    sshKeyName: k.id, // Krutrim uses key_name
                  })}
                  className="w-4 h-4 rounded border-zinc-300 accent-zinc-900" />
                <span className="text-sm text-zinc-700 group-hover:text-zinc-900">{k.name}</span>
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* Hostname */}
      <Card>
        <SectionTitle icon={Server} title="Hostname" subtitle="Name for your instance" />
        <div className="flex gap-3 items-center">
          <Input value={config.hostname} onChange={(e) => patch({ hostname: e.target.value })}
            placeholder="my-server" className="max-w-xs" />
          <button type="button" onClick={() => patch({ hostname: generateHostname() })}
            className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
            Randomise
          </button>
        </div>
      </Card>

      <NavRow onNext={onNext} nextLabel="Find matching plans" loading={loadingOS} />
    </div>
  );
}

// ─── Step 2: Choose Cloud ─────────────────────────────────────────────────────

function Step2({
  config, offers, loading, selected, onSelect, onBack, onNext,
}: {
  config: UnifiedDeployConfig;
  offers: ProviderOffer[];
  loading: boolean;
  selected: ProviderOffer | null;
  onSelect: (o: ProviderOffer) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const billingOpt = BILLING_OPTIONS.find((o) => o.key === config.billingCycle) ?? BILLING_OPTIONS[1];
  function fmt(offer: ProviderOffer) {
    if (billingOpt.key === "hourly") return `Rs.${offer.priceHourly.toFixed(3)}/hr`;
    return `Rs.${(offer.priceMonthly * billingOpt.multiplier).toLocaleString("en-IN", { maximumFractionDigits: 0 })}${billingOpt.suffix}`;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Choose your cloud</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Best matching plan for {config.cpu} vCPU · {config.ramGb} GB RAM · {config.osName} {config.osVersion} in {config.region}
        </p>
      </div>

      {loading ? (
        <Card className="py-20 flex flex-col items-center gap-3 text-zinc-400">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm">Fetching plans across clouds…</p>
        </Card>
      ) : offers.length === 0 ? (
        <Card className="py-20 text-center text-zinc-400 text-sm">
          No matching plans found for this region and configuration.
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const sel = selected?.planId === offer.planId && selected?.providerId === offer.providerId;
            const style = PROVIDER_STYLES[offer.providerId] ?? PROVIDER_STYLES.utho;
            return (
              <button key={`${offer.providerId}-${offer.planId}`} type="button"
                onClick={() => onSelect(offer)}
                className={cn(
                  "w-full text-left border rounded-2xl p-5 transition-all",
                  sel ? "border-zinc-900 shadow-lg bg-white ring-1 ring-zinc-900/5" : "border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm"
                )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      sel ? "border-zinc-900 bg-zinc-900" : "border-zinc-300"
                    )}>
                      {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-zinc-900">{offer.providerName}</p>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide", style.bg, style.text)}>
                          {offer.providerId}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">{offer.planLabel}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xl font-bold text-zinc-900">{fmt(offer)}</p>
                    <p className="text-xs text-zinc-400">on-demand</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap pl-9">
                  <SpecPill label={`${offer.cpu} vCPU`} />
                  <SpecPill label={`${offer.ramGb} GB RAM`} />
                  <SpecPill label={`${offer.diskGb} GB SSD`} />
                  {offer.committedOptions && offer.committedOptions.length > 0 && (
                    <span className="text-[10px] font-medium bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-lg">
                      Committed plans available
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <NavRow onBack={onBack} onNext={onNext} nextLabel="Configure provider settings"
        nextDisabled={!selected || loading} />
    </div>
  );
}

// ─── Step 3: Provider-specific + deploy ───────────────────────────────────────

function Step3({
  config, patch, offer, billingOpt, fmtPrice,
  committedSkuId, onCommittedSkuChange,
  securityGroups, vpcs, krutrimVpcs, krutrimSubnets, sshKeys, uthoFirewalls,
  onBack, onDeploy, deploying,
}: {
  config: UnifiedDeployConfig;
  patch: (p: Partial<UnifiedDeployConfig>) => void;
  offer: ProviderOffer;
  billingOpt: (typeof BILLING_OPTIONS)[number];
  fmtPrice: (o: ProviderOffer) => string;
  committedSkuId: number | null;
  onCommittedSkuChange: (id: number | null) => void;
  securityGroups: E2ESecurityGroup[];
  vpcs: E2EVPC[];
  krutrimVpcs: KrutrimVpc[];
  krutrimSubnets: KrutrimSubnet[];
  sshKeys: { utho: { id: string; name: string }[]; e2e: E2ESshKey[]; krutrim: KrutrimSshKey[] };
  uthoFirewalls: { id: string; name: string }[];
  onBack: () => void;
  onDeploy: () => void;
  deploying: boolean;
}) {
  const isUtho    = offer.providerId === "utho";
  const isE2E     = offer.providerId === "e2e";
  const isKrutrim = offer.providerId === "krutrim";
  const style     = PROVIDER_STYLES[offer.providerId] ?? PROVIDER_STYLES.utho;

  const activeSku  = offer.committedOptions?.find((s) => s.skuId === committedSkuId);
  const displayPrice = activeSku
    ? `Rs.${activeSku.price.toLocaleString("en-IN")} / ${activeSku.days} days`
    : fmtPrice(offer);

  return (
    <div className="flex gap-8 items-start">
      {/* Left settings */}
      <div className="flex-1 min-w-0 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", style.bg, style.text)}>
              {offer.providerName}
            </span>
            <h1 className="text-2xl font-bold text-zinc-900">Provider settings</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Configure {offer.providerName}-specific options before deploying.
          </p>
        </div>

        {/* ── UTHO ── */}
        {isUtho && (
          <>
            <Card>
              <SectionTitle icon={Clock} title="Billing Cycle" subtitle="Choose how you're billed" />
              <div className="flex flex-wrap gap-3">
                {BILLING_OPTIONS.map((opt) => (
                  <button key={opt.key} type="button"
                    onClick={() => patch({ billingCycle: opt.key as BillingCycle })}
                    className={cn(
                      "relative flex flex-col gap-0.5 px-4 py-3 rounded-xl border text-sm transition-all min-w-[90px]",
                      config.billingCycle === opt.key ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-400"
                    )}>
                    {opt.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {opt.badge}
                      </span>
                    )}
                    <span className="font-medium text-zinc-900">{opt.label}</span>
                    <span className="text-[11px] text-zinc-500">{opt.sublabel}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle icon={Cpu} title="CPU Architecture" subtitle="Preferred CPU vendor" />
              <div className="flex gap-3">
                {(["amd", "intel"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => patch({ cpuModel: m })}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium transition-all",
                      config.cpuModel === m ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:border-zinc-500"
                    )}>
                    <Cpu className="w-4 h-4" /> {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </Card>

            {uthoFirewalls.length > 0 && (
              <Card>
                <SectionTitle icon={Shield} title="Firewall" subtitle="Attach a firewall rule set (optional)" />
                <div className="flex flex-wrap gap-2">
                  <Pill label="None" selected={!config.firewallId} onClick={() => patch({ firewallId: "" })} />
                  {uthoFirewalls.map((fw) => (
                    <Pill key={fw.id} label={fw.name} selected={config.firewallId === fw.id}
                      onClick={() => patch({ firewallId: fw.id })} />
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <SectionTitle icon={Database} title="Storage Volumes" subtitle="Additional EBS volumes" />
              <div className="space-y-2 mb-3">
                {config.volumes.map((vol, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                      vol.isRoot ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700")}>
                      {vol.isRoot ? "Root" : "EBS"}
                    </span>
                    <span className="text-sm text-zinc-700 flex-1">{vol.size} GB · {vol.type.toUpperCase()}</span>
                    {!vol.isRoot && (
                      <button type="button"
                        onClick={() => patch({ volumes: config.volumes.filter((_, j) => j !== i) })}
                        className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button"
                onClick={() => patch({ volumes: [...config.volumes, { size: 50, type: "ssd", isRoot: false }] })}
                className="w-full text-sm text-zinc-500 hover:text-zinc-900 border border-dashed border-zinc-300 hover:border-zinc-500 py-2.5 rounded-xl transition-colors">
                + Add Volume
              </button>
            </Card>
          </>
        )}

        {/* ── E2E ── */}
        {isE2E && (
          <>
            <Card>
              <SectionTitle icon={Clock} title="Billing Plan" subtitle="On-demand or committed savings" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <button type="button" onClick={() => onCommittedSkuChange(null)}
                  className={cn("text-left p-4 rounded-xl border transition-all",
                    committedSkuId === null ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400")}>
                  <p className="font-semibold text-zinc-900 text-sm">On-Demand</p>
                  <p className="text-zinc-900 mt-2 font-bold">Rs.{offer.priceHourly.toFixed(3)}<span className="text-xs font-normal text-zinc-500">/hr</span></p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Rs.{offer.priceMonthly.toLocaleString("en-IN")}/mo</p>
                </button>
                {offer.committedOptions?.map((sku) => (
                  <button key={sku.skuId} type="button" onClick={() => onCommittedSkuChange(sku.skuId)}
                    className={cn("relative text-left p-4 rounded-xl border transition-all",
                      committedSkuId === sku.skuId ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400")}>
                    {sku.savings > 0 && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        Save {sku.savings}%
                      </span>
                    )}
                    <p className="font-semibold text-zinc-900 text-sm">
                      {sku.days === 1095 ? "36 Month" : sku.days === 365 ? "12 Month" : sku.days === 183 ? "6 Month" : "3 Month"}
                    </p>
                    <p className="text-zinc-900 mt-2 font-bold text-sm">Rs.{sku.price.toLocaleString("en-IN")}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">/{sku.days} days</p>
                  </button>
                ))}
              </div>
            </Card>

            {securityGroups.length > 0 && (
              <Card>
                <SectionTitle icon={Shield} title="Security Group" subtitle="Firewall rules (optional)" />
                <div className="flex flex-wrap gap-2">
                  <Pill label="None" selected={!config.firewallId} onClick={() => patch({ firewallId: "" })} />
                  {securityGroups.map((sg) => (
                    <Pill key={sg.id} label={sg.name} selected={config.firewallId === String(sg.id)}
                      onClick={() => patch({ firewallId: String(sg.id) })} />
                  ))}
                </div>
              </Card>
            )}

            {vpcs.length > 0 && (
              <Card>
                <SectionTitle icon={Network} title="VPC" subtitle="Attach to a private network (optional)" />
                <div className="flex flex-wrap gap-2">
                  <Pill label="None" selected={!config.vpcId} onClick={() => patch({ vpcId: "" })} />
                  {vpcs.map((vpc) => (
                    <button key={vpc.id} type="button" onClick={() => patch({ vpcId: String(vpc.id) })}
                      className={cn("flex flex-col items-start px-3 py-2 rounded-xl border text-sm transition-all",
                        config.vpcId === String(vpc.id) ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400")}>
                      <span className="font-medium text-zinc-900">{vpc.name}</span>
                      {vpc.cidr && <span className="text-[10px] text-zinc-400">{vpc.cidr}</span>}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {sshKeys.e2e.length > 0 && (
              <Card>
                <SectionTitle icon={Key} title="SSH Keys" subtitle="Additional key-based access" />
                <div className="space-y-2">
                  {sshKeys.e2e.map((k) => (
                    <label key={k.id} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={config.sshKeyIds.includes(String(k.id))}
                        onChange={() => patch({
                          sshKeyIds: config.sshKeyIds.includes(String(k.id))
                            ? config.sshKeyIds.filter((id) => id !== String(k.id))
                            : [...config.sshKeyIds, String(k.id)],
                        })}
                        className="w-4 h-4 rounded border-zinc-300 accent-zinc-900" />
                      <span className="text-sm text-zinc-700 group-hover:text-zinc-900">{k.name}</span>
                    </label>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── KRUTRIM ── */}
        {isKrutrim && (
          <>
            {/* VPC */}
            <Card>
              <SectionTitle icon={Network} title="VPC" subtitle="Select the VPC for your instance — required" />
              {krutrimVpcs.length === 0 ? (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-[10px] font-black">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">No VPCs found in this region</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      You need to create a VPC in your Krutrim account before deploying.
                    </p>
                    <a href="https://cloud.olakrutrim.com" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">
                      Open Krutrim Console →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {krutrimVpcs.map((vpc) => (
                    <button key={vpc.krn} type="button"
                      onClick={() => patch({ vpcId: vpc.krn, subnetId: "" })}
                      className={cn("flex flex-col items-start px-3 py-2.5 rounded-xl border text-sm transition-all",
                        config.vpcId === vpc.krn ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400")}>
                      <span className="font-medium text-zinc-900">{vpc.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px]">{vpc.krn}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Subnet */}
            {config.vpcId && (
              <Card>
                <SectionTitle icon={Network} title="Subnet" subtitle="Select subnet within the VPC — required" />
                {krutrimSubnets.length === 0 ? (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading subnets…
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {krutrimSubnets.map((sn) => (
                      <button key={sn.krn} type="button" onClick={() => patch({ subnetId: sn.krn })}
                        className={cn("flex flex-col items-start px-3 py-2.5 rounded-xl border text-sm transition-all",
                          config.subnetId === sn.krn ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400")}>
                        <span className="font-medium text-zinc-900">{sn.name}</span>
                        {sn.cidr && <span className="text-[10px] text-zinc-400">{sn.cidr}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* SSH Key for Krutrim — name-based */}
            {sshKeys.krutrim.length > 0 && (
              <Card>
                <SectionTitle icon={Key} title="SSH Key" subtitle="Select the SSH key to inject (required)" />
                <div className="flex flex-wrap gap-2">
                  {sshKeys.krutrim.map((k) => (
                    <button key={k.key_name} type="button" onClick={() => patch({ sshKeyName: k.key_name })}
                      className={cn("px-3 py-2 rounded-xl border text-sm transition-all",
                        config.sshKeyName === k.key_name ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400")}>
                      {k.key_name}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Volume size */}
            <Card>
              <SectionTitle icon={Database} title="Root Volume Size" subtitle="Boot volume size in GB" />
              <div className="flex flex-wrap gap-2">
                {DISK_OPTIONS.map((v) => (
                  <Pill key={v} label={`${v} GB`} selected={config.diskGb === v} onClick={() => patch({ diskGb: v })} />
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Shared: public IP */}
        <Card>
          <SectionTitle icon={Network} title="Networking" subtitle="Public IP assignment" />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={config.enablePublicIp}
              onChange={(e) => patch({ enablePublicIp: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-300 accent-zinc-900" />
            <div>
              <p className="text-sm font-medium text-zinc-900">Enable Public IP</p>
              <p className="text-xs text-zinc-500">Assign a public IPv4 address to this instance</p>
            </div>
          </label>
        </Card>

        <NavRow onBack={onBack} onNext={onDeploy}
          nextLabel={deploying ? "Deploying…" : `Deploy on ${offer.providerName}`}
          loading={deploying} />
      </div>

      {/* Right: cost summary */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 sticky top-20 space-y-4">
          <div className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg", style.bg, style.text)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
            {offer.providerName}
          </div>

          <div className="space-y-2">
            <SummaryRow label="Region" value={config.region} />
            <SummaryRow label="OS" value={`${config.osName} ${config.osVersion}`.trim()} />
            <SummaryRow label="Plan" value={offer.planLabel} />
            <SummaryRow label="Hostname" value={config.hostname} />
            {isUtho && <SummaryRow label="Billing" value={BILLING_OPTIONS.find((o) => o.key === config.billingCycle)?.label ?? ""} />}
            {isE2E && <SummaryRow label="Billing" value={committedSkuId ? "Committed" : "On-Demand"} />}
            {isKrutrim && <SummaryRow label="Billing" value="On-Demand" />}
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Estimated cost</p>
            <p className="text-2xl font-bold text-zinc-900">{displayPrice}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Rs.{offer.priceHourly.toFixed(4)}/hr</p>
          </div>

          <Button className="w-full" size="lg" type="button" onClick={onDeploy} disabled={deploying}>
            {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</> : "Deploy Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
