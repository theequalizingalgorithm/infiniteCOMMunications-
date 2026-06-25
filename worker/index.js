const BASE_URL =
  "https://infinite-communications.interviewmojito.com/embed";

// IMPORTANT: keep JOBMOJITO_SIGNING_KEY out of the repository and frontend.
// The key must be stored as a Cloudflare secret and accessed through env.
const EMBED_ID = "38d5216e-9623-4d07-9c8f-ef6cfc3c8a74";
const ALLOWED_ORIGIN = "https://theequalizingalgorithm.github.io";

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(ALLOWED_ORIGIN),
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed." }),
        {
          status: 405,
          headers: corsHeaders(ALLOWED_ORIGIN),
        }
      );
    }

    if (requestOrigin !== ALLOWED_ORIGIN) {
      return new Response(
        JSON.stringify({ error: "Origin not allowed." }),
        {
          status: 403,
          headers: corsHeaders(ALLOWED_ORIGIN),
        }
      );
    }

    try {
      const body = await request.json();

      const name =
        typeof body.name === "string" ? body.name.trim() : "";

      const email =
        typeof body.email === "string"
          ? body.email.trim().toLowerCase()
          : "";

      if (!name || !email) {
        return new Response(
          JSON.stringify({
            error: "Candidate name and email are required.",
          }),
          {
            status: 400,
            headers: corsHeaders(ALLOWED_ORIGIN),
          }
        );
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        return new Response(
          JSON.stringify({
            error: "Please provide a valid email address.",
          }),
          {
            status: 400,
            headers: corsHeaders(ALLOWED_ORIGIN),
          }
        );
      }

      const canonical = EMBED_ID + name + email;

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(env.JOBMOJITO_SIGNING_KEY),
        {
          name: "HMAC",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );

      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(canonical)
      );

      const signature = bufferToHex(signatureBuffer);

      const params = new URLSearchParams({
        embed_id: EMBED_ID,
        name: utf8ToBase64(name),
        email: utf8ToBase64(email),
        signature,
      });

      return new Response(
        JSON.stringify({
          embedUrl: `${BASE_URL}?${params.toString()}`,
        }),
        {
          status: 200,
          headers: corsHeaders(ALLOWED_ORIGIN),
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Unable to prepare the interview.",
        }),
        {
          status: 500,
          headers: corsHeaders(ALLOWED_ORIGIN),
        }
      );
    }
  },
};
