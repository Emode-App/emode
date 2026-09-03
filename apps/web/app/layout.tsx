import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "@emode/ui/src/globals.css";
import { ExtensionAuthBridge } from "../components/ExtensionAuthBridge";

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
        <html lang="en" className={`${inter.variable} ${outfit.variable} scroll-smooth`}>
            <body className="antialiased">
                <ExtensionAuthBridge />
                {children}
                <Analytics />
            </body>
        </html>
    );
}
