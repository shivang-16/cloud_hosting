const BASE_URL = "https://api.utho.com/v2";

async function uthoFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = process.env.UTHO_CLOUD_API_KEY;
  if (!apiKey) throw new Error("UTHO_CLOUD_API_KEY not set");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Utho API error ${res.status}: ${text}`);
  }

  return res.json();
}

export default uthoFetch;
