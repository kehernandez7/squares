import type { APIRoute } from "astro";
import { supabase } from "../../../db/supabase.js";
import { use } from "react";
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing game id" }), { status: 400 });
  }

  // 1. Fetch game
  const { data: game, error: gameError } = await supabase
    .from("game")
    .select("*, nfl_squares_teams(row_team_id, column_team_id)")
    .eq("game_uuid", id)
    .single();

  if (gameError || !game) {
    return new Response(JSON.stringify({ error: gameError?.message || "Game not found" }), {
      status: 404,
    });
  }

  // 2. Fetch selections
  const { data: selections, error: selectionError } = await supabase
    .from("nfl_squares_selections")
    .select("row, col, users (name)")
    .eq("game_id", game.id);

  if (selectionError) {
    return new Response(JSON.stringify({ error: selectionError.message }), { status: 500 });
  }

  // 3. Fetch NFL game name from ESPN API
  let nflGameName: string | null = null;
  if (game.nfl_game_id) {
    try {
      const res = await fetch(
        `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${game.nfl_game_id}?lang=en&region=us`
      );
      if (res.ok) {
        const json = await res.json();
        nflGameName = json?.name ?? null;
      }
    } catch (err) {
      console.error("Error fetching NFL game name:", err);
    }
  }

  // 3. Fetch NFL game name from ESPN API
  let gameStatus: string | null = null;
  if (game.nfl_game_id) {
    try {
      const res = await fetch(
        `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${game.nfl_game_id}/competitions/${game.nfl_game_id}/status?lang=en&region=us`
      );
      if (res.ok) {
        const json = await res.json();
        gameStatus = json?.type?.name ?? null;
      }
    } catch (err) {
      console.error("Error fetching NFL game name:", err);
    }
  }

//todo: ideally fetch these from DB to Prevent numerous calls to api
  // Safely grab first record from the array
  const teamRecord = game.nfl_squares_teams?.[0];

  let team1: string | null = null;
  let team2: string | null = null;

  if (teamRecord) {
    const fetchTeamName = async (teamId: number | null | undefined) => {
      if (!teamId) return null;
      try {
        const res = await fetch(
          `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/teams/${teamId}?lang=en&region=us`
        );
        if (!res.ok) {
          console.error(`ESPN API error for team ${teamId}:`, res.status);
          return null;
        }
        const json = await res.json();
        return json?.shortDisplayName ?? null;
      } catch (err) {
        console.error(`Error fetching NFL team ${teamId}:`, err);
        return null;
      }
    };

    [team1, team2] = await Promise.all([
      fetchTeamName(teamRecord.row_team_id),
      fetchTeamName(teamRecord.column_team_id),
    ]);
  }

  let winners: { row: number; col: number; quarters: number[] }[] = [];

  if (gameStatus == "STATUS_FINAL" && !game.complete) {
    const result = await calculateWinner(
      game.nfl_game_id,
      teamRecord.row_team_id,
      teamRecord.column_team_id,
      game.id
    );
    if (result) {
      winners = result.winners;
    }
  }

  return new Response(
    JSON.stringify({
      game: {
        ...game,
        nfl_game: nflGameName,
        team_1: team1,
        team_2: team2
      },
      selections,
      winners
    }),
    { status: 200 }
  );
};

