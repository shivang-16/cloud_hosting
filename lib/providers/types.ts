export type ProviderId = "utho" | "e2e" | "krutrim";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  logo: string;
  description: string;
  available: boolean;
  capabilities: {
    vpc: boolean;
    snapshots: boolean;
    backups: boolean;
    iso: boolean;
    marketplace: boolean;
    sshKeys: boolean;
    firewalls: boolean;
    cpuModel: boolean;
  };
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "utho",
    name: "Utho Cloud",
    logo: "/logos/utho.svg",
    description: "India's most affordable cloud platform",
    available: true,
    capabilities: {
      vpc: true,
      snapshots: true,
      backups: true,
      iso: true,
      marketplace: true,
      sshKeys: true,
      firewalls: true,
      cpuModel: true,
    },
  },
  {
    id: "e2e",
    name: "E2E Networks",
    logo: "/logos/e2e.svg",
    description: "High-performance cloud for India",
    available: true,
    capabilities: {
      vpc: true,
      snapshots: true,
      backups: false,
      iso: false,
      marketplace: false,
      sshKeys: true,
      firewalls: true,
      cpuModel: false,
    },
  },
  {
    id: "krutrim",
    name: "Krutrim Cloud",
    logo: "/logos/krutrim.svg",
    description: "AI-native India cloud platform",
    available: true,
    capabilities: {
      vpc: true,
      snapshots: false,
      backups: false,
      iso: false,
      marketplace: false,
      sshKeys: true,
      firewalls: true,
      cpuModel: false,
    },
  },
];
