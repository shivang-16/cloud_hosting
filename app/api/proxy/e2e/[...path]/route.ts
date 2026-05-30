import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const E2E_BASE = "https://api.e2enetworks.com/myaccount/api/v1";

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.E2E_CLOUD_AUTH_TOKEN;
  const apiKey = process.env.E2E_CLOUD_API_KEY;
  if (!token || !apiKey) return NextResponse.json({ error: "E2E credentials not configured" }, { status: 500 });

  const { path } = await params;
  // E2E API requires trailing slashes — Next.js strips them before the route handler
  const pathname = "/" + path.join("/") + "/";
  const search = req.nextUrl.search;

  // E2E requires apikey as a query param
  const separator = search ? "&" : "?";
  const url = `${E2E_BASE}${pathname}${search}${separator}apikey=${apiKey}`;

  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;

  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
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
