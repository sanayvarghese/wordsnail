// ==========================================
// Word Cling - TypeScript Definitions
// ==========================================

export interface DailyGameMeta {
    id: number;
    date: string;
    word: string;
    seed: number;
    difficulty: "Easy" | "Medium" | "Hard" | "Expert";
    created_on?: string;
}

export type GameMode = "daily" | "practice" | "crush";

export interface CrushScore {
    score: number;
    highScore: number;
    wordsCrushed: number;
    bestWord: string;
    combosCount: number;
}

export type TileColor = "green" | "yellow" | "gray" | "empty";

export interface CellCoord {
    col: number;
    row: number;
}

export interface FloatingOrbParticle {
    id: number;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    text: string;
}

export interface DiscardParticle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    letter: string;
    size: number;
    opacity: number;
}

export interface TileShard {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    bx: number;
    by: number;
    rot: number;
    color: string;
}

export interface VaporPuff {
    id: number;
    size: number;
    vx: number;
    vy: number;
}

export interface VaporizeEffect {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    letter: string;
    shards: TileShard[];
    smokePuffs: VaporPuff[];
}

export interface SavedGameState {
    date: string;
    id: number;
    word: string;
    seed: number;
    difficulty: string;
    columns: string[][];
    streamIndex: number;
    tileCount: number;
    trashCount: number;
    formedWords: string[];
    elapsedSeconds: number;
    retriesCount: number;
    pendingClearRows: number[];
    isGameOver: boolean;
    isWon: boolean;
    winningRow: number;
    savedAt: number;
}
