import type { APIRoute } from "astro";
import { supabase } from "../../../db/supabase.js";
import bcrypt from "bcryptjs";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { nfl_game_id, row_team_id, column_team_id, name, password, email } =
      await request.json();

    if (!nfl_game_id || !row_team_id || !column_team_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // 1️⃣ Hash password if provided
    let passwordHash: string | null = null;
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    // 2️⃣ Insert into game (with passwordHash if provided)
    const { data: game, error: gameError } = await supabase
      .from("game")
      .insert([{ nfl_game_id, name, password_hash: passwordHash }])
      .select("id, game_uuid")
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: gameError?.message || "Failed to create game" }),
        { status: 500 }
      );
    }

    // 3️⃣ Insert into nfl_squares_teams
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

    const baseUrl = process.env.SITE_URL || "http://localhost:4321";

     await fetch(`${baseUrl}/api/email/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: `${email}`,
        subject: "Thanks for creating an NFL Squares game!",
        html: "<p>Thanks for creating an NFL Squares Game! Here is the link to your game:</p>" + 
        "<a href=" + baseUrl + "/nflsquares/" + game.game_uuid + ">Game Link</a>",
      }),
    });

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
