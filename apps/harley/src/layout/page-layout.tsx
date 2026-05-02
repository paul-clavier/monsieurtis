import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@monsieurtis/ui/components/dropdown-menu";
import logo from "@monsieurtis/ui/images/logo.svg";
import pp from "@monsieurtis/ui/images/pp.png";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { HeadContent, Link, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Settings } from "lucide-react";
import type { Color } from "./color-provider";
import { ColorProvider, useColor } from "./color-provider";
import type { Theme } from "./theme-provider";
import { ThemeProvider, useTheme } from "./theme-provider";

export function PageLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>
            <body>
                <ThemeProvider>
                    <ColorProvider>
                        <Header />
                        <main className="px-6 py-8">{children}</main>
                    </ColorProvider>
                </ThemeProvider>
                <TanStackDevtools
                    config={{ position: "bottom-right" }}
                    plugins={[
                        {
                            name: "Tanstack Router",
                            render: <TanStackRouterDevtoolsPanel />,
                        },
                    ]}
                />
                <Scripts />
            </body>
        </html>
    );
}

function Header() {
    return (
        <header className="grid grid-cols-3 items-center border-b-2 px-6 py-3">
            <div />
            <div className="text-center">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-lg font-semibold"
                >
                    <img src={logo} alt="" className="size-8" />
                    MonsieurTis
                </Link>
            </div>
            <div className="flex items-center justify-end gap-3">
                <Link to="/about" aria-label="About">
                    <img
                        src={pp}
                        alt=""
                        className="size-8 rounded-full object-cover"
                    />
                </Link>
                <SettingsMenu />
            </div>
        </header>
    );
}

function SettingsMenu() {
    const { theme, setTheme } = useTheme();
    const { color, setColor } = useColor();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label="Settings"
                className="cursor-pointer rounded-full p-2 outline-none hover:bg-accent data-[state=open]:bg-accent"
            >
                <Settings className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                            value={theme}
                            onValueChange={(v: string) => setTheme(v as Theme)}
                        >
                            <DropdownMenuRadioItem value="light">
                                Light
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="dark">
                                Dark
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="system">
                                System
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Color</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                            value={color}
                            onValueChange={(v: string) => setColor(v as Color)}
                        >
                            <DropdownMenuRadioItem value="strawhat">
                                Strawhat
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="forest">
                                Forest
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
