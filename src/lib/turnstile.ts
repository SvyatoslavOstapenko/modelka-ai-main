/**
 * Verify Cloudflare Turnstile token on server-side
 * @param token - Turnstile token from client
 * @returns boolean - Whether token is valid
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured");
    // Fail open in development if not configured
    return process.env.NODE_ENV === "development";
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    // Fail closed - security is more important than UX
    // If Cloudflare is down, require manual retry rather than allowing bots
    return false;
  }
}
