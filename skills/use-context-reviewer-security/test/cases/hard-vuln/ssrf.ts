export async function fetchPreview(url: string) {
  const res = await fetch(url);
  return res.text();
}
