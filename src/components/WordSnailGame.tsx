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
import { LetterStream } from "@/lib/stream";
import { getRandomPracticeWord } from "@/lib/practice";
import { initDictionary } from "@/lib/dictionary";
import { sounds } from "@/lib/sound";
import {
    DailyGameMeta,
    SavedGameState,
    CellCoord,
    FloatingOrbParticle,
    DiscardParticle,
    VaporizeEffect,
    TileShard,
    VaporPuff,
    GameMode
} from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faDice, faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";
import { recordDailyWin, getStreakData } from "@/lib/streak";
import { fireWinConfetti } from "@/lib/confetti";

const BOARD_HEIGHT = 10;
const LOCK_DELAY_MS = 600;
const MAX_LOCK_RESETS = 8;

interface WordSnailGameProps {
    mode: "daily" | "practice";
}

export const WordSnailGame: React.FC<WordSnailGameProps> = ({ mode }) => {
    const router = useRouter();

    // Game Meta & Dictionary
    const [isMounted, setIsMounted] = useState<boolean>(false);
    const [gameMeta, setGameMeta] = useState<DailyGameMeta | null>(null);
    const [word, setWord] = useState<string>("PLANT");
    const [seed, setSeed] = useState<number>(435962861);
    const [validWords, setValidWords] = useState<Set<string>>(new Set());
    const [savedGame, setSavedGame] = useState<SavedGameState | null>(null);

    // Board & Falling Piece
    const [columns, setColumns] = useState<string[][]>([]);
    const [fallingCol, setFallingCol] = useState<number>(2);
    const [fallingRow, setFallingRow] = useState<number>(BOARD_HEIGHT - 1);
    const [streamIndex, setStreamIndex] = useState<number>(0);
    const [tileCount, setTileCount] = useState<number>(0);
    const [trashCount, setTrashCount] = useState<number>(1);
    const [formedWords, setFormedWords] = useState<Set<string>>(new Set());

    // Gameplay Flags
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [isLocking, setIsLocking] = useState<boolean>(false);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isWon, setIsWon] = useState<boolean>(false);
    const [winningRow, setWinningRow] = useState<number>(-1);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isFocusPaused, setIsFocusPaused] = useState<boolean>(false);
    const [retriesCount, setRetriesCount] = useState<number>(0);

    // Visual FX & Animations
    const [pendingClearRows, setPendingClearRows] = useState<number[]>([]);
    const [flashingWordCells, setFlashingWordCells] = useState<CellCoord[]>([]);
    const [boardRumble, setBoardRumble] = useState<boolean>(false);
    const [trashBouncing, setTrashBouncing] = useState<boolean>(false);
    const [message, setMessage] = useState<{ text: string; type: string } | null>(null);

    // Particles
    const [floatingOrbs, setFloatingOrbs] = useState<FloatingOrbParticle[]>([]);
    const [vaporizeEffects, setVaporizeEffects] = useState<VaporizeEffect[]>([]);

    // Modals
    const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
    const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

    // Timers
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

    // Synchronized Refs to avoid stale closures in setInterval / setTimeout
    const streamRef = useRef<LetterStream | null>(null);
    const streamIndexRef = useRef<number>(0);
    const fallingColRef = useRef<number>(2);
    const fallingRowRef = useRef<number>(BOARD_HEIGHT - 1);
    const columnsRef = useRef<string[][]>([]);
    const isPlayingRef = useRef<boolean>(true);
    const isGameOverRef = useRef<boolean>(false);
    const isPausedRef = useRef<boolean>(false);
    const isFocusPausedRef = useRef<boolean>(false);
    const trashCountRef = useRef<number>(1);
    const gravityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lockTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lockResetsRef = useRef<number>(0);
    const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

    const stepDownRef = useRef<() => void>(() => { });

    // Auto-open tutorial on first visit
    useEffect(() => {
        try {
            const seen = localStorage.getItem("wordsnail_seen_tutorial_wordsnail");
            if (!seen) {
                setIsTutorialOpen(true);
                localStorage.setItem("wordsnail_seen_tutorial_wordsnail", "true");
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

    // Height-Adaptive Gravity Interval (Normal: 800ms, Danger: 550ms, Relaxed: 1100ms)
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

    // Save Daily Win Immediately
    const saveDailyWin = useCallback((winRow: number, winCols: string[][]) => {
        if (mode !== "daily" || !gameMeta || !word) return;
        const storageKey = `wordsnail_daily_save_${gameMeta.date || word}`;
        const state: SavedGameState = {
            date: gameMeta.date,
            id: gameMeta.id,
            word,
            seed,
            difficulty: gameMeta.difficulty,
            columns: winCols,
            streamIndex: streamIndexRef.current,
            tileCount: tileCount + 1,
            trashCount: trashCountRef.current,
            formedWords: Array.from(formedWords),
            elapsedSeconds,
            retriesCount,
            pendingClearRows: [],
            isGameOver: true,
            isWon: true,
            winningRow: winRow,
            savedAt: Date.now()
        };
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
            setSavedGame(state);
            recordDailyWin(gameMeta.date || undefined);
        } catch { }
    }, [mode, gameMeta, word, seed, tileCount, formedWords, elapsedSeconds, retriesCount]);

    // Save In-Progress to LocalStorage (Daily only)
    const saveProgress = useCallback(() => {
        if (mode !== "daily" || !gameMeta || !word) return;
        const storageKey = `wordsnail_daily_save_${gameMeta.date || word}`;
        const state: SavedGameState = {
            date: gameMeta.date,
            id: gameMeta.id,
            word,
            seed,
            difficulty: gameMeta.difficulty,
            columns: columnsRef.current,
            streamIndex: streamIndexRef.current,
            tileCount,
            trashCount: trashCountRef.current,
            formedWords: Array.from(formedWords),
            elapsedSeconds,
            retriesCount,
            pendingClearRows,
            isGameOver,
            isWon,
            winningRow,
            savedAt: Date.now()
        };
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch { }
    }, [mode, gameMeta, word, seed, tileCount, formedWords, elapsedSeconds, retriesCount, pendingClearRows, isGameOver, isWon, winningRow]);

    // Win Check: checks if any horizontal row r equals the target word
    const checkWin = useCallback((cols: string[][]): number => {
        const maxH = Math.max(...cols.map(c => c.length), 0);
        for (let r = 0; r < maxH; r++) {
            let matched = true;
            for (let c = 0; c < word.length; c++) {
                if (r >= cols[c].length || cols[c][r] !== word[c]) {
                    matched = false;
                    break;
                }
            }
            if (matched) return r;
        }
        return -1;
    }, [word]);

    // Floating Orb Particle Trigger
    const boardContainerRef = useRef<HTMLDivElement>(null);
    const trashBtnRef = useRef<HTMLButtonElement>(null);

    const triggerFloatingOrb = (col: number, row: number, wordText: string) => {
        if (!boardContainerRef.current || !trashBtnRef.current) return;
        const cellEl = boardContainerRef.current.querySelector(`.cell[data-col='${col}'][data-row='${row}']`);
        if (!cellEl) return;

        const cellRect = cellEl.getBoundingClientRect();
        const trashRect = trashBtnRef.current.getBoundingClientRect();

        const startX = cellRect.left + cellRect.width / 2;
        const startY = cellRect.top + cellRect.height / 2;
        const targetX = trashRect.left + trashRect.width / 2;
        const targetY = trashRect.top + trashRect.height / 2;

        const orbId = Date.now() + Math.floor(Math.random() * 1000);
        setFloatingOrbs(prev => [...prev, { id: orbId, startX, startY, targetX, targetY, text: `+1 ${wordText}` }]);

        setTimeout(() => {
            setFloatingOrbs(prev => prev.filter(o => o.id !== orbId));
            setTrashBouncing(true);
            setTimeout(() => setTrashBouncing(false), 500);
        }, 650);
    };

    // Secondary valid words check for +1 Trash reward
    const checkForValidWords = useCallback((cols: string[][], col: number, landedRow: number) => {
        if (!validWords || validWords.size === 0) return;

        const earnedWords: { sub: string; cells: CellCoord[] }[] = [];

        // 1. Horizontal check in landedRow
        let rowChars: string[] = [];
        for (let c = 0; c < word.length; c++) {
            if (landedRow < cols[c].length) {
                rowChars.push(cols[c][landedRow]);
            } else {
                rowChars.push(" ");
            }
        }
        const rowStr = rowChars.join("");

        for (let len = 3; len <= word.length; len++) {
            for (let start = 0; start <= word.length - len; start++) {
                const sub = rowStr.substring(start, start + len);
                if (!sub.includes(" ") && sub !== word && validWords.has(sub)) {
                    if (!formedWords.has(sub)) {
                        const cells: CellCoord[] = [];
                        for (let c = start; c < start + len; c++) {
                            cells.push({ col: c, row: landedRow });
                        }
                        earnedWords.push({ sub, cells });
                    }
                }
            }
        }

        // 2. Vertical check in column col
        const colLetters = cols[col];
        for (let len = 3; len <= Math.min(6, colLetters.length); len++) {
            for (let start = 0; start <= colLetters.length - len; start++) {
                if (landedRow >= start && landedRow < start + len) {
                    const sub = colLetters.slice(start, start + len).join("");
                    if (sub !== word && validWords.has(sub)) {
                        if (!formedWords.has(sub)) {
                            const cells: CellCoord[] = [];
                            for (let r = start; r < start + len; r++) {
                                cells.push({ col, row: r });
                            }
                            earnedWords.push({ sub, cells });
                        }
                    }
                }
            }
        }

        if (earnedWords.length > 0) {
            const allFlashing: CellCoord[] = [];
            earnedWords.forEach(w => {
                formedWords.add(w.sub);
                allFlashing.push(...w.cells);
            });
            setFormedWords(new Set(formedWords));

            setFlashingWordCells(allFlashing);
            sounds.playWordFlash();

            const firstCell = allFlashing[0];
            triggerFloatingOrb(firstCell.col, firstCell.row, earnedWords[0].sub);

            setTimeout(() => {
                trashCountRef.current += earnedWords.length;
                setTrashCount(trashCountRef.current);
                const wordsList = earnedWords.map(w => `"${w.sub}"`).join(", ");
                setMessage({
                    text: `${wordsList} +${earnedWords.length} Trash`,
                    type: "word-reward"
                });
                if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
                messageTimerRef.current = setTimeout(() => setMessage(null), 3200);
                setFlashingWordCells([]);
            }, 550);
        }
    }, [word, validWords, formedWords]);

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
        const landedRow = nextCols[col].length - 1;

        // Check for valid secondary words
        checkForValidWords(nextCols, col, landedRow);

        // Check target word win condition
        const winRow = checkWin(nextCols);
        if (winRow !== -1) {
            columnsRef.current = nextCols;
            setColumns(nextCols);
            isGameOverRef.current = true;
            setIsGameOver(true);
            setIsWon(true);
            setWinningRow(winRow);
            sounds.playWin();
            fireWinConfetti();
            saveDailyWin(winRow, nextCols);
            setTimeout(() => setIsShareOpen(true), 600);
            return;
        }

        // Row breaking: breaks only when another row is filled
        let updatedCols = nextCols;
        const rowJustFilled = nextCols.every(c => c.length > landedRow);

        if (pendingClearRows.length > 0 && rowJustFilled) {
            sounds.playRowShatter();
            setBoardRumble(true);
            setTimeout(() => setBoardRumble(false), 400);

            updatedCols = updatedCols.map(c => c.slice(1));
            setPendingClearRows([]);

            const winAfterShift = checkWin(updatedCols);
            if (winAfterShift !== -1) {
                columnsRef.current = updatedCols;
                setColumns(updatedCols);
                isGameOverRef.current = true;
                setIsGameOver(true);
                setIsWon(true);
                setWinningRow(winAfterShift);
                sounds.playWin();
                fireWinConfetti();
                saveDailyWin(winAfterShift, updatedCols);
                setTimeout(() => setIsShareOpen(true), 600);
                return;
            }
        }

        // Stack weight threshold: >= 4 rows fully filled
        const fullRowsCount = Array.from({ length: BOARD_HEIGHT }).filter((_, r) => {
            return updatedCols.every(c => c.length > r);
        }).length;

        if (fullRowsCount >= 4) {
            setPendingClearRows([0]);
        } else {
            setPendingClearRows([]);
        }

        // Ceiling Check (Visible ceiling = 10 rows)
        const maxH = Math.max(...updatedCols.map(c => c.length), 0);
        if (maxH >= BOARD_HEIGHT) {
            columnsRef.current = updatedCols;
            setColumns(updatedCols);
            isGameOverRef.current = true;
            setIsGameOver(true);
            setIsWon(false);
            const nextRetries = retriesCount + 1;
            setRetriesCount(nextRetries);
            sounds.playGameOver();
            setMessage({
                text: mode === "daily" ? "Ceiling Reached · Retry Below" : "Ceiling Reached · Retry Below",
                type: "game-over"
            });
            if (mode === "daily" && gameMeta && word) {
                const storageKey = `wordsnail_daily_save_${gameMeta.date || word}`;
                const state: SavedGameState = {
                    date: gameMeta.date,
                    id: gameMeta.id,
                    word,
                    seed,
                    difficulty: gameMeta.difficulty,
                    columns: updatedCols,
                    streamIndex: streamIndexRef.current,
                    tileCount,
                    trashCount: trashCountRef.current,
                    formedWords: Array.from(formedWords),
                    elapsedSeconds,
                    retriesCount: nextRetries,
                    pendingClearRows: [],
                    isGameOver: true,
                    isWon: false,
                    winningRow: -1,
                    savedAt: Date.now()
                };
                try {
                    localStorage.setItem(storageKey, JSON.stringify(state));
                    setSavedGame(state);
                } catch { }
            }
            setTimeout(() => setIsShareOpen(true), 600);
            return;
        }

        columnsRef.current = updatedCols;
        setColumns(updatedCols);

        const nextStreamIdx = currentIdx + 1;
        streamIndexRef.current = nextStreamIdx;
        setStreamIndex(nextStreamIdx);

        const spawnCol = Math.floor(word.length / 2);
        const spawnRow = BOARD_HEIGHT - 1;
        fallingColRef.current = spawnCol;
        fallingRowRef.current = spawnRow;
        setFallingCol(spawnCol);
        setFallingRow(spawnRow);

        setTileCount(t => t + 1);
        resetGravityTimer();
    }, [clearLockDelay, checkForValidWords, checkWin, pendingClearRows, word.length, saveDailyWin]);

    // Start Lock Delay Grace Period (600ms)
    const startLockDelay = useCallback(() => {
        clearLockDelay();
        setIsLocking(true);
        lockTimerRef.current = setTimeout(() => {
            lockTimerRef.current = null;
            setIsLocking(false);
            lockCurrentPiece();
        }, LOCK_DELAY_MS);
    }, [clearLockDelay, lockCurrentPiece]);

    // Step Down (Soft Drop / Gravity)
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

    // Reset Gravity Timer
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
        if (col < word.length - 1) {
            const newCol = col + 1;
            fallingColRef.current = newCol;
            setFallingCol(newCol);
            sounds.playMove();
            handleMoveDuringLock(newCol);
        }
    }, [word.length, handleMoveDuringLock]);

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

    // Discard Falling Tile (Trash Button)
    const discardCurrentPiece = useCallback(() => {
        if (isGameOverRef.current || isPausedRef.current || isFocusPausedRef.current || !isPlayingRef.current) return;
        if (trashCountRef.current <= 0) {
            setMessage({
                text: "No Trash left — spell a word to earn more",
                type: "trash-alert"
            });
            setTimeout(() => setMessage(null), 2200);
            return;
        }

        clearLockDelay();
        trashCountRef.current -= 1;
        setTrashCount(trashCountRef.current);

        const currentIdx = streamIndexRef.current;
        const discardedLetter = streamRef.current ? streamRef.current.get(currentIdx) : "";

        sounds.playDiscardWhoosh();

        if (boardContainerRef.current) {
            const fallingCell = boardContainerRef.current.querySelector(
                `.cell[data-col='${fallingColRef.current}'][data-row='${fallingRowRef.current}']`
            );
            if (fallingCell) {
                const rect = fallingCell.getBoundingClientRect();
                const shardCols = 4;
                const shardRows = 4;
                const shardW = rect.width / shardCols;
                const shardH = rect.height / shardRows;
                const tileColors = [
                    "#ffffff",
                    "#f8fafc",
                    "#f1f5f9",
                    "#e2e8f0",
                    "#cbd5e1",
                    "#ff8a80",
                    "#ffa499"
                ];

                const shards: TileShard[] = [];
                let shardId = 0;
                for (let r = 0; r < shardRows; r++) {
                    for (let c = 0; c < shardCols; c++) {
                        const sx = c * shardW;
                        const sy = r * shardH;
                        const normX = (sx + shardW / 2 - rect.width / 2) / (rect.width / 2);
                        const normY = (sy + shardH / 2 - rect.height / 2) / (rect.height / 2);
                        const burstDist = 32 + Math.random() * 45;
                        const bx = normX * burstDist + (Math.random() - 0.5) * 20;
                        const by = normY * burstDist - (14 + Math.random() * 26);
                        const rot = (Math.random() - 0.5) * 540;

                        shards.push({
                            id: shardId++,
                            x: sx,
                            y: sy,
                            w: shardW + (Math.random() - 0.5) * 2,
                            h: shardH + (Math.random() - 0.5) * 2,
                            bx,
                            by,
                            rot,
                            color: tileColors[Math.floor(Math.random() * tileColors.length)]
                        });
                    }
                }

                const smokePuffs: VaporPuff[] = Array.from({ length: 8 }, (_, i) => ({
                    id: i,
                    size: 16 + Math.random() * 20,
                    vx: (Math.random() - 0.5) * 45,
                    vy: -(28 + Math.random() * 38)
                }));

                const effectId = Date.now() + Math.floor(Math.random() * 1000);
                const effect: VaporizeEffect = {
                    id: effectId,
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    letter: discardedLetter,
                    shards,
                    smokePuffs
                };

                setVaporizeEffects(prev => [...prev, effect]);
                setTimeout(() => {
                    setVaporizeEffects(prev => prev.filter(e => e.id !== effectId));
                }, 480);
            }
        }

        const nextStreamIdx = currentIdx + 1;
        streamIndexRef.current = nextStreamIdx;
        setStreamIndex(nextStreamIdx);

        const spawnCol = Math.floor(word.length / 2);
        const spawnRow = BOARD_HEIGHT - 1;
        fallingColRef.current = spawnCol;
        fallingRowRef.current = spawnRow;
        setFallingCol(spawnCol);
        setFallingRow(spawnRow);

        resetGravityTimer();
    }, [word.length, clearLockDelay, resetGravityTimer]);

    // Initialize Game & Dictionary
    useEffect(() => {
        setIsMounted(true);
        initDictionary().then(dict => setValidWords(dict));

        if (mode === "daily") {
            const now = new Date();
            const localDate = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;

            fetch(`/api/today?date=${encodeURIComponent(localDate)}`)
                .then(r => r.json())
                .then((meta: DailyGameMeta) => {
                    setGameMeta(meta);
                    const targetWord = (meta.word || getRandomPracticeWord().word).toUpperCase().trim();
                    const targetSeed = meta.seed || 435962861;
                    setWord(targetWord);
                    setSeed(targetSeed);

                    const storageKey = `wordsnail_daily_save_${meta.date || targetWord}`;
                    const rawSaved = localStorage.getItem(storageKey);
                    if (rawSaved) {
                        try {
                            const parsed: SavedGameState = JSON.parse(rawSaved);
                            setSavedGame(parsed);
                            setRetriesCount(parsed.retriesCount || 0);

                            // 1. IF WON: Permanent victory lock, cannot play daily again
                            if (parsed.isWon) {
                                recordDailyWin(meta.date || undefined);
                                if (parsed.columns && parsed.columns.length === targetWord.length) {
                                    setColumns(parsed.columns);
                                    columnsRef.current = parsed.columns;
                                }
                                setTileCount(parsed.tileCount || 0);
                                setElapsedSeconds(parsed.elapsedSeconds || 0);
                                setIsGameOver(true);
                                isGameOverRef.current = true;
                                setIsWon(true);
                                setWinningRow(parsed.winningRow !== undefined ? parsed.winningRow : -1);
                                setIsShareOpen(false);
                                return;
                            }

                            // 2. IF HIT CEILING PREVIOUSLY (isGameOver is true, but NOT won):
                            // Player CAN play retry! Reset board for fresh retry attempt while keeping retriesCount
                            if (parsed.isGameOver && !parsed.isWon) {
                                const initCols = Array.from({ length: targetWord.length }, () => []);
                                setColumns(initCols);
                                columnsRef.current = initCols;
                                streamRef.current = new LetterStream(targetWord, targetSeed);
                                streamIndexRef.current = 0;
                                setStreamIndex(0);
                                setTileCount(0);
                                setTrashCount(1);
                                trashCountRef.current = 1;
                                setFormedWords(new Set());
                                setElapsedSeconds(0);
                                setPendingClearRows([]);
                                setIsGameOver(false);
                                isGameOverRef.current = false;
                                setIsWon(false);
                                setWinningRow(-1);

                                const startCol = Math.floor(targetWord.length / 2);
                                const startRow = BOARD_HEIGHT - 1;
                                fallingColRef.current = startCol;
                                fallingRowRef.current = startRow;
                                setFallingCol(startCol);
                                setFallingRow(startRow);
                                return;
                            }

                            // 3. IN PROGRESS GAME: restore board state
                            if (parsed.columns && parsed.columns.length === targetWord.length) {
                                setColumns(parsed.columns);
                                columnsRef.current = parsed.columns;
                            } else {
                                const initCols = Array.from({ length: targetWord.length }, () => []);
                                setColumns(initCols);
                                columnsRef.current = initCols;
                            }

                            const sIdx = parsed.streamIndex || 0;
                            streamRef.current = new LetterStream(targetWord, targetSeed);
                            streamIndexRef.current = sIdx;
                            setStreamIndex(sIdx);

                            setTileCount(parsed.tileCount || 0);
                            const tc = parsed.trashCount !== undefined ? parsed.trashCount : 1;
                            setTrashCount(tc);
                            trashCountRef.current = tc;

                            setFormedWords(new Set(parsed.formedWords || []));
                            setElapsedSeconds(parsed.elapsedSeconds || 0);
                            setPendingClearRows(parsed.pendingClearRows || []);
                            setIsGameOver(false);
                            isGameOverRef.current = false;
                            setIsWon(false);
                            setWinningRow(-1);

                            const startCol = Math.floor(targetWord.length / 2);
                            const startRow = BOARD_HEIGHT - 1;
                            fallingColRef.current = startCol;
                            fallingRowRef.current = startRow;
                            setFallingCol(startCol);
                            setFallingRow(startRow);
                            return;
                        } catch { }
                    }

                    // Fresh daily game
                    const initCols = Array.from({ length: targetWord.length }, () => []);
                    setColumns(initCols);
                    columnsRef.current = initCols;
                    streamRef.current = new LetterStream(targetWord, targetSeed);
                    streamIndexRef.current = 0;
                    setStreamIndex(0);

                    const startCol = Math.floor(targetWord.length / 2);
                    const startRow = BOARD_HEIGHT - 1;
                    fallingColRef.current = startCol;
                    fallingRowRef.current = startRow;
                    setFallingCol(startCol);
                    setFallingRow(startRow);
                })
                .catch(() => {
                    const fallbackPractice = getRandomPracticeWord();
                    const fallbackWord = fallbackPractice.word;
                    const fallbackSeed = fallbackPractice.seed;
                    setWord(fallbackWord);
                    setSeed(fallbackSeed);
                    const initCols = Array.from({ length: fallbackWord.length }, () => []);
                    setColumns(initCols);
                    columnsRef.current = initCols;
                    streamRef.current = new LetterStream(fallbackWord, fallbackSeed);
                });
        } else {
            // Practice Mode: fresh random word
            const practiceData = getRandomPracticeWord();
            const targetWord = practiceData.word;
            const practiceSeed = practiceData.seed;
            setWord(targetWord);
            setSeed(practiceSeed);

            const initCols = Array.from({ length: targetWord.length }, () => []);
            setColumns(initCols);
            columnsRef.current = initCols;

            streamRef.current = new LetterStream(targetWord, practiceSeed);
            streamIndexRef.current = 0;
            setStreamIndex(0);

            const startCol = Math.floor(targetWord.length / 2);
            const startRow = BOARD_HEIGHT - 1;
            fallingColRef.current = startCol;
            fallingRowRef.current = startRow;
            setFallingCol(startCol);
            setFallingRow(startRow);
        }
    }, [mode]);

    // Timer Interval (1-second tick)
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
            } else if (e.key === "t" || e.key === "T" || e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                discardCurrentPiece();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [moveLeft, moveRight, triggerSoftDrop, hardDrop, discardCurrentPiece]);

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

    // Auto-save whenever key states change (Daily mode only)
    useEffect(() => {
        if (isPlaying && tileCount > 0 && mode === "daily") {
            saveProgress();
        }
    }, [isPlaying, tileCount, elapsedSeconds, saveProgress, mode]);

    // Handle Practice Next Word or Restart
    const handleNextPracticeWord = () => {
        const practiceData = getRandomPracticeWord(word);
        const targetWord = practiceData.word;
        const practiceSeed = practiceData.seed;
        setWord(targetWord);
        setSeed(practiceSeed);

        const initCols = Array.from({ length: targetWord.length }, () => []);
        setColumns(initCols);
        columnsRef.current = initCols;

        streamRef.current = new LetterStream(targetWord, practiceSeed);
        streamIndexRef.current = 0;
        setStreamIndex(0);

        setTileCount(0);
        setTrashCount(1);
        trashCountRef.current = 1;
        setFormedWords(new Set());
        setElapsedSeconds(0);
        setPendingClearRows([]);
        setFlashingWordCells([]);
        setIsGameOver(false);
        isGameOverRef.current = false;
        setIsWon(false);
        setIsShareOpen(false);
        setWinningRow(-1);
        setIsPaused(false);
        isPausedRef.current = false;
        setIsFocusPaused(false);
        isFocusPausedRef.current = false;
        setMessage(null);

        const startCol = Math.floor(targetWord.length / 2);
        const startRow = BOARD_HEIGHT - 1;
        fallingColRef.current = startCol;
        fallingRowRef.current = startRow;
        setFallingCol(startCol);
        setFallingRow(startRow);

        clearLockDelay();
        resetGravityTimer();
    };

    // Retry after ceiling hit (Daily mode retry)
    const handleRetryDailyGame = () => {
        const initCols = Array.from({ length: word.length }, () => []);
        setColumns(initCols);
        columnsRef.current = initCols;

        streamRef.current = new LetterStream(word, seed);
        streamIndexRef.current = 0;
        setStreamIndex(0);

        setTileCount(0);
        setTrashCount(1);
        trashCountRef.current = 1;
        setFormedWords(new Set());
        setElapsedSeconds(0);
        setPendingClearRows([]);
        setFlashingWordCells([]);
        setIsGameOver(false);
        isGameOverRef.current = false;
        setIsWon(false);
        setIsShareOpen(false);
        setWinningRow(-1);
        setIsPaused(false);
        isPausedRef.current = false;
        setIsFocusPaused(false);
        isFocusPausedRef.current = false;
        setMessage(null);

        const startCol = Math.floor(word.length / 2);
        const startRow = BOARD_HEIGHT - 1;
        fallingColRef.current = startCol;
        fallingRowRef.current = startRow;
        setFallingCol(startCol);
        setFallingRow(startRow);

        clearLockDelay();
        resetGravityTimer();

        // Save fresh retry state to localStorage
        if (mode === "daily" && gameMeta && word) {
            const storageKey = `wordsnail_daily_save_${gameMeta.date || word}`;
            const state: SavedGameState = {
                date: gameMeta.date,
                id: gameMeta.id,
                word,
                seed,
                difficulty: gameMeta.difficulty,
                columns: initCols,
                streamIndex: 0,
                tileCount: 0,
                trashCount: 1,
                formedWords: [],
                elapsedSeconds: 0,
                retriesCount,
                pendingClearRows: [],
                isGameOver: false,
                isWon: false,
                winningRow: -1,
                savedAt: Date.now()
            };
            try {
                localStorage.setItem(storageKey, JSON.stringify(state));
                setSavedGame(state);
            } catch { }
        }
    };

    // Retry same word in Practice mode
    const handleRetryPracticeGame = () => {
        const initCols = Array.from({ length: word.length }, () => []);
        setColumns(initCols);
        columnsRef.current = initCols;

        streamRef.current = new LetterStream(word, seed);
        streamIndexRef.current = 0;
        setStreamIndex(0);

        setTileCount(0);
        setTrashCount(1);
        trashCountRef.current = 1;
        setFormedWords(new Set());
        setElapsedSeconds(0);
        setPendingClearRows([]);
        setFlashingWordCells([]);
        setIsGameOver(false);
        isGameOverRef.current = false;
        setIsWon(false);
        setIsShareOpen(false);
        setWinningRow(-1);
        setIsPaused(false);
        isPausedRef.current = false;
        setIsFocusPaused(false);
        isFocusPausedRef.current = false;
        setMessage(null);

        const startCol = Math.floor(word.length / 2);
        const startRow = BOARD_HEIGHT - 1;
        fallingColRef.current = startCol;
        fallingRowRef.current = startRow;
        setFallingCol(startCol);
        setFallingRow(startRow);

        clearLockDelay();
        resetGravityTimer();
    };

    const maxHeight = Math.max(...columns.map(c => c.length), 0);

    return (
        <main className="app-container">
            {/* Header */}
            <Header
                gameMeta={gameMeta}
                gameMode={mode}
                onOpenTutorial={() => setIsTutorialOpen(true)}
                onOpenResults={(isWon || isGameOver) ? () => setIsShareOpen(true) : undefined}
                onExitToMenu={() => router.push("/")}
            />

            {/* Particle Effects Layer */}
            <ParticleLayer
                floatingOrbs={floatingOrbs}
                vaporizeEffects={vaporizeEffects}
            />

            <div
                className="game-layout"
                style={{
                    opacity: isMounted ? 1 : 0,
                    transition: "opacity 0.15s ease"
                }}
            >
                {/* Inline Info Bar + Next Tiles */}
                <SidePanel
                    nextLetters={getNextLetters()}
                    tileCount={tileCount}
                    elapsedSeconds={elapsedSeconds}
                    retriesCount={retriesCount}
                    maxHeight={maxHeight}
                    boardHeight={BOARD_HEIGHT}
                    isPaused={isPaused}
                    onTogglePause={() => { }}
                    isCompleted={isWon}
                    isGameOver={isGameOver && !isWon}
                    currentStreak={getStreakData(gameMeta?.date || undefined).currentStreak}
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
                        word={word}
                        gameMode={mode}
                        boardHeight={BOARD_HEIGHT}
                        columns={columns}
                        fallingCol={fallingCol}
                        fallingRow={fallingRow}
                        fallingLetter={getCurrentLetter()}
                        isLocking={isLocking}
                        isGameOver={isGameOver}
                        isFocusPaused={isFocusPaused}
                        winningRow={winningRow}
                        pendingClearRows={pendingClearRows}
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

                {/* Controls or Action Buttons */}
                {isWon ? (
                    <div className="completed-board-actions">
                        <button
                            className="btn-completed-result"
                            onClick={() => setIsShareOpen(true)}
                            id="btn-view-results"
                        >
                            <FontAwesomeIcon icon={faChartBar} /> View Results
                        </button>
                        <button
                            className="btn-completed-practice"
                            onClick={mode === "practice" ? handleNextPracticeWord : () => router.push("/practice")}
                            id="btn-play-random"
                        >
                            <FontAwesomeIcon icon={faDice} /> Play Random
                        </button>
                    </div>
                ) : isGameOver ? (
                    <div className="completed-board-actions">
                        <button
                            className="btn-completed-result btn-retry-action"
                            onClick={mode === "daily" ? handleRetryDailyGame : handleRetryPracticeGame}
                            id="btn-board-retry"
                        >
                            <FontAwesomeIcon icon={faArrowRotateRight} /> Retry {mode === "daily" ? `(#${retriesCount + 1})` : ""}
                        </button>
                        {mode === "practice" && (
                            <button
                                className="btn-completed-practice"
                                onClick={handleNextPracticeWord}
                                id="btn-board-next"
                            >
                                <FontAwesomeIcon icon={faDice} /> Next Word
                            </button>
                        )}
                        <button
                            className="btn-completed-practice"
                            onClick={() => setIsShareOpen(true)}
                            id="btn-board-results"
                        >
                            <FontAwesomeIcon icon={faChartBar} /> Results
                        </button>
                    </div>
                ) : (
                    <Controls
                        trashCount={trashCount}
                        trashBouncing={trashBouncing}
                        showTrash={true}
                        onMoveLeft={moveLeft}
                        onMoveRight={moveRight}
                        onSoftDrop={triggerSoftDrop}
                        onHardDrop={hardDrop}
                        onDiscard={discardCurrentPiece}
                        trashRef={trashBtnRef}
                    />
                )}
            </div>

            {/* Tutorial Modal */}
            <TutorialModal
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
                gameMode={mode}
            />

            {/* Share / Game Over Modal */}
            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                gameMode={mode}
                isWon={isWon}
                gameMeta={gameMeta}
                word={word}
                winningRow={winningRow}
                tileCount={tileCount}
                elapsedSeconds={elapsedSeconds}
                retriesCount={retriesCount}
                columns={columns}
                onPlayAgain={() => {
                    if (mode === "practice") {
                        handleNextPracticeWord();
                    } else if (savedGame?.isWon || isWon) {
                        router.push("/practice");
                    } else {
                        handleRetryDailyGame();
                    }
                }}
                onReturnToMenu={() => router.push("/")}
            />
        </main>
    );
};
