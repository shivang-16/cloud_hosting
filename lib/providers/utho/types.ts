export interface Datacenter {
  id: string;
  slug: string;
  city: string;
  country: string;
  cc: string;
  status: "active" | "inactive" | "maintenance";
  is_selected?: boolean;
  default_cpu?: "amd" | "intel" | "arm";
  ebs?: string;
  product_vpc?: string;
}

export interface Plan {
  id: string;
  slug: "basic" | "dedicated-cpu" | "dedicated-memory" | string;
  type: string;
  ram: string;
  cpu: string;
  disk: string;
  bandwidth: string;
  price: number;
  dedicated_vcore?: string;
  is_available?: string;
  currency?: string;
  currencyprefix?: string;
}

// Real API shape: distro is grouped with nested images[]
export interface DistroGroup {
  distro: string;
  distribution: string;
  images: CloudImage[];
}

export interface CloudImage {
  id: string;
  distro: string;
  image: string;
  version: string;
  distribution: string;
  category: string;
  type: string;
  size?: string;
  cost?: number;
}

export interface Firewall {
  id: string;
  name: string;
}

export interface SshKey {
  id: string;
  name: string;
}

export interface DeployOptions {
  dczones: Datacenter[];
  plans: Plan[];
  distro: DistroGroup[];
  firewalls: Firewall[];
  keys: SshKey[];
  ebs?: string;
  vpc?: Record<string, unknown>;
}

export interface CloudDeployRequest {
  dcslug: string;
  planid: string;
  billingcycle: "hourly" | "monthly" | "3month" | "6month" | "12month" | "36month";
  auth: "option1" | "option2";
  root_password?: string;
  sshkeys?: string;
  enable_publicip: "true" | "false";
  cpumodel: "amd" | "intel";
  firewall?: string;
  enablebackup: "true" | "false";
  vpc?: string;
  image: string;
  cloud: Array<{ hostname: string }>;
  coupon?: string;
}

export interface CloudInstance {
  cloudid: string;
  hostname: string;
  ipaddress: string;
  status: string;
  created_at: string;
}
