"use client";

import React from "react";
import { CellCoord, GameMode } from "@/lib/types";

// SVG crack patterns
const CRACK_SVGS = [
    `<svg class="tile-crack-svg" viewBox="0 0 46 46">
        <path class="crack-fissure-bg" d="M8 0 L10 10 L4 18 M38 0 L34 10 L46 16 M12 46 L18 36 L14 28" />
        <path class="crack-fissure" d="M8 0 L10 10 L4 18 M38 0 L34 10 L46 16 M12 46 L18 36 L14 28" />
    </svg>`,
    `<svg class="tile-crack-svg" viewBox="0 0 46 46">
        <path class="crack-fissure-bg" d="M0 8 L12 12 L16 4 M36 46 L32 34 L46 30 M0 36 L10 32" />
        <path class="crack-fissure" d="M0 8 L12 12 L16 4 M36 46 L32 34 L46 30 M0 36 L10 32" />
    </svg>`,
    `<svg class="tile-crack-svg" viewBox="0 0 46 46">
        <path class="crack-fissure-bg" d="M28 0 L24 8 L32 14 M4 46 L8 34 L0 28 M46 10 L38 18" />
        <path class="crack-fissure" d="M28 0 L24 8 L32 14 M4 46 L8 34 L0 28 M46 10 L38 18" />
    </svg>`,
    `<svg class="tile-crack-svg" viewBox="0 0 46 46">
        <path class="crack-fissure-bg" d="M0 16 L8 12 L12 0 M46 34 L36 38 L32 46 M42 4 L34 10" />
        <path class="crack-fissure" d="M0 16 L8 12 L12 0 M46 34 L36 38 L32 46 M42 4 L34 10" />
    </svg>`
];

interface BoardProps {
    word: string;
    gameMode?: GameMode;
    boardHeight: number;
    columns: string[][];
    fallingCol: number;
    fallingRow: number;
    fallingLetter: string;
    isLocking: boolean;
    isGameOver: boolean;
    isFocusPaused: boolean;
    winningRow: number;
    pendingClearRows: number[];
    flashingWordCells: CellCoord[];
    boardRumble: boolean;
    onColumnClick: (col: number) => void;
    onResumeFocus: () => void;
    boardContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const Board: React.FC<BoardProps> = ({
    word,
    gameMode = "daily",
    boardHeight,
    columns,
    fallingCol,
    fallingRow,
    fallingLetter,
    isLocking,
    isGameOver,
    isFocusPaused,
    winningRow,
    pendingClearRows,
    flashingWordCells,
    boardRumble,
    onColumnClick,
    onResumeFocus,
    boardContainerRef
}) => {
    const landingRow = columns[fallingCol] ? columns[fallingCol].length : 0;

    const getTileColor = (letter: string, col: number): string => {
        if (gameMode === "crush") return "crush-tile";
        if (letter === word[col]) return "green";
        if (word.includes(letter)) return "yellow";
        return "gray";
    };

    const cells: React.ReactNode[] = [];
    for (let r = boardHeight - 1; r >= 0; r--) {
        for (let c = 0; c < word.length; c++) {
            const isFallingCell = !isGameOver && c === fallingCol && r === fallingRow;
            const isGhostCell = !isGameOver && c === fallingCol && r === landingRow && fallingRow > landingRow;
            const stack = columns[c] || [];
            const isLockedCell = r < stack.length;
            const isFlashingWord = flashingWordCells.some(pt => pt.col === c && pt.row === r);
            const isCrackingRow = pendingClearRows.includes(r);
            const isWinningCell = winningRow !== -1 && r === winningRow;

            let cellClass = "cell";
            let content: React.ReactNode = null;

            if (isFallingCell) {
                cellClass += " falling";
                if (isLocking) cellClass += " locking";
                content = fallingLetter;
            } else if (isGhostCell) {
                cellClass += " ghost";
                content = fallingLetter;
            } else if (isLockedCell) {
                const lockedLetter = stack[r];
                const colorClass = getTileColor(lockedLetter, c);
                cellClass += ` locked ${colorClass}`;
                if (isFlashingWord) cellClass += " word-flash";
                if (isCrackingRow) cellClass += " tile-cracking";
                if (isWinningCell) cellClass += " winner";

                const crackSvgHtml = isCrackingRow ? CRACK_SVGS[(c + r * 3) % CRACK_SVGS.length] : null;

                content = (
                    <>
                        <span className="cell-letter">{lockedLetter}</span>
                        {crackSvgHtml && (
                            <div
                                className="tile-crack-overlay"
                                dangerouslySetInnerHTML={{ __html: crackSvgHtml }}
                            />
                        )}
                    </>
                );
            } else {
                cellClass += " empty";
            }

            cells.push(
                <div
                    key={`${c}-${r}`}
                    className={cellClass}
                    data-col={c}
                    data-row={r}
                    onClick={() => onColumnClick(c)}
                >
                    {content}
                </div>
            );
        }
    }

    return (
        <div
            className="board-outer-container"
            ref={boardContainerRef}
            style={{
                ["--cols" as string]: word.length
            }}
        >
            {/* Column Guide Headers */}
            <div
                className="column-headers"
                style={{ gridTemplateColumns: `repeat(${word.length}, var(--cell-size))` }}
            >
                {Array.from({ length: word.length }).map((_, c) => (
                    <button
                        key={c}
                        className={`col-hdr ${c === fallingCol && !isGameOver ? "active" : ""}`}
                        onClick={() => onColumnClick(c)}
                    >
                        {c + 1}
                    </button>
                ))}
            </div>

            {/* Board Grid */}
            <div className={`board-wrapper ${boardRumble ? "board-rumble" : ""}`}>
                {isFocusPaused && (
                    <div className="focus-overlay" onClick={onResumeFocus}>
                        <div className="focus-overlay-content">
                            <span className="focus-title">PAUSED</span>
                            <p className="focus-sub">Tap to resume</p>
                            <button className="btn-focus-resume" onClick={onResumeFocus}>
                                Resume
                            </button>
                        </div>
                    </div>
                )}

                <div
                    className="board-grid"
                    style={{
                        gridTemplateColumns: `repeat(${word.length}, var(--cell-size))`,
                        gridTemplateRows: `repeat(${boardHeight}, var(--cell-size))`
                    }}
                >
                    {cells}
                </div>
            </div>
        </div>
    );
};
