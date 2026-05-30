const BASE_URL = "https://api.e2enetworks.com/myaccount/api/v1";

export async function e2eFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = process.env.E2E_CLOUD_AUTH_TOKEN;
  const apiKey = process.env.E2E_CLOUD_API_KEY;
  if (!token || !apiKey) throw new Error("E2E credentials not configured");

  // E2E requires apikey as a query param and Bearer token as header
  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${path}${separator}apikey=${apiKey}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`E2E API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}
