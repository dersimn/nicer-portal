import {LitElement, html, css} from '../vendor/lit-all.min.js';
import './nice-portal-page.js';

/**
 * The portal application: loads config.json, renders pages of tiles, provides
 * tag-based search and full keyboard navigation (arrows / enter / space /
 * escape / type-to-search).
 */
export class NicePortalApp extends LitElement {
    static properties = {
        heading: {type: String},
        pages: {state: true},
        search: {state: true}
    };

    static styles = css`
        :host {
            display: block;
            min-height: 100%;
            font-family: Roboto, 'Segoe UI', system-ui, sans-serif;
            background-color: var(--bg, #37474f);
            color: #fff;
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
            border-bottom: 1px solid rgba(255, 255, 255, 0.25);
        }

        .search:focus-within {
            border-bottom-color: var(--accent, #4dd0e1);
        }

        .search svg {
            flex: 0 0 auto;
            width: 18px;
            height: 18px;
            fill: #90a4ae;
        }

        .search input {
            flex: 1 1 auto;
            min-width: 0;
            margin: 0 8px;
            padding: 10px 0;
            border: 0;
            background: transparent;
            color: #eceff1;
            font: inherit;
            outline: none;
        }

        .search input::placeholder {
            color: #78909c;
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

        .search input:not(:placeholder-shown) ~ .clear {
            visibility: visible;
        }

        .clear:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        #content {
            max-width: 1600px;
            margin: 0 auto;
            padding-bottom: 24px;
        }

        .empty {
            padding: 48px 16px;
            text-align: center;
            color: #90a4ae;
        }
    `;

    constructor() {
        super();
        this.heading = 'portal';
        this.pages = [];
        this.search = '';
        this._allPages = [];
        this._onKeydown = this._onKeydown.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('keydown', this._onKeydown);
        this._loadConfig();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this._onKeydown);
    }

    async _loadConfig() {
        try {
            const response = await fetch('./config.json');
            const config = await response.json();
            if (config.title) {
                this.heading = config.title;
                document.title = config.title;
            }
            this._allPages = Array.isArray(config.pages) ? config.pages : [];
            this.pages = this._allPages;
        } catch (error) {
            console.error('Failed to load config.json', error);
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
                                fill="#90a4ae"
                                d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                            />
                        </svg>
                    </button>
                </label>
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

    _onKeydown(event) {
        const searchFocused = this.renderRoot.activeElement === this._searchInput;

        switch (event.key) {
            case 'Escape':
                this.search = '';
                this._searchInput.blur();
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
                    this._searchInput.focus();
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
