"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, Loader2,
  Globe, HardDrive, Server, Shield, Key, Cpu, Network, Database, ChevronDown, Clock, Search,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BILLING_OPTIONS } from "@/components/deploy/BillingCycleSelector";
import type {
  UnifiedDeployConfig, ProviderOffer,
  UthoProviderConfig, E2EProviderConfig, KrutrimProviderConfig,
} from "@/lib/deploy/types";
import type { DeployOptions, Plan } from "@/lib/providers/utho/types";
import type { E2EImage, E2EOSCategory, E2ESshKey, E2ESecurityGroup, E2EVPC, E2ELocation } from "@/lib/providers/e2e/types";
import {
  KRUTRIM_INSTANCE_TYPES,
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

const REGIONS = [
  { label: "Mumbai",    uthoSlug: "inmumbaizone2" as string | null,    e2eLoc: null as E2ELocation | null,       krutrimRegion: null as KrutrimRegion | null },
  { label: "Delhi NCR", uthoSlug: "innoidazone1" as string | null,     e2eLoc: "Delhi" as E2ELocation | null,    krutrimRegion: null as KrutrimRegion | null },
  { label: "Chennai",   uthoSlug: "inchennaizone1" as string | null,   e2eLoc: "Chennai" as E2ELocation | null,  krutrimRegion: null as KrutrimRegion | null },
  { label: "Bangalore", uthoSlug: "inbangalorezone1" as string | null, e2eLoc: null as E2ELocation | null,       krutrimRegion: "In-Bangalore-1" as KrutrimRegion | null },
  { label: "Hyderabad", uthoSlug: null as string | null,               e2eLoc: null as E2ELocation | null,       krutrimRegion: "In-Hyderabad-1" as KrutrimRegion | null },
];

const PROVIDER_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  utho:    { bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  e2e:     { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400"   },
  krutrim: { bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-400" },
};

const PROVIDER_NAMES: Record<string, string> = {
  utho: "Utho Cloud", e2e: "E2E Networks", krutrim: "Krutrim Cloud",
};

const PROVIDER_ORDER: Array<keyof typeof PROVIDER_NAMES> = ["utho", "e2e", "krutrim"];

function generateHostname() {
  return `node-${Math.random().toString(36).substring(2, 8)}`;
}

async function safeFetch(url: string, opts?: RequestInit) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    const text = await res.text();
    try { return JSON.parse(text); } catch { return null; }
  } catch { return null; }
}

function krutrimHeaders(region: KrutrimRegion): Record<string, string> {
  return { "x-region": region };
}

// ─── Offer building (AWS-style: pick instance type from list) ──────────────────

function uthoOfferFromPlan(plan: Plan): ProviderOffer {
  const ramGb = parseInt(plan.ram) / 1024;
  return {
    providerId: "utho",
    providerName: "Utho Cloud",
    planId: plan.id,
    planLabel: `${plan.cpu} vCPU · ${ramGb} GB RAM · ${plan.disk && plan.disk !== "0" ? plan.disk + " GB SSD" : "EBS"}`,
    cpu: parseInt(plan.cpu),
    ramGb,
    diskGb: parseInt(plan.disk) || 0,
    priceMonthly: plan.price,
    priceHourly: plan.price / (24 * 30),
    currency: plan.currencyprefix ?? "Rs.",
    raw: { plan },
  };
}

function e2eOfferFromImage(img: E2EImage, location: E2ELocation): ProviderOffer {
  return {
    providerId: "e2e",
    providerName: "E2E Networks",
    planId: img.plan,
    planLabel: `${img.specs.cpu} vCPU · ${img.specs.ram} GB RAM · ${img.specs.disk_space} GB SSD`,
    cpu: img.specs.cpu,
    ramGb: parseFloat(img.specs.ram),
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
    raw: { image: img, location },
  };
}

function krutrimOfferFromType(t: KrutrimInstanceType, region: KrutrimRegion): ProviderOffer {
  return {
    providerId: "krutrim",
    providerName: "Krutrim Cloud",
    planId: t.id,
    planLabel: `${t.name} · ${t.cpu} vCPU · ${t.ramGb} GB RAM · ${t.diskGb} GB SSD`,
    cpu: t.cpu,
    ramGb: t.ramGb,
    diskGb: t.diskGb,
    priceMonthly: t.priceMonthly,
    priceHourly: t.priceHourly,
    currency: "Rs.",
    raw: { instanceType: t, region },
  };
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function DeployPage() {
  const router = useRouter();

  // ── Common config (Step 1) ────────────────────────────────────────────────
  const [config, setConfig] = useState<UnifiedDeployConfig>({
    region: "Mumbai",
    osName: "Ubuntu", osVersion: "22.04",
    cpu: 2, ramGb: 4, diskGb: 80,
    billingCycle: "monthly",
    authMethod: "sshkeys", password: "",
    hostname: generateHostname(),
  });

  // ── Per-provider config (Step 3) ─────────────────────────────────────────
  const [uthoConfig, setUthoConfig] = useState<UthoProviderConfig>({
    cpuModel: "amd", sshKeyIds: [], firewallId: "", enablePublicIp: true,
    volumes: [{ size: 80, type: "nvme", isRoot: true }],
  });
  const [e2eConfig, setE2eConfig] = useState<E2EProviderConfig>({
    sshKeyIds: [], securityGroupId: "", vpcId: "", enablePublicIp: true, committedSkuId: null,
  });
  const [krutrimConfig, setKrutrimConfig] = useState<KrutrimProviderConfig>({
    imageKrn: "", vpcId: "", subnetId: "", sshKeyName: "", enablePublicIp: true,
  });

  // ── Region / provider data ────────────────────────────────────────────────
  const [e2eCategories, setE2eCategories]   = useState<E2EOSCategory[]>([]);
  const [uthoOptions, setUthoOptions]       = useState<DeployOptions | null>(null);
  const [loadingOS, setLoadingOS]           = useState(true);

  // SSH keys per provider
  const [uthoSshKeys, setUthoSshKeys]       = useState<{ id: string; name: string }[]>([]);
  const [e2eSshKeys, setE2eSshKeys]         = useState<E2ESshKey[]>([]);
  const [krutrimSshKeys, setKrutrimSshKeys] = useState<KrutrimSshKey[]>([]);

  // E2E networking
  const [e2eSecurityGroups, setE2eSecurityGroups] = useState<E2ESecurityGroup[]>([]);
  const [e2eVpcs, setE2eVpcs]                     = useState<E2EVPC[]>([]);

  // Krutrim networking + images
  const [krutrimVpcs, setKrutrimVpcs]       = useState<KrutrimVpc[]>([]);
  const [krutrimSubnets, setKrutrimSubnets] = useState<KrutrimSubnet[]>([]);
  const [krutrimImages, setKrutrimImages]   = useState<{ krn: string; name: string }[]>([]);

  // ── Offers (Step 2) ───────────────────────────────────────────────────────
  const [offers, setOffers]               = useState<ProviderOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<ProviderOffer | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const regionObj = REGIONS.find((r) => r.label === config.region) ?? REGIONS[0];
  const billingOpt = BILLING_OPTIONS.find((o) => o.key === config.billingCycle) ?? BILLING_OPTIONS[1];

  // ── Load region data when region changes ─────────────────────────────────

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
          setE2eSshKeys(Array.isArray(keysD?.data) ? keysD.data : []);
          setE2eSecurityGroups(Array.isArray(sgD?.data) ? sgD.data : []);
          setE2eVpcs(Array.isArray(vpcD?.data) ? vpcD.data : []);
        })
      );
    } else {
      setE2eCategories([]);
      setE2eSshKeys([]);
      setE2eSecurityGroups([]);
      setE2eVpcs([]);
    }

    if (region.uthoSlug) {
      tasks.push(
        fetch(`/api/proxy/utho/cloud/getdeploy?dcslug=${region.uthoSlug}`)
          .then((r) => r.ok ? r.json() : null)
          .then((d: DeployOptions | null) => {
            setUthoOptions(d);
            setUthoSshKeys(d?.keys ?? []);
          })
          .catch(() => { setUthoOptions(null); setUthoSshKeys([]); })
      );
    } else {
      setUthoOptions(null);
      setUthoSshKeys([]);
    }

    if (region.krutrimRegion) {
      tasks.push(
        Promise.all([
          safeFetch("/api/proxy/krutrim/v1/highlvlvpc/search_vpc", {
            headers: krutrimHeaders(region.krutrimRegion),
          }),
          safeFetch("/api/proxy/krutrim/v2/sshkeys/list", {
            headers: krutrimHeaders(region.krutrimRegion),
          }).catch(() => null),
          safeFetch(`/api/proxy/krutrim/vm/v1/image/${region.krutrimRegion}`, {
            headers: krutrimHeaders(region.krutrimRegion),
          }).catch(() => null),
        ]).then(([vpcD, keysD, imgD]) => {
          const kVpcs: KrutrimVpc[] =
            Array.isArray(vpcD?.vpc_doc) ? vpcD.vpc_doc :
            Array.isArray(vpcD)          ? vpcD          :
            Array.isArray(vpcD?.vpcs)    ? vpcD.vpcs     :
            Array.isArray(vpcD?.data)    ? vpcD.data     : [];
          setKrutrimVpcs(kVpcs);

          type RawKey = { key_name?: string; keyName?: string; name?: string };
          const rawKeys: RawKey[] =
            Array.isArray(keysD?.sshKeys)  ? keysD.sshKeys  :
            Array.isArray(keysD?.ssh_keys) ? keysD.ssh_keys :
            Array.isArray(keysD?.items)    ? keysD.items    :
            Array.isArray(keysD?.keys)     ? keysD.keys     :
            Array.isArray(keysD?.data)     ? keysD.data     :
            Array.isArray(keysD)           ? keysD          : [];
          setKrutrimSshKeys(rawKeys.map((k) => ({ key_name: k.keyName ?? k.key_name ?? k.name ?? "" })));

          type RawImg = { krn_id?: string; krn?: string; name?: string; image_name?: string };
          const rawImgs: RawImg[] =
            Array.isArray(imgD)          ? imgD          :
            Array.isArray(imgD?.images)  ? imgD.images   :
            Array.isArray(imgD?.data)    ? imgD.data     : [];
          const imgs = rawImgs.map((img) => ({
            krn:  img.krn_id ?? img.krn ?? "",
            name: img.name ?? img.image_name ?? "",
          }));
          setKrutrimImages(imgs);
          // Auto-select first image
          if (imgs.length) setKrutrimConfig((p) => ({ ...p, imageKrn: p.imageKrn || imgs[0].krn }));
        }).catch(() => {
          setKrutrimVpcs([]);
          setKrutrimSshKeys([]);
          setKrutrimImages([]);
        })
      );
    } else {
      setKrutrimVpcs([]);
      setKrutrimSubnets([]);
      setKrutrimSshKeys([]);
      setKrutrimImages([]);
    }

    await Promise.all(tasks);
    setLoadingOS(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      void loadRegionData(regionObj);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [loadRegionData, regionObj]);

  // Load Krutrim subnets when VPC is selected
  useEffect(() => {
    let cancelled = false;

    if (!krutrimConfig.vpcId || !regionObj.krutrimRegion) {
      const t = setTimeout(() => {
        if (cancelled) return;
        setKrutrimSubnets([]);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    void safeFetch(`/api/proxy/krutrim/v1/highlvlvpc/search_subnet?vpc_id=${krutrimConfig.vpcId}`, {
      headers: krutrimHeaders(regionObj.krutrimRegion),
    }).then((d) => {
      if (cancelled) return;
      type RawSn = { krn_id?: string; krn?: string; name?: string; cidr?: string };
      const raw: RawSn[] =
        Array.isArray(d?.subnet_doc) ? d.subnet_doc :
        Array.isArray(d?.subnets)    ? d.subnets    :
        Array.isArray(d?.networks)   ? d.networks   :
        Array.isArray(d?.data)       ? d.data       :
        Array.isArray(d)             ? d            : [];
      const subnets: KrutrimSubnet[] = raw.map((s) => ({
        krn:  s.krn_id ?? s.krn ?? "",
        name: s.name ?? "",
        cidr: s.cidr,
      }));
      setKrutrimSubnets(subnets);
      if (subnets.length && !krutrimConfig.subnetId) {
        setKrutrimConfig((p) => ({ ...p, subnetId: subnets[0].krn }));
      }
    }).catch(() => {
      if (cancelled) return;
      setKrutrimSubnets([]);
    });

    return () => { cancelled = true; };
  }, [krutrimConfig.vpcId, krutrimConfig.subnetId, regionObj.krutrimRegion]);

  // ── OS list — merged from all available providers for the selected region ──

  const osOptions: string[] = [];

  // E2E: has full OS category list with versions
  e2eCategories.forEach((c) => {
    if (!["SQLWEB", "SQLSTANDARD"].includes(c.OS) && !osOptions.includes(c.OS)) osOptions.push(c.OS);
  });

  // Utho: distro groups each have a distribution name
  uthoOptions?.distro?.forEach((d) => {
    if (d.distribution && !osOptions.includes(d.distribution)) osOptions.push(d.distribution);
  });

  // Krutrim: extract OS name from image name (e.g. "ubuntu-server22.04-..." → "Ubuntu")
  krutrimImages.forEach((img) => {
    const lower = img.name.toLowerCase();
    const osName =
      lower.includes("ubuntu")  ? "Ubuntu"    :
      lower.includes("debian")  ? "Debian"    :
      lower.includes("centos")  ? "CentOS"    :
      lower.includes("rocky")   ? "RockyLinux":
      lower.includes("alma")    ? "AlmaLinux" :
      lower.includes("windows") ? "Windows"   : null;
    if (osName && !osOptions.includes(osName)) osOptions.push(osName);
  });

  // Versions: E2E is the canonical source; Utho distro images as fallback
  const versionsForOS: { version: string }[] =
    e2eCategories.find((c) => c.OS === config.osName)?.version ??
    (uthoOptions?.distro?.find((d) => d.distribution === config.osName)?.images.map((i) => ({ version: i.version })) ?? []);

  function handleOSChange(osName: string) {
    const e2eCat = e2eCategories.find((c) => c.OS === osName);
    const uthoDist = uthoOptions?.distro?.find((d) => d.distribution === osName);
    const firstVersion =
      e2eCat?.version[0]?.version ??
      uthoDist?.images[0]?.version ??
      "";
    setConfig((p) => ({ ...p, osName, osVersion: firstVersion }));
  }

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────

  async function refreshOffers() {
    // AWS-like behavior: users can browse instance types without completing
    // hostname/password first. We'll validate those on Launch.
    if (!config.osName) { toast.error("Please select an OS."); return; }
    if (!config.osVersion) { toast.error("Please select an OS version."); return; }

    setLoadingOffers(true);
    setOffers([]);

    const results: ProviderOffer[] = [];

    // Utho
    if (regionObj.uthoSlug) {
      try {
        const opts: DeployOptions = uthoOptions ??
          await fetch(`/api/proxy/utho/cloud/getdeploy?dcslug=${regionObj.uthoSlug}`).then((r) => r.json());
        const available = (opts.plans ?? []).filter((p) => p.is_available === "YES");
        available.forEach((p) => results.push({ ...uthoOfferFromPlan(p), raw: { plan: p, opts } }));
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
        imgs.forEach((img) => results.push(e2eOfferFromImage(img, regionObj.e2eLoc)));
      } catch { /* unavailable */ }
    }

    // Krutrim
    if (regionObj.krutrimRegion) {
      KRUTRIM_INSTANCE_TYPES.forEach((t) => results.push(krutrimOfferFromType(t, regionObj.krutrimRegion)));
    }

    // Sort like AWS instance type list: smallest → largest, then cheapest
    const sorted = [...results].sort((a, b) => {
      const ca = a.cpu - b.cpu;
      if (ca !== 0) return ca;
      const ra = a.ramGb - b.ramGb;
      if (ra !== 0) return ra;
      return a.priceHourly - b.priceHourly;
    });

    setOffers(sorted);
    setSelectedOffer((prev) => {
      if (!sorted.length) return null;
      if (!prev) return sorted[0];
      const stillExists = sorted.some((o) => o.providerId === prev.providerId && o.planId === prev.planId);
      return stillExists ? prev : sorted[0];
    });
    setLoadingOffers(false);
  }

  // Auto-refresh instance types when region/OS changes (AWS-like).
  useEffect(() => {
    if (loadingOS) return;
    if (!config.osName || !config.osVersion) return;
    if (loadingOffers) return;
    const t = setTimeout(() => { void refreshOffers(); }, 250);
    return () => clearTimeout(t);
  }, [loadingOS, config.region, config.osName, config.osVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Deploy ────────────────────────────────────────────────────────────────

  const [deploying, setDeploying] = useState(false);

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
          auth: "option2",
          sshkeys: uthoConfig.sshKeyIds.join(","),
          enable_publicip: uthoConfig.enablePublicIp ? "true" : "false",
          cpumodel: uthoConfig.cpuModel,
          ...(uthoConfig.firewallId ? { firewall: uthoConfig.firewallId } : {}),
          enablebackup: "false",
          image,
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
        const billingType = e2eConfig.committedSkuId ? "committed" : "on_demand";
        const payload = {
          name: config.hostname,
          plan: image.plan,
          image: image.image,
          location,
          project_id: DEFAULT_PROJECT_ID,
          ssh_keys: e2eConfig.sshKeyIds.map(Number).filter(Boolean),
          disable_password: true,
          default_public_ip: e2eConfig.enablePublicIp,
          reserve_ip: "",
          is_ipv6_availed: false,
          ...(e2eConfig.securityGroupId ? { security_group_id: Number(e2eConfig.securityGroupId) } : {}),
          ...(e2eConfig.vpcId ? { vpc_id: Number(e2eConfig.vpcId) } : {}),
          number_of_instances: 1,
          label: "default",
          backups: false,
          start_scripts: [],
          is_saved_image: false,
          enable_bitninja: false,
          billing_type: billingType,
          ...(billingType === "committed" && e2eConfig.committedSkuId
            ? { committed_sku_id: e2eConfig.committedSkuId } : {}),
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
        const { instanceType, region: kRegion } = selectedOffer.raw as {
          instanceType: KrutrimInstanceType;
          region: KrutrimRegion;
        };
        if (!krutrimConfig.imageKrn)  throw new Error("Please select an OS image.");
        if (!krutrimConfig.vpcId)     throw new Error("Please select a VPC.");
        if (!krutrimConfig.subnetId)  throw new Error("Please select a subnet.");
        // Krutrim supports SSH key based access; password is not required here.

        const payload: Record<string, unknown> = {
          instanceName:          config.hostname,
          image_krn:             krutrimConfig.imageKrn,
          instanceType:          instanceType.id,
          subnet_id:             krutrimConfig.subnetId,
          vpc_id:                krutrimConfig.vpcId,
          network_id:            krutrimConfig.vpcId,
          region:                kRegion,
          volumetype:            "standard",
          volume_size:           config.diskGb,
          floating_ip:           krutrimConfig.enablePublicIp,
          delete_on_termination: true,
          user_data:             "",
          security_groups:       [],
          sshkey_name:           krutrimConfig.sshKeyName || "",
          count:                 1,
        };
        console.log("Krutrim payload:", JSON.stringify(payload, null, 2));
        const res = await fetch("/api/proxy/krutrim/vm/v1/create_instance", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-region": kRegion },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        const errMsg = data?.message ?? data?.error ?? "Deploy failed";
        console.log("Krutrim response:", res.status, JSON.stringify(data, null, 2));
        if (!res.ok || data?.error) throw new Error(errMsg);
        toast.success("Instance deployed on Krutrim Cloud!");
        router.push("/");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }

  function fmtPrice(offer: ProviderOffer) {
    if (billingOpt.key === "hourly") return `Rs.${offer.priceHourly.toFixed(3)}/hr`;
    return `Rs.${(offer.priceMonthly * billingOpt.multiplier).toLocaleString("en-IN", { maximumFractionDigits: 0 })}${billingOpt.suffix}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#141920] text-[#e8eef6]">
      <header className="bg-[#141920] border-b border-white/15 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-[#e8eef6] hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#e8eef6] truncate">Launch an instance</p>
              <p className="text-xs text-[#e8eef6] truncate">AWS-like flow, powered by India clouds</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-[#141920] text-[#e8eef6] hover:bg-[#161d26]"
              onClick={refreshOffers}
              disabled={loadingOS || loadingOffers}
            >
              {loadingOffers ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Compare clouds
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div className="space-y-6 min-w-0">
            <Step1
              config={config} setConfig={setConfig}
              loadingOS={loadingOS}
              osOptions={osOptions} versionsForOS={versionsForOS}
              onOSChange={handleOSChange}
            />

            <Step2
              offers={offers}
              loading={loadingOffers}
              selected={selectedOffer}
              onSelect={(o) => {
                setSelectedOffer(o);
                setE2eConfig((p) => ({ ...p, committedSkuId: null }));
                setConfig((prev) => ({
                  ...prev,
                  cpu: o.cpu,
                  ramGb: o.ramGb,
                  diskGb: o.diskGb || prev.diskGb,
                }));
              }}
              onCompare={refreshOffers}
            />

            {selectedOffer && (
              <Step3
                offer={selectedOffer}
                // Utho
                uthoConfig={uthoConfig} setUthoConfig={setUthoConfig}
                uthoSshKeys={uthoSshKeys}
                uthoFirewalls={uthoOptions?.firewalls ?? []}
                // E2E
                e2eConfig={e2eConfig} setE2eConfig={setE2eConfig}
                e2eSshKeys={e2eSshKeys}
                e2eSecurityGroups={e2eSecurityGroups} e2eVpcs={e2eVpcs}
                // Krutrim
                krutrimConfig={krutrimConfig} setKrutrimConfig={setKrutrimConfig}
                krutrimSshKeys={krutrimSshKeys}
                krutrimVpcs={krutrimVpcs} krutrimSubnets={krutrimSubnets} krutrimImages={krutrimImages}
              />
            )}
          </div>

          <LaunchSidebar
            config={config}
            billingOptLabel={billingOpt.label}
            offer={selectedOffer}
            fmtPrice={(o) => fmtPrice(o)}
            e2eIsCommitted={Boolean(e2eConfig.committedSkuId)}
            deploying={deploying}
            onDeploy={handleDeploy}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-[#161d26] border border-white/15 rounded-xl p-5", className)}>{children}</div>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 bg-[#141920] rounded-lg flex items-center justify-center flex-shrink-0 border border-white/15">
        <Icon className="w-4 h-4 text-[#e8eef6]" />
      </div>
      <div>
        <p className="font-semibold text-[#e8eef6]">{title}</p>
        <p className="text-xs text-[#e8eef6] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
        selected
          ? "border-[#3da4e8] bg-[#141920] text-[#e8eef6]"
          : "border-white/15 bg-[#141920] text-[#e8eef6] hover:border-white/30"
      )}>
      {label}
    </button>
  );
}

function formatOfferPricing(offer: ProviderOffer): string[] {
  const lines = [
    `On-Demand base pricing: Rs.${offer.priceMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`,
    `Hourly pricing: Rs.${offer.priceHourly.toFixed(4)}/hr`,
  ];
  const committed = offer.committedOptions?.[0];
  if (committed) {
    lines.push(
      `Committed (${committed.days} days): Rs.${committed.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo`
    );
  }
  return lines;
}

function InstanceTypeDetails({
  offer,
  showBadge = true,
}: {
  offer: ProviderOffer;
  showBadge?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-[#e8eef6] text-sm leading-snug">{offer.planLabel}</p>
        {showBadge && (
          <span className="text-[11px] text-[#9aa4b2] whitespace-nowrap flex-shrink-0 pt-0.5">
            {offer.providerName}
          </span>
        )}
      </div>
      <p className="text-xs text-[#9aa4b2] mt-1 leading-relaxed">
        Provider: {offer.providerName}
        {" · "}
        {offer.cpu} vCPU
        {" · "}
        {offer.ramGb} GiB Memory
        {offer.diskGb ? ` · ${offer.diskGb} GiB Storage` : ""}
      </p>
      <div className="mt-2 space-y-0.5">
        {formatOfferPricing(offer).map((line) => (
          <p key={line} className="text-xs text-[#9aa4b2] leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#e8eef6] flex-shrink-0 text-sm">{label}</span>
      <span className="text-[#e8eef6] font-medium text-right truncate max-w-[130px] text-sm">{value}</span>
    </div>
  );
}

function LaunchSidebar({
  config,
  billingOptLabel,
  offer,
  fmtPrice,
  e2eIsCommitted,
  deploying,
  onDeploy,
}: {
  config: UnifiedDeployConfig;
  billingOptLabel: string;
  offer: ProviderOffer | null;
  fmtPrice: (o: ProviderOffer) => string;
  e2eIsCommitted: boolean;
  deploying: boolean;
  onDeploy: () => void;
}) {
  const style = offer ? (PROVIDER_STYLES[offer.providerId] ?? PROVIDER_STYLES.utho) : null;

  const canDeploy = Boolean(offer) && Boolean(config.hostname.trim()) && Boolean(config.osName);

  return (
    <div className="sticky top-20 space-y-4">
      <div className="bg-[#161d26] border border-white/20 rounded-xl p-5 space-y-4">
        {offer ? (
          <div className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg", style?.bg, style?.text)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", style?.dot)} />
            {offer.providerName}
          </div>
        ) : (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#141920] text-[#e8eef6] border border-white/15">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            Choose a cloud
          </div>
        )}

        <div className="space-y-2">
          <SummaryRow label="Region" value={config.region} />
          <SummaryRow label="OS" value={`${config.osName} ${config.osVersion}`.trim()} />
          <SummaryRow label="Specs" value={`${config.cpu} vCPU · ${config.ramGb} GB`} />
          <SummaryRow label="Disk" value={`${config.diskGb} GB`} />
          <SummaryRow label="Hostname" value={config.hostname} />
          {offer?.providerId === "utho" && <SummaryRow label="Billing" value={billingOptLabel} />}
          {offer?.providerId === "e2e" && <SummaryRow label="Billing" value={e2eIsCommitted ? "Committed" : "On-Demand"} />}
          {offer?.providerId === "krutrim" && <SummaryRow label="Billing" value="On-Demand" />}
        </div>

        <div className="border-t border-white/15 pt-4">
          <p className="text-[11px] font-semibold text-[#e8eef6] uppercase tracking-wide mb-1">Estimated cost</p>
          <p className="text-2xl font-bold text-[#e8eef6]">{offer ? fmtPrice(offer) : "—"}</p>
          {offer && <p className="text-xs text-[#e8eef6] mt-0.5">Rs.{offer.priceHourly.toFixed(4)}/hr</p>}
        </div>

        {!offer && (
          <div className="text-xs text-[#e8eef6]">
            Click <span className="font-semibold text-[#e8eef6]">Compare clouds</span> to fetch matching plans.
          </div>
        )}

        <Button
          className="w-full bg-[#ff9902] text-white hover:bg-[#e88a02] border border-[#ff9902] focus-visible:ring-[#ff9902] focus-visible:ring-offset-0 disabled:opacity-50"
          size="lg"
          type="button"
          onClick={onDeploy}
          disabled={!canDeploy || deploying}
        >
          {deploying ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Launching…</> : "Launch instance"}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 1: Configure (provider-agnostic) ────────────────────────────────────

function Step1({
  config, setConfig, loadingOS, osOptions, versionsForOS, onOSChange,
}: {
  config: UnifiedDeployConfig;
  setConfig: React.Dispatch<React.SetStateAction<UnifiedDeployConfig>>;
  loadingOS: boolean;
  osOptions: string[];
  versionsForOS: { version: string }[];
  onOSChange: (os: string) => void;
}) {
  const [showMoreOS, setShowMoreOS] = useState(false);
  function patch(p: Partial<UnifiedDeployConfig>) { setConfig((prev) => ({ ...prev, ...p })); }

  const quickStartOrder = ["Ubuntu", "Debian", "Windows", "RedHat"];
  const quickStart = quickStartOrder.filter((os) => osOptions.includes(os)).slice(0, 4);
  const remaining = osOptions.filter((os) => !quickStart.includes(os));

  return (
    <div className="space-y-6">

      {/* Hostname */}
      <Card>
        <SectionTitle icon={Server} title="Name and tags" subtitle="Name for your instance" />
        <div className="flex gap-3 items-center">
          <Input
            value={config.hostname}
            onChange={(e) => patch({ hostname: e.target.value })}
            placeholder="my-web-server"
            className="max-w-sm bg-[#141920] border-white/20 text-[#e8eef6] placeholder:text-[#e8eef6]/50 focus:ring-[#3da4e8] focus:ring-offset-0"
          />
          <button type="button" onClick={() => patch({ hostname: generateHostname() })}
            className="text-xs text-[#e8eef6] hover:text-white underline underline-offset-2 transition-colors">
            Randomise
          </button>
        </div>
      </Card>

      {/* Region */}
      <Card>
        <SectionTitle icon={Globe} title="Region" subtitle="Choose your data center location" />
        <div className="flex flex-wrap gap-3">
          {REGIONS.map((r) => {
            const sel = config.region === r.label;
            const providers = [r.uthoSlug && "Utho", r.e2eLoc && "E2E", r.krutrimRegion && "Krutrim"].filter(Boolean).join(", ");
            return (
              <button key={r.label} type="button"
                onClick={() => patch({ region: r.label })}
                className={cn(
                  "relative flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm transition-all",
                  sel ? "border-[#3da4e8] bg-[#141920] shadow-sm" : "border-white/20 bg-[#141920] hover:border-white/35"
                )}>
                <Icon icon="twemoji:flag-india" className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-[#e8eef6] leading-tight">{r.label}</p>
                  <p className="text-[10px] text-[#e8eef6] leading-tight">{providers}</p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" />
                {sel && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#3da4e8] rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#141920]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* OS */}
      <Card>
        <SectionTitle icon={HardDrive} title="Application and OS Images" subtitle="Quick start (expand for more)" />
        {loadingOS ? (
          <div className="flex items-center gap-2 text-[#e8eef6] text-sm py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : osOptions.length === 0 ? (
          <p className="text-sm text-[#e8eef6] text-center py-4">No OS options for this region.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs font-semibold text-[#e8eef6] uppercase tracking-wide">Quick start</p>
              {remaining.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMoreOS((v) => !v)}
                  className="text-xs text-[#e8eef6] hover:text-white font-semibold"
                >
                  {showMoreOS ? "Show less" : `Show more (${remaining.length})`}
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {quickStart.map((os) => (
                <button key={os} type="button" onClick={() => onOSChange(os)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    config.osName === os ? "border-[#3da4e8] bg-[#141920] shadow-sm" : "border-white/20 hover:border-white/35 bg-[#141920]"
                  )}>
                  <Icon icon={OS_ICONS[os] ?? "mdi:disc"} className="w-5 h-5" />
                  <p className="text-xs font-semibold text-[#e8eef6] leading-tight">{os}</p>
                </button>
              ))}
            </div>

            {showMoreOS && remaining.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                {remaining.map((os) => (
                  <button key={os} type="button" onClick={() => onOSChange(os)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                      config.osName === os ? "border-[#3da4e8] bg-[#141920] shadow-sm" : "border-white/20 hover:border-white/35 bg-[#141920]"
                    )}>
                    <Icon icon={OS_ICONS[os] ?? "mdi:disc"} className="w-4 h-4" />
                    <p className="text-xs font-medium text-[#e8eef6]">{os}</p>
                  </button>
                ))}
              </div>
            )}

            {versionsForOS.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#e8eef6] uppercase tracking-wide">Version</span>
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

    </div>
  );
}

// ─── Step 2: Choose provider + plan ───────────────────────────────────────────

function Step2({
  offers, loading, selected, onSelect, onCompare,
}: {
  offers: ProviderOffer[];
  loading: boolean;
  selected: ProviderOffer | null;
  onSelect: (o: ProviderOffer) => void;
  onCompare: () => void;
}) {
  const providerCounts = PROVIDER_ORDER.reduce((acc, pid) => {
    acc[pid] = offers.filter((o) => o.providerId === pid).length;
    return acc;
  }, {} as Record<(typeof PROVIDER_ORDER)[number], number>);

  const [activeProvider, setActiveProvider] = useState<"utho" | "e2e" | "krutrim" | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (activeProvider === "all") return;
    if (providerCounts[activeProvider] > 0) return;
    const t = setTimeout(() => {
      setActiveProvider("all");
      if (offers[0]) onSelect(offers[0]);
    }, 0);
    return () => clearTimeout(t);
  }, [activeProvider, providerCounts, offers, onSelect]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-instance-type-root]")) return;
      setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const filtered = offers.filter((o) => {
    if (activeProvider !== "all" && o.providerId !== activeProvider) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.planLabel.toLowerCase().includes(q) ||
      o.providerName.toLowerCase().includes(q) ||
      `${o.cpu}`.includes(q) ||
      `${o.ramGb}`.includes(q)
    );
  });

  return (
    <Card>
      <SectionTitle icon={Server} title="Instance type" subtitle="Select provider + instance type (AWS-style)" />

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-[#e8eef6]">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm">Fetching plans across clouds…</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[#e8eef6]">No instance types loaded yet.</p>
          <Button type="button" onClick={onCompare}>Compare clouds</Button>
          <p className="text-xs text-[#e8eef6]">We’ll fetch instance types for your region and OS.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveProvider("all");
                  if (offers[0]) onSelect(offers[0]);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                  activeProvider === "all"
                    ? "bg-[#141920] text-[#e8eef6] border-[#3da4e8]"
                    : "bg-[#141920] text-[#e8eef6] border-white/20 hover:border-white/35"
                )}
              >
                All clouds
              </button>
              {PROVIDER_ORDER.map((pid) => {
                const disabled = providerCounts[pid] === 0;
                const isActive = activeProvider === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setActiveProvider(pid);
                      const next = offers.find((o) => o.providerId === pid);
                      if (next) onSelect(next);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                      disabled
                        ? "bg-[#161d26] text-[#e8eef6]/40 border-white/10 cursor-not-allowed"
                        : isActive
                          ? "bg-[#141920] text-[#e8eef6] border-[#3da4e8]"
                          : "bg-[#141920] text-[#e8eef6] border-white/20 hover:border-white/35"
                    )}
                    title={disabled ? "Not available for this region/OS" : ""}
                  >
                    {PROVIDER_NAMES[pid]}
                    <span className={cn(
                      "ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      disabled ? "bg-[#141920] text-[#e8eef6]/40 border border-white/10" : "bg-[#141920] text-[#e8eef6]/80 border border-white/10"
                    )}>
                      {providerCounts[pid]}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button type="button" variant="outline" className="border-white/20 bg-[#141920] text-[#e8eef6] hover:bg-[#161d26]" onClick={onCompare}>
              Refresh
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#e8eef6]">Instance type</p>
            <div
              data-instance-type-root
              className={cn(
                "rounded-lg border bg-[#141920] overflow-hidden transition-colors",
                open ? "border-[#3da4e8]" : "border-white/20 hover:border-white/30"
              )}
            >
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left"
              >
                {selected ? (
                  <InstanceTypeDetails offer={selected} />
                ) : (
                  <p className="text-sm text-[#9aa4b2] py-1">Choose an instance type</p>
                )}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-[#3da4e8] flex-shrink-0 mt-1 transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>

              {open && (
                <>
                  <div className="px-3 pb-3 border-t border-white/10">
                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aa4b2] pointer-events-none" />
                      <Input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter instance types"
                        className="pl-9 bg-[#141920] border-[#3da4e8] text-[#e8eef6] placeholder:text-[#9aa4b2] focus:ring-[#3da4e8] focus:ring-offset-0"
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#9aa4b2]">
                      {filtered.length} instance type{filtered.length === 1 ? "" : "s"} available
                    </p>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto border-t border-white/10">
                    {filtered.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-[#9aa4b2] text-center">No matches</div>
                    ) : (
                      filtered.slice(0, 120).map((offer) => {
                        const sel =
                          selected?.planId === offer.planId && selected?.providerId === offer.providerId;
                        return (
                          <button
                            key={`${offer.providerId}-${offer.planId}`}
                            type="button"
                            onClick={() => {
                              onSelect(offer);
                              setOpen(false);
                              setSearch("");
                            }}
                            className={cn(
                              "w-full px-4 py-3 text-left border-b border-white/10 last:border-0 transition-colors",
                              sel ? "bg-[#161d26]" : "hover:bg-[#161d26]/60"
                            )}
                          >
                            <InstanceTypeDetails offer={offer} />
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── Step 3: Provider-specific settings + deploy ──────────────────────────────

function Step3({
  offer,
  uthoConfig, setUthoConfig, uthoSshKeys, uthoFirewalls,
  e2eConfig, setE2eConfig, e2eSshKeys, e2eSecurityGroups, e2eVpcs,
  krutrimConfig, setKrutrimConfig, krutrimSshKeys, krutrimVpcs, krutrimSubnets, krutrimImages,
}: {
  offer: ProviderOffer;
  uthoConfig: UthoProviderConfig;
  setUthoConfig: React.Dispatch<React.SetStateAction<UthoProviderConfig>>;
  uthoSshKeys: { id: string; name: string }[];
  uthoFirewalls: { id: string; name: string }[];
  e2eConfig: E2EProviderConfig;
  setE2eConfig: React.Dispatch<React.SetStateAction<E2EProviderConfig>>;
  e2eSshKeys: E2ESshKey[];
  e2eSecurityGroups: E2ESecurityGroup[];
  e2eVpcs: E2EVPC[];
  krutrimConfig: KrutrimProviderConfig;
  setKrutrimConfig: React.Dispatch<React.SetStateAction<KrutrimProviderConfig>>;
  krutrimSshKeys: KrutrimSshKey[];
  krutrimVpcs: KrutrimVpc[];
  krutrimSubnets: KrutrimSubnet[];
  krutrimImages: { krn: string; name: string }[];
}) {
  const isUtho    = offer.providerId === "utho";
  const isE2E     = offer.providerId === "e2e";
  const isKrutrim = offer.providerId === "krutrim";

  function patchUtho(p: Partial<UthoProviderConfig>)     { setUthoConfig((prev) => ({ ...prev, ...p })); }
  function patchE2E(p: Partial<E2EProviderConfig>)       { setE2eConfig((prev) => ({ ...prev, ...p })); }
  function patchKrutrim(p: Partial<KrutrimProviderConfig>) { setKrutrimConfig((prev) => ({ ...prev, ...p })); }

  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPrivatePem, setNewKeyPrivatePem] = useState<string | null>(null);
  const [creatingKeyBusy, setCreatingKeyBusy] = useState(false);

  async function generateRsaKeyPair(): Promise<{ publicKeyOpenSsh: string; privateKeyPem: string }> {
    // Browser WebCrypto: generate RSA key, export public as OpenSSH "ssh-rsa"
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );

    const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    function ab2b64(buf: ArrayBuffer) {
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin);
    }

    function pem(label: string, buf: ArrayBuffer) {
      const b64 = ab2b64(buf);
      const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
      return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
    }

    // Convert SPKI -> OpenSSH ssh-rsa by extracting modulus/exponent from JWK
    const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey) as JsonWebKey;
    const nB64 = jwk.n ?? "";
    const eB64 = jwk.e ?? "";
    if (!nB64 || !eB64) throw new Error("Failed to export JWK for public key.");

    function b64UrlToBytes(s: string) {
      const pad = "=".repeat((4 - (s.length % 4)) % 4);
      const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }

    function u32be(n: number) {
      const b = new Uint8Array(4);
      b[0] = (n >>> 24) & 0xff;
      b[1] = (n >>> 16) & 0xff;
      b[2] = (n >>> 8) & 0xff;
      b[3] = n & 0xff;
      return b;
    }

    function sshString(bytes: Uint8Array) {
      return new Uint8Array([...u32be(bytes.length), ...bytes]);
    }

    const type = new TextEncoder().encode("ssh-rsa");
    const e = b64UrlToBytes(eB64);
    const n = b64UrlToBytes(nB64);

    // If MSB set, prefix 0x00 to indicate positive integer in mpint
    function mpint(x: Uint8Array) {
      if (x.length === 0) return sshString(new Uint8Array([0]));
      if (x[0] & 0x80) return sshString(new Uint8Array([0, ...x]));
      return sshString(x);
    }

    const blob = new Uint8Array([
      ...sshString(type),
      ...mpint(e),
      ...mpint(n),
    ]);

    const publicKeyOpenSsh = `ssh-rsa ${ab2b64(blob.buffer)} ${newKeyName || "key"}`.trim();
    const privateKeyPem = pem("PRIVATE KEY", pkcs8);
    return { publicKeyOpenSsh, privateKeyPem };
  }

  async function createKeyPair() {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key pair name.");
      return;
    }
    setCreatingKeyBusy(true);
    try {
      const { publicKeyOpenSsh, privateKeyPem } = await generateRsaKeyPair();
      setNewKeyPrivatePem(privateKeyPem);

      if (offer.providerId === "utho") {
        const res = await fetch("/api/proxy/utho/key/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newKeyName.trim(), key: publicKeyOpenSsh }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.status === "error") throw new Error(data?.message ?? "Failed to add SSH key to Utho.");
        // Refresh keys list (region data fetch already populates)
        toast.success("Key pair created for Utho. Download your private key below.");
      } else if (offer.providerId === "e2e") {
        // E2E docs indicate POST /ssh_keys with { label, ssh_key, project_id, location }
        const location = (offer.raw as { location?: E2ELocation })?.location;
        if (!location) throw new Error("Missing E2E location.");
        const res = await fetch(`/api/proxy/e2e/ssh-keys?location=${location}&project_id=${DEFAULT_PROJECT_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: newKeyName.trim(),
            ssh_key: publicKeyOpenSsh,
            project_id: String(DEFAULT_PROJECT_ID),
            location,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data?.code && data.code !== 200 && data.code !== 201)) {
          throw new Error(data?.message ?? data?.errors ?? "Failed to add SSH key to E2E.");
        }
        toast.success("Key pair created for E2E. Download your private key below.");
      } else {
        // Krutrim: docs suggest SSH keys are managed in console; API may be unavailable.
        toast.error("Krutrim key creation via API is not available yet. Please create/upload the key in Krutrim Console and refresh.");
      }

      setCreatingKey(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create key pair");
    } finally {
      setCreatingKeyBusy(false);
    }
  }

  function downloadPrivateKey() {
    if (!newKeyPrivatePem) return;
    const blob = new Blob([newKeyPrivatePem], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${newKeyName || "key"}.pem`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* ── Key pair (login) ─────────────────────────────────── */}
      <Card>
        <SectionTitle icon={Key} title="Key pair (login)" subtitle="Create or select an SSH key" />

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#e8eef6]">
            Your private key is generated locally and never uploaded. We only upload the public key to the selected cloud.
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 bg-[#141920] text-[#e8eef6] hover:bg-[#161d26]"
            onClick={() => setCreatingKey((v) => !v)}
          >
            {creatingKey ? "Close" : "Create new key pair"}
          </Button>
        </div>

        {creatingKey && (
          <div className="mt-4 rounded-lg border border-white/15 bg-[#141920] p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <p className="text-xs font-semibold text-[#e8eef6] uppercase tracking-wide mb-1">Key pair name</p>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="my-keypair"
                  className="bg-[#141920] border-white/20 text-[#e8eef6] placeholder:text-[#e8eef6]/50 focus:ring-[#3da4e8] focus:ring-offset-0"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={createKeyPair} disabled={creatingKeyBusy} className="flex-1">
                  {creatingKeyBusy ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating…</> : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-[#141920] text-[#e8eef6] hover:bg-[#161d26]"
                  onClick={downloadPrivateKey}
                  disabled={!newKeyPrivatePem}
                >
                  Download
                </Button>
              </div>
            </div>
            <p className="text-xs text-[#e8eef6]">
              After download, keep the `.pem` safe. You won’t be able to retrieve it again.
            </p>
          </div>
        )}

        {/* Provider-specific key selection */}
        {isUtho && (
          <div className="mt-4">
            {uthoSshKeys.length === 0 ? (
              <p className="text-sm text-[#e8eef6]">No SSH keys found for Utho in this region.</p>
            ) : (
              <div className="space-y-2">
                {uthoSshKeys.map((k) => (
                  <label key={k.id} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={uthoConfig.sshKeyIds.includes(k.id)}
                      onChange={() => patchUtho({
                        sshKeyIds: uthoConfig.sshKeyIds.includes(k.id)
                          ? uthoConfig.sshKeyIds.filter((id) => id !== k.id)
                          : [...uthoConfig.sshKeyIds, k.id],
                      })}
                      className="w-4 h-4 rounded border-white/20 bg-[#141920] accent-[#3da4e8]" />
                    <span className="text-sm text-[#e8eef6] group-hover:text-white">{k.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {isE2E && (
          <div className="mt-4">
            {e2eSshKeys.length === 0 ? (
              <p className="text-sm text-[#e8eef6]">No SSH keys found for E2E in this region.</p>
            ) : (
              <div className="space-y-2">
                {e2eSshKeys.map((k) => (
                  <label key={k.id} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={e2eConfig.sshKeyIds.includes(String(k.id))}
                      onChange={() => patchE2E({
                        sshKeyIds: e2eConfig.sshKeyIds.includes(String(k.id))
                          ? e2eConfig.sshKeyIds.filter((id) => id !== String(k.id))
                          : [...e2eConfig.sshKeyIds, String(k.id)],
                      })}
                      className="w-4 h-4 rounded border-white/20 bg-[#141920] accent-[#3da4e8]" />
                    <span className="text-sm text-[#e8eef6] group-hover:text-white">{k.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {isKrutrim && (
          <div className="mt-4">
            {krutrimSshKeys.length === 0 ? (
              <p className="text-sm text-[#e8eef6]">No SSH keys found for Krutrim in this region.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {krutrimSshKeys.map((k) => (
                  <button key={k.key_name} type="button"
                    onClick={() => patchKrutrim({ sshKeyName: krutrimConfig.sshKeyName === k.key_name ? "" : k.key_name })}
                    className={cn("px-3 py-2 rounded-xl border text-sm transition-all",
                      krutrimConfig.sshKeyName === k.key_name
                        ? "border-[#3da4e8] bg-[#141920] shadow-sm text-[#e8eef6]"
                        : "border-white/15 bg-[#141920] hover:border-white/30 text-[#e8eef6]")}>
                    {k.key_name}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-[#e8eef6] mt-2">
              Krutrim SSH key creation is currently handled in their console. Create/upload the key there, then refresh.
            </p>
          </div>
        )}
      </Card>

        {/* ── UTHO ────────────────────────────────────────────── */}
        {isUtho && (
          <>
            <Card>
              <SectionTitle icon={Cpu} title="CPU Architecture" subtitle="Preferred CPU vendor" />
              <div className="flex gap-3">
                {(["amd", "intel"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => patchUtho({ cpuModel: m })}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium transition-all",
                      uthoConfig.cpuModel === m
                        ? "border-[#3da4e8] bg-[#141920] text-[#e8eef6]"
                        : "border-white/15 bg-[#141920] text-[#e8eef6] hover:border-white/30"
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
                  <Pill label="None" selected={!uthoConfig.firewallId} onClick={() => patchUtho({ firewallId: "" })} />
                  {uthoFirewalls.map((fw) => (
                    <Pill key={fw.id} label={fw.name} selected={uthoConfig.firewallId === fw.id}
                      onClick={() => patchUtho({ firewallId: fw.id })} />
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <SectionTitle icon={Database} title="Storage Volumes" subtitle="Additional EBS volumes (optional)" />
              <div className="space-y-2 mb-3">
                {uthoConfig.volumes.map((vol, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#141920] border border-white/15">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                      vol.isRoot ? "bg-[#3da4e8] text-[#141920]" : "bg-[#161d26] text-[#e8eef6] border border-white/10")}>
                      {vol.isRoot ? "Root" : "EBS"}
                    </span>
                    <span className="text-sm text-[#e8eef6] flex-1">{vol.size} GB · {vol.type.toUpperCase()}</span>
                    {!vol.isRoot && (
                      <button type="button"
                        onClick={() => patchUtho({ volumes: uthoConfig.volumes.filter((_, j) => j !== i) })}
                        className="text-xs text-red-300 hover:text-red-200 font-medium">Remove</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button"
                onClick={() => patchUtho({ volumes: [...uthoConfig.volumes, { size: 50, type: "ssd", isRoot: false }] })}
                className="w-full text-sm text-[#e8eef6] hover:text-white border border-dashed border-white/20 hover:border-white/35 py-2.5 rounded-lg transition-colors bg-[#141920]">
                + Add Volume
              </button>
            </Card>

            <Card>
              <SectionTitle icon={Network} title="Networking" subtitle="Public IP assignment" />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={uthoConfig.enablePublicIp}
                  onChange={(e) => patchUtho({ enablePublicIp: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-[#141920] accent-[#3da4e8]" />
                <div>
                  <p className="text-sm font-medium text-[#e8eef6]">Enable Public IP</p>
                  <p className="text-xs text-[#e8eef6]">Assign a public IPv4 address to this instance</p>
                </div>
              </label>
            </Card>
          </>
        )}

        {/* ── E2E ─────────────────────────────────────────────── */}
        {isE2E && (
          <>
            <Card>
              <SectionTitle icon={Clock} title="Billing Plan" subtitle="On-demand or committed savings" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <button type="button" onClick={() => patchE2E({ committedSkuId: null })}
                  className={cn("text-left p-4 rounded-xl border transition-all",
                    e2eConfig.committedSkuId === null ? "border-[#3da4e8] bg-[#3da4e8]/10 shadow-sm" : "border-white/15 bg-[#141920] hover:border-white/30")}>
                  <p className="font-semibold text-[#e8eef6] text-sm">On-Demand</p>
                  <p className="text-[#e8eef6] mt-2 font-bold">Rs.{offer.priceHourly.toFixed(3)}<span className="text-xs font-normal text-[#e8eef6]">/hr</span></p>
                  <p className="text-[11px] text-[#e8eef6] mt-0.5">Rs.{offer.priceMonthly.toLocaleString("en-IN")}/mo</p>
                </button>
                {offer.committedOptions?.map((sku) => (
                  <button key={sku.skuId} type="button" onClick={() => patchE2E({ committedSkuId: sku.skuId })}
                    className={cn("relative text-left p-4 rounded-xl border transition-all",
                      e2eConfig.committedSkuId === sku.skuId ? "border-[#3da4e8] bg-[#3da4e8]/10 shadow-sm" : "border-white/15 bg-[#141920] hover:border-white/30")}>
                    {sku.savings > 0 && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        Save {sku.savings}%
                      </span>
                    )}
                    <p className="font-semibold text-[#e8eef6] text-sm">
                      {sku.days === 1095 ? "36 Month" : sku.days === 365 ? "12 Month" : sku.days === 183 ? "6 Month" : "3 Month"}
                    </p>
                    <p className="text-[#e8eef6] mt-2 font-bold text-sm">Rs.{sku.price.toLocaleString("en-IN")}</p>
                    <p className="text-[11px] text-[#e8eef6] mt-0.5">/{sku.days} days</p>
                  </button>
                ))}
              </div>
            </Card>

            {e2eSecurityGroups.length > 0 && (
              <Card>
                <SectionTitle icon={Shield} title="Security Group" subtitle="Firewall rules (optional)" />
                <div className="flex flex-wrap gap-2">
                  <Pill label="None" selected={!e2eConfig.securityGroupId} onClick={() => patchE2E({ securityGroupId: "" })} />
                  {e2eSecurityGroups.map((sg) => (
                    <Pill key={sg.id} label={sg.name} selected={e2eConfig.securityGroupId === String(sg.id)}
                      onClick={() => patchE2E({ securityGroupId: String(sg.id) })} />
                  ))}
                </div>
              </Card>
            )}

            {e2eVpcs.length > 0 && (
              <Card>
                <SectionTitle icon={Network} title="VPC" subtitle="Attach to a private network (optional)" />
                <div className="flex flex-wrap gap-2">
                  <Pill label="None" selected={!e2eConfig.vpcId} onClick={() => patchE2E({ vpcId: "" })} />
                  {e2eVpcs.map((vpc) => (
                    <button key={vpc.id} type="button" onClick={() => patchE2E({ vpcId: String(vpc.id) })}
                      className={cn("flex flex-col items-start px-3 py-2 rounded-xl border text-sm transition-all",
                        e2eConfig.vpcId === String(vpc.id) ? "border-[#3da4e8] bg-[#3da4e8]/10" : "border-white/15 bg-[#141920] hover:border-white/30")}>
                      <span className="font-medium text-[#e8eef6]">{vpc.name}</span>
                      {vpc.cidr && <span className="text-[10px] text-[#e8eef6]">{vpc.cidr}</span>}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <SectionTitle icon={Network} title="Networking" subtitle="Public IP assignment" />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={e2eConfig.enablePublicIp}
                  onChange={(e) => patchE2E({ enablePublicIp: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-[#141920] accent-[#3da4e8]" />
                <div>
                  <p className="text-sm font-medium text-[#e8eef6]">Enable Public IP</p>
                  <p className="text-xs text-[#e8eef6]">Assign a public IPv4 address to this instance</p>
                </div>
              </label>
            </Card>
          </>
        )}

        {/* ── KRUTRIM ──────────────────────────────────────────── */}
        {isKrutrim && (
          <>
            <Card>
              <SectionTitle icon={Server} title="OS Image" subtitle="Available images in your Krutrim account" />
              {krutrimImages.length === 0 ? (
                <div className="flex items-center gap-2 text-[#e8eef6] text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading images…
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {krutrimImages.map((img) => (
                    <button key={img.krn} type="button"
                      onClick={() => patchKrutrim({ imageKrn: img.krn })}
                      className={cn("flex flex-col items-start px-3 py-2.5 rounded-xl border text-sm transition-all",
                        krutrimConfig.imageKrn === img.krn ? "border-[#3da4e8] bg-[#3da4e8]/10 shadow-sm" : "border-white/15 bg-[#141920] hover:border-white/30")}>
                      <span className="font-medium text-[#e8eef6]">{img.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle icon={Network} title="VPC" subtitle="Required — select the VPC for your instance" />
              {krutrimVpcs.length === 0 ? (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-[10px] font-black">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">No VPCs found in this region</p>
                    <p className="text-xs text-amber-700 mt-0.5">Create a VPC in your Krutrim account before deploying.</p>
                    <a href="https://cloud.olakrutrim.com" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">
                      Open Krutrim Console →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {krutrimVpcs.map((vpc) => {
                    const vpcId = vpc.krn_id ?? vpc.krn ?? "";
                    return (
                      <button key={vpcId} type="button"
                        onClick={() => patchKrutrim({ vpcId, subnetId: "" })}
                        className={cn("flex flex-col items-start px-3 py-2.5 rounded-xl border text-sm transition-all",
                          krutrimConfig.vpcId === vpcId ? "border-[#3da4e8] bg-[#3da4e8]/10 shadow-sm" : "border-white/15 bg-[#141920] hover:border-white/30")}>
                        <span className="font-medium text-[#e8eef6]">{vpc.name}</span>
                        <span className="text-[10px] text-[#e8eef6] font-mono truncate max-w-[180px]">{vpcId}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {krutrimConfig.vpcId && (
              <Card>
                <SectionTitle icon={Network} title="Subnet" subtitle="Required — select a subnet within the VPC" />
                {krutrimSubnets.length === 0 ? (
                  <div className="flex items-center gap-2 text-[#e8eef6] text-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading subnets…
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {krutrimSubnets.map((sn) => (
                      <button key={sn.krn} type="button" onClick={() => patchKrutrim({ subnetId: sn.krn })}
                        className={cn("flex flex-col items-start px-3 py-2.5 rounded-xl border text-sm transition-all",
                          krutrimConfig.subnetId === sn.krn ? "border-[#3da4e8] bg-[#3da4e8]/10 shadow-sm" : "border-white/15 bg-[#141920] hover:border-white/30")}>
                        <span className="font-medium text-[#e8eef6]">{sn.name}</span>
                        {sn.cidr && <span className="text-[10px] text-[#e8eef6]">{sn.cidr}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <Card>
              <SectionTitle icon={Network} title="Networking" subtitle="Public IP assignment" />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={krutrimConfig.enablePublicIp}
                  onChange={(e) => patchKrutrim({ enablePublicIp: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-[#141920] accent-[#3da4e8]" />
                <div>
                  <p className="text-sm font-medium text-[#e8eef6]">Enable Public IP</p>
                  <p className="text-xs text-[#e8eef6]">Assign a floating IP to this instance</p>
                </div>
              </label>
            </Card>
          </>
        )}

    </div>
  );
}
