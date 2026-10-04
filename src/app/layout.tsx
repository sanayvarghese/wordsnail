import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PreventPullToRefresh } from "@/components/PreventPullToRefresh";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WordSnail - Daily Word Puzzle",
  description: "A Tetris-style word puzzle. Slide falling letters to spell the hidden word before hitting the ceiling.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <PreventPullToRefresh />
        {children}
      </body>
    </html>
  );
}
