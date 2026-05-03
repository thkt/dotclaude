const ALLOWED_HOSTS = new Set(["api.example.com"]);

export async function fetchPreview(url: string) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.host)) {
    throw new Error("blocked host");
  }
  const res = await fetch(u);
  return res.text();
}
