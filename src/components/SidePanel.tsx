"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCubes, faClock, faTrophy, faFire, faArrowRotateRight, faSpellCheck } from "@fortawesome/free-solid-svg-icons";

import { GameMode } from "@/lib/types";

interface SidePanelProps {
    nextLetters: string[];
    tileCount: number;
    elapsedSeconds: number;
    retriesCount: number;
    maxHeight: number;
    boardHeight: number;
    isPaused: boolean;
    onTogglePause: () => void;
    isCompleted?: boolean;
    isGameOver?: boolean;
    currentStreak?: number;
    gameMode?: GameMode;
    score?: number;
    highScore?: number;
    combo?: number;
    wordsCrushed?: number;
}

export const SidePanel: React.FC<SidePanelProps> = ({
    nextLetters,
    tileCount,
    elapsedSeconds,
    isCompleted = false,
    isGameOver = false,
    currentStreak = 0,
    gameMode = "daily",
    score = 0,
    highScore = 0,
    combo = 1,
    wordsCrushed = 0,
}) => {
    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    return (
        <>
            {/* Inline info bar: words guessed (for WordTrash) or tiles (for WordSnail) + timer */}
            <div className="game-info-bar">
                {gameMode === "crush" ? (
                    <div className="info-item" title="Words Guessed & Crushed">
                        <FontAwesomeIcon icon={faSpellCheck} />
                        <span className="info-value">{wordsCrushed}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                            {wordsCrushed === 1 ? "word" : "words"}
                        </span>
                    </div>
                ) : (
                    <div className="info-item" title="Tiles Dropped">
                        <FontAwesomeIcon icon={faCubes} />
                        <span className="info-value">{tileCount}</span>
                    </div>
                )}
                <div className="info-item" title="Elapsed Time">
                    <FontAwesomeIcon icon={faClock} />
                    <span className="info-value">{formatTime(elapsedSeconds)}</span>
                </div>
            </div>

            {/* Next tiles row or Solved / Failed status */}
            {isCompleted ? (
                <div className="solved-status-badge">
                    <FontAwesomeIcon icon={faTrophy} />
                    <span>Solved Board</span>
                    {currentStreak > 0 && (
                        <span className="side-panel-streak">
                            <FontAwesomeIcon icon={faFire} /> {currentStreak}d streak
                        </span>
                    )}
                </div>
            ) : isGameOver ? null : (
                <div className="next-tiles-row">
                    <span className="next-label">Next</span>
                    {nextLetters.map((letter, idx) => (
                        <div key={idx} className="next-tile">
                            {letter}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};
