import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
  API_KEY: string;
};

interface Link {
  id: number;
  url: string;
  title: string;
  description: string | null;
  clicks: number;
  created_at: string;
  updated_at: string;
}

interface CreateLinkBody {
  url: string;
  title: string;
  description?: string;
  tags?: string[];
}

interface UpdateLinkBody {
  url?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

const linksApp = new Hono<{ Bindings: Bindings }>();

// List all links
linksApp.get("/links", async (c) => {
  const tag = c.req.query("tag");
  const limitParam = parseInt(c.req.query("limit") || "50", 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const offset = Math.max(parseInt(c.req.query("offset") || "0", 10), 0);

  let results;

  if (tag) {
    results = await c.env.DB.prepare(
      `SELECT l.* FROM links l
       INNER JOIN link_tags lt ON l.id = lt.link_id
       INNER JOIN tags t ON lt.tag_id = t.id
       WHERE t.name = ?
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(tag, limit, offset)
      .all<Link>();
  } else {
    results = await c.env.DB.prepare(
      `SELECT * FROM links ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all<Link>();
  }

  // Fetch tags for each link
  const links = await Promise.all(
    (results.results ?? []).map(async (link) => {
      const tagResults = await c.env.DB.prepare(
        `SELECT t.name FROM tags t
         INNER JOIN link_tags lt ON t.id = lt.tag_id
         WHERE lt.link_id = ?`
      )
        .bind(link.id)
        .all<{ name: string }>();

      return {
        ...link,
        tags: (tagResults.results ?? []).map((t) => t.name),
      };
    })
  );

  return c.json({ links, meta: { limit, offset } });
});

// Get single link by ID — also increments click count
linksApp.get("/links/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);

  const link = await c.env.DB.prepare(`SELECT * FROM links WHERE id = ?`)
    .bind(id)
    .first<Link>();

  if (!link) {
    return c.json({ error: "Link not found" }, 404);
  }

  // Increment click counter
  await c.env.DB.prepare(
    `UPDATE links SET clicks = clicks + 1 WHERE id = ?`
  )
    .bind(id)
    .run();

  const tagResults = await c.env.DB.prepare(
    `SELECT t.name FROM tags t
     INNER JOIN link_tags lt ON t.id = lt.tag_id
     WHERE lt.link_id = ?`
  )
    .bind(id)
    .all<{ name: string }>();

  return c.json({
    ...link,
    clicks: link.clicks + 1,
    tags: (tagResults.results ?? []).map((t) => t.name),
  });
});

// Create a new link
linksApp.post("/links", async (c) => {
  const body = await c.req.json<CreateLinkBody>();

  if (!body.url || !body.title) {
    return c.json({ error: "url and title are required" }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO links (url, title, description) VALUES (?, ?, ?) RETURNING *`
  )
    .bind(body.url, body.title, body.description ?? null)
    .first<Link>();

  if (!result) {
    return c.json({ error: "Failed to create link" }, 500);
  }

  // Handle tags
  if (body.tags && body.tags.length > 0) {
    await attachTags(c.env.DB, result.id, body.tags);
  }

  return c.json(result, 201);
});

// Update a link
linksApp.put("/links/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json<UpdateLinkBody>();

  const existing = await c.env.DB.prepare(`SELECT * FROM links WHERE id = ?`)
    .bind(id)
    .first<Link>();

  if (!existing) {
    return c.json({ error: "Link not found" }, 404);
  }

  const updated = await c.env.DB.prepare(
    `UPDATE links
     SET url = ?, title = ?, description = ?, updated_at = datetime('now')
     WHERE id = ?
     RETURNING *`
  )
    .bind(
      body.url ?? existing.url,
      body.title ?? existing.title,
      body.description ?? existing.description,
      id
    )
    .first<Link>();

  if (body.tags) {
    await c.env.DB.prepare(`DELETE FROM link_tags WHERE link_id = ?`)
      .bind(id)
      .run();
    if (body.tags.length > 0) {
      await attachTags(c.env.DB, id, body.tags);
    }
  }

  return c.json(updated);
});

// Delete a link
linksApp.delete("/links/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);

  const existing = await c.env.DB.prepare(`SELECT id FROM links WHERE id = ?`)
    .bind(id)
    .first();

  if (!existing) {
    return c.json({ error: "Link not found" }, 404);
  }

  await c.env.DB.prepare(`DELETE FROM links WHERE id = ?`).bind(id).run();

  return c.json({ deleted: true });
});

// Helper: attach tags to a link, creating tags if they don't exist
async function attachTags(
  db: D1Database,
  linkId: number,
  tags: string[]
): Promise<void> {
  for (const tagName of tags) {
    const normalized = tagName.toLowerCase().trim();

    // Upsert tag
    await db
      .prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`)
      .bind(normalized)
      .run();

    const tag = await db
      .prepare(`SELECT id FROM tags WHERE name = ?`)
      .bind(normalized)
      .first<{ id: number }>();

    if (tag) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO link_tags (link_id, tag_id) VALUES (?, ?)`
        )
        .bind(linkId, tag.id)
        .run();
    }
  }
}

export { linksApp };
