// ==========================================
// Word Cling - Target-Aware Deterministic Stream Generator
// ==========================================

export function mulberry32(seed: number) {
    let s = (seed >>> 0);
    return function (): number {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function hashSeed(seed: string | number): number {
    if (typeof seed === "number") {
        return (seed >>> 0) || 123456789;
    }
    const num = Number(seed);
    if (!isNaN(num) && Number.isInteger(num)) {
        return (num >>> 0) || 123456789;
    }
    const str = String(seed);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 123456789;
}

export function shuffle<T>(array: T[], rng: () => number): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

export class LetterStream {
    public word: string;
    public rawSeed: string | number;
    public seedNumber: number;
    private rng: () => number;
    public cache: string[];
    private bag: string[];
    private targetLetters: string[];
    private targetIndex: number;

    private utilityVowels = ["A", "A", "E", "E", "E", "I", "I", "O", "O", "U"];
    private utilityConsonants = [
        "R", "R", "S", "S", "T", "T", "L", "L", "N", "N",
        "D", "D", "M", "C", "P", "B", "G", "H"
    ];
    private flavorLetters = ["F", "K", "V", "W", "Y", "J", "Q", "X", "Z"];

    constructor(word = "PLANET", seed: string | number = 12345) {
        this.word = String(word).toUpperCase().trim();
        this.rawSeed = seed;
        this.seedNumber = hashSeed(seed);
        this.rng = mulberry32(this.seedNumber);

        this.cache = [];
        this.bag = [];
        this.targetLetters = this.word.split("");
        this.targetIndex = 0;
    }

    private _refillBag(): void {
        const miniBag: string[] = [];

        // 1. Guaranteed target letter cadence: 1 letter for <= 4 len words, 2 for >= 5 len
        const targetCount = this.word.length >= 5 ? 2 : 1;
        for (let i = 0; i < targetCount; i++) {
            miniBag.push(this.targetLetters[this.targetIndex % this.targetLetters.length]);
            this.targetIndex++;
        }

        // 2. High-utility vowels (2 vowels per mini-bag)
        for (let i = 0; i < 2; i++) {
            const vIdx = Math.floor(this.rng() * this.utilityVowels.length);
            miniBag.push(this.utilityVowels[vIdx]);
        }

        // 3. High-utility consonants (3 consonants per mini-bag)
        for (let i = 0; i < 3; i++) {
            const cIdx = Math.floor(this.rng() * this.utilityConsonants.length);
            miniBag.push(this.utilityConsonants[cIdx]);
        }

        // 4. Wildcard / flavor letter (~25% probability)
        if (this.rng() < 0.25) {
            const fIdx = Math.floor(this.rng() * this.flavorLetters.length);
            miniBag.push(this.flavorLetters[fIdx]);
        }

        // 5. Deterministic shuffle
        shuffle(miniBag, this.rng);

        // 6. Anti-clumping pass: ensure max 3 consecutive consonants across bag boundaries
        const isVowel = (c: string) => ["A", "E", "I", "O", "U"].includes(c);
        let consCount = 0;
        const prevLetters = this.bag.length > 0 ? this.bag : this.cache;
        for (let k = prevLetters.length - 1; k >= 0; k--) {
            if (!isVowel(prevLetters[k])) {
                consCount++;
            } else {
                break;
            }
        }

        for (let i = 0; i < miniBag.length; i++) {
            if (!isVowel(miniBag[i])) {
                consCount++;
                if (consCount >= 4) {
                    for (let j = i + 1; j < miniBag.length; j++) {
                        if (isVowel(miniBag[j])) {
                            const tmp = miniBag[i];
                            miniBag[i] = miniBag[j];
                            miniBag[j] = tmp;
                            break;
                        }
                    }
                    if (isVowel(miniBag[i])) {
                        consCount = 0;
                    }
                }
            } else {
                consCount = 0;
            }
        }

        this.bag.push(...miniBag);
    }

    public next(): string {
        if (this.bag.length === 0) {
            this._refillBag();
        }
        const letter = this.bag.shift()!;
        this.cache.push(letter);
        return letter;
    }

    public get(index: number): string {
        while (this.cache.length <= index) {
            this.next();
        }
        return this.cache[index];
    }

    public take(count: number): string[] {
        while (this.cache.length < count) {
            this.next();
        }
        return this.cache.slice(0, count);
    }

    public reset(): void {
        this.rng = mulberry32(this.seedNumber);
        this.cache = [];
        this.bag = [];
        this.targetIndex = 0;
    }
}

export class EndlessLetterStream {
    public cache: string[];
    private bag: string[];
    private rng: () => number;

    private vowels = ["A", "A", "E", "E", "E", "I", "I", "O", "O", "U"];
    private commonConsonants = [
        "R", "R", "S", "S", "T", "T", "L", "L", "N", "N",
        "D", "D", "M", "C", "P", "B", "G", "H"
    ];
    private rareConsonants = ["F", "K", "V", "W", "Y", "J", "X", "Z", "Q"];

    constructor(seed: number = Date.now()) {
        this.rng = mulberry32(hashSeed(seed));
        this.cache = [];
        this.bag = [];
    }

    private _refillBag(): void {
        const miniBag: string[] = [];
        for (let i = 0; i < 3; i++) {
            miniBag.push(this.vowels[Math.floor(this.rng() * this.vowels.length)]);
        }
        for (let i = 0; i < 3; i++) {
            miniBag.push(this.commonConsonants[Math.floor(this.rng() * this.commonConsonants.length)]);
        }
        if (this.rng() < 0.2) {
            miniBag.push(this.rareConsonants[Math.floor(this.rng() * this.rareConsonants.length)]);
        } else {
            miniBag.push(this.commonConsonants[Math.floor(this.rng() * this.commonConsonants.length)]);
        }

        shuffle(miniBag, this.rng);
        this.bag.push(...miniBag);
    }

    public next(): string {
        if (this.bag.length === 0) {
            this._refillBag();
        }
        const letter = this.bag.shift()!;
        this.cache.push(letter);
        return letter;
    }

    public get(index: number): string {
        while (this.cache.length <= index) {
            this.next();
        }
        return this.cache[index];
    }

    public take(count: number): string[] {
        while (this.cache.length < count) {
            this.next();
        }
        return this.cache.slice(0, count);
    }

    public reset(): void {
        this.cache = [];
        this.bag = [];
    }
}
