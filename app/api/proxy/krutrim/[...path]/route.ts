import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const KRUTRIM_BASE = "https://cloud.olakrutrim.com";
const KRUTRIM_AUTH_URL = "https://cloud.olakrutrim.com/iam/v1/signInAsRootUser";

// In-process token cache — refreshes when within 60s of expiry
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getKrutrimToken(): Promise<string> {
  const now = Date.now();
  // Return cached token if still valid for at least 60 more seconds
  if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;

  // If a static API key is provided, use it directly (no refresh needed)
  const staticKey = process.env.KRUTRIM_API_KEY;
  if (staticKey) return staticKey;

  const email    = process.env.KRUTRIM_EMAIL;
  const password = process.env.KRUTRIM_PASSWORD;
  console.log("Krutrim auth — email:", email, "| password length:", password?.length ?? 0);
  if (!email || !password) throw new Error(`KRUTRIM_NOT_CONFIGURED: email=${!!email} password=${!!password}`);

  const res = await fetch(KRUTRIM_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Krutrim auth failed ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const token: string = data.access_token;
  // Tokens expire every 5 minutes per docs; cache for 4m 30s to be safe
  cachedToken    = token;
  tokenExpiresAt = now + 4.5 * 60 * 1000;
  return token;
}

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let token: string;
  try {
    token = await getKrutrimToken();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Auth error" }, { status: 500 });
  }

  const { path } = await params;
  const pathname = "/" + path.join("/");
  const search   = req.nextUrl.search;
  const url      = `${KRUTRIM_BASE}${pathname}${search}`;

  // Forward x-region header if present in the incoming request
  const xRegion = req.headers.get("x-region") ?? "";
  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Content-Type":  "application/json",
    "Accept":        "application/json",
  };
  if (xRegion) headers["x-region"] = xRegion;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  }

  const text = await upstream.text();
  return NextResponse.json(
    { error: `Upstream error ${upstream.status}`, detail: text.slice(0, 500) },
    { status: upstream.status >= 400 ? upstream.status : 502 }
  );
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
