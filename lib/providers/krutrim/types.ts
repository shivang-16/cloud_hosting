export type KrutrimRegion = "In-Bangalore-1" | "In-Hyderabad-1";

export interface KrutrimInstanceType {
  id: string;          // e.g. "cpu-standard-4"
  name: string;        // human label
  cpu: number;
  ramGb: number;
  diskGb: number;
  priceMonthly: number;
  priceHourly: number;
  category: "standard" | "cpu" | "memory" | "gpu";
}

export interface KrutrimImage {
  krn: string;
  name: string;
  os: string;
  version: string;
}

export interface KrutrimSshKey {
  key_name: string;
  public_key?: string;
  id?: string;
}

export interface KrutrimVpc {
  krn_id?: string;  // actual API response field
  krn?: string;     // older SDK shape
  name: string;
  status?: string;
}

export interface KrutrimSubnet {
  krn: string;
  name: string;
  cidr?: string;
  vpc_id?: string;
}

export interface KrutrimSecurityGroup {
  krn: string;
  name: string;
  description?: string;
}

export interface KrutrimInstance {
  krn: string;
  instanceName: string;
  status: string;
  instanceType: string;
  region: string;
  created_at?: string;
}

export interface KrutrimCreateInstanceRequest {
  instanceName: string;
  image_krn: string;
  instanceType: string;
  network_id: string;
  security_groups: string[];
  sshkey_name: string;
  subnet_id: string;
  vpc_id: string;
  region: KrutrimRegion;
  volumetype: string;
  volume_size?: number;
  floating_ip?: boolean;
  delete_on_termination?: boolean;
}

// Static instance type catalog — Krutrim doesn't expose a public flavors list endpoint
// for standard compute; these are sourced from their public pricing page.
export const KRUTRIM_INSTANCE_TYPES: KrutrimInstanceType[] = [
  { id: "cpu-standard-2",   name: "Standard 2",   cpu: 2,  ramGb: 4,   diskGb: 40,  priceHourly: 0.55,  priceMonthly: 396,  category: "standard" },
  { id: "cpu-standard-4",   name: "Standard 4",   cpu: 4,  ramGb: 8,   diskGb: 80,  priceHourly: 1.10,  priceMonthly: 792,  category: "standard" },
  { id: "cpu-standard-8",   name: "Standard 8",   cpu: 8,  ramGb: 16,  diskGb: 160, priceHourly: 2.20,  priceMonthly: 1584, category: "standard" },
  { id: "cpu-standard-16",  name: "Standard 16",  cpu: 16, ramGb: 32,  diskGb: 320, priceHourly: 4.40,  priceMonthly: 3168, category: "standard" },
  { id: "cpu-standard-32",  name: "Standard 32",  cpu: 32, ramGb: 64,  diskGb: 640, priceHourly: 8.80,  priceMonthly: 6336, category: "standard" },
  { id: "cpu-opt-4",        name: "CPU Opt 4",    cpu: 4,  ramGb: 4,   diskGb: 80,  priceHourly: 1.20,  priceMonthly: 864,  category: "cpu" },
  { id: "cpu-opt-8",        name: "CPU Opt 8",    cpu: 8,  ramGb: 8,   diskGb: 160, priceHourly: 2.40,  priceMonthly: 1728, category: "cpu" },
  { id: "mem-opt-2",        name: "Mem Opt 2",    cpu: 2,  ramGb: 16,  diskGb: 40,  priceHourly: 1.30,  priceMonthly: 936,  category: "memory" },
  { id: "mem-opt-4",        name: "Mem Opt 4",    cpu: 4,  ramGb: 32,  diskGb: 80,  priceHourly: 2.60,  priceMonthly: 1872, category: "memory" },
];

// Static OS image KRNs (Bangalore region)
export const KRUTRIM_IMAGES: KrutrimImage[] = [
  { krn: "krn:krutrim:image:public:ubuntu-22.04",  name: "Ubuntu 22.04 LTS",  os: "Ubuntu",  version: "22.04" },
  { krn: "krn:krutrim:image:public:ubuntu-20.04",  name: "Ubuntu 20.04 LTS",  os: "Ubuntu",  version: "20.04" },
  { krn: "krn:krutrim:image:public:debian-12",     name: "Debian 12",         os: "Debian",  version: "12" },
  { krn: "krn:krutrim:image:public:debian-11",     name: "Debian 11",         os: "Debian",  version: "11" },
  { krn: "krn:krutrim:image:public:centos-9",      name: "CentOS Stream 9",   os: "CentOS",  version: "9" },
  { krn: "krn:krutrim:image:public:rocky-9",       name: "Rocky Linux 9",     os: "RockyLinux", version: "9" },
  { krn: "krn:krutrim:image:public:almalinux-9",   name: "AlmaLinux 9",       os: "AlmaLinux",  version: "9" },
];
