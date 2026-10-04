"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { DailyHub } from "@/components/DailyHub";
import { TutorialModal } from "@/components/TutorialModal";
import { ShareModal } from "@/components/ShareModal";
import { DailyGameMeta, SavedGameState } from "@/lib/types";

export default function HomePage() {
    const router = useRouter();

    const [gameMeta, setGameMeta] = useState<DailyGameMeta | null>(null);
    const [savedGame, setSavedGame] = useState<SavedGameState | null>(null);
    const [crushHighScore, setCrushHighScore] = useState<number>(0);
    const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
    const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

    useEffect(() => {
        // 1. Get user's local date (DD-MM-YYYY)
        const now = new Date();
        const localDate = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;

        // 2. Fetch today's daily puzzle meta for user's timezone
        fetch(`/api/today?date=${encodeURIComponent(localDate)}`)
            .then(res => res.json())
            .then((meta: DailyGameMeta) => {
                setGameMeta(meta);
                const targetKey = meta.date || meta.word || localDate;
                const saved = localStorage.getItem(`wordsnail_daily_save_${targetKey}`);
                if (saved) {
                    try {
                        setSavedGame(JSON.parse(saved));
                    } catch { }
                }
            })
            .catch(() => { });

        // 3. Load WordTrash high score
        const savedHigh = localStorage.getItem("wordsnail_crush_highscore");
        if (savedHigh) {
            setCrushHighScore(Number(savedHigh) || 0);
        }
    }, []);

    return (
        <main className="app-container">
            {/* Header */}
            <Header
                gameMeta={gameMeta}
                gameMode="daily"
                onOpenTutorial={() => setIsTutorialOpen(true)}
            />

            {/* Central Mode Hub Screen */}
            <DailyHub
                gameMeta={gameMeta}
                savedGame={savedGame}
                crushHighScore={crushHighScore}
                onStartDailyGame={() => router.push("/daily")}
                onResumeDailyGame={() => router.push("/daily")}
                onStartPracticeGame={() => router.push("/practice")}
                onStartCrushGame={() => router.push("/wordtrash")}
                onViewDailyResult={() => router.push("/daily")}
            />

            {/* Tutorial Modal */}
            <TutorialModal
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
            />

            {/* Share / Results Modal (for completed daily game preview from Hub) */}
            {savedGame && (
                <ShareModal
                    isOpen={isShareOpen}
                    onClose={() => setIsShareOpen(false)}
                    gameMode="daily"
                    isWon={Boolean(savedGame.isWon)}
                    gameMeta={gameMeta}
                    word={savedGame.word}
                    winningRow={savedGame.winningRow ?? -1}
                    tileCount={savedGame.tileCount}
                    elapsedSeconds={savedGame.elapsedSeconds}
                    retriesCount={savedGame.retriesCount}
                    columns={savedGame.columns || []}
                    onPlayAgain={() => {
                        setIsShareOpen(false);
                        if (savedGame.isWon) {
                            router.push("/practice");
                        } else {
                            router.push("/daily");
                        }
                    }}
                    onReturnToMenu={() => setIsShareOpen(false)}
                />
            )}
        </main>
    );
}
