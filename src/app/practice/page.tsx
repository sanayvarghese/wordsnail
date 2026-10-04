import { Metadata } from "next";
import { WordSnailGame } from "@/components/WordSnailGame";

export const metadata: Metadata = {
    title: "Practice Mode - WordSnail",
    description: "Play unlimited random practice rounds of WordSnail with fresh words anytime!",
};

export default function PracticePage() {
    return <WordSnailGame mode="practice" />;
}
