import {LitElement, html, css} from '../vendor/lit-all.min.js';
import './nice-portal-tile.js';

/**
 * A titled group ("page") of tiles. Hidden automatically when it has no tiles
 * to show (e.g. filtered out by search).
 */
export class NicePortalPage extends LitElement {
    static properties = {
        heading: {type: String},
        tiles: {type: Array}
    };

    static styles = css`
        :host {
            display: block;
        }

        :host([hidden]) {
            display: none;
        }

        h3 {
            margin: 0;
            padding: 16px 12px 4px;
            font-size: 16px;
            font-weight: 500;
            color: var(--heading-fg, #eceff1);
        }

        /* Auto-fill grid: tracks are at least one tile wide and stretch to
           fill the row, so there's never leftover space on the right. Narrow
           screens collapse to two columns, then one on the smallest phones. */
        #container {
            padding: 12px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
        }

        /* Override the tile's intrinsic fixed width so it fills its grid track
           (outer-tree rules win over the tile's own :host width). */
        #container nice-portal-tile {
            width: 100%;
            margin: 0;
        }
    `;

    constructor() {
        super();
        this.tiles = [];
    }

    render() {
        return html`
            <h3>${this.heading}</h3>
            <div id="container">
                ${this.tiles.map(
                    tile => html`
                        <nice-portal-tile
                            href=${tile.href}
                            img=${tile.img}
                            title=${tile.title || ''}
                            tags=${tile.tags || ''}
                            ?halo=${tile.halo === true}
                        ></nice-portal-tile>
                    `
                )}
            </div>
        `;
    }

    /** All tile elements in this page, in DOM order. */
    get tileElements() {
        return [...this.renderRoot.querySelectorAll('nice-portal-tile')];
    }
}

customElements.define('nice-portal-page', NicePortalPage);
