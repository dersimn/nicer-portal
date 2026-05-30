# nicer-portal 🏰

A dead simple — but nice — tile portal webpage, rebuilt with [Lit](https://lit.dev/)
and **no runtime fetches to the network**. Its two dependencies — Lit and
[js-yaml](https://github.com/nodeca/js-yaml) — are vendored locally in
[vendor/](vendor/), so the whole site can be hosted fully **air-gapped** — just
static files, no CDN, no build step, no network.

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

Edit the config to suit your needs — that's all. The app loads the first file it
finds, in this order:

1. `config.yaml`
2. `config.yml`
3. `config.json`

So you can write the config in either YAML or JSON. A YAML starting point is
provided in [config.example.yaml](config.example.yaml) (rename it to
`config.yaml` to use it). Each tile takes:

| field   | required | description                                            |
| ------- | -------- | ------------------------------------------------------ |
| `href`  | yes      | link target                                            |
| `img`   | yes      | icon path (e.g. `img/grafana.png`)                     |
| `tags`  | yes      | space-separated keywords used for search               |
| `title` | no       | label shown under the icon (also searched)             |
| `halo`  | no       | `true` adds a theme-aware halo around the logo so single-color (all-white or all-black) transparent PNGs stay visible. Defaults to `false`. |

### Dynamic hrefs

`href` may contain JavaScript **template expressions** (`${...}`), evaluated
against the page's current location. This is useful when the host/IP isn't known
ahead of time — e.g. the portal is reached by IP and links to other ports on the
same host:

```yaml
- href: "http://${hostname}:${port + 1000}/foo"   # quote it in YAML
```

Available variables (from `window.location`): `protocol` (`"https:"`),
`hostname`, `port` (a **number**, defaulting to 80/443), `host`, `origin`,
`href`, `pathname`, `hash`, `search`. Any valid JS expression works, so
`${port + 1000}` etc. are fine. An `href` with no `${` is used verbatim.

> Expressions are evaluated as JavaScript (via `new Function`), which is safe
> because the config is your own static file — but a strict `unsafe-eval`
> Content-Security-Policy would block it.

```yaml
# config.yaml
title: portal
pages:
  - title: Services
    tiles:
      - href: https://grafana
        tags: grafana charts
        img: img/grafana.png
```

```json
// config.json
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

## Updating the vendored libraries

The only third-party code is two pinned, self-contained ES-module bundles in
[vendor/](vendor/). Refresh them on a machine with network access (then copy
into the air-gapped host):

```sh
# Lit (web components)
curl -L -o vendor/lit-all.min.js \
  "https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js"

# js-yaml (YAML config parsing)
curl -L -o vendor/js-yaml.min.js \
  "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm"
```
