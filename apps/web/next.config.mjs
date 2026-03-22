/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["@emode/ui", "@emode/database", "@emode/types"],
    webpack: (config) => {
        config.cache = false;
        return config;
    },
    async headers() {
        return [
            {
                // Allow /modal to be embedded as iframe from any origin
                source: '/modal',
                headers: [
                    { key: 'X-Frame-Options', value: 'ALLOWALL' },
                    { key: 'Content-Security-Policy', value: "frame-ancestors *" },
                ],
            },
            {
                // CORS for API routes (widget/extension fetch from cross-origin iframes)
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                ],
            },
        ];
    },
};

export default nextConfig;
