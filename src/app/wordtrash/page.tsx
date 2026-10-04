import { Metadata } from "next";
import { WordTrashGame } from "@/components/WordTrashGame";

export const metadata: Metadata = {
    title: "WordTrash - Endless Word Crush",
    description: "Endless arcade word puzzle! Form 3+ letter words to trash tiles and trigger cascading combos.",
};

export default function WordTrashPage() {
    return <WordTrashGame />;
}
