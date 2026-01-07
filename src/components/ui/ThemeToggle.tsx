"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`
        p-2 rounded-lg transition-all duration-300
        ${theme === 'dark'
                    ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                    : 'bg-white text-orange-500 shadow-sm border border-slate-200 hover:bg-slate-50'
                }
      `}
            aria-label="Alternar tema"
        >
            {theme === 'dark' ? (
                <Moon size={20} className="fill-yellow-400/20" />
            ) : (
                <Sun size={20} className="fill-orange-500/20" />
            )}
        </button>
    );
}
