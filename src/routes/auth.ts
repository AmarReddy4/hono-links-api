import { Context, Next } from "hono";

type Bindings = {
  API_KEY: string;
};

/**
 * Simple API key authentication middleware.
 * Expects the key in the X-API-Key header.
 */
export async function apiKeyAuth(
  c: Context<{ Bindings: Bindings }>,
  next: Next
) {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    return c.json({ error: "Missing API key" }, 401);
  }

  if (apiKey !== c.env.API_KEY) {
    return c.json({ error: "Invalid API key" }, 403);
  }

  await next();
}
