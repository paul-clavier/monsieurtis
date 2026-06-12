/**
 * Crocus brand marks. Pure inline SVG so they ship with the bundle, follow
 * the theme tokens via `currentColor` where possible, and need no asset
 * pipeline.
 */

/**
 * A stylised crocus bloom — three violet petals around a red/saffron stigma.
 * Rendered as a large, faint background motif behind the auth card.
 */
export function CrocusMotif({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 200 240"
            aria-hidden="true"
            className={className}
            fill="none"
        >
            {/* stem */}
            <path
                d="M100 130 C100 175 96 205 88 236"
                stroke="oklch(0.45 0.07 150)"
                strokeWidth="4"
                strokeLinecap="round"
            />
            {/* side petals */}
            <path
                d="M100 128 C58 118 44 78 52 38 C80 52 98 84 100 128 Z"
                fill="oklch(0.42 0.16 300)"
            />
            <path
                d="M100 128 C142 118 156 78 148 38 C120 52 102 84 100 128 Z"
                fill="oklch(0.42 0.16 300)"
            />
            {/* centre petal */}
            <path
                d="M100 130 C78 92 80 48 100 14 C120 48 122 92 100 130 Z"
                fill="oklch(0.5 0.18 310)"
            />
            {/* saffron stigmas — the red heart of the crocus */}
            <path
                d="M100 124 C96 104 94 88 96 72 M100 124 C100 102 100 86 100 68 M100 124 C104 104 106 88 104 72"
                stroke="oklch(0.6 0.22 25)"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <circle cx="96" cy="70" r="4" fill="oklch(0.6 0.22 25)" />
            <circle cx="100" cy="66" r="4" fill="oklch(0.6 0.22 25)" />
            <circle cx="104" cy="70" r="4" fill="oklch(0.6 0.22 25)" />
        </svg>
    );
}

/**
 * A minimal lighthouse glyph — tower with beacon beams. Inherits
 * `currentColor` so it sits quietly in the footer next to the wordmark.
 */
export function LighthouseMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* tower */}
            <path d="M10 9 L9 21 H15 L14 9 Z" />
            {/* lantern room */}
            <path d="M10 9 V6 H14 V9" />
            <path d="M9.2 6 H14.8" />
            {/* roof */}
            <path d="M10 6 L12 3.5 L14 6" />
            {/* beams */}
            <path d="M8 5 L4.5 3.5 M16 5 L19.5 3.5" />
            {/* base */}
            <path d="M7.5 21 H16.5" />
        </svg>
    );
}
