"use client";

import React, { useState, useEffect } from "react";
import { DailyGameMeta, SavedGameState, GameMode } from "@/lib/types";
import { getStreakData, DailyStreakData } from "@/lib/streak";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlay, faArrowRotateRight, faDice, faChartBar, faTrophy,
    faCalendarDay, faTrashCan, faClock, faCubes, faBolt, faFire, faInfinity, faTableCells
} from "@fortawesome/free-solid-svg-icons";

interface DailyHubProps {
    gameMeta: DailyGameMeta | null;
    savedGame: SavedGameState | null;
    crushHighScore: number;
    onStartDailyGame: () => void;
    onResumeDailyGame: () => void;
    onStartPracticeGame: () => void;
    onStartCrushGame: () => void;
    onViewDailyResult?: () => void;
}

export const DailyHub: React.FC<DailyHubProps> = ({
    gameMeta,
    savedGame,
    crushHighScore,
    onStartDailyGame,
    onResumeDailyGame,
    onStartPracticeGame,
    onStartCrushGame,
    onViewDailyResult
}) => {
    const [selectedTab, setSelectedTab] = useState<GameMode>("daily");
    const [streak, setStreak] = useState<DailyStreakData>({
        currentStreak: 0,
        maxStreak: 0,
        lastSolvedDate: "",
        totalWins: 0,
        totalPlayed: 0
    });

    const isCompleted = Boolean(savedGame?.isWon);
    const hasCeilingLoss = Boolean(savedGame && !savedGame.isWon && (savedGame.isGameOver || (savedGame.retriesCount || 0) > 0));
    const isInProgress = Boolean(
        savedGame &&
        !savedGame.isWon &&
        !savedGame.isGameOver &&
        (savedGame.tileCount > 0 || savedGame.columns?.some(c => c.length > 0))
    );

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    useEffect(() => {
        setStreak(getStreakData(gameMeta?.date || undefined));
    }, [gameMeta?.date, isCompleted]);

    const getDailyMascotSrc = () => {
        if (isCompleted) return "/mascot/word-found.png";
        if (isInProgress) return "/mascot/sleeping-snail.png";
        if (hasCeilingLoss) return "/mascot/losing-snail.png";
        return "/mascot/happy-snail.png";
    };

    return (
        <div className="start-screen-wrapper">
            {/* Mode Tabs */}
            <div className="mode-toggle-group">
                <button
                    className={`btn-mode-tab ${selectedTab === "daily" ? "active" : ""}`}
                    onClick={() => setSelectedTab("daily")}
                >
                    WordSnail
                </button>
                <button
                    className={`btn-mode-tab ${selectedTab === "crush" ? "active" : ""}`}
                    onClick={() => setSelectedTab("crush")}
                >
                    WordTrash
                </button>
            </div>

            <div className="start-card">
                {selectedTab === "daily" ? (
                    <>
                        <div className="start-badge-wrap">
                            <span className="start-badge">
                                <FontAwesomeIcon icon={faCalendarDay} />
                                {isCompleted
                                    ? `Solved ${gameMeta?.date || "Today"}`
                                    : gameMeta ? `#${gameMeta.id} · ${gameMeta.date}` : "Loading..."}
                            </span>
                            {streak.currentStreak > 0 && (
                                <span className="streak-badge">
                                    <FontAwesomeIcon icon={faFire} />
                                    {streak.currentStreak}d streak
                                </span>
                            )}
                        </div>

                        <div className="hub-mascot-container">
                            <img
                                src={getDailyMascotSrc()}
                                alt="Snail"
                                className="hub-mascot-img"
                            />
                        </div>

                        {isCompleted ? (
                            <>
                                <h2 className="start-headline" style={{ color: "#6aaa64" }}>Completed</h2>
                                <p className="start-subtext">
                                    You solved today&apos;s puzzle. View your board, share your result, or play practice mode.
                                </p>

                                <div className="completed-box">
                                    <div className="completed-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <FontAwesomeIcon icon={faTrophy} />
                                            <strong>Daily Solved</strong>
                                        </div>
                                        {streak.currentStreak > 0 && (
                                            <span className="completed-streak-tag">
                                                <FontAwesomeIcon icon={faFire} /> {streak.currentStreak} {streak.currentStreak === 1 ? "day streak" : "days streak"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="resume-stats">
                                        <span>Row <strong>{(savedGame?.winningRow ?? 0) + 1}</strong></span>
                                        <span>Tiles <strong>{savedGame?.tileCount}</strong></span>
                                        <span>{formatTime(savedGame?.elapsedSeconds || 0)}</span>
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <button className="btn-play-daily completed-mode" onClick={onResumeDailyGame}>
                                        <FontAwesomeIcon icon={faTableCells} /> View Board
                                    </button>
                                    <button className="btn-practice" onClick={onStartPracticeGame} style={{ width: "100%", padding: 10 }}>
                                        <FontAwesomeIcon icon={faDice} /> Practice Mode
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="start-headline">Daily Puzzle</h2>
                                <p className="start-subtext">
                                    Letters fall — slide them to spell the hidden word in any row before hitting the ceiling.
                                </p>

                                {streak.currentStreak > 0 && (
                                    <div className="streak-reminder-bar">
                                        <FontAwesomeIcon icon={faFire} />
                                        <span><strong>{streak.currentStreak} day streak</strong> active · Solve today to keep it!</span>
                                    </div>
                                )}

                                {isInProgress && savedGame && (
                                    <div className="resume-box">
                                        <div className="resume-header">
                                            <FontAwesomeIcon icon={faCubes} />
                                            <strong>Game in progress</strong>
                                        </div>
                                        <div className="resume-stats">
                                            <span><strong>{savedGame.tileCount}</strong> tiles</span>
                                            <span>{formatTime(savedGame.elapsedSeconds)}</span>
                                            {savedGame.retriesCount > 0 && (
                                                <span>Retries: <strong>{savedGame.retriesCount}</strong></span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {isInProgress ? (
                                        <button className="btn-play-daily resume-mode" onClick={onResumeDailyGame}>
                                            <FontAwesomeIcon icon={faPlay} /> Resume
                                        </button>
                                    ) : hasCeilingLoss ? (
                                        <button className="btn-play-daily resume-mode" onClick={onStartDailyGame}>
                                            <FontAwesomeIcon icon={faArrowRotateRight} /> Retry (#{(savedGame?.retriesCount || 0) + 1})
                                        </button>
                                    ) : (
                                        <button className="btn-play-daily" onClick={onStartDailyGame}>
                                            <FontAwesomeIcon icon={faPlay} /> Play
                                        </button>
                                    )}

                                    <button className="btn-practice" onClick={onStartPracticeGame} style={{ width: "100%", padding: 10 }}>
                                        <FontAwesomeIcon icon={faDice} /> Practice Mode
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="start-info-pills">
                            <span className="info-pill"><FontAwesomeIcon icon={faClock} /> Timed</span>
                            <span className="info-pill"><FontAwesomeIcon icon={faBolt} /> Word Rewards</span>
                            <span className="info-pill"><FontAwesomeIcon icon={faInfinity} /> Practice</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="start-badge-wrap">
                            <span className="start-badge">
                                <FontAwesomeIcon icon={faTrashCan} /> WORDTRASH
                            </span>
                        </div>

                        <div className="hub-mascot-container">
                            <img
                                src="/mascot/happy-snail.png"
                                alt="Snail"
                                className="hub-mascot-img"
                            />
                        </div>

                        <h2 className="start-headline" style={{ color: "#F4C430" }}>WordTrash</h2>
                        <p className="start-subtext">
                            Spell 3+ letter words to clear tiles. Chain cascades for combos and chase your best score.
                        </p>

                        <div className="crush-hub-highscore-box">
                            <div className="crush-hub-highscore-label">
                                <FontAwesomeIcon icon={faTrophy} /> HIGH SCORE
                            </div>
                            <div className="crush-hub-highscore-value">
                                {crushHighScore > 0 ? `${crushHighScore.toLocaleString()}` : "—"}
                            </div>
                            <div className="crush-hub-highscore-sub">
                                {crushHighScore > 0 ? "Can you beat it?" : "Play to set a record"}
                            </div>
                        </div>

                        <button className="btn-play-daily crush-mode" onClick={onStartCrushGame}>
                            <FontAwesomeIcon icon={faPlay} /> Play WordTrash
                        </button>

                        <div className="start-info-pills">
                            <span className="info-pill"><FontAwesomeIcon icon={faBolt} /> Cascades</span>
                            <span className="info-pill"><FontAwesomeIcon icon={faFire} /> Combos</span>
                            <span className="info-pill"><FontAwesomeIcon icon={faInfinity} /> Infinite</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
