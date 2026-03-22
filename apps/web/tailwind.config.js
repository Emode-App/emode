/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#fdfdfd",
                foreground: "#111111",
                obsidian: "#0a0a0a",
                charcoal: "#2d2d2d",
                "off-white": "#f5f5f5",
                "accent-gold": "#c5a059",
                "accent-silver": "#a0a0a0",
                success: "#10b981",
                error: "#ef4444",
                star: "#fbbf24",
            },
            backgroundImage: {
                "purple-gradient": "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            },
            fontFamily: {
                heading: ["Outfit", "sans-serif"],
                body: ["Inter", "sans-serif"],
            },
        },
    },
    plugins: [],
};
