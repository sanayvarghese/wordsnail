import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DailyGameMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

function getFormattedDate(d = new Date()): string {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientDate = searchParams.get("date");

    let todayStr = getFormattedDate();
    if (clientDate) {
        const ddmmyyyy = clientDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (ddmmyyyy) {
            todayStr = `${ddmmyyyy[1].padStart(2, "0")}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[3]}`;
        } else {
            const yyyymmdd = clientDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
            if (yyyymmdd) {
                todayStr = `${yyyymmdd[3].padStart(2, "0")}-${yyyymmdd[2].padStart(2, "0")}-${yyyymmdd[1]}`;
            }
        }
    }

    const nextGamesDir = path.join(process.cwd(), "src", "data", "games");
    const rootGamesDir = path.join(process.cwd(), "..", "games");

    try {
        // 1. Try Next.js games directory
        const nextFilePath = path.join(nextGamesDir, `${todayStr}.json`);
        if (fs.existsSync(nextFilePath)) {
            const raw = fs.readFileSync(nextFilePath, "utf8");
            return NextResponse.json(JSON.parse(raw));
        }

        // 2. Try root games directory
        const rootFilePath = path.join(rootGamesDir, `${todayStr}.json`);
        if (fs.existsSync(rootFilePath)) {
            const raw = fs.readFileSync(rootFilePath, "utf8");
            return NextResponse.json(JSON.parse(raw));
        }

        // 3. Fallback: find the latest existing puzzle file
        const searchDir = fs.existsSync(nextGamesDir) ? nextGamesDir : (fs.existsSync(rootGamesDir) ? rootGamesDir : null);
        if (searchDir) {
            const files = fs.readdirSync(searchDir).filter(f => f.endsWith(".json"));
            if (files.length > 0) {
                files.sort();
                const latestFile = files[files.length - 1];
                const raw = fs.readFileSync(path.join(searchDir, latestFile), "utf8");
                const parsed = JSON.parse(raw);
                return NextResponse.json({ ...parsed, date: todayStr });
            }
        }
    } catch {
        // Fallback
    }

    // Default daily game fallback: pick from target_words.json
    let fallbackWord = "PLANT";
    try {
        const targetWordsPath = path.join(process.cwd(), "src", "data", "target_words.json");
        if (fs.existsSync(targetWordsPath)) {
            const twData = JSON.parse(fs.readFileSync(targetWordsPath, "utf8"));
            const fiveLetter = (twData?.words || []).filter((w: string) => w.length === 5);
            if (fiveLetter.length > 0) {
                fallbackWord = fiveLetter[Math.floor(Math.random() * fiveLetter.length)];
            }
        }
    } catch {}

    const fallback: DailyGameMeta = {
        id: 276,
        date: todayStr,
        word: fallbackWord,
        seed: 435962861,
        difficulty: "Hard",
        created_on: new Date().toISOString()
    };
    return NextResponse.json(fallback);
}
