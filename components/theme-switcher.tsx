"use client";

import { useEffect, useState } from "react";

type ThemeId = "warm" | "sky";

const themes: Array<{ id: ThemeId; label: string }> = [
  { id: "warm", label: "暖棕纸白" },
  { id: "sky", label: "蓝天白云" },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "warm";
    return window.localStorage.getItem("course-distillation-theme") === "sky"
      ? "sky"
      : "warm";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("course-distillation-theme", theme);
  }, [theme]);

  return (
    <div className="theme-switcher" aria-label="页面配色">
      {themes.map((item) => (
        <button
          key={item.id}
          type="button"
          className={theme === item.id ? "is-selected" : ""}
          aria-pressed={theme === item.id}
          onClick={() => setTheme(item.id)}
        >
          <i aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
