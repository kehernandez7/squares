import type { APIRoute } from "astro";
export const prerender = false;


export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    console.log("Email request body:", body);

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": import.meta.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "Fantasy Dart",
          email: "donotreply@fantasydart.com",
        },
        to: [
          {
            email: body.to,
          }
        ],
        subject: body.subject,
        htmlContent: body.html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
        console.log(res);
      return new Response(
        JSON.stringify({ error: data }),
        { status: res.status }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
    });
  } catch (err) {
    console.error("Brevo API error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
    });
  }
};
