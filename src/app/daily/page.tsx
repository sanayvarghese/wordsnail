import { Metadata } from "next";
import { WordSnailGame } from "@/components/WordSnailGame";

export const metadata: Metadata = {
    title: "Daily Challenge - WordSnail",
    description: "Play today's official daily WordSnail challenge! Form the hidden word before reaching the ceiling.",
};

export default function DailyPage() {
    return <WordSnailGame mode="daily" />;
}
