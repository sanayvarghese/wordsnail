"use client";

import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faXmark,
    faMobileScreen,
    faKeyboard,
    faFire,
    faTrashCan,
    faAnglesDown,
    faChevronLeft,
    faChevronRight,
    faChevronDown
} from "@fortawesome/free-solid-svg-icons";
import { GameMode } from "@/lib/types";

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameMode?: GameMode;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
    isOpen,
    onClose,
    gameMode = "daily"
}) => {
    const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
            setIsTouchDevice(hasTouch);
        }
    }, []);

    if (!isOpen) return null;

    const isCrush = gameMode === "crush";

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card tutorial-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <span className="modal-header-title">
                        {isCrush ? "How to Play WordTrash" : "How to Play WordSnail"}
                    </span>
                    <button className="btn-close" onClick={onClose} id="btn-close-tutorial">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className="tutorial-content">
                    {isCrush ? (
                        /* WordTrash Mode Instructions */
                        <>
                            <div className="tutorial-step">
                                <div className="tutorial-step-num">1</div>
                                <div className="tutorial-step-text">
                                    <h4>Drop & Stack</h4>
                                    <p>Letters fall one at a time. Move them into columns to build rows.</p>
                                </div>
                            </div>

                            <div className="tutorial-step">
                                <div className="tutorial-step-num">2</div>
                                <div className="tutorial-step-text">
                                    <h4>Spell to Crush</h4>
                                    <p>Spell any valid 3+ letter word horizontally to vaporize it and score!</p>
                                </div>
                            </div>

                            <div className="tutorial-step">
                                <div className="tutorial-step-num">3</div>
                                <div className="tutorial-step-text">
                                    <h4>Combos & Score</h4>
                                    <p>Crush words back-to-back to trigger 2x, 3x multipliers and rack up your high score.</p>
                                </div>
                            </div>

                            <div className="tutorial-step">
                                <div className="tutorial-step-num">4</div>
                                <div className="tutorial-step-text">
                                    <h4>Ceiling Alert</h4>
                                    <p>Don&apos;t let any column hit 10 tiles high, or the game ends!</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* WordSnail Mode Instructions */
                        <>
                            <div className="tutorial-step">
                                <div className="tutorial-step-num">1</div>
                                <div className="tutorial-step-text">
                                    <h4>Letters Fall</h4>
                                    <p>Drop tiles into columns. Build the hidden secret word across <strong>any</strong> row.</p>
                                </div>
                            </div>

                            <div className="tutorial-step">
                                <div className="tutorial-step-num">2</div>
                                <div className="tutorial-step-text">
                                    <h4>Word Clues</h4>
                                    <div className="tutorial-example-row">
                                        <div className="tutorial-tile t-green">S</div>
                                        <div className="tutorial-tile t-yellow">T</div>
                                        <div className="tutorial-tile t-gray">A</div>
                                        <div className="tutorial-tile t-green">R</div>
                                    </div>
                                    <div className="tutorial-color-legend">
                                        <span><span className="legend-dot" style={{ background: "#538d4e" }}></span> Right spot</span>
                                        <span><span className="legend-dot" style={{ background: "#b59f3b" }}></span> Wrong spot</span>
                                        <span><span className="legend-dot" style={{ background: "#3a3a3c" }}></span> Not in word</span>
                                    </div>
                                </div>
                            </div>

                            <div className="tutorial-step">
                                <div className="tutorial-step-num">3</div>
                                <div className="tutorial-step-text">
                                    <h4>Trash Bad Tiles</h4>
                                    <p>Discard unwanted letters with Trash. Spell any 3+ letter word to earn +1 Trash!</p>
                                </div>
                            </div>

                            <div className="tutorial-step">
                                <div className="tutorial-step-num">4</div>
                                <div className="tutorial-step-text">
                                    <h4>Ceiling Alert</h4>
                                    <p>Keep columns under 10 tiles high to stay alive.</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Device-Specific Controls Box */}
                    <div className="tutorial-controls-card">
                        <div className="tutorial-controls-hdr">
                            <FontAwesomeIcon icon={isTouchDevice ? faMobileScreen : faKeyboard} />
                            <span>{isTouchDevice ? "Mobile & Touch Controls" : "Desktop Keyboard Controls"}</span>
                        </div>
                        {isTouchDevice ? (
                            <div className="tutorial-controls-list">
                                <div className="tut-ctrl-row">
                                    <span className="tut-key">↔ Swipe Left / Right</span>
                                    <span className="tut-desc">Move 1 column</span>
                                </div>
                                <div className="tut-ctrl-row">
                                    <span className="tut-key">⬇ Swipe Down</span>
                                    <span className="tut-desc">Step down 1 row</span>
                                </div>
                                <div className="tut-ctrl-row">
                                    <span className="tut-key">Drop Button</span>
                                    <span className="tut-desc">Slam tile to bottom</span>
                                </div>
                                {!isCrush && (
                                    <div className="tut-ctrl-row">
                                        <span className="tut-key">Trash Button</span>
                                        <span className="tut-desc">Discard tile</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="tutorial-controls-list">
                                <div className="tut-ctrl-row">
                                    <span className="tut-key">← / → or A / D</span>
                                    <span className="tut-desc">Move column</span>
                                </div>
                                <div className="tut-ctrl-row">
                                    <span className="tut-key">↓ or S</span>
                                    <span className="tut-desc">Step down 1 row</span>
                                </div>
                                <div className="tut-ctrl-row">
                                    <span className="tut-key">Space / Enter</span>
                                    <span className="tut-desc">Hard Drop</span>
                                </div>
                                {!isCrush && (
                                    <div className="tut-ctrl-row">
                                        <span className="tut-key">Del / Backspace</span>
                                        <span className="tut-desc">Trash tile</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action button */}
                <div className="tutorial-actions">
                    <button className="btn-primary" onClick={onClose} id="btn-tutorial-got-it">
                        Got it, Let&apos;s Play!
                    </button>
                </div>
            </div>
        </div>
    );
};
