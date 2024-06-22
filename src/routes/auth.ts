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
  // Accept either X-API-Key header or Authorization: Bearer <key>
  const headerKey = c.req.header("X-API-Key");
  const authHeader = c.req.header("Authorization");
  const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const apiKey = headerKey || bearerKey;

  if (!apiKey) {
    return c.json({ error: "Missing API key" }, 401);
  }

  if (apiKey !== c.env.API_KEY) {
    return c.json({ error: "Invalid API key" }, 403);
  }

  await next();
}
