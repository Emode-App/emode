import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "@emode/ui/src/globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
});

export const metadata: Metadata = {
    title: "emodeAI | Virtual Try-On for Modern Fashion",
    description: "Experience high-fashion try-ons anywhere you shop.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
            <body className="antialiased">{children}</body>
        </html>
    );
}
