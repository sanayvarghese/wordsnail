"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Board } from "@/components/Board";
import { Controls } from "@/components/Controls";
import { SidePanel } from "@/components/SidePanel";
import { TutorialModal } from "@/components/TutorialModal";
import { ShareModal } from "@/components/ShareModal";
import { ParticleLayer } from "@/components/ParticleLayer";
import { EndlessLetterStream } from "@/lib/stream";
import { initDictionary } from "@/lib/dictionary";
import { sounds } from "@/lib/sound";
import {
    CellCoord,
    FloatingOrbParticle,
    DiscardParticle
} from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faChartBar } from "@fortawesome/free-solid-svg-icons";

const BOARD_HEIGHT = 10;
const CRUSH_WIDTH = 5;
const LOCK_DELAY_MS = 600;
const MAX_LOCK_RESETS = 8;

export const WordTrashGame: React.FC = () => {
    const router = useRouter();

    // WordTrash State
    const [score, setScore] = useState<number>(0);
    const [highScore, setHighScore] = useState<number>(0);
    const [combo, setCombo] = useState<number>(1);
    const [wordsCrushed, setWordsCrushed] = useState<number>(0);
    const [bestWord, setBestWord] = useState<string>("");
    const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
    const [validWords, setValidWords] = useState<Set<string>>(new Set());

    const scoreRef = useRef<number>(0);
    const highScoreRef = useRef<number>(0);
    const comboRef = useRef<number>(1);

    // Board & Falling Piece
    const [columns, setColumns] = useState<string[][]>(Array.from({ length: CRUSH_WIDTH }, () => []));
    const [fallingCol, setFallingCol] = useState<number>(2);
    const [fallingRow, setFallingRow] = useState<number>(BOARD_HEIGHT - 1);
    const [streamIndex, setStreamIndex] = useState<number>(0);
    const [tileCount, setTileCount] = useState<number>(0);

    // Gameplay Flags
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [isLocking, setIsLocking] = useState<boolean>(false);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isFocusPaused, setIsFocusPaused] = useState<boolean>(false);

    // Visual FX & Animations
    const [flashingWordCells, setFlashingWordCells] = useState<CellCoord[]>([]);
    const [boardRumble, setBoardRumble] = useState<boolean>(false);
    const [message, setMessage] = useState<{ text: string; type: string } | null>(null);

    // Modals
    const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
    const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

    // Timers
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

    // Synchronized Refs
    const streamRef = useRef<EndlessLetterStream | null>(null);
    const streamIndexRef = useRef<number>(0);
    const fallingColRef = useRef<number>(2);
    const fallingRowRef = useRef<number>(BOARD_HEIGHT - 1);
    const columnsRef = useRef<string[][]>(Array.from({ length: CRUSH_WIDTH }, () => []));
    const isPlayingRef = useRef<boolean>(true);
    const isGameOverRef = useRef<boolean>(false);
    const isPausedRef = useRef<boolean>(false);
    const isFocusPausedRef = useRef<boolean>(false);
    const gravityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lockTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lockResetsRef = useRef<number>(0);
    const messageTimerRef = useRef<NodeJS.Timeout | null>(null);
    const boardContainerRef = useRef<HTMLDivElement>(null);
    const stepDownRef = useRef<() => void>(() => { });

    // Auto-open tutorial on first visit
    useEffect(() => {
        try {
            const seen = localStorage.getItem("wordsnail_seen_tutorial_wordtrash");
            if (!seen) {
                setIsTutorialOpen(true);
                localStorage.setItem("wordsnail_seen_tutorial_wordtrash", "true");
            }
        } catch { }
    }, []);

    // Keep active refs in sync with state
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        isGameOverRef.current = isGameOver;
    }, [isGameOver]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        isFocusPausedRef.current = isFocusPaused;
    }, [isFocusPaused]);

    useEffect(() => {
        columnsRef.current = columns;
    }, [columns]);

    // Current Letter Getter
    const getCurrentLetter = useCallback((): string => {
        if (!streamRef.current) return "";
        return streamRef.current.get(streamIndex);
    }, [streamIndex]);

    // Next 3 Letters Preview
    const getNextLetters = useCallback((): string[] => {
        if (!streamRef.current) return ["", "", ""];
        return [
            streamRef.current.get(streamIndex + 1),
            streamRef.current.get(streamIndex + 2),
            streamRef.current.get(streamIndex + 3)
        ];
    }, [streamIndex]);

    // Height-Adaptive Gravity Interval
    const getGravityInterval = useCallback((): number => {
        const maxH = Math.max(...columns.map(c => c.length), 0);
        if (maxH <= 3) return 1100;
        if (maxH <= 6) return 800;
        return 550;
    }, [columns]);

    // Clear Lock Delay
    const clearLockDelay = useCallback(() => {
        if (lockTimerRef.current) {
            clearTimeout(lockTimerRef.current);
            lockTimerRef.current = null;
        }
        setIsLocking(false);
    }, []);

    // Reset Gravity Timer (calls stepDownRef.current)
    const resetGravityTimer = useCallback(() => {
        if (gravityTimerRef.current) {
            clearInterval(gravityTimerRef.current);
            gravityTimerRef.current = null;
        }
        if (!isPlayingRef.current || isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current) return;

        const maxH = Math.max(...columnsRef.current.map(c => c.length), 0);
        const interval = maxH <= 3 ? 1100 : maxH <= 6 ? 800 : 550;
        gravityTimerRef.current = setInterval(() => {
            stepDownRef.current();
        }, interval);
    }, []);

    // Process Crush Matches & Gravity Cascades
    const processCrushCascade = useCallback((cols: string[][], currentCombo: number) => {
        if (!validWords || validWords.size === 0) return;

        const matches: { word: string; cells: CellCoord[] }[] = [];
        const boardColsCount = cols.length;

        // 1. Horizontal check across all board rows
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            let rowChars: string[] = [];
            for (let c = 0; c < boardColsCount; c++) {
                if (r < cols[c].length) {
                    rowChars.push(cols[c][r]);
                } else {
                    rowChars.push(" ");
                }
            }
            const rowStr = rowChars.join("");

            for (let len = 3; len <= boardColsCount; len++) {
                for (let start = 0; start <= boardColsCount - len; start++) {
                    const sub = rowStr.substring(start, start + len);
                    if (!sub.includes(" ") && validWords.has(sub)) {
                        const cells: CellCoord[] = [];
                        for (let c = start; c < start + len; c++) {
                            cells.push({ col: c, row: r });
                        }
                        matches.push({ word: sub, cells });
                    }
                }
            }
        }

        // 2. Vertical check down each column
        for (let c = 0; c < boardColsCount; c++) {
            const colLetters = cols[c];
            for (let len = 3; len <= Math.min(6, colLetters.length); len++) {
                for (let start = 0; start <= colLetters.length - len; start++) {
                    const sub = colLetters.slice(start, start + len).join("");
                    if (validWords.has(sub)) {
                        const cells: CellCoord[] = [];
                        for (let r = start; r < start + len; r++) {
                            cells.push({ col: c, row: r });
                        }
                        matches.push({ word: sub, cells });
                    }
                }
            }
        }

        // Base case: No matches in this iteration
        if (matches.length === 0) {
            columnsRef.current = cols;
            setColumns(cols);

            // Ceiling check
            const maxH = Math.max(...cols.map(c => c.length), 0);
            if (maxH >= BOARD_HEIGHT) {
                isGameOverRef.current = true;
                setIsGameOver(true);
                sounds.playGameOver();
                setMessage({
                    text: `Game Over — Score: ${scoreRef.current.toLocaleString()}`,
                    type: "game-over"
                });
                setTimeout(() => setIsShareOpen(true), 600);
                return;
            }

            // Reset combo and spawn next falling piece
            setCombo(1);
            comboRef.current = 1;
            setTileCount(t => t + 1);

            const nextStreamIdx = streamIndexRef.current + 1;
            streamIndexRef.current = nextStreamIdx;
            setStreamIndex(nextStreamIdx);

            const spawnCol = Math.floor(cols.length / 2);
            const spawnRow = BOARD_HEIGHT - 1;
            fallingColRef.current = spawnCol;
            fallingRowRef.current = spawnRow;
            setFallingCol(spawnCol);
            setFallingRow(spawnRow);

            clearLockDelay();
            resetGravityTimer();
            return;
        }

        // Matches found! Collect unique cells to crush
        const crushedCoordSet = new Set<string>();
        const allCrushedCells: CellCoord[] = [];
        let earnedPoints = 0;

        matches.forEach(m => {
            const basePts = m.word.length === 3 ? 300 : m.word.length === 4 ? 600 : m.word.length === 5 ? 1200 : 2500;
            earnedPoints += basePts * currentCombo;
            m.cells.forEach(pt => {
                const key = `${pt.col},${pt.row}`;
                if (!crushedCoordSet.has(key)) {
                    crushedCoordSet.add(key);
                    allCrushedCells.push(pt);
                }
            });
            setBestWord(prev => m.word.length > prev.length ? m.word : prev);
        });

        // Update score & high score
        scoreRef.current += earnedPoints;
        setScore(scoreRef.current);
        if (scoreRef.current > highScoreRef.current) {
            highScoreRef.current = scoreRef.current;
            setHighScore(scoreRef.current);
            setIsNewHighScore(true);
            try {
                localStorage.setItem("wordsnail_crush_highscore", String(scoreRef.current));
            } catch { }
        }

        setCombo(currentCombo);
        comboRef.current = currentCombo;
        setWordsCrushed(w => w + matches.length);

        // 1. Visual flash & sound
        setFlashingWordCells(allCrushedCells);
        sounds.playRowShatter();
        setBoardRumble(true);
        setTimeout(() => setBoardRumble(false), 300);

        const wordsStr = matches.map(m => `"${m.word}"`).join(", ");
        setMessage({
            text: `${wordsStr} +${earnedPoints.toLocaleString()} PTS ${currentCombo > 1 ? `(${currentCombo}x)` : ""}`,
            type: "word-reward"
        });

        // Keep reward text visible for 3.2s
        if (messageTimerRef.current) {
            clearTimeout(messageTimerRef.current);
        }
        messageTimerRef.current = setTimeout(() => {
            setMessage(null);
        }, 3200);

        // 2. Add 850ms delay to destroying the word found so the player clearly sees what word was formed
        setTimeout(() => {
            setFlashingWordCells([]);

            const collapsedCols = cols.map((colArr, c) => {
                return colArr.filter((_, r) => !crushedCoordSet.has(`${c},${r}`));
            });

            columnsRef.current = collapsedCols;
            setColumns(collapsedCols);

            setTimeout(() => {
                processCrushCascade(collapsedCols, currentCombo + 1);
            }, 280);
        }, 850);
    }, [validWords, clearLockDelay, resetGravityTimer]);

    // Lock Current Piece
    const lockCurrentPiece = useCallback(() => {
        clearLockDelay();
        lockResetsRef.current = 0;

        if (!streamRef.current) return;

        const currentIdx = streamIndexRef.current;
        const letter = streamRef.current.get(currentIdx);
        const col = fallingColRef.current;

        sounds.playLock();

        const nextCols = columnsRef.current.map((c, idx) => idx === col ? [...c, letter] : [...c]);
        processCrushCascade(nextCols, 1);
    }, [clearLockDelay, processCrushCascade]);

    // Start Lock Delay (600ms)
    const startLockDelay = useCallback(() => {
        clearLockDelay();
        setIsLocking(true);
        lockTimerRef.current = setTimeout(() => {
            lockTimerRef.current = null;
            setIsLocking(false);
            lockCurrentPiece();
        }, LOCK_DELAY_MS);
    }, [clearLockDelay, lockCurrentPiece]);

    // Step Down
    const stepDown = useCallback(() => {
        if (isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current || !isPlayingRef.current) return;
        const col = fallingColRef.current;
        const row = fallingRowRef.current;
        const landing = columnsRef.current[col] ? columnsRef.current[col].length : 0;

        if (row > landing) {
            const nextRow = row - 1;
            fallingRowRef.current = nextRow;
            setFallingRow(nextRow);
            if (nextRow === landing) {
                startLockDelay();
            }
        } else {
            if (!lockTimerRef.current) {
                startLockDelay();
            }
        }
    }, [startLockDelay]);

    useEffect(() => {
        stepDownRef.current = stepDown;
    });

    // Slide during lock
    const handleMoveDuringLock = useCallback((newCol: number) => {
        const landing = columnsRef.current[newCol] ? columnsRef.current[newCol].length : 0;
        const row = fallingRowRef.current;
        if (row > landing) {
            clearLockDelay();
        } else {
            if (lockResetsRef.current < MAX_LOCK_RESETS) {
                lockResetsRef.current++;
                startLockDelay();
            }
        }
    }, [clearLockDelay, startLockDelay]);

    // Move Left
    const moveLeft = useCallback(() => {
        if (isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current || !isPlayingRef.current) return;
        const col = fallingColRef.current;
        if (col > 0) {
            const newCol = col - 1;
            fallingColRef.current = newCol;
            setFallingCol(newCol);
            sounds.playMove();
            handleMoveDuringLock(newCol);
        }
    }, [handleMoveDuringLock]);

    // Move Right
    const moveRight = useCallback(() => {
        if (isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current || !isPlayingRef.current) return;
        const col = fallingColRef.current;
        if (col < CRUSH_WIDTH - 1) {
            const newCol = col + 1;
            fallingColRef.current = newCol;
            setFallingCol(newCol);
            sounds.playMove();
            handleMoveDuringLock(newCol);
        }
    }, [handleMoveDuringLock]);

    // Manual Soft Drop
    const triggerSoftDrop = useCallback(() => {
        if (isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current || !isPlayingRef.current) return;
        const col = fallingColRef.current;
        const row = fallingRowRef.current;
        const landing = columnsRef.current[col] ? columnsRef.current[col].length : 0;
        if (row > landing) {
            stepDown();
            resetGravityTimer();
        } else {
            clearLockDelay();
            lockCurrentPiece();
        }
    }, [stepDown, clearLockDelay, lockCurrentPiece, resetGravityTimer]);

    // Hard Drop
    const hardDrop = useCallback(() => {
        if (isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current || !isPlayingRef.current) return;
        clearLockDelay();
        const col = fallingColRef.current;
        const landing = columnsRef.current[col] ? columnsRef.current[col].length : 0;
        fallingRowRef.current = landing;
        setFallingRow(landing);
        lockCurrentPiece();
    }, [clearLockDelay, lockCurrentPiece]);

    // Restart fresh WordTrash game
    const handleStartFreshGame = useCallback(() => {
        const initCols = Array.from({ length: CRUSH_WIDTH }, () => []);
        setColumns(initCols);
        columnsRef.current = initCols;

        streamRef.current = new EndlessLetterStream(Date.now());
        streamIndexRef.current = 0;
        setStreamIndex(0);

        setScore(0);
        scoreRef.current = 0;
        setCombo(1);
        comboRef.current = 1;
        setWordsCrushed(0);
        setBestWord("");
        setIsNewHighScore(false);

        setTileCount(0);
        setElapsedSeconds(0);
        setFlashingWordCells([]);
        setIsGameOver(false);
        isGameOverRef.current = false;
        setIsShareOpen(false);
        setIsPaused(false);
        isPausedRef.current = false;
        setIsFocusPaused(false);
        isFocusPausedRef.current = false;
        setMessage(null);

        const startCol = Math.floor(CRUSH_WIDTH / 2);
        const startRow = BOARD_HEIGHT - 1;
        fallingColRef.current = startCol;
        fallingRowRef.current = startRow;
        setFallingCol(startCol);
        setFallingRow(startRow);

        clearLockDelay();
        resetGravityTimer();
    }, [clearLockDelay, resetGravityTimer]);

    // Initialize Game
    useEffect(() => {
        initDictionary().then(dict => setValidWords(dict));

        // Load high score
        const savedHigh = localStorage.getItem("wordsnail_crush_highscore");
        if (savedHigh) {
            const h = Number(savedHigh) || 0;
            setHighScore(h);
            highScoreRef.current = h;
        }

        handleStartFreshGame();
    }, []);

    // Timer Interval
    useEffect(() => {
        if (!isPlaying || isGameOver || isPaused || isFocusPaused) return;
        const timer = setInterval(() => {
            setElapsedSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [isPlaying, isGameOver, isPaused, isFocusPaused]);

    // Gravity loop trigger
    useEffect(() => {
        if (!isPlaying || isGameOver || isPaused || isFocusPaused || columns.length === 0) {
            if (gravityTimerRef.current) {
                clearInterval(gravityTimerRef.current);
                gravityTimerRef.current = null;
            }
            return;
        }

        resetGravityTimer();

        return () => {
            if (gravityTimerRef.current) {
                clearInterval(gravityTimerRef.current);
                gravityTimerRef.current = null;
            }
        };
    }, [isPlaying, isGameOver, isPaused, isFocusPaused, columns.length, resetGravityTimer]);

    // Focus & Blur Listeners
    useEffect(() => {
        const handleBlur = () => {
            if (isPlayingRef.current && !isGameOverRef.current) {
                setIsFocusPaused(true);
            }
        };

        const handleFocus = () => {
            if (isFocusPausedRef.current) {
                setIsFocusPaused(false);
            }
        };

        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        const handleVisibility = () => {
            if (document.hidden) handleBlur();
            else handleFocus();
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    // Keyboard Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlayingRef.current || isGameOverRef.current) return;

            if (isFocusPausedRef.current) {
                setIsFocusPaused(false);
                return;
            }

            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                e.preventDefault();
                moveLeft();
            } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                e.preventDefault();
                moveRight();
            } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
                e.preventDefault();
                triggerSoftDrop();
            } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                hardDrop();
            } else if (e.key === "p" || e.key === "P") {
                setIsPaused(p => !p);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [moveLeft, moveRight, triggerSoftDrop, hardDrop]);

    // Touch Gesture Handler for mobile: strictly 1 column per horizontal swipe, strictly 1 row per down swipe
    useEffect(() => {
        const boardEl = boardContainerRef.current;
        if (!boardEl) return;

        let startX = 0;
        let startY = 0;
        let hasSteppedVertically = false;
        let hasMovedHorizontally = false;

        const ROW_STEP_PX = 46; // Deliberate drag down (1 full row height) moves down 1 row
        const COL_STEP_PX = 28; // Drag sideways moves 1 column
        const SWIPE_THRESHOLD = 32;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            hasSteppedVertically = false;
            hasMovedHorizontally = false;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current || !isPlayingRef.current) return;

            const touch = e.touches[0];
            const curX = touch.clientX;
            const curY = touch.clientY;

            const deltaX = curX - startX;
            const deltaY = curY - startY;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // If swiping horizontally: prevent horizontal browser bounce/navigation and move 1 column
            if (absX > absY) {
                if (e.cancelable) {
                    e.preventDefault();
                }
                // Strictly 1 column shift per horizontal swipe (regardless of hardness or intensity)
                if (!hasMovedHorizontally && absX >= COL_STEP_PX) {
                    if (deltaX > 0) moveRight();
                    else moveLeft();
                    hasMovedHorizontally = true; // Lock: will not move another column during this gesture
                }
            } else if (absY > absX) {
                // Vertical Gesture: DO NOT preventDefault so natural gesture scrolling works smoothly!
                if (!hasSteppedVertically && deltaY >= ROW_STEP_PX) {
                    triggerSoftDrop();
                    hasSteppedVertically = true; // Lock: strictly 1 row per downward gesture
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current || !isPlayingRef.current) return;

            const touch = e.changedTouches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Quick flick fallback if not triggered during move: strictly 1 step
            if (!hasMovedHorizontally && absDx >= SWIPE_THRESHOLD && absDx > absDy) {
                if (dx > 0) moveRight();
                else moveLeft();
                hasMovedHorizontally = true;
            } else if (!hasSteppedVertically && dy >= SWIPE_THRESHOLD && absDy > absDx) {
                triggerSoftDrop();
                hasSteppedVertically = true;
            }
        };

        boardEl.addEventListener("touchstart", handleTouchStart, { passive: true });
        boardEl.addEventListener("touchmove", handleTouchMove, { passive: false });
        boardEl.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            boardEl.removeEventListener("touchstart", handleTouchStart);
            boardEl.removeEventListener("touchmove", handleTouchMove);
            boardEl.removeEventListener("touchend", handleTouchEnd);
        };
    }, [moveLeft, moveRight, triggerSoftDrop]);

    const maxHeight = Math.max(...columns.map(c => c.length), 0);

    return (
        <main className="app-container">
            {/* Header */}
            <Header
                gameMeta={null}
                gameMode="crush"
                score={score}
                highScore={highScore}
                combo={combo}
                onOpenTutorial={() => setIsTutorialOpen(true)}
                onOpenResults={isGameOver ? () => setIsShareOpen(true) : undefined}
                onExitToMenu={() => router.push("/")}
            />

            {/* Particle Effects Layer */}
            <ParticleLayer floatingOrbs={[]} discardParticles={[]} />

            <div className="game-layout">
                {/* Inline Info Bar + Next Tiles */}
                <SidePanel
                    nextLetters={getNextLetters()}
                    tileCount={tileCount}
                    wordsCrushed={wordsCrushed}
                    elapsedSeconds={elapsedSeconds}
                    retriesCount={0}
                    maxHeight={maxHeight}
                    boardHeight={BOARD_HEIGHT}
                    isPaused={isPaused}
                    onTogglePause={() => { }}
                    isGameOver={isGameOver}
                    gameMode="crush"
                    score={score}
                    highScore={highScore}
                    combo={combo}
                />

                {/* Floating Message Alert Banner - non-flow overlay to prevent board layout shift */}
                <div className="message-banner-container">
                    {message && (
                        <div className={`message-banner ${message.type}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Board */}
                <div className="board-container">
                    <Board
                        word="WORDS"
                        gameMode="crush"
                        boardHeight={BOARD_HEIGHT}
                        columns={columns}
                        fallingCol={fallingCol}
                        fallingRow={fallingRow}
                        fallingLetter={getCurrentLetter()}
                        isLocking={isLocking}
                        isGameOver={isGameOver}
                        isFocusPaused={isFocusPaused}
                        winningRow={-1}
                        pendingClearRows={[]}
                        flashingWordCells={flashingWordCells}
                        boardRumble={boardRumble}
                        onColumnClick={col => {
                            if (!isGameOver && !isPaused && !isFocusPaused) {
                                fallingColRef.current = col;
                                setFallingCol(col);
                            }
                        }}
                        onResumeFocus={() => setIsFocusPaused(false)}
                        boardContainerRef={boardContainerRef}
                    />
                </div>

                {/* Controls or Game Over Action Buttons */}
                {isGameOver ? (
                    <div className="completed-board-actions">
                        <button
                            className="btn-completed-result btn-retry-action"
                            onClick={handleStartFreshGame}
                            id="btn-trash-retry"
                        >
                            <FontAwesomeIcon icon={faArrowRotateRight} /> Play Again
                        </button>
                        <button
                            className="btn-completed-practice"
                            onClick={() => setIsShareOpen(true)}
                            id="btn-trash-results"
                        >
                            <FontAwesomeIcon icon={faChartBar} /> Results
                        </button>
                    </div>
                ) : (
                    <Controls
                        trashCount={0}
                        trashBouncing={false}
                        showTrash={false}
                        onMoveLeft={moveLeft}
                        onMoveRight={moveRight}
                        onSoftDrop={triggerSoftDrop}
                        onHardDrop={hardDrop}
                        onDiscard={() => { }}
                    />
                )}
            </div>

            {/* Tutorial Modal */}
            <TutorialModal
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
                gameMode="crush"
            />

            {/* Share / Game Over Modal */}
            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                gameMode="crush"
                isWon={false}
                gameMeta={null}
                word="WORDS"
                winningRow={-1}
                tileCount={tileCount}
                elapsedSeconds={elapsedSeconds}
                retriesCount={0}
                columns={columns}
                score={score}
                highScore={highScore}
                wordsCrushed={wordsCrushed}
                bestWord={bestWord}
                isNewHighScore={isNewHighScore}
                onPlayAgain={handleStartFreshGame}
                onReturnToMenu={() => router.push("/")}
            />
        </main>
    );
};
