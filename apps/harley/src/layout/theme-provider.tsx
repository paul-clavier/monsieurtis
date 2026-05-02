import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
    theme: Theme;
    setTheme: (t: Theme) => void;
} | null>(null);

const systemPrefersDark = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

const applyTheme = (theme: Theme) => {
    const isDark = theme === "dark" || (theme === "system" && systemPrefersDark());
    document.documentElement.classList.toggle("dark", isDark);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "light" || saved === "dark" || saved === "system") {
            setThemeState(saved);
        }
    }, []);

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem("theme", theme);
        if (theme !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => applyTheme("system");
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
}
