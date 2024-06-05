import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { linksApp } from "./routes/links";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", logger());
app.use("*", cors());

app.get("/", (c) => {
  return c.json({
    name: "hono-links-api",
    version: "0.1.0",
    endpoints: {
      links: "/api/links",
    },
  });
});

app.route("/api", linksApp);

export default app;
