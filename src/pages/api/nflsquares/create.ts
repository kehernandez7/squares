import type { APIRoute } from "astro";
import { supabase } from "../../../db/supabase.js";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { nfl_game_id, row_team_id, column_team_id, name } = await request.json();

    if (!nfl_game_id || !row_team_id || !column_team_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // 1️⃣ Insert into game
    const { data: game, error: gameError } = await supabase
      .from("game")
      .insert([{ nfl_game_id, name }])
      .select("id, game_uuid")
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: gameError?.message || "Failed to create game" }),
        { status: 500 }
      );
    }

    // 2️⃣ Insert into nfl_squares_teams
    const { error: teamsError } = await supabase
      .from("nfl_squares_teams")
      .insert([
        {
          game_id: game.id,
          row_team_id,
          column_team_id,
          nfl_game_id,
        },
      ]);

    if (teamsError) {
      return new Response(
        JSON.stringify({ error: teamsError.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, game }), {
      status: 201,
    });
  } catch (err) {
    console.error("Error creating game:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500 }
    );
  }
};
