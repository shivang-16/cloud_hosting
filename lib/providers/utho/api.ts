import uthoFetch from "./client";
import type { DeployOptions, CloudDeployRequest, CloudInstance } from "./types";

export async function getDeployOptions(dcslug?: string): Promise<DeployOptions> {
  const params = dcslug ? `?dcslug=${dcslug}` : "";
  return uthoFetch<DeployOptions>(`/cloud/getdeploy${params}`);
}

export async function deployInstance(payload: CloudDeployRequest) {
  return uthoFetch("/cloud/deploy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listInstances(): Promise<{ cloud: CloudInstance[] }> {
  return uthoFetch<{ cloud: CloudInstance[] }>("/cloud");
}

export async function powerOff(cloudid: string) {
  return uthoFetch(`/cloud/${cloudid}/poweroff`, { method: "POST" });
}

export async function powerOn(cloudid: string) {
  return uthoFetch(`/cloud/${cloudid}/poweron`, { method: "POST" });
}

export async function destroyInstance(cloudid: string) {
  return uthoFetch(`/cloud/${cloudid}/destroy`, { method: "DELETE" });
}
