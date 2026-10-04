// ==========================================
// Word Cling - Curated Practice Words from /src/data/target_words.json
// ==========================================

import targetWordsData from "@/data/target_words.json";

// Extract target words from /src/data/target_words.json
const rawWords: string[] = Array.isArray(targetWordsData?.words)
    ? targetWordsData.words
    : [];

export const ALL_TARGET_WORDS: string[] = rawWords.map((w: string) => w.toUpperCase().trim());

// 5-letter target words (standard WordSnail grid width)
export const PRACTICE_WORDS_5_LETTER: string[] = ALL_TARGET_WORDS.filter(w => w.length === 5);

// Default practice pool: 5-letter words from target_words.json (over 1,000 words)
export const PRACTICE_WORDS: string[] = PRACTICE_WORDS_5_LETTER.length > 0
    ? PRACTICE_WORDS_5_LETTER
    : ALL_TARGET_WORDS;

export interface PracticeWordResult {
    word: string;
    seed: number;
}

export function getRandomPracticeWord(excludeWord?: string, length: number = 5): PracticeWordResult {
    let sourcePool = ALL_TARGET_WORDS.filter(w => w.length >= 4 && w.length <= 6);
    // if (length !== 5) {
    //     const byLen = ALL_TARGET_WORDS.filter(w => w.length === length);
    //     if (byLen.length > 0) sourcePool = byLen;
    // }

    const pool = excludeWord
        ? sourcePool.filter(w => w !== excludeWord)
        : sourcePool;
    const candidates = pool.length > 0 ? pool : sourcePool;
    const word = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : "PLANT";
    const seed = Math.floor(Math.random() * 1_000_000_000) + 1;
    return { word, seed };
}
