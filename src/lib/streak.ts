// ==========================================
// Daily Streak Tracking for WordSnail
// Persisted in browser localStorage
// ==========================================

export interface DailyStreakData {
    currentStreak: number;
    maxStreak: number;
    lastSolvedDate: string; // DD-MM-YYYY
    totalWins: number;
    totalPlayed: number;
}

const STORAGE_KEY = "wordsnail_daily_streaks";

export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split("-").map(p => parseInt(p, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
        // [DD, MM, YYYY]
        const [day, month, year] = parts;
        return new Date(year, month - 1, day);
    }
    return null;
}

export function getDaysDiff(fromDateStr: string, toDateStr: string): number {
    const d1 = parseDate(fromDateStr);
    const d2 = parseDate(toDateStr);
    if (!d1 || !d2) return 999;
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function getTodayString(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
}

export function getStreakData(todayStr = getTodayString()): DailyStreakData {
    if (typeof window === "undefined") {
        return {
            currentStreak: 0,
            maxStreak: 0,
            lastSolvedDate: "",
            totalWins: 0,
            totalPlayed: 0
        };
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data: DailyStreakData = JSON.parse(raw);
            if (data.lastSolvedDate) {
                const diff = getDaysDiff(data.lastSolvedDate, todayStr);
                // If diff === 0: solved today (streak is active)
                // If diff === 1: solved yesterday (streak is active, awaiting today's solve)
                // If diff > 1: missed a day, streak is broken
                if (diff > 1) {
                    return {
                        ...data,
                        currentStreak: 0
                    };
                }
            }
            return data;
        }

        // Migration / Seeding: check if today's game was already solved
        const todaySaveKey = `wordsnail_daily_save_${todayStr}`;
        const rawTodaySave = localStorage.getItem(todaySaveKey);
        if (rawTodaySave) {
            const parsed = JSON.parse(rawTodaySave);
            if (parsed.isWon) {
                const initialData: DailyStreakData = {
                    currentStreak: 1,
                    maxStreak: 1,
                    lastSolvedDate: todayStr,
                    totalWins: 1,
                    totalPlayed: 1
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
                return initialData;
            }
        }
    } catch { }

    return {
        currentStreak: 0,
        maxStreak: 0,
        lastSolvedDate: "",
        totalWins: 0,
        totalPlayed: 0
    };
}

export function recordDailyWin(dateStr = getTodayString()): DailyStreakData {
    if (typeof window === "undefined") {
        return {
            currentStreak: 1,
            maxStreak: 1,
            lastSolvedDate: dateStr,
            totalWins: 1,
            totalPlayed: 1
        };
    }

    try {
        const current = getStreakData(dateStr);

        // Already recorded for this date
        if (current.lastSolvedDate === dateStr && current.currentStreak > 0) {
            return current;
        }

        let nextStreak = 1;
        if (current.lastSolvedDate) {
            const diff = getDaysDiff(current.lastSolvedDate, dateStr);
            if (diff === 1) {
                // Solved consecutive day
                nextStreak = current.currentStreak + 1;
            } else if (diff === 0) {
                nextStreak = current.currentStreak;
            } else {
                // Streak broken, starting new streak
                nextStreak = 1;
            }
        }

        const nextMax = Math.max(current.maxStreak, nextStreak);
        const nextWins = current.lastSolvedDate === dateStr ? current.totalWins : current.totalWins + 1;
        const nextPlayed = current.lastSolvedDate === dateStr ? current.totalPlayed : Math.max(current.totalPlayed, nextWins);

        const updated: DailyStreakData = {
            currentStreak: nextStreak,
            maxStreak: nextMax,
            lastSolvedDate: dateStr,
            totalWins: nextWins,
            totalPlayed: nextPlayed
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch {
        return {
            currentStreak: 1,
            maxStreak: 1,
            lastSolvedDate: dateStr,
            totalWins: 1,
            totalPlayed: 1
        };
    }
}
