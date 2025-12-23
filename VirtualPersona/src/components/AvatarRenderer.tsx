/**
 * @file AvatarRenderer.tsx
 * @brief 2D 아바타 렌더러 컴포넌트
 * @description Canvas 기반으로 아바타 파라미터를 적용하여 실시간 렌더링합니다.
 */

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { AvatarParams, DEFAULT_AVATAR_PARAMS } from '@/types/avatar';
import styles from './AvatarRenderer.module.css';

/**
 * @brief AvatarRenderer Props
 */
interface AvatarRendererProps {
    /** @brief 아바타 ID */
    avatarId: string;

    /** @brief 아바타 파라미터 */
    params: AvatarParams;

    /** @brief 캔버스 너비 */
    width?: number;

    /** @brief 캔버스 높이 */
    height?: number;

    /** @brief 추가 CSS 클래스 */
    className?: string;
}

/**
 * @brief 아바타 색상 맵
 */
const AVATAR_COLORS: Record<string, { primary: string; secondary: string; skin: string }> = {
    avatar1: { primary: '#6366f1', secondary: '#8b5cf6', skin: '#FFE4C4' },
    avatar2: { primary: '#ec4899', secondary: '#f472b6', skin: '#FFDAB9' },
    avatar3: { primary: '#10b981', secondary: '#34d399', skin: '#FFE4E1' },
    avatar4: { primary: '#f59e0b', secondary: '#fbbf24', skin: '#FFE4C4' },
};

/**
 * @brief 2D 아바타 렌더러 컴포넌트
 * @param avatarId - 아바타 ID
 * @param params - 아바타 파라미터
 * @param width - 캔버스 너비
 * @param height - 캔버스 높이
 * @returns Canvas 기반 아바타 렌더링
 */
