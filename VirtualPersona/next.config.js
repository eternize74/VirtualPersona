/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false, // WebSocket 연결 안정성을 위해 비활성화
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            path: false,
        };
        return config;
    },
};

module.exports = nextConfig;
