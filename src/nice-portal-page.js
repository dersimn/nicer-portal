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

        #container {
            padding: 6px;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
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
