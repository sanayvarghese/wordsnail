"use client";

import React, { useState, useEffect } from "react";
import { sounds } from "@/lib/sound";
import { DailyGameMeta, GameMode } from "@/lib/types";
import { Original_Surfer } from "next/font/google";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion, faVolumeHigh, faVolumeXmark, faArrowLeft, faChartBar } from "@fortawesome/free-solid-svg-icons";

interface HeaderProps {
    gameMeta: DailyGameMeta | null;
    gameMode?: GameMode;
    score?: number;
    highScore?: number;
    combo?: number;
    onOpenTutorial: () => void;
    onOpenResults?: () => void;
    onExitToMenu?: () => void;
}

const monoton = Original_Surfer({
    weight: "400",
    subsets: ["latin"],
});

export const Header: React.FC<HeaderProps> = ({
    gameMeta,
    gameMode = "daily",
    score = 0,
    highScore = 0,
    combo = 1,
    onOpenTutorial,
    onOpenResults,
    onExitToMenu
}) => {
    const [soundOn, setSoundOn] = useState<boolean>(true);

    useEffect(() => {
        setSoundOn(sounds.enabled);
    }, []);

    const toggleSound = () => {
        const next = sounds.toggle();
        setSoundOn(next);
    };

    return (
        <header className="header-wrapper">
            <div className="header-top">
                {/* Left: back button when in-game */}
                {onExitToMenu && (
                    <div className="header-actions-left">
                        <button className="btn-header-icon" onClick={onExitToMenu} title="Menu">
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                    </div>
                )}

                {/* Center: Logo + SNAIL text */}
                <div className="brand-logo-container" onClick={onExitToMenu} style={{ cursor: onExitToMenu ? "pointer" : "default" }}>
                    <img
                        src="/images/word-logo.png"
                        alt="WORD"
                        className="brand-logo-image"
                    />
                    <span className={monoton.className} style={{ fontSize: 22, marginTop: 6, color: "#F4C430" }}>
                        {gameMode === "crush" ? "TRASH" : "SNAIL"}
                    </span>
                </div>

                {/* Right: results (if available) + help + sound */}
                <div className="header-actions-right">
                    {onOpenResults && (
                        <button className="btn-header-icon" onClick={onOpenResults} title="View Results">
                            <FontAwesomeIcon icon={faChartBar} />
                        </button>
                    )}
                    <button className="btn-header-icon" onClick={onOpenTutorial} title="How to Play">
                        <FontAwesomeIcon icon={faCircleQuestion} />
                    </button>
                    <button className="btn-header-icon" onClick={toggleSound} title={soundOn ? "Mute" : "Unmute"}>
                        <FontAwesomeIcon icon={soundOn ? faVolumeHigh : faVolumeXmark} />
                    </button>
                </div>
            </div>

            {/* WordTrash SCORE and BEST score boxes */}
            {gameMode === "crush" && (
                <div className="crush-score-bar">
                    <div className="crush-score-box">
                        <span className="crush-score-label">SCORE</span>
                        <span className="crush-score-value">{score.toLocaleString()}</span>
                    </div>
                    {combo > 1 && (
                        <div className="crush-combo-badge">
                            {combo}x
                        </div>
                    )}
                    <div className="crush-score-box">
                        <span className="crush-score-label">BEST</span>
                        <span className="crush-score-value">{highScore.toLocaleString()}</span>
                    </div>
                </div>
            )}
        </header>
    );
};
