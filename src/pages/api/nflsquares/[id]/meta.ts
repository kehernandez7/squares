import type { APIRoute } from "astro";
import { supabase } from "../../../../db/supabase.js";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing game id" }), {
      status: 400,
    });
  }

  const { data: game, error } = await supabase
    .from("game")
    .select("password_hash")
    .eq("game_uuid", id)
    .single();

  if (error || !game) {
    return new Response(
      JSON.stringify({ error: error?.message || "Game not found" }),
      { status: 404 }
    );
  }

  return new Response(
    JSON.stringify({ password_required: !!game.password_hash }),
    { status: 200 }
  );
};
