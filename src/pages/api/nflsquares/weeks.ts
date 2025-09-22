import type { APIRoute } from "astro";

export const prerender = false;

let cachedWeeks: { number: number; text: string }[] | null = null;
let lastFetch = 0;

export const GET: APIRoute = async () => {
  // Cache for 24 hours
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (cachedWeeks && now - lastFetch < CACHE_TTL) {
    return new Response(JSON.stringify(cachedWeeks), { status: 200 });
  }

  try {
    const res = await fetch(
      "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/weeks"
    );
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch weeks" }), { status: 500 });
    }

    const json = await res.json();
    const items = json.items || [];

    const results: { number: number; text: string }[] = [];

    for (const item of items) {
      const weekRes = await fetch(item.$ref);
      if (!weekRes.ok) continue;
      const weekJson = await weekRes.json();
      results.push({
        number: weekJson.number,
        text: weekJson.text || `Week ${weekJson.number}`,
      });
    }

    cachedWeeks = results;
    lastFetch = now;

    return new Response(JSON.stringify(results), { status: 200 });
  } catch (err) {
    console.error("Error fetching weeks:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch weeks" }), { status: 500 });
  }
};
