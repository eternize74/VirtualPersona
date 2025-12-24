/**
 * @file HandsOverlay.tsx
 * @brief 손 랜드마크 시각화 컴포넌트
 * @description 캔버스에 손 랜드마크와 연결선을 그려 시각화합니다.
 */

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { HandLandmark, HandParams, HandGesture } from '@/types/avatarV2';
import { HAND_CONNECTIONS } from '@/hooks/useHandTracking';
import styles from './HandsOverlay.module.css';

/**
 * @brief HandsOverlay Props
 */
interface HandsOverlayProps {
    /** @brief 손 파라미터 */
    handParams: HandParams;
    /** @brief 캔버스 너비 */
    width?: number;
    /** @brief 캔버스 높이 */
    height?: number;
    /** @brief 미러 모드 (카메라 반전) */
    mirror?: boolean;
    /** @brief 추가 CSS 클래스 */
    className?: string;
}

/**
 * @brief 제스처 아이콘 매핑 (15종)
 */
const GESTURE_ICONS: Record<NonNullable<HandGesture>, string> = {
    wave: '👋',
    thumbsUp: '👍',
    thumbsDown: '👎',
    peace: '✌️',
    fist: '✊',
    open: '🖐️',
    point: '👆',
    ok: '👌',
    rock: '🤘',
    call: '🤙',
    love: '🤟',
    four: '🖖',
    pinch: '🤏',
    clap: '👏',
    pray: '🙏',
};

/**
 * @brief 손 랜드마크 시각화 컴포넌트
 * @param handParams - 손 파라미터
 * @param width - 캔버스 너비
 * @param height - 캔버스 높이
 * @param mirror - 미러 모드
 * @returns 캔버스 기반 손 오버레이
 */
export function HandsOverlay({
    handParams,
    width = 400,
    height = 400,
    mirror = true,
    className = '',
}: HandsOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    /**
     * @brief 단일 손 그리기
     */
    const drawHand = useCallback((
        ctx: CanvasRenderingContext2D,
        landmarks: HandLandmark[],
        color: string,
        isLeft: boolean
    ) => {
        if (!landmarks || landmarks.length < 21) return;

        // 연결선 그리기
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
            const start = landmarks[startIdx];
            const end = landmarks[endIdx];

            if (!start || !end) continue;

            let startX = start.x * width;
            let endX = end.x * width;

            // 미러 모드
            if (mirror) {
                startX = width - startX;
                endX = width - endX;
            }

            ctx.beginPath();
            ctx.moveTo(startX, start.y * height);
            ctx.lineTo(endX, end.y * height);
            ctx.stroke();
        }

        // 랜드마크 포인트 그리기
        for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            let x = lm.x * width;

            if (mirror) {
                x = width - x;
            }

            const y = lm.y * height;

            // 포인트 크기 (손가락 끝은 더 크게)
            const isTip = [4, 8, 12, 16, 20].includes(i);
            const radius = isTip ? 8 : 5;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = isTip ? '#fff' : color;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }, [width, height, mirror]);

    /**
     * @brief 제스처 아이콘 그리기
     */
    const drawGesture = useCallback((
        ctx: CanvasRenderingContext2D,
        gesture: HandGesture,
        x: number,
        y: number
    ) => {
        if (!gesture) return;

        const icon = GESTURE_ICONS[gesture];
        if (!icon) return;

        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);
    }, []);

    /**
     * @brief 렌더링
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 클리어
        ctx.clearRect(0, 0, width, height);

        const { leftHand, rightHand, gesture } = handParams;

        // 왼손 그리기 (파란색)
        if (leftHand) {
            drawHand(ctx, leftHand, '#3b82f6', true);
        }

        // 오른손 그리기 (초록색)
        if (rightHand) {
            drawHand(ctx, rightHand, '#10b981', false);
        }

        // 제스처 아이콘 표시
        if (gesture) {
            // 손 위치 기반으로 아이콘 위치 결정
            const hand = rightHand || leftHand;
            if (hand) {
                let wristX = hand[0].x * width;
                if (mirror) {
                    wristX = width - wristX;
                }
                const wristY = hand[0].y * height;

                // 손목 위에 아이콘 표시
                drawGesture(ctx, gesture, wristX, wristY - 50);
            }
        }
    }, [handParams, width, height, mirror, drawHand, drawGesture]);

    // 손이 감지되지 않으면 표시하지 않음
    if (!handParams.leftHand && !handParams.rightHand) {
        return null;
    }

    return (
        <div className={`${styles.container} ${className}`}>
            <canvas
                ref={canvasRef}
                className={styles.canvas}
                width={width}
                height={height}
            />
            {handParams.gesture && (
                <div className={styles.gestureLabel}>
                    {GESTURE_ICONS[handParams.gesture]} {handParams.gesture}
                </div>
            )}
        </div>
    );
}

export default HandsOverlay;
