import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
    const gamesDir = path.join(process.cwd(), "src", "data", "games");
    try {
        if (fs.existsSync(gamesDir)) {
            const files = fs.readdirSync(gamesDir).filter(f => f.endsWith(".json"));
            const games = files.map(file => {
                const raw = fs.readFileSync(path.join(gamesDir, file), "utf8");
                return JSON.parse(raw);
            });
            return NextResponse.json({ games });
        }
    } catch {
        // Fallback
    }
    return NextResponse.json({ games: [] });
}
