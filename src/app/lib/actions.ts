"use server";

interface ShortResponse {
  short_url: string;
}

export async function getShortenLink(url: string) {
  const response = await fetch(
    "https://zip1.io/api/create",

    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }
  );
  const result: ShortResponse = await response.json();
  return result.short_url;
}
export async function getCurrentTime() {
  return Date.now();
}
