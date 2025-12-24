/**
 * @file AvatarRendererV2.tsx
 * @brief Phase 2 확장 아바타 렌더러 컴포넌트
 * @description 커스터마이징, 감정 프리셋, 스타일 옵션을 지원하는 확장 렌더러입니다.
 */

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { AvatarParams, DEFAULT_AVATAR_PARAMS } from '@/types/avatar';
import {
    AvatarCustomization,
    DEFAULT_CUSTOMIZATION,
    EyeStyle,
    MouthStyle
} from '@/types/avatarV2';
import styles from './AvatarRenderer.module.css';

/**
 * @brief AvatarRendererV2 Props
 */
interface AvatarRendererV2Props {
    /** @brief 아바타 ID */
    avatarId: string;

    /** @brief 아바타 파라미터 */
    params: AvatarParams;

    /** @brief 커스터마이징 옵션 (Phase 2) */
    customization?: AvatarCustomization;

    /** @brief 캔버스 너비 */
    width?: number;

    /** @brief 캔버스 높이 */
    height?: number;

    /** @brief 추가 CSS 클래스 */
    className?: string;
}

/**
 * @brief Phase 2 확장 아바타 렌더러 컴포넌트
 * @param avatarId - 아바타 ID
 * @param params - 아바타 파라미터
 * @param customization - 커스터마이징 옵션
 * @param width - 캔버스 너비
 * @param height - 캔버스 높이
 * @returns Canvas 기반 아바타 렌더링 (커스터마이징 지원)
 */
