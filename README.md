# JNET Stats Dashboard

## Architecture

- **Runtime / build:** Bun 1.3 + `bun build`
- **UI:** React 19, TypeScript, Tailwind (via `bun-plugin-tailwind`)
- **State:** Zustand
- **Charts:** Custom D3 renderers (candlesticks, line charts, grouped bars)
- **Lint/format:** Flat ESLint config with `@typescript-eslint` + React plugins, Prettier 3

## Getting Started

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `bun install`   | Install dependencies                         |
| `bun dev`       | Bun dev server w/ hot reload (`src/index.ts`) |
| `bun lint`      | ESLint (TS + React)                          |
| `bun format`    | Prettier 3                                   |
| `bun run build` | Production build to `dist/`                  |

The dev server hosts `src/index.html`, which mounts `src/frontend.tsx`. The production build emits static assets to `dist/`.

## Project Structure

```
src/
├── components/     # Charts + layout primitives
├── lib/            # Data processing, hooks, stores
├── App.tsx         # Root shell (TopBar + sections)
├── frontend.tsx    # React entry
└── index.ts        # Bun HTTP server for prod
```

## Data Flow

1. User drops `game_history.json`; `parseGameHistoryText` loads it into the Zustand store.
2. Derived hooks (`useFilteredGames`, `useDataBounds`, etc.) expose filtered/aggregated data to sections.
3. Charts leverage D3 for scales + SVG rendering; Tailwind handles styling.

## Testing / QA

- `bun lint` – static analysis; no automated feature tests yet.

## Deployment

`bun run build` emits static assets in `dist/`. Host wherever you prefer (Cloudflare Pages, Netlify, S3, etc.). If you use the Bun server (`src/index.ts`), configure routes so unknown paths fall back to `index.html`.

## License

MIT License. See `LICENSE` file.
