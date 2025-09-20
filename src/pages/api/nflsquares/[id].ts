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
    .select("*")
    .eq("game_uuid", id)
    .single();

  if (gameError || !game) {
    return new Response(JSON.stringify({ error: gameError?.message || "Game not found" }), {
      status: 404,
    });
  }``

  // 2. Fetch selections
  const { data: selections, error: selectionError } = await supabase
    .from("nfl_squares_selections")
    .select("row, col, users (name)")
    .eq("game_id", game.id);

  if (selectionError) {
    return new Response(JSON.stringify({ error: selectionError.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ game, selections }), { status: 200 });
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
