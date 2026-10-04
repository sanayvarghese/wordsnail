"use client";

import { useEffect } from "react";

/**
 * Prevents mobile browsers (Chrome on Android, iOS Safari, etc.) from triggering
 * an accidental pull-to-refresh / hard-refresh when gesturing downwards at the top of the page,
 * while allowing 100% natural, smooth vertical scrolling throughout the entire website.
 */
export function PreventPullToRefresh() {
    useEffect(() => {
        let touchStartY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                touchStartY = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const currentY = e.touches[0].clientY;
                const deltaY = currentY - touchStartY;

                // When user is scrolled to the top of the page and pulls downwards,
                // cancel the touch event so the browser cannot trigger a hard-refresh.
                const isAtTop = window.scrollY <= 0 || document.documentElement.scrollTop <= 0;
                if (isAtTop && deltaY > 0 && e.cancelable) {
                    e.preventDefault();
                }
            }
        };

        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
        };
    }, []);

    return null;
}
