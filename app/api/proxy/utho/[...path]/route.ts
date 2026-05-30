import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const UTHO_BASE = "https://api.utho.com/v2";

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.UTHO_CLOUD_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  const { path } = await params;
  const pathname = "/" + path.join("/");
  const search = req.nextUrl.search;
  const url = `${UTHO_BASE}${pathname}${search}`;

  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.text()
    : undefined;

  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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