export const POST: APIRoute = async ({ request, params }) => {
  const { id } = params;

  // Look up the game
  const { data: game, error: gameError } = await supabase
    .from("game")
    .select("id")
    .eq("game_uuid", id)
    .single();

  if (gameError || !game) {
    return new Response(JSON.stringify({ error: gameError?.message || "Game not found" }), {
      status: 404,
    });
  }

  const { name, email, selected } = await request.json();

  if (!name || !email || !selected?.length) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }

  // Find or insert user
  let { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name")
    .eq("email", email)
    .maybeSingle();

  if (userError) {
    return new Response(JSON.stringify({ error: userError.message }), { status: 500 });
  }

  if (!user) {
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([{ name, email }])
      .select("id, name")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }
    user = newUser;
  }

  // 1️⃣ Convert selections into row/col objects
  const selections = selected.map((key: string) => {
    const [row, col] = key.split("-").map(Number);
    return { row, col, game_id: game.id };
  });

  // 2️⃣ Check existing squares
  const { data: existing, error: existingError } = await supabase
    .from("nfl_squares_selections")
    .select("row, col")
    .eq("game_id", game.id)
    .in(
      "row",
      selections.map((s: { row: any; }) => s.row)
    );

  if (existingError) {
    return new Response(JSON.stringify({ error: existingError.message }), { status: 500 });
  }

  const existingKeys = new Set(existing?.map((e) => `${e.row}-${e.col}`));

  // 3️⃣ Filter out already taken
  const newSelections = selections
    .filter((s: { row: any; col: any; }) => !existingKeys.has(`${s.row}-${s.col}`))
    .map((s: any) => ({ ...s, user_id: user.id }));

  // 4️⃣ Insert only fresh ones
  let allInserted = true;
  if (newSelections.length > 0) {
    const { error: insertError } = await supabase
      .from("nfl_squares_selections")
      .insert(newSelections);

    if (insertError) {
      console.error(insertError);
      allInserted = false;
    }
  }

  // 5️⃣ Response
  if (!allInserted || newSelections.length < selections.length) {
    return new Response(JSON.stringify({ success: true, name: user.name, partial: true }), {
      status: 207,
    });
  }

  return new Response(JSON.stringify({ success: true, name: user.name }), { status: 201 });
};

async function calculateWinner(
  nfl_game_id: number,
  team_1: number,
  team_2: number,
  gameId: number
) {
  console.log("calculating winners (per quarter)");

  if (!nfl_game_id) return null;

  // 1. Fetch the row/col number assignments
  const { data: numbers, error: numbersError } = await supabase
    .from("nfl_squares_numbers")
    .select("axis, position, value")
    .eq("game_id", gameId);

  if (numbersError || !numbers || numbers.length === 0) {
    console.error("No numbers found for this game.");
    return null;
  }

  const rowNumbers = numbers
    .filter((n) => n.axis === "row")
    .sort((a, b) => a.position - b.position)
    .map((n) => n.value);

  const colNumbers = numbers
    .filter((n) => n.axis === "col")
    .sort((a, b) => a.position - b.position)
    .map((n) => n.value);

  // 2. Fetch scores
  const fetchTeamScores = async (teamId: number) => {
    try {
      const res = await fetch(
        `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${nfl_game_id}/competitions/${nfl_game_id}/competitors/${teamId}/linescores?lang=en&region=us`
      );
      if (!res.ok) return [0, 0, 0, 0];

      const json = await res.json();
      const items = json?.items ?? [];

      let cumulative = 0;
      const scores = items.map((q: any) => (cumulative += q.value ?? 0));
      while (scores.length < 4) scores.push(cumulative);
      return scores;
    } catch (err) {
      console.error(`Error fetching scores for team ${teamId}:`, err);
      return [0, 0, 0, 0];
    }
  };

  const [team1Scores, team2Scores] = await Promise.all([
    fetchTeamScores(team_1),
    fetchTeamScores(team_2),
  ]);

  // 3. Winners per quarter
  const winners: Record<
    string,
    { row: number; col: number; quarters: number[] }
  > = {};

  for (let q = 0; q < 4; q++) {
    const team1LastDigit = team1Scores[q] % 10;
    const team2LastDigit = team2Scores[q] % 10;

    const row = rowNumbers.indexOf(team1LastDigit);
    const col = colNumbers.indexOf(team2LastDigit);
    if (row === -1 || col === -1) continue;

    const key = `${row}-${col}`;
    if (!winners[key]) {
      winners[key] = { row, col, quarters: [q + 1] }; // store Q1–Q4
    } else {
      winners[key].quarters.push(q + 1);
    }
  }

  return {
    winners: Object.values(winners),
    team1Scores,
    team2Scores,
  };
}