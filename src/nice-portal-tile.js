import {LitElement, html, css} from '../vendor/lit-all.min.js';

/**
 * A single clickable portal tile: an icon, an optional title, and a link.
 * Reports focus/blur up via the `active` reflected attribute so the app can
 * track keyboard selection.
 */
export class NicePortalTile extends LitElement {
    static properties = {
        href: {type: String},
        img: {type: String},
        title: {type: String},
        tags: {type: String},
        active: {type: Boolean, reflect: true}
    };

    static styles = css`
        :host {
            display: inline-block;
            position: relative;
            box-sizing: border-box;
            width: 169px;
            height: 112px;
            margin: 6px;
            border-radius: 3px;
            background-color: var(--tile-bg, #263238);
            color: var(--tile-fg, #cfd8dc);
            text-align: center;
            box-shadow: 0 1px 3px var(--tile-shadow, rgba(0, 0, 0, 0.4));
            transition: box-shadow 120ms ease, transform 120ms ease;
        }

        :host(:hover) {
            box-shadow: 0 3px 8px var(--tile-shadow-hover, rgba(0, 0, 0, 0.5));
        }

        :host([active]) {
            box-shadow: 0 0 0 2px var(--accent, #4dd0e1), 0 6px 14px var(--tile-shadow-active, rgba(0, 0, 0, 0.6));
            transform: translateY(-1px);
        }

        a {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            text-decoration: none;
            outline: none;
            color: inherit;
        }

        #img {
            flex: 1 1 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 0;
            padding: 6px;
        }

        img {
            max-height: 80%;
            max-width: 90%;
            user-select: none;
            -webkit-user-drag: none;
            filter: var(--img-filter, none);
        }

        #title {
            flex: 0 0 auto;
            height: 20px;
            line-height: 20px;
            padding: 0 6px 6px;
            font-size: 13px;
            color: var(--tile-title, #90a4ae);
            user-select: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    `;

    constructor() {
        super();
        this.active = false;
    }

    render() {
        return html`
            <a
                id="anchor"
                href=${this.href}
                draggable="false"
                @focus=${() => {
                    this.active = true;
                }}
                @blur=${() => {
                    this.active = false;
                }}
            >
                <div id="img">
                    <img draggable="false" src=${this.img} alt=${this.title || this.tags || ''} />
                </div>
                ${this.title ? html`<div id="title">${this.title}</div>` : ''}
            </a>
        `;
    }

    /** Move keyboard focus to this tile's link. */
    focusAnchor() {
        const anchor = this.renderRoot.querySelector('#anchor');
        if (anchor) {
            anchor.focus();
        }
    }

    /** Programmatically follow this tile's link. */
    activate() {
        const anchor = this.renderRoot.querySelector('#anchor');
        if (anchor) {
            anchor.click();
        }
    }
}

customElements.define('nice-portal-tile', NicePortalTile);
