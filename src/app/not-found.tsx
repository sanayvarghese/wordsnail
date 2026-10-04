import React from "react";
import Link from "next/link";
import { Original_Surfer } from "next/font/google";

const monoton = Original_Surfer({
    weight: "400",
    subsets: ["latin"],
});

export default function NotFound() {
    return (
        <main className="app-container">
            <header className="header-wrapper">
                <div className="header-top">
                    <Link href="/" style={{ textDecoration: "none" }}>
                        <div className="brand-logo-container">
                            <img
                                src="/images/word-logo.png"
                                alt="WORD"
                                className="brand-logo-image"
                            />
                            <span className={monoton.className} style={{ fontSize: 22, marginTop: 6, color: "#F4C430" }}>
                                SNAIL
                            </span>
                        </div>
                    </Link>
                </div>
            </header>

            <div className="start-screen-wrapper">
                <div className="start-card" style={{ paddingTop: 40, paddingBottom: 40 }}>
                    <div className="hub-mascot-container">
                        <img
                            src="/mascot/thinking-snail.png"
                            alt="Thinking Snail"
                            className="hub-mascot-img"
                        />
                    </div>

                    <h2 className="start-headline">Page Not Found</h2>
                    <p className="start-subtext">
                        This page doesn&apos;t exist. Head back to the puzzle.
                    </p>

                    <Link href="/" className="btn-play-daily" style={{ textDecoration: "none", display: "flex" }}>
                        Back to Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
