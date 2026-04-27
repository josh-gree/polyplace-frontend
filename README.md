# Polyplace Grid UI Prototype

Vite prototype for navigating a 1000 x 1000 cell grid.

## Run

### Worker-local frontend

Use this when testing against the watcher on `http://127.0.0.1:8000`.
This serves the built frontend through the Cloudflare Worker on `http://127.0.0.1:8787`,
so browser requests to `/grid` and `/ws` go cross-origin to the watcher.

```sh
npm install
npm run worker:dev
```

Then open `http://127.0.0.1:8787`.

The local Wrangler environment returns this from `/config.json`:

```json
{ "backendUrl": "http://127.0.0.1:8000" }
```

Wrangler runs locally by default; do not use the deprecated `--local` flag.

### Canvas prototype only

```sh
npm install
npm run dev
```

Then open the local URL printed by Vite.

In a second terminal, start the random cell update stream:

```sh
npm run ws
```

The WebSocket server streams 1000 single-cell color update messages per second at `ws://127.0.0.1:8765/ws`.

## Controls

- Drag the grid to pan.
- Wheel or pinch to zoom around the pointer.
- Drag or click the minimap to jump around the board.
- Click a cell to mark it.
- Press `F` to fit the board.
- Press `+` or `-` to zoom around the viewport center.
- Use the arrow keys to pan.

## File Map

- `src/config.js` contains constants such as grid size, zoom limits, colors, and render thresholds.
- `src/math.js` contains small shared helpers.
- `src/board.js` creates the 1000 x 1000 grey offscreen board bitmap and applies live cell updates.
- `src/viewport.js` adapts D3 zoom transforms into grid coordinates, fit-to-screen, and visible-bound math.
- `src/renderer.js` draws the board, high-zoom cell grid, hover/selection overlays, and minimap.
- `src/input.js` wires `d3-zoom` for pointer, wheel, and pinch navigation, plus minimap and keyboard controls.
- `src/live-updates.js` consumes WebSocket cell batches and writes them into the offscreen board.
- `src/main.js` connects the pieces and handles initial resize.
- `scripts/random_cell_ws.py` is the tiny Python WebSocket producer for random updates.

## Build & deploy

Builds and deploys are handled by the **Cloudflare Workers Builds** GitHub App (`cloudflare-workers-and-pages`), configured from the Cloudflare dashboard rather than from this repo. On every push it runs `npm ci` + `npm run build` and:

- For PR branches, deploys a preview Worker and posts the URL as a bot comment on the PR.
- For `main`, deploys to production.
- Posts a `Workers Builds: polyplace-frontend` status check on each commit.

There is no GitHub Actions workflow — the Cloudflare check is the build signal. To reproduce a build locally:

```sh
npm ci        # or `npm install` for dev
npm run build
```

## Libraries

- `d3-zoom` handles pan, wheel zoom, touch zoom, pinch gestures, and transform state.
- `d3-selection` attaches the zoom behavior to the canvas element.