export default function AvatarRenderer({
    avatarId,
    params,
    width = 400,
    height = 400,
    className = '',
}: AvatarRendererProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const prevParamsRef = useRef<AvatarParams>(DEFAULT_AVATAR_PARAMS);

    /**
     * @brief 아바타 렌더링 함수
     */
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const colors = AVATAR_COLORS[avatarId] || AVATAR_COLORS.avatar1;
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = Math.min(width, height) / 400;

        // 클리어
        ctx.clearRect(0, 0, width, height);

        // Head Rotation 적용
        const [pitch, yaw, roll] = params.headRotation;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(roll * 0.5); // Roll 적용 (감쇠)
        ctx.translate(yaw * 30, pitch * 20); // Yaw/Pitch로 위치 이동
        ctx.translate(-centerX, -centerY);

        // 1. 머리카락 (뒤)
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - 20 * scale, 120 * scale, 130 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = colors.primary;
        ctx.fill();

        // 2. 얼굴 베이스
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 100 * scale, 110 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = colors.skin;
        ctx.fill();

        // 3. 볼 터치 (미소에 따라 강도 변화)
        const blushOpacity = 0.15 + params.smile * 0.2;
        ctx.beginPath();
        ctx.ellipse(centerX - 60 * scale, centerY + 20 * scale, 20 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 150, 150, ${blushOpacity})`;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 60 * scale, centerY + 20 * scale, 20 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. 눈 (깜빡임 적용)
        const eyeY = centerY - 15 * scale;
        const leftEyeX = centerX - 35 * scale;
        const rightEyeX = centerX + 35 * scale;

        // 눈 흰자
        const eyeOpenLeft = 1 - params.eyeBlinkLeft;
        const eyeOpenRight = 1 - params.eyeBlinkRight;

        // 왼쪽 눈
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 18 * scale, 22 * scale * Math.max(0.1, eyeOpenLeft), 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 왼쪽 눈동자
        if (eyeOpenLeft > 0.2) {
            ctx.beginPath();
            ctx.arc(leftEyeX + yaw * 5, eyeY + pitch * 3, 10 * scale * eyeOpenLeft, 0, Math.PI * 2);
            ctx.fillStyle = colors.secondary;
            ctx.fill();

            // 눈동자 하이라이트
            ctx.beginPath();
            ctx.arc(leftEyeX + yaw * 5 - 3 * scale, eyeY + pitch * 3 - 3 * scale, 3 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
        ctx.restore();

        // 오른쪽 눈
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(rightEyeX, eyeY, 18 * scale, 22 * scale * Math.max(0.1, eyeOpenRight), 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 오른쪽 눈동자
        if (eyeOpenRight > 0.2) {
            ctx.beginPath();
            ctx.arc(rightEyeX + yaw * 5, eyeY + pitch * 3, 10 * scale * eyeOpenRight, 0, Math.PI * 2);
            ctx.fillStyle = colors.secondary;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(rightEyeX + yaw * 5 - 3 * scale, eyeY + pitch * 3 - 3 * scale, 3 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
        ctx.restore();

        // 눈썹
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 4 * scale;
        ctx.lineCap = 'round';

        // 왼쪽 눈썹
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 15 * scale, eyeY - 30 * scale);
        ctx.quadraticCurveTo(leftEyeX, eyeY - 35 * scale, leftEyeX + 15 * scale, eyeY - 30 * scale);
        ctx.stroke();

        // 오른쪽 눈썹
        ctx.beginPath();
        ctx.moveTo(rightEyeX - 15 * scale, eyeY - 30 * scale);
        ctx.quadraticCurveTo(rightEyeX, eyeY - 35 * scale, rightEyeX + 15 * scale, eyeY - 30 * scale);
        ctx.stroke();

        // 5. 코
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + 5 * scale);
        ctx.lineTo(centerX - 5 * scale, centerY + 25 * scale);
        ctx.lineTo(centerX + 5 * scale, centerY + 25 * scale);
        ctx.closePath();
        ctx.fillStyle = `rgba(200, 150, 130, 0.3)`;
        ctx.fill();

        // 6. 입 (벌림 및 미소 적용)
        const mouthY = centerY + 50 * scale;
        const mouthWidth = 40 * scale + params.smile * 15 * scale;
        const mouthOpen = params.mouthOpen * 20 * scale;

        ctx.beginPath();
        if (mouthOpen > 2) {
            // 열린 입
            ctx.ellipse(centerX, mouthY, mouthWidth, mouthOpen, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#8B0000';
            ctx.fill();

            // 혀
            ctx.beginPath();
            ctx.ellipse(centerX, mouthY + mouthOpen * 0.3, mouthWidth * 0.6, mouthOpen * 0.5, 0, 0, Math.PI);
            ctx.fillStyle = '#FF6B6B';
            ctx.fill();
        } else {
            // 닫힌 입 (미소)
            const smileCurve = params.smile * 15 * scale;
            ctx.moveTo(centerX - mouthWidth, mouthY);
            ctx.quadraticCurveTo(centerX, mouthY + smileCurve, centerX + mouthWidth, mouthY);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
        }

        // 7. 머리카락 (앞)
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - 80 * scale, 100 * scale, 60 * scale, 0, Math.PI, Math.PI * 2);
        ctx.fillStyle = colors.primary;
        ctx.fill();

        // 앞머리 디테일
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.ellipse(
                centerX + i * 25 * scale,
                centerY - 60 * scale,
                15 * scale,
                30 * scale,
                (i * 0.1),
                0,
                Math.PI * 2
            );
            ctx.fillStyle = i % 2 === 0 ? colors.primary : colors.secondary;
            ctx.fill();
        }

        ctx.restore();
    }, [avatarId, params, width, height]);

    /**
     * @brief 렌더 루프
     */
    useEffect(() => {
        const loop = () => {
            render();
            animationRef.current = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [render]);

    /**
     * @brief 캔버스 크기 설정
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
        }
    }, [width, height]);

    return (
        <div className={`${styles.container} ${className}`}>
            <canvas
                ref={canvasRef}
                className={styles.canvas}
                width={width}
                height={height}
            />
        </div>
    );
}
