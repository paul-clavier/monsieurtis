import { createContext, useContext, useEffect, useState } from "react";

export type Color = "strawhat" | "forest";

const ColorContext = createContext<{
    color: Color;
    setColor: (c: Color) => void;
} | null>(null);

export function ColorProvider({ children }: { children: React.ReactNode }) {
    const [color, setColorState] = useState<Color>("strawhat");

    useEffect(() => {
        const saved = localStorage.getItem("color");
        if (saved === "strawhat" || saved === "forest") setColorState(saved);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute("data-color", color);
        localStorage.setItem("color", color);
    }, [color]);

    return (
        <ColorContext.Provider value={{ color, setColor: setColorState }}>
            {children}
        </ColorContext.Provider>
    );
}

export function useColor() {
    const ctx = useContext(ColorContext);
    if (!ctx) throw new Error("useColor must be used inside ColorProvider");
    return ctx;
}
