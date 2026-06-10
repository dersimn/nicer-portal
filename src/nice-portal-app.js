import {LitElement, html, css} from '../vendor/lit-all.min.js';
import {load as parseYAML} from '../vendor/js-yaml.min.js';
import './nice-portal-page.js';

/**
 * The portal application: loads its config (config.yaml > config.yml >
 * config.json), renders pages of tiles, provides tag-based search and full
 * keyboard navigation (arrows / enter / space / escape / type-to-search).
 */
export class NicePortalApp extends LitElement {
    static properties = {
        heading: {type: String},
        pages: {state: true},
        search: {state: true},
        searchOpen: {type: Boolean, reflect: true, attribute: 'search-open'},
        themeMode: {state: true}
    };

    static styles = css`
        :host {
            display: block;
            min-height: 100%;
            font-family: Roboto, 'Segoe UI', system-ui, sans-serif;
            background-color: var(--bg, #37474f);
            color: var(--bar-fg, #fff);
        }

        header {
            position: sticky;
            top: 0;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 16px;
            height: 56px;
            padding: 0 16px;
            background-color: var(--bar-bg, #263238);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .title {
            font-size: 20px;
            font-weight: 500;
            white-space: nowrap;
        }

        .search {
            display: flex;
            align-items: center;
            flex: 1 1 auto;
            max-width: 420px;
            margin-left: auto;
            padding: 0 10px;
            border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.25));
        }

        .search:focus-within {
            border-bottom-color: var(--accent, #4dd0e1);
        }

        .search svg {
            flex: 0 0 auto;
            width: 18px;
            height: 18px;
            fill: var(--muted, #90a4ae);
        }

        .search input {
            flex: 1 1 auto;
            min-width: 0;
            margin: 0 8px;
            padding: 10px 0;
            border: 0;
            background: transparent;
            color: var(--bar-fg, #eceff1);
            font: inherit;
            outline: none;
        }

        .search input::placeholder {
            color: var(--muted, #78909c);
        }

        .clear {
            flex: 0 0 auto;
            display: flex;
            padding: 2px;
            border: 0;
            border-radius: 50%;
            background: transparent;
            cursor: pointer;
            visibility: hidden;
        }

        .clear svg {
            fill: var(--muted, #90a4ae);
        }

        .search input:not(:placeholder-shown) ~ .clear {
            visibility: visible;
        }

        .clear:hover {
            background: var(--hover-overlay, rgba(255, 255, 255, 0.1));
        }

        .theme-toggle,
        .search-toggle {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            padding: 0;
            border: 0;
            border-radius: 50%;
            background: transparent;
            color: var(--bar-fg, #fff);
            cursor: pointer;
        }

        .theme-toggle:hover,
        .search-toggle:hover {
            background: var(--hover-overlay, rgba(255, 255, 255, 0.1));
        }

        .theme-toggle:focus-visible,
        .search-toggle:focus-visible {
            outline: 2px solid var(--accent, #4dd0e1);
            outline-offset: 1px;
        }

        .theme-toggle svg,
        .search-toggle svg {
            width: 22px;
            height: 22px;
            fill: currentColor;
        }

        /* The search-toggle only exists on small screens, where the inline
           search field is collapsed behind it. */
        .search-toggle {
            display: none;
        }

        #content {
            max-width: 1600px;
            margin: 0 auto;
            padding-bottom: 24px;
        }

        .empty {
            padding: 48px 16px;
            text-align: center;
            color: var(--muted, #90a4ae);
        }

        /* Small screens: collapse the inline search behind a magnifier button.
           Tapping it expands the field across the bar (with a back arrow to
           dismiss) and hides the title and theme toggle to make room. */
        @media (max-width: 600px) {
            header {
                gap: 8px;
            }

            .search {
                display: none;
            }

            .search-toggle {
                display: flex;
                margin-left: auto;
            }

            :host([search-open]) .title,
            :host([search-open]) .theme-toggle {
                display: none;
            }

            :host([search-open]) .search {
                display: flex;
                flex: 1 1 auto;
                max-width: none;
                margin-left: 0;
            }

            :host([search-open]) .search-toggle {
                order: -1;
                margin-left: 0;
            }
        }
    `;

