// ==========================================
// Word Cling - Curated Dictionary & Target Wordlist from /src/data/target_words.json
// ==========================================

import targetWordsData from "@/data/target_words.json";

// Curated valid words initialized directly from /src/data/target_words.json
const rawWords: string[] = Array.isArray(targetWordsData?.words)
    ? targetWordsData.words
    : [];

export const BUILT_IN_WORDS: string[] = rawWords.map((w: string) => w.toUpperCase().trim());

export const validWordsSet = new Set<string>(BUILT_IN_WORDS);

let dictionaryLoaded = BUILT_IN_WORDS.length > 0;

export async function initDictionary(): Promise<Set<string>> {
    if (dictionaryLoaded && validWordsSet.size > 0) return validWordsSet;
    try {
        const res = await fetch("/target_words.json");
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.words)) {
                data.words.forEach((w: string) => validWordsSet.add(w.toUpperCase().trim()));
            }
            dictionaryLoaded = true;
        }
    } catch {
        // Already populated from bundled target_words.json
    }
    return validWordsSet;
}
