// Common config — only fields shared across ALL providers
// Provider-specific fields live in per-provider state in Step 3

export interface UnifiedDeployConfig {
  // Location
  region: string;

  // OS (used for plan matching; Krutrim uses image KRN selected in Step 3)
  osName: string;
  osVersion: string;

  // Desired resources (used to match plans per provider)
  cpu: number;
  ramGb: number;
  diskGb: number;

  // Auth (how the user will SSH/login)
  authMethod: "password" | "sshkeys";
  password: string;

  // Identity
  hostname: string;

  // Billing cycle (Utho uses this; E2E has on-demand/committed; Krutrim is always on-demand)
  billingCycle: "hourly" | "monthly" | "3month" | "6month" | "12month" | "36month";
}

// Per-provider Step 3 state — kept separate so common schema stays clean
export interface UthoProviderConfig {
  cpuModel: "amd" | "intel";
  sshKeyIds: string[];        // comma-joined on deploy
  firewallId: string;
  enablePublicIp: boolean;
  volumes: { size: number; type: "nvme" | "ssd"; isRoot: boolean }[];
}

export interface E2EProviderConfig {
  sshKeyIds: string[];        // numeric IDs
  securityGroupId: string;
  vpcId: string;
  enablePublicIp: boolean;
  committedSkuId: number | null;
}

export interface KrutrimProviderConfig {
  imageKrn: string;
  vpcId: string;
  subnetId: string;
  sshKeyName: string;         // Krutrim identifies keys by name
  enablePublicIp: boolean;
}

// A resolved plan/offer from a specific provider
export interface ProviderOffer {
  providerId: "utho" | "e2e" | "krutrim";
  providerName: string;
  planId: string;
  planLabel: string;
  cpu: number;
  ramGb: number;
  diskGb: number;
  priceMonthly: number;
  priceHourly: number;
  currency: string;
  committedOptions?: {
    skuId: number;
    days: number;
    price: number;
    savings: number;
  }[];
  raw: unknown;
}

// -----------------------------------------------------------------------------
// Next step: truly provider-agnostic "launch instance" schema.
//
// Goal: collect everything in ONE form (AWS-like) without forcing users to pick
// a provider up front. Later we "materialize" this spec into provider-specific
// resources (keys, security groups/firewalls, VPC/subnet) and finally create
// the instance.
// -----------------------------------------------------------------------------

export type UnifiedProviderId = ProviderOffer["providerId"];

export type IpVersion = "ipv4" | "ipv6";
export type TrafficDirection = "ingress" | "egress";
export type NetworkProtocol = "tcp" | "udp" | "icmp" | "all";

export interface PortRange {
  from: number;
  to: number;
}

export interface CidrSource {
  cidr: string; // e.g. "0.0.0.0/0", "203.0.113.4/32"
  ipVersion: IpVersion;
}

export interface UnifiedSecurityRule {
  direction: TrafficDirection;
  protocol: NetworkProtocol;
  ports?: PortRange; // omit for "all" or icmp
  sourceOrDest: CidrSource;
  description?: string;
}

export interface UnifiedSshPublicKey {
  name: string;
  publicKey: string; // OpenSSH format
}

export interface UnifiedAccessSpec {
  // If present, will be used when the selected provider supports password-based login.
  // Some providers may require a password in addition to SSH keys.
  rootPassword?: string;

  // Provider-agnostic: we store public keys and import/create them per provider.
  sshPublicKeys: UnifiedSshPublicKey[];

  // If true, we try to disable password auth where supported (e.g., E2E's disable_password).
  preferKeyOnlyLogin: boolean;
}

export interface UnifiedVpcSpec {
  mode: "none" | "existing" | "create";
  id?: string;
  name?: string;
  cidr?: string;
}

export interface UnifiedSubnetSpec {
  mode: "none" | "existing" | "create";
  id?: string;
  name?: string;
  cidr?: string;
}

export interface UnifiedPublicIpSpec {
  enabled: boolean;
  // "auto": provider assigns one (if supported)
  // "reserved": attach a specific reserved/static IP (if supported)
  mode: "auto" | "reserved";
  reservedId?: string;
}

export interface UnifiedNetworkingSpec {
  vpc: UnifiedVpcSpec;
  subnet: UnifiedSubnetSpec;
  publicIp: UnifiedPublicIpSpec;
}

export interface UnifiedVolumeSpec {
  sizeGb: number;
  // Keep generic; providers map to their own enum/pricing tiers.
  type: "standard" | "ssd" | "nvme";
  // Root volume is handled separately; this is for optional data volumes.
  name?: string;
}

export interface UnifiedStorageSpec {
  rootDisk: {
    sizeGb: number;
    type: "standard" | "ssd" | "nvme";
    deleteOnTermination: boolean;
  };
  dataVolumes: UnifiedVolumeSpec[];
}

export interface UnifiedBillingSpec {
  // Normalized billing intent — provider mapping decides exact SKU/term.
  mode: "on_demand" | "committed";
  committedDays?: number; // e.g. 90, 180, 365, 1095

  // Utho still needs its billingCycle field on deploy; we derive it from mode/days.
  uthoBillingCycle?: UnifiedDeployConfig["billingCycle"];
}

export interface UnifiedLaunchSpec {
  placement: {
    region: string; // e.g. "Mumbai", "Delhi NCR"
  };
  instance: {
    name: string;
    count: number;
  };
  image: {
    osName: string;
    osVersion: string;
  };
  compute: {
    cpu: number;
    ramGb: number;
  };

  // Disk intent here is only for root disk matching. Provider plan may override.
  storage: UnifiedStorageSpec;
  networking: UnifiedNetworkingSpec;
  security: {
    rules: UnifiedSecurityRule[];
  };
  access: UnifiedAccessSpec;
  billing: UnifiedBillingSpec;

  metadata?: {
    tags?: Record<string, string>;
    userData?: string; // cloud-init / startup script
  };
}
