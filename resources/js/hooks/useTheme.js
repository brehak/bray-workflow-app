import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'theme';

/**
 * Resolve the theme to use on first paint: a stored preference if present,
 * otherwise the OS-level preference. Safe to call before React mounts.
 */
export function getInitialTheme() {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Toggle the `dark` class on <html> to match the given theme. */
export function applyTheme(theme) {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * useTheme — persists the light/dark preference in localStorage and keeps the
 * `dark` class on <html> in sync. Each page mounts this fresh on navigation and
 * reads back the stored value, so the choice persists across all pages.
 */
export function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, toggleTheme, setTheme };
}