export default function AvatarRendererV2({
    avatarId,
    params,
    customization = DEFAULT_CUSTOMIZATION,
    width = 400,
    height = 400,
    className = '',
}: AvatarRendererV2Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    /**
     * @brief 눈 스타일별 렌더링
     */
    const drawEye = useCallback((
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        scale: number,
        eyeOpen: number,
        eyeOffsetX: number,
        eyeOffsetY: number,
        eyeStyle: EyeStyle,
        colors: { primary: string; secondary: string }
    ) => {
        ctx.save();

        const adjustedEyeOpen = Math.max(0.1, eyeOpen);

        // 눈 스타일에 따른 형태
        switch (eyeStyle) {
            case 'star':
                // 별 모양 눈
                ctx.beginPath();
                const starPoints = 5;
                const outerRadius = 20 * scale * adjustedEyeOpen;
                const innerRadius = 10 * scale * adjustedEyeOpen;
                for (let i = 0; i < starPoints * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / starPoints - Math.PI / 2;
                    const px = x + Math.cos(angle) * radius;
                    const py = y + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = colors.secondary;
                ctx.fill();
                break;

            case 'cat':
                // 고양이 눈 (세로로 긴 동공)
                ctx.beginPath();
                ctx.ellipse(x, y, 18 * scale, 24 * scale * adjustedEyeOpen, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();

                if (eyeOpen > 0.2) {
                    // 세로 동공
                    ctx.beginPath();
                    ctx.ellipse(x + eyeOffsetX, y + eyeOffsetY, 4 * scale, 12 * scale * eyeOpen, 0, 0, Math.PI * 2);
                    ctx.fillStyle = '#1a1a2e';
                    ctx.fill();
                }
                break;

            case 'almond':
                // 아몬드 눈
                ctx.beginPath();
                ctx.moveTo(x - 22 * scale, y);
                ctx.quadraticCurveTo(x, y - 18 * scale * adjustedEyeOpen, x + 22 * scale, y);
                ctx.quadraticCurveTo(x, y + 18 * scale * adjustedEyeOpen, x - 22 * scale, y);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();

                if (eyeOpen > 0.2) {
                    ctx.beginPath();
                    ctx.arc(x + eyeOffsetX, y + eyeOffsetY, 8 * scale * eyeOpen, 0, Math.PI * 2);
                    ctx.fillStyle = colors.secondary;
                    ctx.fill();
                }
                break;

            case 'round':
            default:
                // 기본 둥근 눈
                ctx.beginPath();
                ctx.ellipse(x, y, 18 * scale, 22 * scale * adjustedEyeOpen, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();

                if (eyeOpen > 0.2) {
                    ctx.beginPath();
                    ctx.arc(x + eyeOffsetX, y + eyeOffsetY, 10 * scale * eyeOpen, 0, Math.PI * 2);
                    ctx.fillStyle = colors.secondary;
                    ctx.fill();

                    // 하이라이트
                    ctx.beginPath();
                    ctx.arc(x + eyeOffsetX - 3 * scale, y + eyeOffsetY - 3 * scale, 3 * scale, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                }
                break;
        }

        ctx.restore();
    }, []);

    /**
     * @brief 입 스타일별 렌더링
     */
    const drawMouth = useCallback((
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        scale: number,
        mouthOpen: number,
        smile: number,
        mouthStyle: MouthStyle
    ) => {
        const mouthWidth = 40 * scale + smile * 15 * scale;
        const openAmount = mouthOpen * 20 * scale;

        ctx.save();

        switch (mouthStyle) {
            case 'cat':
                // 고양이 입 (ω 모양)
                if (openAmount > 2) {
                    ctx.beginPath();
                    ctx.moveTo(x - 20 * scale, y);
                    ctx.quadraticCurveTo(x - 10 * scale, y + openAmount, x, y + 5 * scale);
                    ctx.quadraticCurveTo(x + 10 * scale, y + openAmount, x + 20 * scale, y);
                    ctx.fillStyle = '#8B0000';
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(x - 15 * scale, y - 5 * scale);
                    ctx.lineTo(x, y + 5 * scale + smile * 5 * scale);
                    ctx.lineTo(x + 15 * scale, y - 5 * scale);
                    ctx.strokeStyle = '#8B4513';
                    ctx.lineWidth = 3 * scale;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
                break;

            case 'dot':
                // 점 입
                ctx.beginPath();
                const dotSize = 3 * scale + mouthOpen * 8 * scale;
                ctx.arc(x, y, dotSize, 0, Math.PI * 2);
                ctx.fillStyle = mouthOpen > 0.3 ? '#8B0000' : '#8B4513';
                ctx.fill();
                break;

            case 'smile':
                // 큰 미소
                ctx.beginPath();
                const smileCurve = 20 * scale + smile * 10 * scale;
                ctx.moveTo(x - mouthWidth, y - 5 * scale);
                ctx.quadraticCurveTo(x, y + smileCurve, x + mouthWidth, y - 5 * scale);

                if (openAmount > 2) {
                    ctx.lineTo(x + mouthWidth * 0.8, y);
                    ctx.quadraticCurveTo(x, y + smileCurve * 0.6, x - mouthWidth * 0.8, y);
                    ctx.closePath();
                    ctx.fillStyle = '#8B0000';
                    ctx.fill();
                } else {
                    ctx.strokeStyle = '#8B4513';
                    ctx.lineWidth = 4 * scale;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
                break;

            case 'normal':
            default:
                // 기본 입
                ctx.beginPath();
                if (openAmount > 2) {
                    ctx.ellipse(x, y, mouthWidth, openAmount, 0, 0, Math.PI * 2);
                    ctx.fillStyle = '#8B0000';
                    ctx.fill();

                    // 혀
                    ctx.beginPath();
                    ctx.ellipse(x, y + openAmount * 0.3, mouthWidth * 0.6, openAmount * 0.5, 0, 0, Math.PI);
                    ctx.fillStyle = '#FF6B6B';
                    ctx.fill();
                } else {
                    const smileCurve = smile * 15 * scale;
                    ctx.moveTo(x - mouthWidth, y);
                    ctx.quadraticCurveTo(x, y + smileCurve, x + mouthWidth, y);
                    ctx.strokeStyle = '#8B4513';
                    ctx.lineWidth = 3 * scale;
                    ctx.stroke();
                }
                break;
        }

        ctx.restore();
    }, []);

    /**
     * @brief 아바타 렌더링 함수
     */
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 커스터마이징 색상 사용
        const colors = {
            primary: customization.primaryColor,
            secondary: customization.secondaryColor,
            skin: customization.skinColor,
        };

        const centerX = width / 2;
        const centerY = height / 2;
        const scale = Math.min(width, height) / 400;

        // 클리어
        ctx.clearRect(0, 0, width, height);

        // Head Rotation 적용
        const [pitch, yaw, roll] = params.headRotation;
        const yawDeg = yaw * 180 / Math.PI;
        const pitchDeg = pitch * 180 / Math.PI;

        ctx.save();
        ctx.translate(centerX, centerY);

        // Roll 적용
        ctx.rotate(roll * 0.8);

        // Yaw 적용
        const yawOffset = yawDeg * 2.5;
        ctx.translate(yawOffset, 0);

        // Pitch 적용
        const pitchOffset = pitchDeg * 1.5;
        ctx.translate(0, pitchOffset);

        // 원근 효과
        const perspectiveScale = 1 - Math.abs(yawDeg) / 100;
        ctx.scale(perspectiveScale, 1);

        ctx.translate(-centerX, -centerY);

        // 눈 위치 오프셋
        const eyeOffsetX = yawDeg * 0.3;
        const eyeOffsetY = pitchDeg * 0.2;

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

        // 3. 볼 터치
        const blushOpacity = 0.15 + params.smile * 0.2;
        ctx.beginPath();
        ctx.ellipse(centerX - 60 * scale, centerY + 20 * scale, 20 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 150, 150, ${blushOpacity})`;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 60 * scale, centerY + 20 * scale, 20 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. 눈 (스타일 적용)
        const eyeY = centerY - 15 * scale;
        const leftEyeX = centerX - 35 * scale;
        const rightEyeX = centerX + 35 * scale;

        const eyeOpenLeft = 1 - params.eyeBlinkLeft;
        const eyeOpenRight = 1 - params.eyeBlinkRight;

        drawEye(ctx, leftEyeX, eyeY, scale, eyeOpenLeft, eyeOffsetX, eyeOffsetY, customization.eyeStyle, colors);
        drawEye(ctx, rightEyeX, eyeY, scale, eyeOpenRight, eyeOffsetX, eyeOffsetY, customization.eyeStyle, colors);

        // 눈썹
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 4 * scale;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(leftEyeX - 15 * scale, eyeY - 30 * scale);
        ctx.quadraticCurveTo(leftEyeX, eyeY - 35 * scale, leftEyeX + 15 * scale, eyeY - 30 * scale);
        ctx.stroke();

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

        // 6. 입 (스타일 적용)
        const mouthY = centerY + 50 * scale;
        drawMouth(ctx, centerX, mouthY, scale, params.mouthOpen, params.smile, customization.mouthStyle);

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
    }, [avatarId, params, customization, width, height, drawEye, drawMouth]);

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
