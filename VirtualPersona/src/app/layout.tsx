/**
 * @file layout.tsx
 * @brief 루트 레이아웃 컴포넌트
 * @description Next.js App Router의 루트 레이아웃을 정의합니다.
 */

import type { Metadata } from 'next';
import '@/styles/globals.css';

/**
 * @brief 페이지 메타데이터
 */
export const metadata: Metadata = {
    title: 'VirtualPersona - 실시간 아바타 화상채팅',
    description: '실제 얼굴 대신 실시간 아바타로 1:1 화상채팅을 즐기세요. 프라이버시를 보호하면서 감정을 전달합니다.',
    keywords: ['아바타', '화상채팅', 'WebRTC', '실시간', '프라이버시'],
};

/**
 * @brief 루트 레이아웃 컴포넌트
 * @param children - 자식 컴포넌트
 * @returns 레이아웃이 적용된 페이지
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <main>{children}</main>
            </body>
        </html>
    );
}
