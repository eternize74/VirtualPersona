/**
 * @file AvatarRendererV3.tsx
 * @brief Neural Avatar 렌더러
 * @description 추론 서버에서 받은 이미지를 표시하는 컴포넌트
 */

'use client';

import React, { useRef, useEffect } from 'react';
import styles from './AvatarRendererV3.module.css';

/**
 * @brief AvatarRendererV3 Props
 */
export interface AvatarRendererV3Props {
    /** @brief 이미지 소스 (data URL) */
    imageSrc: string | null;
    /** @brief 너비 */
    width?: number;
    /** @brief 높이 */
    height?: number;
    /** @brief 로딩 중 여부 */
    loading?: boolean;
    /** @brief 플레이스홀더 텍스트 */
    placeholder?: string;
}

/**
 * @brief Neural Avatar 렌더러 컴포넌트
 */
export function AvatarRendererV3({
    imageSrc,
    width = 256,
    height = 256,
    loading = false,
    placeholder = 'Reference 이미지를 업로드하세요',
}: AvatarRendererV3Props): React.ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // 이미지 로드 및 캔버스에 그리기
    useEffect(() => {
        if (!imageSrc || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 이미지 객체 재사용
        if (!imageRef.current) {
            imageRef.current = new Image();
        }

        const image = imageRef.current;

        image.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        };

        image.src = imageSrc;
    }, [imageSrc]);

    return (
        <div
            className={styles.container}
            style={{ width, height }}
        >
            {imageSrc ? (
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className={styles.canvas}
                />
            ) : (
                <div className={styles.placeholder}>
                    {loading ? (
                        <div className={styles.loader}>
                            <span className={styles.spinner} />
                            <span>로딩 중...</span>
                        </div>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </div>
            )}
        </div>
    );
}

export default AvatarRendererV3;
