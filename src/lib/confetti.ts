import confetti from "canvas-confetti";

/**
 * Fires multi-stage celebratory confetti when a word is solved / game is won.
 */
export function fireWinConfetti() {
    if (typeof window === "undefined") return;

    // Stage 1: Immediate center burst of victory gold, emerald green, and crisp white
    confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#F4C430", "#538d4e", "#6aaa64", "#ffffff", "#ffd700"],
        disableForReducedMotion: true,
    });

    // Stage 2: Dual cannon blasts from both lower corners
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0.05, y: 0.75 },
            colors: ["#F4C430", "#538d4e", "#ff6b5c", "#ffd700"],
            disableForReducedMotion: true,
        });
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 0.95, y: 0.75 },
            colors: ["#F4C430", "#538d4e", "#ff6b5c", "#ffd700"],
            disableForReducedMotion: true,
        });
    }, 180);

    // Stage 3: Gentle star & ribbon cascade
    setTimeout(() => {
        confetti({
            particleCount: 65,
            spread: 100,
            origin: { y: 0.5 },
            colors: ["#F4C430", "#538d4e", "#ffffff", "#ffd700"],
            shapes: ["circle", "square"],
            scalar: 1.15,
            disableForReducedMotion: true,
        });
    }, 420);
}
