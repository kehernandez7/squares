import type { APIRoute } from "astro";
import { supabase } from "../../../../db/supabase.js";
import bcrypt from "bcryptjs";

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing game id" }), {
      status: 400,
    });
  }

  const { password } = await request.json();

  if (!password) {
    return new Response(JSON.stringify({ error: "Missing password" }), {
      status: 400,
    });
  }

  // Fetch password hash for this game
  const { data: game, error: gameError } = await supabase
    .from("game")
    .select("password_hash")
    .eq("game_uuid", id)
    .single();

  if (gameError || !game) {
    return new Response(
      JSON.stringify({ error: gameError?.message || "Game not found" }),
      { status: 404 }
    );
  }

  if (!game.password_hash) {
    // No password required
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // Verify bcrypt hash
  const isValid = await bcrypt.compare(password, game.password_hash);

  if (!isValid) {
    return new Response(JSON.stringify({ error: "Invalid password" }), {
      status: 401,
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
