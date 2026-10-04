"use client";

import React, { useState, useEffect } from "react";
import { DailyGameMeta, GameMode } from "@/lib/types";
import { getStreakData } from "@/lib/streak";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faShareFromSquare, faArrowRotateRight, faDice, faHouse, faLock, faTrophy, faSkull, faTableCells, faFire } from "@fortawesome/free-solid-svg-icons";
import { fireWinConfetti } from "@/lib/confetti";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameMode?: GameMode;
    isWon?: boolean;
    gameMeta: DailyGameMeta | null;
    word: string;
    winningRow: number;
    tileCount: number;
    elapsedSeconds: number;
    retriesCount: number;
    columns: string[][];
    score?: number;
    highScore?: number;
    wordsCrushed?: number;
    bestWord?: string;
    isNewHighScore?: boolean;
    onPlayAgain: () => void;
    onReturnToMenu?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    gameMode = "daily",
    isWon = true,
    gameMeta,
    word,
    winningRow,
    tileCount,
    elapsedSeconds,
    retriesCount,
    columns,
    score = 0,
    highScore = 0,
    wordsCrushed = 0,
    bestWord = "",
    isNewHighScore = false,
    onPlayAgain,
    onReturnToMenu
}) => {
    const [copied, setCopied] = useState<boolean>(false);
    const streak = getStreakData(gameMeta?.date || undefined);

    useEffect(() => {
        if (isOpen && (isWon || isNewHighScore)) {
            fireWinConfetti();
        }
    }, [isOpen, isWon, isNewHighScore]);

    if (!isOpen) return null;

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const generateEmojiGrid = (): string => {
        let grid = "";
        const colsCount = gameMode === "crush" ? (columns.length || 5) : word.length;
        const maxH = Math.max(...columns.map(c => c.length), 0);
        for (let r = maxH - 1; r >= 0; r--) {
            let rowStr = "";
            for (let c = 0; c < colsCount; c++) {
                if (columns[c] && r < columns[c].length) {
                    if (gameMode === "crush") {
                        rowStr += "🟧";
                    } else {
                        const char = columns[c][r];
                        if (char === word[c]) rowStr += "🟩";
                        else if (word.includes(char)) rowStr += "🟨";
                        else rowStr += "⬛";
                    }
                } else {
                    rowStr += "▫️";
                }
            }
            grid += rowStr + "\n";
        }
        return grid;
    };

    const handleCopy = () => {
        let text = "";

        if (gameMode === "crush") {
            const highStr = isNewHighScore ? " (NEW BEST!)" : ` (Best: ${highScore.toLocaleString()})`;
            const bestWordStr = bestWord ? `\nBest Word: "${bestWord}"` : "";
            text = `WordSnail - WordTrash\n` +
                `Score: ${score.toLocaleString()} PTS${highStr}\n` +
                `Words: ${wordsCrushed}${bestWordStr}\n` +
                `${tileCount} tiles | ${formatTime(elapsedSeconds)}\n\n` +
                generateEmojiGrid() +
                `\nwordsnail.com`;
        } else if (gameMode === "practice") {
            const titleLine = isWon
                ? `Word: ${word} (Row ${winningRow + 1})`
                : `Ceiling Hit!`;
            text = `WordSnail - Practice\n` +
                `${titleLine}\n` +
                `${tileCount} tiles | ${formatTime(elapsedSeconds)}\n\n` +
                generateEmojiGrid() +
                `\nwordsnail.com`;
        } else {
            const dateStr = gameMeta?.date || "Daily";
            const idStr = gameMeta?.id ? `#${gameMeta.id}` : "";
            const retriesStr = retriesCount > 0 ? ` | Retries: ${retriesCount}` : "";
            const streakStr = streak.currentStreak > 0 ? ` | Streak: ${streak.currentStreak}` : "";
            const titleLine = isWon
                ? `Word: ${word} (Row ${winningRow + 1})`
                : `Ceiling Hit! (Attempt ${retriesCount + 1})`;
            text = `WordSnail ${idStr} (${dateStr})\n` +
                `${titleLine}\n` +
                `${tileCount} tiles | ${formatTime(elapsedSeconds)}${retriesStr}${streakStr}\n\n` +
                generateEmojiGrid() +
                `\nwordsnail.com`;
        }

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        }).catch(() => { });
    };

    const getHeaderText = () => {
        if (gameMode === "crush") return isNewHighScore ? "NEW HIGH SCORE" : "GAME OVER";
        if (isWon) return "SOLVED";
        return "CEILING HIT";
    };

    const isLoss = gameMode === "crush" ? !isNewHighScore : !isWon;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card share-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className={`celebration-tag ${isLoss ? "loss-tag" : ""}`}>
                        {getHeaderText()}
                    </span>
                    <button className="btn-close" onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className="share-body">
                    {/* Mascot */}
                    <div className="share-mascot-container">
                        <img
                            src={gameMode === "crush"
                                ? (isNewHighScore ? "/mascot/happy-snail.png" : "/mascot/losing-snail.png")
                                : (isWon ? "/mascot/word-found.png" : "/mascot/losing-snail.png")}
                            alt="Result"
                            className="share-mascot-img"
                        />
                    </div>

                    {gameMode === "crush" ? (
                        <>
                            <div className="share-word-reveal" style={{ color: isNewHighScore ? "#F4C430" : "var(--color-accent)" }}>
                                {score.toLocaleString()} PTS
                            </div>
                            <div className="share-stats-grid">
                                <div className="share-stat-box">
                                    <span className="stat-number">{wordsCrushed}</span>
                                    <span className="stat-desc">Words</span>
                                </div>
                                <div className="share-stat-box">
                                    <span className="stat-number">{highScore.toLocaleString()}</span>
                                    <span className="stat-desc">Best</span>
                                </div>
                                <div className="share-stat-box">
                                    <span className="stat-number">{formatTime(elapsedSeconds)}</span>
                                    <span className="stat-desc">Time</span>
                                </div>
                            </div>
                        </>
                    ) : isWon ? (
                        <>
                            <div className="share-result-header">Word Found</div>
                            <div className="share-word-reveal">{word}</div>
                            <p className="share-row-info">Row {winningRow + 1}</p>
                            <div className="share-stats-grid four-col">
                                <div className="share-stat-box">
                                    <span className="stat-number">{tileCount}</span>
                                    <span className="stat-desc">Tiles</span>
                                </div>
                                <div className="share-stat-box">
                                    <span className="stat-number">{formatTime(elapsedSeconds)}</span>
                                    <span className="stat-desc">Time</span>
                                </div>
                                <div className="share-stat-box streak-stat">
                                    <span className="stat-number">
                                        <FontAwesomeIcon icon={faFire} className="streak-flame" /> {streak.currentStreak}
                                    </span>
                                    <span className="stat-desc">Streak</span>
                                </div>
                                <div className="share-stat-box">
                                    <span className="stat-number">{streak.maxStreak}</span>
                                    <span className="stat-desc">Max</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mystery-word-wrap">
                                <span className="mystery-tag">
                                    <FontAwesomeIcon icon={faLock} /> WORD HIDDEN
                                </span>
                                <div className="mystery-tiles-row">
                                    {Array.from({ length: word.length || 5 }).map((_, i) => (
                                        <span key={i} className="mystery-tile">?</span>
                                    ))}
                                </div>
                                <p className="share-row-info">
                                    Columns hit the ceiling. Retry to solve it.
                                </p>
                            </div>
                            <div className="share-stats-grid">
                                <div className="share-stat-box">
                                    <span className="stat-number">{tileCount}</span>
                                    <span className="stat-desc">Tiles</span>
                                </div>
                                <div className="share-stat-box">
                                    <span className="stat-number">{formatTime(elapsedSeconds)}</span>
                                    <span className="stat-desc">Time</span>
                                </div>
                                <div className="share-stat-box">
                                    <span className="stat-number">{retriesCount}</span>
                                    <span className="stat-desc">Retries</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Emoji grid */}
                    <div className="share-emoji-preview">
                        <pre className="emoji-text">{generateEmojiGrid()}</pre>
                    </div>

                    {/* Actions */}
                    <div className="share-actions">
                        <div className="share-actions-row">
                            <button className="btn-share" onClick={handleCopy}>
                                <FontAwesomeIcon icon={faShareFromSquare} />
                                {copied ? "Copied!" : "Share"}
                            </button>
                            <button className="btn-play-again" onClick={onPlayAgain}>
                                <FontAwesomeIcon icon={isWon ? faDice : faArrowRotateRight} />
                                {isWon
                                    ? "Play Random"
                                    : gameMode === "daily"
                                        ? "Retry"
                                        : gameMode === "crush"
                                            ? "Play Again"
                                            : "Next"}
                            </button>
                        </div>
                        {onReturnToMenu ? (
                            <div className="share-actions-row" style={{ marginTop: 8 }}>
                                <button className="btn-menu" onClick={onClose} title="View your solved board">
                                    <FontAwesomeIcon icon={faTableCells} /> View Board
                                </button>
                                <button className="btn-menu" onClick={onReturnToMenu}>
                                    <FontAwesomeIcon icon={faHouse} /> Menu
                                </button>
                            </div>
                        ) : (
                            <button className="btn-menu" onClick={onClose} style={{ marginTop: 8 }} title="View your solved board">
                                <FontAwesomeIcon icon={faTableCells} /> View Board
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
