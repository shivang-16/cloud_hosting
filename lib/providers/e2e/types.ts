export type E2ELocation = "Delhi" | "Chennai";

export interface E2EOSVersion {
  os: string;
  version: string;
  sub_category: string;
  software_version: string;
  number_of_domains: number | null;
}

export interface E2EOSCategory {
  OS: string;
  version: E2EOSVersion[];
  category: string[];
}

export interface E2EOSCategoryResponse {
  code: number;
  data: {
    category_list: E2EOSCategory[];
    is_private_cluster_user: boolean;
    storage_price: number;
  };
}

export interface E2ECommittedSKU {
  committed_sku_id: number;
  committed_sku_name: string;
  committed_sku_price: number;
  committed_upto_date: string;
  committed_days: number;
}

export interface E2EPlanSpecs {
  id: string;
  sku_name: string;
  ram: string;
  cpu: number;
  disk_space: number;
  price_per_month: number;
  price_per_hour: number;
  series: string;
  minimum_billing_amount: number;
  committed_sku: E2ECommittedSKU[];
}

export interface E2EImage {
  name: string;
  plan: string;
  image: string;
  os: {
    name: string;
    version: string;
    image: string;
    category: string;
  };
  location: string;
  specs: E2EPlanSpecs;
  instance_type?: string;
  display_category?: string;
}

export interface E2ESshKey {
  id: number;
  name: string;
  public_key?: string;
}

export interface E2ESecurityGroup {
  id: number;
  name: string;
  description?: string;
}

export interface E2ENode {
  id: number;
  name: string;
  status: string;
  location: string;
  ip_address?: string;
  created_at?: string;
  plan?: string;
  image?: string;
  cpu?: number;
  ram?: string;
  disk?: number;
}

export interface E2ECreateNodeRequest {
  name: string;
  plan: string;
  image: string;
  location: E2ELocation;
  project_id: number;
  // Auth
  ssh_keys: number[];
  disable_password: boolean;
  // Networking
  default_public_ip: boolean;
  reserve_ip: string;
  is_ipv6_availed: boolean;
  security_group_id: number | null;
  vpc_id?: number;
  // Instance config
  number_of_instances: number;
  label: string;
  backups: boolean;
  start_scripts: unknown[];
  is_saved_image: boolean;
  saved_image_template_id: number | null;
  enable_bitninja: boolean;
  // Billing
  billing_type: "on_demand" | "committed";
  committed_sku_id?: number;
}

// Node actions: power_on, power_off, reboot, rebuild, resize, etc.
export type E2ENodeAction =
  | "power_on"
  | "power_off"
  | "reboot"
  | "hard_reboot"
  | "rebuild"
  | "resize"
  | "enable_backups"
  | "disable_backups";

export interface E2ENodeActionRequest {
  action: E2ENodeAction;
  [key: string]: unknown;
}

// Block Storage (Volumes)
export interface E2EVolume {
  id: number;
  name: string;
  size: number;
  status: string;
  location: string;
  node_id?: number;
  created_at?: string;
}

export interface E2ECreateVolumeRequest {
  name: string;
  size: number;
  location: E2ELocation;
  project_id: number;
}

// VPC
export interface E2EVPC {
  id: number;
  name: string;
  cidr?: string;
  location: string;
  status?: string;
  created_at?: string;
}

export interface E2ECreateVPCRequest {
  name: string;
  cidr: string;
  location: E2ELocation;
  project_id: number;
}

export interface E2EDeployOptions {
  os_categories: E2EOSCategory[];
  images: E2EImage[];
  ssh_keys: E2ESshKey[];
  security_groups: E2ESecurityGroup[];
  vpcs: E2EVPC[];
  storage_price: number;
  location: E2ELocation;
}
