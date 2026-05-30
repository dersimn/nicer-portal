# nicer-portal 🏰

A dead simple — but nice — tile portal webpage, rebuilt with [Lit](https://lit.dev/)
and **zero runtime dependencies**. Lit itself is vendored locally in
[vendor/lit-all.min.js](vendor/lit-all.min.js), so the whole site can be hosted
fully **air-gapped** — just static files, no CDN, no build step, no network.

Inspired by [hobbyquaker/nice-portal](https://github.com/hobbyquaker/nice-portal).

## Features

- Tile-based layout grouped into named pages (categories).
- Light / dark theme switch in the toolbar that cycles **Auto → Light → Dark**.
  Defaults to following the OS preference (`prefers-color-scheme`) and reacts to
  system changes live; an explicit choice is remembered in `localStorage` and
  applied before first paint (no flash).
- Instant tag-based search (matches every space-separated term against a tile's
  tags and title).
- Full keyboard navigation:
  - **Arrow keys** — move between tiles in the grid.
  - **Enter / Space** — open the focused tile.
  - **Enter** — when the search narrows results to a single tile, opens it.
  - **Escape** — clear the search.
  - **Any character** — starts searching immediately, from anywhere.

## Usage

Edit [config.json](config.json) to suit your needs — that's all. Each tile takes:

| field   | required | description                                            |
| ------- | -------- | ------------------------------------------------------ |
| `href`  | yes      | link target                                            |
| `img`   | yes      | icon path (e.g. `img/grafana.png`)                     |
| `tags`  | yes      | space-separated keywords used for search               |
| `title` | no       | label shown under the icon (also searched)             |

```json
{
    "title": "portal",
    "pages": [
        {"title": "Services", "tiles": [
            {"href": "https://grafana", "tags": "grafana charts", "img": "img/grafana.png"}
        ]}
    ]
}
```

## Running it

It's just static files — serve the directory with any web server, then open the
printed URL in a browser.

A server is needed only because the app `fetch`es `config.json`; opening
`index.html` via `file://` is blocked by browser CORS rules.

**Python** (if you have it on hand):

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

**Docker only** (no Python / Node needed) — serve this directory with nginx:

```sh
docker run --rm -p 8080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine
# open http://localhost:8080
```

Either way the container/server only reads static files; nothing reaches out to
the network, so it works the same air-gapped.

## Updating the vendored Lit

The only third-party code is the pinned Lit bundle. To refresh it:

```sh
curl -L -o vendor/lit-all.min.js \
  "https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js"
```