    constructor() {
        super();
        this.heading = 'portal';
        this.pages = [];
        this.search = '';
        this.searchOpen = false;
        this._allPages = [];
        this.themeMode = this._readThemeMode();
        this._onKeydown = this._onKeydown.bind(this);
        this._mql = window.matchMedia('(prefers-color-scheme: dark)');
        this._onSystemThemeChange = () => {
            if (this.themeMode === 'system') {
                this._applyTheme();
            }
        };
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('keydown', this._onKeydown);
        this._mql.addEventListener('change', this._onSystemThemeChange);
        this._applyTheme();
        this._loadConfig();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this._onKeydown);
        this._mql.removeEventListener('change', this._onSystemThemeChange);
    }

    async _loadConfig() {
        // Precedence: config.yaml > config.yml > config.json.
        const sources = [
            {url: './config.yaml', yaml: true},
            {url: './config.yml', yaml: true},
            {url: './config.json', yaml: false}
        ];

        for (const {url, yaml} of sources) {
            let response;
            try {
                response = await fetch(url);
            } catch (error) {
                continue; // network/file error — try the next candidate
            }
            if (!response.ok) {
                continue; // typically 404 — file not present
            }
            try {
                const text = await response.text();
                const config = yaml ? parseYAML(text) : JSON.parse(text);
                if (!config || !Array.isArray(config.pages)) {
                    continue; // not a valid portal config (e.g. SPA fallback)
                }
                this._applyConfig(config);
                return;
            } catch (error) {
                console.error(`Failed to parse ${url}`, error);
                return; // file exists but is broken — surface it, don't fall back
            }
        }
        console.error('No config found (looked for config.yaml, config.yml, config.json).');
    }

    _applyConfig(config) {
        if (config.title) {
            this.heading = config.title;
            document.title = config.title;
        }
        // Resolve `${...}` template expressions in hrefs against the current
        // location, so configs can point at the host shown in the browser bar.
        this._allPages = config.pages.map(page => ({
            ...page,
            tiles: (page.tiles || []).map(tile => ({
                ...tile,
                href: this._interpolate(tile.href)
            }))
        }));
        this.pages = this._allPages;
    }

    /** Variables exposed to href template expressions. */
    _locationContext() {
        const loc = window.location;
        const defaultPort = loc.protocol === 'https:' ? 443 : 80;
        return {
            protocol: loc.protocol, // "https:"
            hostname: loc.hostname, // "192.168.1.5" or "portal.example.com"
            port: loc.port ? Number(loc.port) : defaultPort, // number, e.g. 8080
            host: loc.host, // "192.168.1.5:8080"
            origin: loc.origin, // "https://192.168.1.5:8080"
            href: loc.href,
            pathname: loc.pathname,
            hash: loc.hash,
            search: loc.search
        };
    }

    /**
     * Evaluate a string as a JavaScript template literal with the location
     * context in scope, e.g. "http://${hostname}:${port + 1000}/foo". Strings
     * without `${` are returned unchanged. The config is a trusted, author-
     * controlled file, so evaluating it is intentional (note: a strict
     * `unsafe-eval` CSP would block this).
     */
    _interpolate(value) {
        if (typeof value !== 'string' || !value.includes('${')) {
            return value;
        }
        const ctx = this._locationContext();
        const escaped = value.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        try {
            // eslint-disable-next-line no-new-func
            const fn = new Function(...Object.keys(ctx), 'return `' + escaped + '`;');
            return fn(...Object.values(ctx));
        } catch (error) {
            console.error(`Failed to evaluate href template: ${value}`, error);
            return value;
        }
    }

    render() {
        const visible = this._visiblePages;
        return html`
            <header>
                <span class="title">${this.heading}</span>
                <label class="search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"
                        />
                    </svg>
                    <input
                        id="search"
                        type="text"
                        placeholder="Search"
                        autocomplete="off"
                        spellcheck="false"
                        .value=${this.search}
                        aria-label="Search"
                        @input=${e => {
                            this.search = e.target.value;
                        }}
                    />
                    <button
                        class="clear"
                        type="button"
                        tabindex="-1"
                        aria-label="Clear search"
                        @click=${this._clearSearch}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                            />
                        </svg>
                    </button>
                </label>
                <button
                    class="search-toggle"
                    type="button"
                    tabindex="-1"
                    aria-label=${this.searchOpen ? 'Close search' : 'Search'}
                    @click=${this._toggleSearch}
                >
                    ${this._searchToggleIcon()}
                </button>
                <button
                    class="theme-toggle"
                    type="button"
                    tabindex="-1"
                    title=${`Theme: ${this.themeMode} (click to change)`}
                    aria-label=${`Theme: ${this.themeMode}. Click to change.`}
                    @click=${this._cycleTheme}
                >
                    ${this._themeIcon()}
                </button>
            </header>
            <div id="content">
                ${visible.map(
                    page => html`
                        <nice-portal-page
                            heading=${page.title}
                            .tiles=${page.tiles}
                        ></nice-portal-page>
                    `
                )}
                ${visible.length === 0
                    ? html`<div class="empty">No matches.</div>`
                    : ''}
            </div>
        `;
    }

    /** Pages filtered by the current search terms (all terms must match tags/title). */
    get _visiblePages() {
        const query = this.search.toLowerCase().trim();
        if (!query) {
            return this._allPages;
        }
        const terms = query.split(/\s+/);
        return this._allPages
            .map(page => ({
                title: page.title,
                tiles: page.tiles.filter(tile => {
                    const haystack = `${tile.tags || ''} ${tile.title || ''}`.toLowerCase();
                    return terms.every(term => haystack.includes(term));
                })
            }))
            .filter(page => page.tiles.length > 0);
    }

    get _searchInput() {
        return this.renderRoot.querySelector('#search');
    }

    /** All currently rendered tile elements, flattened in DOM order. */
    get _tiles() {
        const tiles = [];
        this.renderRoot.querySelectorAll('nice-portal-page').forEach(page => {
            tiles.push(...page.tileElements);
        });
        return tiles;
    }

    get _activeTile() {
        return this._tiles.find(tile => tile.active) || null;
    }

    _clearSearch() {
        this.search = '';
        this._searchInput.focus();
    }

    /** Small-screen only: expand/collapse the search field behind its icon. */
    _toggleSearch() {
        this.searchOpen = !this.searchOpen;
        if (this.searchOpen) {
            // The field is freshly un-hidden; focus it after the render.
            this.updateComplete.then(() => this._searchInput?.focus());
        } else {
            this.search = '';
        }
    }

    _searchToggleIcon() {
        // Complete <svg> per branch so each is created in the SVG namespace.
        return this.searchOpen
            ? html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>`
            : html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" /></svg>`;
    }

    _readThemeMode() {
        try {
            const stored = localStorage.getItem('portal-theme');
            return stored === 'light' || stored === 'dark' ? stored : 'system';
        } catch (e) {
            return 'system';
        }
    }

    /** Resolve the active theme mode to a concrete 'light'/'dark' on <html>. */
    _applyTheme() {
        const resolved =
            this.themeMode === 'system'
                ? (this._mql.matches ? 'dark' : 'light')
                : this.themeMode;
        document.documentElement.dataset.theme = resolved;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.content = resolved === 'dark' ? '#263238' : '#ffffff';
        }
    }

    /** Cycle System -> Light -> Dark -> System and persist the choice. */
    _cycleTheme() {
        const order = ['system', 'light', 'dark'];
        this.themeMode = order[(order.indexOf(this.themeMode) + 1) % order.length];
        try {
            if (this.themeMode === 'system') {
                localStorage.removeItem('portal-theme');
            } else {
                localStorage.setItem('portal-theme', this.themeMode);
            }
        } catch (e) {
            // localStorage unavailable (e.g. private mode) — theme still applies for the session.
        }
        this._applyTheme();
    }

    _themeIcon() {
        // Each icon is a complete <svg> so the SVG namespace is established
        // within a single template (a bare <path> interpolated into <svg> would
        // be created in the HTML namespace and not render).
        switch (this.themeMode) {
            case 'light':
                // sun
                return html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2v-2H2v2zm18 0h2v-2h-2v2zm-9 9h2v-2h-2v2zM11 1v2h2V1h-2zm7.07 4.93l-1.41 1.41 1.41 1.42 1.42-1.42-1.42-1.41zM4.93 18.36l1.41-1.42-1.41-1.41-1.42 1.41 1.42 1.42zm0-12.73L3.51 7.05l1.42 1.41 1.41-1.41-1.41-1.42zm12.02 12.73l1.42 1.42 1.41-1.42-1.41-1.41-1.42 1.41z" /></svg>`;
            case 'dark':
                // moon
                return html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" /></svg>`;
            default:
                // system / auto (half-filled circle)
                return html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-18v16c-4.41 0-8-3.59-8-8s3.59-8 8-8z" /></svg>`;
        }
    }

    _onKeydown(event) {
        const searchFocused = this.renderRoot.activeElement === this._searchInput;

        switch (event.key) {
            case 'Escape':
                this.search = '';
                this._searchInput?.blur();
                this.searchOpen = false;
                return;

            case 'Enter': {
                // A single result? Open it directly even while typing.
                const tiles = this._tiles;
                if (tiles.length === 1) {
                    event.preventDefault();
                    tiles[0].activate();
                    return;
                }
                if (!searchFocused) {
                    const active = this._activeTile;
                    if (active) {
                        event.preventDefault();
                        active.activate();
                    }
                }
                return;
            }

            case ' ':
                if (!searchFocused) {
                    const active = this._activeTile;
                    if (active) {
                        event.preventDefault();
                        active.activate();
                    }
                }
                return;

            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                if (searchFocused && event.key !== 'ArrowDown') {
                    return; // let caret movement work in the search field
                }
                event.preventDefault();
                this._navigate(event.key);
                return;

            default:
                // Any other printable key starts/continues a search.
                if (!searchFocused && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    this.searchOpen = true; // reveal the field on small screens
                    this._searchInput?.focus();
                }
        }
    }

    _navigate(key) {
        const tiles = this._tiles;
        if (tiles.length === 0) {
            return;
        }

        const current = this._activeTile;
        if (!current) {
            tiles[0].focusAnchor();
            return;
        }

        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            const index = tiles.indexOf(current);
            const next = tiles[index + (key === 'ArrowRight' ? 1 : -1)];
            if (next) {
                next.focusAnchor();
            }
            return;
        }

        // Up / Down: pick the geometrically nearest tile in the target direction.
        const down = key === 'ArrowDown';
        const rect = current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const candidates = tiles
            .filter(tile => tile !== current)
            .map(tile => {
                const r = tile.getBoundingClientRect();
                return {tile, dx: r.left + r.width / 2 - cx, dy: r.top + r.height / 2 - cy};
            })
            .filter(c => (down ? c.dy > 1 : c.dy < -1));

        if (candidates.length === 0) {
            return;
        }

        // Nearest row first, then nearest column within that row.
        const minRow = Math.min(...candidates.map(c => Math.abs(c.dy)));
        const rowBand = rect.height * 0.75;
        const best = candidates
            .filter(c => Math.abs(c.dy) <= minRow + rowBand)
            .sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx))[0];

        if (best) {
            best.tile.focusAnchor();
        }
    }
}

customElements.define('nice-portal-app', NicePortalApp);
