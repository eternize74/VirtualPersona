/**
 * @file EmotionPresets.tsx
 * @brief 감정 프리셋 컴포넌트 (Phase 2)
 * @description 빠른 감정 표현을 위한 버튼 UI입니다. 키보드 단축키 지원.
 */

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { AvatarParams } from '@/types/avatar';
import { EmotionType, EmotionPreset, EMOTION_PRESETS } from '@/types/avatarV2';
import styles from './EmotionPresets.module.css';

/**
 * @brief EmotionPresets Props
 */
interface EmotionPresetsProps {
    /** @brief 현재 아바타 파라미터 */
    currentParams: AvatarParams;
    /** @brief 파라미터 변경 콜백 */
    onParamsChange: (params: AvatarParams) => void;
    /** @brief 감정 해제 콜백 (카메라로 돌아가기) */
    onEmotionClear?: () => void;
    /** @brief 컴포넌트 클래스명 */
    className?: string;
}

/**
 * @brief 감정 프리셋 컴포넌트
 * @param currentParams - 현재 아바타 파라미터
 * @param onParamsChange - 파라미터 변경 콜백
 * @param onEmotionClear - 감정 해제 콜백
 * @returns 감정 프리셋 버튼 UI
 */
export function EmotionPresets({
    currentParams,
    onParamsChange,
    onEmotionClear,
    className = '',
}: EmotionPresetsProps) {
    const [activeEmotion, setActiveEmotion] = useState<EmotionType | null>(null);
    const originalParamsRef = useRef<AvatarParams | null>(null);

    /**
     * @brief 카메라로 돌아가기 (감정 해제)
     */
    const clearEmotion = useCallback(() => {
        setActiveEmotion(null);
        originalParamsRef.current = null;
        onEmotionClear?.();
    }, [onEmotionClear]);

    /**
     * @brief 감정 프리셋 적용
     */
    const applyEmotion = useCallback((preset: EmotionPreset) => {
        // 이미 활성화된 감정이면 취소 (토글)
        if (activeEmotion === preset.type) {
            clearEmotion();
            return;
        }

        // 원본 파라미터 저장 (첫 활성화 시만)
        if (!originalParamsRef.current) {
            originalParamsRef.current = { ...currentParams };
        }

        // 감정 프리셋 적용
        setActiveEmotion(preset.type);

        const newParams: AvatarParams = {
            ...currentParams,
            ...preset.params,
            timestamp: Date.now(),
        };

        // headRotation이 있으면 적용
        if (preset.params.headRotation) {
            newParams.headRotation = preset.params.headRotation as [number, number, number];
        }

        onParamsChange(newParams);
    }, [activeEmotion, currentParams, onParamsChange, clearEmotion]);

    /**
     * @brief 키보드 단축키 핸들러
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 입력 필드에서는 무시
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // ESC 키로 감정 해제
            if (e.key === 'Escape' && activeEmotion) {
                e.preventDefault();
                clearEmotion();
                return;
            }

            // 숫자 키로 감정 적용
            const preset = EMOTION_PRESETS.find(p => p.shortcut === e.key);
            if (preset) {
                e.preventDefault();
                applyEmotion(preset);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [applyEmotion, activeEmotion, clearEmotion]);

    return (
        <div className={`${styles.container} ${className}`}>
            <div className={styles.header}>
                <span className={styles.title}>😊 감정 표현</span>
                <span className={styles.hint}>(1-6, ESC로 해제)</span>
            </div>

            <div className={styles.grid}>
                {EMOTION_PRESETS.map((preset) => (
                    <button
                        key={preset.type}
                        className={`${styles.emotionButton} ${activeEmotion === preset.type ? styles.active : ''
                            }`}
                        onClick={() => applyEmotion(preset)}
                        title={`${preset.name} (${preset.shortcut})`}
                    >
                        <span className={styles.icon}>{preset.icon}</span>
                        <span className={styles.name}>{preset.name}</span>
                        <span className={styles.shortcut}>{preset.shortcut}</span>
                    </button>
                ))}
            </div>

            {activeEmotion && (
                <div className={styles.activeIndicator}>
                    <span className={styles.pulse}>●</span>
                    <span>{EMOTION_PRESETS.find(p => p.type === activeEmotion)?.name} 활성화</span>
                    <button
                        className={styles.clearButton}
                        onClick={clearEmotion}
                        title="카메라로 돌아가기 (ESC)"
                    >
                        📹 카메라로
                    </button>
                </div>
            )}
        </div>
    );
}

export default EmotionPresets;
