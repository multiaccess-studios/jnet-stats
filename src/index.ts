import { serve } from "bun";
import index from "./index.html";

const port = Number(process.env.JNET_STATS_PORT ?? 3000);

const server = serve({
  port,
  routes: {
    // Let the SPA handle every route.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
