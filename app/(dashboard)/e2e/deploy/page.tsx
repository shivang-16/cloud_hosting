"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { SectionCard } from "@/components/deploy/DCLocationSelector";
import { Globe, HardDrive, Server, Shield, Key, Cpu, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { E2EOSCategory, E2EImage, E2ESshKey, E2ESecurityGroup, E2EVPC, E2ELocation } from "@/lib/providers/e2e/types";

const LOCATIONS: E2ELocation[] = ["Delhi", "Chennai"];

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

const SERIES_INFO: Record<string, { label: string; desc: string }> = {
  C3: { label: "C3 – CPU Intensive 3rd Gen", desc: "Compute-optimized for web servers, batch, analytics" },
  E1: { label: "E1 – Extensive 1st Gen", desc: "Cost-effective for development and testing" },
  M3: { label: "M3 – High Memory 3rd Gen", desc: "Memory-optimized for in-memory databases and caching" },
};

function generateName() {
  return `node-${Math.random().toString(36).substring(2, 8)}`;
}

const DEFAULT_DISPLAY_CAT = "Linux Virtual Node";
const DEFAULT_PROJECT_ID = 54565;

export default function E2EDeployPage() {
  const router = useRouter();

  const [location, setLocation] = useState<E2ELocation>("Delhi");
  const [osCategories, setOsCategories] = useState<E2EOSCategory[]>([]);
  const [images, setImages] = useState<E2EImage[]>([]);
  const [sshKeys, setSshKeys] = useState<E2ESshKey[]>([]);
  const [securityGroups, setSecurityGroups] = useState<E2ESecurityGroup[]>([]);
  const [vpcs, setVpcs] = useState<E2EVPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selection state
  const [selectedOS, setSelectedOS] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<E2EImage | null>(null);
  const [billingType, setBillingType] = useState<"on_demand" | "committed">("on_demand");
  const [committedSkuId, setCommittedSkuId] = useState<number | null>(null);
  const [selectedSshKeys, setSelectedSshKeys] = useState<number[]>([]);
  const [selectedSG, setSelectedSG] = useState<number | null>(null);
  const [selectedVPC, setSelectedVPC] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState(generateName);
  const [deploying, setDeploying] = useState(false);

  const fetchData = useCallback(async (loc: E2ELocation) => {
    setLoading(true);
    setError("");
    try {
      const catRes = await fetch(`/api/proxy/e2e/images/os-category/?location=${loc}&active=true`);
      const catData = await catRes.json();
      const categories: E2EOSCategory[] = Array.isArray(catData?.data?.category_list)
        ? catData.data.category_list
        : [];
      setOsCategories(categories);

      // Auto-select Ubuntu 22.04
      if (categories.length) {
        const ubuntu = categories.find((c) => c.OS === "Ubuntu") ?? categories[0];
        const ver = ubuntu.version.find((v) => v.version === "22.04") ?? ubuntu.version[0];
        setSelectedOS(ubuntu.OS);
        setSelectedVersion(ver.version);
        await fetchImages(loc, ubuntu.OS, ver.version);
      }

      // Fetch optional resources — silently fall back to [] on any error
      async function safeFetch(url: string) {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const ct = res.headers.get("content-type") ?? "";
          if (!ct.includes("application/json")) return null;
          return res.json();
        } catch {
          return null;
        }
      }

      const [keysData, sgData, vpcData] = await Promise.all([
        safeFetch(`/api/proxy/e2e/ssh-keys?location=${loc}&project_id=${DEFAULT_PROJECT_ID}`),
        safeFetch(`/api/proxy/e2e/security-groups?location=${loc}&project_id=${DEFAULT_PROJECT_ID}`),
        safeFetch(`/api/proxy/e2e/vpc/list?location=${loc}&project_id=${DEFAULT_PROJECT_ID}`),
      ]);
      setSshKeys(Array.isArray(keysData?.data) ? keysData.data : []);
      setSecurityGroups(Array.isArray(sgData?.data) ? sgData.data : []);
      setVpcs(Array.isArray(vpcData?.data) ? vpcData.data : []);
    } catch {
      setError("Failed to load deployment options.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchImages(loc: E2ELocation, os: string, version: string) {
    const q = new URLSearchParams({
      category: os, os, osversion: version,
      display_category: DEFAULT_DISPLAY_CAT, location: loc,
    });
    const res = await fetch(`/api/proxy/e2e/images/?${q}`);
    const data = await res.json();
    const imgs: E2EImage[] = data?.data ?? [];
    setImages(imgs);
    if (imgs.length) setSelectedPlan(imgs[0]);
    return imgs;
  }

  useEffect(() => { fetchData(location); }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleOSSelect(os: string, version: string) {
    setSelectedOS(os);
    setSelectedVersion(version);
    setSelectedPlan(null);
    await fetchImages(location, os, version);
  }

  async function handleDeploy() {
    if (!selectedPlan) { setError("Please select a plan."); return; }
    setError("");
    setDeploying(true);
    try {
      const payload = {
        name: nodeName,
        plan: selectedPlan.plan,
        image: selectedPlan.image,
        location,
        project_id: DEFAULT_PROJECT_ID,
        // Auth
        ssh_keys: selectedSshKeys,
        disable_password: selectedSshKeys.length > 0,
        // Networking
        default_public_ip: true,
        reserve_ip: "",
        is_ipv6_availed: false,
        ...(selectedSG ? { security_group_id: selectedSG } : {}),
        ...(selectedVPC ? { vpc_id: selectedVPC } : {}),
        // Instance config
        number_of_instances: 1,
        label: "default",
        backups: false,
        start_scripts: [],
        is_saved_image: false,
        enable_bitninja: false,
        // Billing
        billing_type: billingType,
        ...(billingType === "committed" && committedSkuId ? { committed_sku_id: committedSkuId } : {}),
      };

      const res = await fetch(`/api/proxy/e2e/nodes?location=${location}&project_id=${DEFAULT_PROJECT_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.code !== 200 && data?.code !== 201) {
        throw new Error(data?.errors ?? data?.message ?? "Deploy failed");
      }
      toast.success("Node deployed successfully!");
      router.push("/e2e");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }

  // Group images by series
  const seriesMap = images.reduce<Record<string, E2EImage[]>>((acc, img) => {
    const s = img.specs.series ?? "Other";
    if (!acc[s]) acc[s] = [];
    acc[s].push(img);
    return acc;
  }, {});

  const selectedVersionObj = osCategories
    .find((c) => c.OS === selectedOS)?.version
    .find((v) => v.version === selectedVersion);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/e2e" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Deploy Cloud Node</h1>
            <p className="text-xs text-zinc-500">E2E Networks — Configure and launch your node</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            {loading ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 flex flex-col items-center gap-3 text-zinc-400">
                <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
                <p className="text-sm">Loading deployment options…</p>
              </div>
            ) : (
              <>
                {/* Location */}
                <SectionCard icon={Globe} title="Location" subtitle="Choose your nearest data center">
                  <div className="flex gap-3">
                    {LOCATIONS.map((loc) => (
                      <button key={loc} type="button" onClick={() => setLocation(loc)}
                        className={cn(
                          "relative flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm transition-all",
                          location === loc ? "border-zinc-900 bg-white shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-400"
                        )}>
                        <Icon icon="twemoji:flag-india" className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-zinc-900">{loc}</p>
                          <p className="text-xs text-zinc-500">India</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />
                        {location === loc && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </SectionCard>

                {/* OS Selection */}
                <SectionCard icon={HardDrive} title="Select OS" subtitle="Choose operating system"
                  action={<Badge variant="outline">Required</Badge>}>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mb-4">
                    {osCategories.filter((c) => !["SQLWEB", "SQLSTANDARD"].includes(c.OS)).map((cat) => {
                      const iconId = OS_ICONS[cat.OS] ?? "mdi:disc";
                      const isSelected = selectedOS === cat.OS;
                      return (
                        <button key={cat.OS} type="button"
                          onClick={() => {
                            const ver = cat.version[0];
                            handleOSSelect(cat.OS, ver.version);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border text-sm transition-all",
                            isSelected ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400 bg-white"
                          )}>
                          <Icon icon={iconId} className="w-7 h-7" />
                          <p className="text-[10px] font-medium text-zinc-900 text-center leading-tight">{cat.OS}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Version selector */}
                  {selectedOS && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-600 font-medium">Version:</span>
                      <div className="flex gap-2 flex-wrap">
                        {osCategories.find((c) => c.OS === selectedOS)?.version.map((v) => (
                          <button key={v.version} type="button"
                            onClick={() => handleOSSelect(selectedOS, v.version)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg border text-sm transition-all",
                              selectedVersion === v.version
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
                            )}>
                            {v.version}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedVersionObj && (
                    <p className="text-xs text-zinc-400 mt-2">
                      Selected: {selectedOS} {selectedVersion}
                    </p>
                  )}
                </SectionCard>

                {/* Instance Type (Series) + Plan */}
                <SectionCard icon={Server} title="Instance Type & Plan" subtitle="Choose resources for your node"
                  action={<Badge className="bg-red-500 text-white">Required</Badge>}>
                  {images.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 text-sm">
                      Select an OS to see available plans
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Series tabs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {Object.keys(seriesMap).map((series) => {
                          const info = SERIES_INFO[series] ?? { label: series, desc: "" };
                          const isActive = selectedPlan?.specs.series === series;
                          return (
                            <button key={series} type="button"
                              onClick={() => {
                                const first = seriesMap[series][0];
                                setSelectedPlan(first);
                              }}
                              className={cn(
                                "text-left p-4 rounded-xl border transition-all",
                                isActive ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400 bg-white"
                              )}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-zinc-900">{series}</span>
                                {isActive && (
                                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="7" stroke="#18181b" strokeWidth="1.5" />
                                    <circle cx="8" cy="8" r="3" fill="#18181b" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-xs font-medium text-zinc-700">{info.label.split("–")[1]?.trim()}</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{info.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Plan dropdown for selected series */}
                      {selectedPlan && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Plan</p>
                          <select
                            value={selectedPlan.plan}
                            onChange={(e) => {
                              const img = images.find((i) => i.plan === e.target.value);
                              if (img) setSelectedPlan(img);
                            }}
                            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900">
                            {(seriesMap[selectedPlan.specs.series] ?? []).map((img) => (
                              <option key={img.plan} value={img.plan}>
                                {img.specs.cpu} vCPU · {img.specs.ram} GB RAM · {img.specs.disk_space} GB SSD — Rs.{img.specs.price_per_month}/mo (Rs.{img.specs.price_per_hour}/hr)
                              </option>
                            ))}
                          </select>

                          {/* Pricing cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                            {/* On-demand */}
                            <button type="button"
                              onClick={() => { setBillingType("on_demand"); setCommittedSkuId(null); }}
                              className={cn(
                                "text-left p-3 rounded-xl border transition-all",
                                billingType === "on_demand" && !committedSkuId
                                  ? "border-zinc-900 bg-zinc-50 shadow-sm"
                                  : "border-zinc-200 hover:border-zinc-400 bg-white"
                              )}>
                              <p className="text-xs font-semibold text-zinc-900">On-Demand</p>
                              <p className="text-sm font-bold text-zinc-900 mt-1">Rs.{selectedPlan.specs.price_per_hour}<span className="text-[10px] font-normal text-zinc-500">/hr</span></p>
                              <p className="text-[10px] text-zinc-400">Rs.{selectedPlan.specs.price_per_month}/mo</p>
                              <p className="text-[10px] text-zinc-400">Hourly</p>
                            </button>

                            {/* Committed SKU options */}
                            {selectedPlan.specs.committed_sku?.map((sku) => {
                              const isActive = billingType === "committed" && committedSkuId === sku.committed_sku_id;
                              const savings = Math.round((1 - sku.committed_sku_price / (selectedPlan.specs.price_per_month * sku.committed_days / 30)) * 100);
                              return (
                                <button key={sku.committed_sku_id} type="button"
                                  onClick={() => { setBillingType("committed"); setCommittedSkuId(sku.committed_sku_id); }}
                                  className={cn(
                                    "relative text-left p-3 rounded-xl border transition-all",
                                    isActive ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-400 bg-white"
                                  )}>
                                  {savings > 0 && (
                                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                      Save {savings}%
                                    </span>
                                  )}
                                  <p className="text-xs font-semibold text-zinc-900">{sku.committed_days === 1095 ? "36 Month" : sku.committed_days === 365 ? "12 Month" : sku.committed_days === 183 ? "6 Month" : "3 Month"}</p>
                                  <p className="text-xs font-semibold text-zinc-900 mt-0.5">Savings Plan</p>
                                  <p className="text-sm font-bold text-zinc-900 mt-1">Rs.{sku.committed_sku_price.toLocaleString("en-IN")}</p>
                                  <p className="text-[10px] text-zinc-400">/{sku.committed_days}days</p>
                                  <p className="text-[10px] text-zinc-400">Committed</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>

                {/* Security Group */}
                <SectionCard icon={Shield} title="Security Group" subtitle="Control traffic rules">
                  {securityGroups.length === 0 ? (
                    <p className="text-sm text-zinc-400">No security groups found for this location.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedSG(null)}
                        className={cn("px-3 py-2 rounded-lg border text-sm transition-all",
                          !selectedSG ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400")}>
                        None
                      </button>
                      {securityGroups.map((sg) => (
                        <button key={sg.id} type="button" onClick={() => setSelectedSG(sg.id)}
                          className={cn("px-3 py-2 rounded-lg border text-sm transition-all",
                            selectedSG === sg.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400")}>
                          {sg.name}
                        </button>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* VPC */}
                <SectionCard icon={Network} title="VPC" subtitle="Optional — attach to a private network">
                  {vpcs.length === 0 ? (
                    <p className="text-sm text-zinc-400">No VPCs found for this location.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedVPC(null)}
                        className={cn("px-3 py-2 rounded-lg border text-sm transition-all",
                          !selectedVPC ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400")}>
                        None
                      </button>
                      {vpcs.map((vpc) => (
                        <button key={vpc.id} type="button" onClick={() => setSelectedVPC(vpc.id)}
                          className={cn("flex flex-col items-start px-3 py-2 rounded-lg border text-sm transition-all",
                            selectedVPC === vpc.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400")}>
                          <span className="font-medium text-zinc-900">{vpc.name}</span>
                          {vpc.cidr && <span className="text-[10px] text-zinc-400">{vpc.cidr}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* SSH Keys */}
                <SectionCard icon={Key} title="SSH Keys" subtitle="Key-based authentication">
                  {sshKeys.length === 0 ? (
                    <p className="text-sm text-zinc-400">No SSH keys found. Add one in your E2E account.</p>
                  ) : (
                    <div className="space-y-2">
                      {sshKeys.map((key) => (
                        <label key={key.id} className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={selectedSshKeys.includes(key.id)}
                            onChange={() => setSelectedSshKeys((prev) =>
                              prev.includes(key.id) ? prev.filter((k) => k !== key.id) : [...prev, key.id]
                            )}
                            className="w-4 h-4 rounded border-zinc-300 accent-zinc-900" />
                          <span className="text-sm text-zinc-700">{key.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Node Name */}
                <SectionCard icon={Cpu} title="Node Name" subtitle="Name for your node instance">
                  <Input value={nodeName} onChange={(e) => setNodeName(e.target.value)} placeholder="my-node" className="max-w-sm" />
                </SectionCard>
              </>
            )}
          </div>

          {/* Right — cost summary */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 sticky top-6 space-y-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Summary</p>

              {selectedPlan ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">OS</span>
                    <span className="text-zinc-900">{selectedOS} {selectedVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Instance</span>
                    <span className="text-zinc-900">{selectedPlan.specs.series} · {selectedPlan.specs.sku_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">vCPU</span>
                    <span className="text-zinc-900">{selectedPlan.specs.cpu}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">RAM</span>
                    <span className="text-zinc-900">{selectedPlan.specs.ram} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Disk</span>
                    <span className="text-zinc-900">{selectedPlan.specs.disk_space} GB SSD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Location</span>
                    <span className="text-zinc-900">{location}</span>
                  </div>
                  <div className="h-px bg-zinc-100" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-500">Billing</span>
                    <span className="text-xs font-medium text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-full">
                      {billingType === "on_demand" ? "On-Demand" : "Committed"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Select an OS and plan to see summary</p>
              )}

              {selectedPlan && (
                <div className="flex justify-between items-baseline border-t border-zinc-100 pt-3">
                  <span className="text-sm font-semibold text-zinc-900">Cost/hr</span>
                  <span className="text-2xl font-bold text-blue-600">Rs.{selectedPlan.specs.price_per_hour}</span>
                </div>
              )}

              <Button type="button" className="w-full" size="lg"
                onClick={handleDeploy} disabled={deploying || !selectedPlan}>
                {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</> : "Deploy Now"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
