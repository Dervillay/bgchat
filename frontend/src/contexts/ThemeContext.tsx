import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { gradients } from '../theme/gradients';
import { useFetchWithAuth } from '../utils/fetchWithAuth';
import { createThemedFaviconDataUrl, FAVICON_IMAGE_SRC } from '../utils/themedFavicon';

interface ThemeContextType {
    themeId: number;
    setTheme: (themeId: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = 'bgchat-selected-theme';
/** Light turquoise (`#A8EDEA` → `#FED6E3`) */
export const DEFAULT_THEME_ID = 5;

const clampThemeId = (value: number): number => 
    Math.max(0, Math.min(value, gradients.length - 1));

const parseThemeId = (value: string | null): number => {
    const parsed = parseInt(value ?? '', 10);
    return isNaN(parsed) ? DEFAULT_THEME_ID : clampThemeId(parsed);
};

function updateFavicon(themeId: number, image: HTMLImageElement | null) {
    if (!image) return;

    const dataUrl = createThemedFaviconDataUrl(themeId, image, 64);
    if (!dataUrl) return;

    // Replace all icon links so static .ico / cached icons don't win over the theme.
    document
        .querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']")
        .forEach((el) => el.remove());

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.sizes = "any";
    link.href = dataUrl;
    document.head.appendChild(link);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeId, setThemeId] = useState<number>(() => 
        parseThemeId(localStorage.getItem(THEME_STORAGE_KEY))
    );
    
    const fetchWithAuth = useFetchWithAuth();
    const hasSynced = useRef(false);
    const faviconImage = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        // Same-origin asset — avoid crossOrigin so the canvas isn't tainted.
        img.onload = () => {
            faviconImage.current = img;
            updateFavicon(themeId, img);
        };
        img.src = FAVICON_IMAGE_SRC;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        updateFavicon(themeId, faviconImage.current);
    }, [themeId]);

    useEffect(() => {
        if (hasSynced.current) return;
        hasSynced.current = true;
        
        fetchWithAuth(`${process.env.REACT_APP_BACKEND_URL}/user-theme`)
        .then(res => res.json())
            .then(({ data }) => {
                if (typeof data === 'number') {
                    const id = clampThemeId(data);
                    setThemeId(id);
                    localStorage.setItem(THEME_STORAGE_KEY, String(id));
                }
            })
            .catch(err => console.error('Failed to sync theme:', err));
    }, [fetchWithAuth]);

    const setTheme = useCallback((themeId: number) => {
        setThemeId(themeId);
        localStorage.setItem(THEME_STORAGE_KEY, String(themeId));
        fetchWithAuth(`${process.env.REACT_APP_BACKEND_URL}/user-theme`, {
            method: 'POST',
            body: JSON.stringify({ theme: themeId }),
        }).catch(err => console.error('Failed to save theme:', err));
    }, [fetchWithAuth]);

    return (
        <ThemeContext.Provider value={{ themeId, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
