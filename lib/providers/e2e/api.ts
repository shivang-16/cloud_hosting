import { e2eFetch } from "./client";
import type {
  E2EOSCategoryResponse,
  E2EImage,
  E2ESshKey,
  E2ESecurityGroup,
  E2ENode,
  E2ECreateNodeRequest,
  E2ENodeActionRequest,
  E2EVolume,
  E2ECreateVolumeRequest,
  E2EVPC,
  E2ECreateVPCRequest,
  E2ELocation,
} from "./types";

// ─── OS / Images ────────────────────────────────────────────────────────────

export async function getOSCategories(location: E2ELocation = "Delhi") {
  const res = await e2eFetch<E2EOSCategoryResponse>(
    `/images/os-category/?location=${location}&active=true`
  );
  return res.data;
}

export async function getImages(params: {
  category: string;
  os: string;
  osversion: string;
  display_category: string;
  location: E2ELocation;
}) {
  const q = new URLSearchParams({
    category: params.category,
    os: params.os,
    osversion: params.osversion,
    display_category: params.display_category,
    location: params.location,
  });
  const res = await e2eFetch<{ code: number; data: E2EImage[] }>(`/images/?${q}`);
  return res.data ?? [];
}

// ─── Nodes ───────────────────────────────────────────────────────────────────

export async function listNodes(location: E2ELocation, projectId: number) {
  const res = await e2eFetch<{ code: number; data: E2ENode[] }>(
    `/nodes/?location=${location}&project_id=${projectId}`
  );
  return res.data ?? [];
}

export async function getNode(nodeId: number, location: E2ELocation, projectId: number) {
  const res = await e2eFetch<{ code: number; data: E2ENode }>(
    `/nodes/${nodeId}/?location=${location}&project_id=${projectId}`
  );
  return res.data;
}

export async function createNode(payload: E2ECreateNodeRequest) {
  return e2eFetch<{ code: number; data: E2ENode; message: string }>("/nodes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function nodeAction(nodeId: number, payload: E2ENodeActionRequest, location: E2ELocation, projectId: number) {
  return e2eFetch<{ code: number; message: string }>(
    `/nodes/${nodeId}/actions/?location=${location}&project_id=${projectId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

// ─── SSH Keys ─────────────────────────────────────────────────────────────────

export async function getSshKeys(location: E2ELocation, projectId: number) {
  const res = await e2eFetch<{ code: number; data: E2ESshKey[] }>(
    `/ssh-keys/?location=${location}&project_id=${projectId}`
  );
  return res.data ?? [];
}

// ─── Security Groups ──────────────────────────────────────────────────────────

export async function getSecurityGroups(location: E2ELocation, projectId: number) {
  const res = await e2eFetch<{ code: number; data: E2ESecurityGroup[] }>(
    `/security-groups/?location=${location}&project_id=${projectId}`
  );
  return res.data ?? [];
}

// ─── Block Storage (Volumes) ──────────────────────────────────────────────────

export async function listVolumes(location: E2ELocation, projectId: number) {
  const res = await e2eFetch<{ code: number; data: E2EVolume[] }>(
    `/block_storage/?location=${location}&project_id=${projectId}`
  );
  return res.data ?? [];
}

export async function createVolume(payload: E2ECreateVolumeRequest) {
  return e2eFetch<{ code: number; data: E2EVolume; message: string }>("/block_storage/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── VPC ──────────────────────────────────────────────────────────────────────

export async function listVPCs(location: E2ELocation, projectId: number) {
  const res = await e2eFetch<{ code: number; data: E2EVPC[] }>(
    `/vpc/list/?location=${location}&project_id=${projectId}`
  );
  return res.data ?? [];
}

export async function createVPC(payload: E2ECreateVPCRequest) {
  return e2eFetch<{ code: number; data: E2EVPC; message: string }>("/vpc/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
