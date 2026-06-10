import logo from "@monsieurtis/ui/images/logo.svg";
import { createRootRoute } from "@tanstack/react-router";

import { PageLayout } from "../layout/page-layout";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: "MonsieurTis blog, Harley",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
            {
                rel: "icon",
                type: "image/svg+xml",
                href: logo,
            },
        ],
    }),
    shellComponent: PageLayout,
});
