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
      ? `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=1000&seasonType=${type}&year=${season}&week=${week}`
      : `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch ESPN events" }), { status: 500 });
    }

    const json = await res.json();
    const events = json.events || [];

    const results = [];

    for (const event of events) {
      const competition = event.competitions?.[0];

      if (!competition?.status) continue;

      if (competition?.status?.type?.name === "STATUS_SCHEDULED") {
        results.push({
          id: event.id,
          name: event.name,
          shortDetail: event.shortName,
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
