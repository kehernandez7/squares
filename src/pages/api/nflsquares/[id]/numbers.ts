import type { APIRoute } from "astro";
import { supabase } from "../../../../db/supabase.js";
export const prerender = false;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// GET → return existing numbers if they exist
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  // Lookup game
  const { data: game, error: gameError } = await supabase
    .from("game")
    .select("id")
    .eq("game_uuid", id)
    .single();

  if (gameError || !game) {
    return new Response(JSON.stringify({ error: "Game not found" }), { status: 404 });
  }

  // Fetch numbers
  const { data: existing, error: existingError } = await supabase
    .from("nfl_squares_numbers")
    .select("axis, position, value")
    .eq("game_id", game.id);

  if (existingError) {
    return new Response(JSON.stringify({ error: existingError.message }), { status: 500 });
  }

  if (!existing || existing.length === 0) {
    return new Response(
      JSON.stringify({ message: "Numbers not yet generated." }),
      { status: 200 }
    );
  }

  // Format into row + col arrays
  const rowNumbers = existing
    .filter((n) => n.axis === "row")
    .sort((a, b) => a.position - b.position)
    .map((n) => n.value);

  const colNumbers = existing
    .filter((n) => n.axis === "col")
    .sort((a, b) => a.position - b.position)
    .map((n) => n.value);

  return new Response(
    JSON.stringify({ rows: { row: rowNumbers, col: colNumbers } }),
    { status: 200 }
  );
};

// POST → generate numbers if none exist yet
export const POST: APIRoute = async ({ params }) => {
  const { id } = params;

  // Lookup game
  const { data: game, error: gameError } = await supabase
    .from("game")
    .select("id")
    .eq("game_uuid", id)
    .single();

  if (gameError || !game) {
    return new Response(JSON.stringify({ error: "Game not found" }), { status: 404 });
  }

  // Check if numbers already exist
  const { data: existing } = await supabase
    .from("nfl_squares_numbers")
    .select("id")
    .eq("game_id", game.id);

  if (existing && existing.length > 0) {
    return GET({ params } as any); // 👈 reuse GET to return them
  }

  // Generate fresh random numbers
  const rowNumbers = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const colNumbers = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  const rows = [
    ...rowNumbers.map((val, pos) => ({
      game_id: game.id,
      axis: "row",
      position: pos,
      value: val,
    })),
    ...colNumbers.map((val, pos) => ({
      game_id: game.id,
      axis: "col",
      position: pos,
      value: val,
    })),
  ];

  const { error: insertError } = await supabase
    .from("nfl_squares_numbers")
    .insert(rows);

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ rows: { row: rowNumbers, col: colNumbers } }),
    { status: 201 }
  );
};
