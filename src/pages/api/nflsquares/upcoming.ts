import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const season = url.searchParams.get("season") || "2025"; // default season
    const type = url.searchParams.get("type") || "2";        // 2 = regular season
    const week = url.searchParams.get("week");               // optional

    // Choose endpoint
    const endpoint = week
      ? `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${season}/types/${type}/weeks/${week}/events`
      : `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch ESPN events" }), { status: 500 });
    }

    const json = await res.json();
    const items = json.items || [];

    const results = [];

    for (const item of items) {
      const eventRes = await fetch(item.$ref);
      if (!eventRes.ok) continue;
      const eventJson = await eventRes.json();

      const competition = eventJson.competitions?.[0];
      if (!competition?.status?.$ref) continue;

      const statusRes = await fetch(competition.status.$ref);
      if (!statusRes.ok) continue;
      const statusJson = await statusRes.json();

      if (statusJson?.type.name === "STATUS_SCHEDULED") {
        results.push({
          id: eventJson.id,
          name: eventJson.name,
          shortDetail: eventJson.shortName,
          competitors: competition.competitors?.map((c: any) => c.team?.displayName),
          // placeholders for now — you’ll wire in later
          rowTeamId: competition.competitors?.[0]?.id || null,
          colTeamId: competition.competitors?.[1]?.id || null,
        });
      }
    }

    return new Response(JSON.stringify(results), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to fetch NFL events" }), { status: 500 });
  }
};
