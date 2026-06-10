// Unified deploy schema — provider-agnostic form state
// Mapped to provider-specific payloads at deploy time

export interface UnifiedStorageVolume {
  size: number;   // GB
  type: "nvme" | "ssd";
  isRoot: boolean;
}

export interface UnifiedDeployConfig {
  // Location
  region: string;

  // OS
  osName: string;
  osVersion: string;

  // Resources
  cpu: number;
  ramGb: number;
  diskGb: number;

  // Billing
  billingCycle: "hourly" | "monthly" | "3month" | "6month" | "12month" | "36month";

  // Networking
  enablePublicIp: boolean;
  firewallId: string;
  vpcId: string;
  subnetId: string;   // Krutrim requires explicit subnet

  // CPU model (Utho-specific)
  cpuModel: "amd" | "intel";

  // Auth
  authMethod: "password" | "sshkeys";
  password: string;
  sshKeyIds: string[];
  sshKeyName: string; // Krutrim uses key name not ID

  // Identity
  hostname: string;

  // Storage (Utho EBS volumes)
  volumes: UnifiedStorageVolume[];
}

// A resolved "offer" from a specific provider after matching the config
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
  // E2E committed SKU options
  committedOptions?: {
    skuId: number;
    days: number;
    price: number;
    savings: number;
  }[];
  raw: unknown;
}
