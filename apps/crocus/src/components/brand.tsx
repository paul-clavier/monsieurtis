/**
 * Crocus brand marks. Pure inline SVG so they ship with the bundle, follow
 * the theme tokens via `currentColor` where possible, and need no asset
 * pipeline.
 */

/**
 * A tall lighthouse with red beacon beams — rendered as a large, faint
 * background motif behind the auth card.
 */
export function LighthouseMotif({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 200 320"
            aria-hidden="true"
            className={className}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <g stroke="oklch(0.65 0.03 300)" strokeWidth="4">
                {/* tower */}
                <path d="M84 96 L72 296 H128 L116 96 Z" />
                {/* stripes */}
                <path d="M81 146 H119" />
                <path d="M78 196 H122" />
                <path d="M75 246 H125" />
                {/* gallery + lantern room */}
                <path d="M80 96 H120" />
                <path d="M86 96 V70 H114 V96" />
                {/* roof */}
                <path d="M84 70 L100 48 L116 70" />
                <circle cx="100" cy="40" r="4" />
                {/* base */}
                <path d="M62 296 H138" />
            </g>
            {/* lantern glow + beams in crocus red */}
            <g stroke="oklch(0.58 0.21 25)" strokeWidth="5">
                <path d="M78 80 L30 64" />
                <path d="M122 80 L170 64" />
                <path d="M80 88 L44 92" opacity="0.6" />
                <path d="M120 88 L156 92" opacity="0.6" />
            </g>
            <rect
                x="90"
                y="74"
                width="20"
                height="16"
                rx="3"
                fill="oklch(0.58 0.21 25)"
            />
        </svg>
    );
}

/** The official multicolour Google "G", for OIDC provider buttons. */
export function GoogleLogo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
            />
            <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
            />
            <path
                fill="#FBBC05"
                d="M5.28 14.28a7.21 7.21 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z"
            />
            <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
            />
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
