/**
 * @file AvatarCustomizer.tsx
 * @brief 아바타 커스터마이징 컴포넌트 (Phase 2)
 * @description 색상, 스타일 등 아바타 외형을 커스터마이징하는 UI입니다.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    AvatarCustomization,
    DEFAULT_CUSTOMIZATION,
    SKIN_COLOR_PRESETS,
    PRIMARY_COLOR_PRESETS,
    EyeStyle,
    MouthStyle,
} from '@/types/avatarV2';
import styles from './AvatarCustomizer.module.css';

/**
 * @brief AvatarCustomizer Props
 */
interface AvatarCustomizerProps {
    /** @brief 현재 커스터마이징 설정 */
    customization?: AvatarCustomization;
    /** @brief 설정 변경 콜백 */
    onChange: (customization: AvatarCustomization) => void;
    /** @brief 닫기 콜백 */
    onClose?: () => void;
    /** @brief 컴포넌트 클래스명 */
    className?: string;
}

/**
 * @brief 눈 스타일 옵션
 */
const EYE_STYLE_OPTIONS: { value: EyeStyle; label: string; icon: string }[] = [
    { value: 'round', label: '둥근 눈', icon: '◉' },
    { value: 'almond', label: '아몬드', icon: '◐' },
    { value: 'cat', label: '고양이', icon: '◆' },
    { value: 'star', label: '별', icon: '★' },
];

/**
 * @brief 입 스타일 옵션
 */
const MOUTH_STYLE_OPTIONS: { value: MouthStyle; label: string; icon: string }[] = [
    { value: 'normal', label: '기본', icon: '◡' },
    { value: 'cat', label: '고양이', icon: 'ω' },
    { value: 'smile', label: '미소', icon: '∪' },
    { value: 'dot', label: '점', icon: '·' },
];

/**
 * @brief 아바타 커스터마이저 컴포넌트
 * @param customization - 현재 커스터마이징 설정
 * @param onChange - 설정 변경 콜백
 * @param onClose - 닫기 콜백
 * @returns 커스터마이징 UI
 */
export function AvatarCustomizer({
    customization = DEFAULT_CUSTOMIZATION,
    onChange,
    onClose,
    className = '',
}: AvatarCustomizerProps) {
    const [localCustomization, setLocalCustomization] = useState<AvatarCustomization>(customization);

    // 로컬 스토리지에서 저장된 설정 로드
    useEffect(() => {
        const saved = localStorage.getItem('avatarCustomization');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setLocalCustomization(parsed);
                onChange(parsed);
            } catch (e) {
                console.warn('저장된 커스터마이징 설정 로드 실패:', e);
            }
        }
    }, [onChange]);

    /**
     * @brief 설정 업데이트 핸들러
     */
    const updateCustomization = useCallback((updates: Partial<AvatarCustomization>) => {
        setLocalCustomization(prev => {
            const newCustomization = { ...prev, ...updates };
            onChange(newCustomization);
            return newCustomization;
        });
    }, [onChange]);

    /**
     * @brief 설정 저장
     */
    const handleSave = useCallback(() => {
        localStorage.setItem('avatarCustomization', JSON.stringify(localCustomization));
        alert('커스터마이징 설정이 저장되었습니다!');
    }, [localCustomization]);

    /**
     * @brief 기본값으로 초기화
     */
    const handleReset = useCallback(() => {
        setLocalCustomization(DEFAULT_CUSTOMIZATION);
        onChange(DEFAULT_CUSTOMIZATION);
        localStorage.removeItem('avatarCustomization');
    }, [onChange]);

    return (
        <div className={`${styles.container} ${className}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>🎨 아바타 커스터마이징</h3>
                {onClose && (
                    <button className={styles.closeButton} onClick={onClose} aria-label="닫기">
                        ✕
                    </button>
                )}
            </div>

            <div className={styles.content}>
                {/* 피부색 섹션 */}
                <section className={styles.section}>
                    <h4 className={styles.sectionTitle}>피부색</h4>
                    <div className={styles.colorGrid}>
                        {SKIN_COLOR_PRESETS.map((color) => (
                            <button
                                key={color}
                                className={`${styles.colorButton} ${localCustomization.skinColor === color ? styles.selected : ''
                                    }`}
                                style={{ backgroundColor: color }}
                                onClick={() => updateCustomization({ skinColor: color })}
                                aria-label={`피부색 ${color}`}
                            />
                        ))}
                        <input
                            type="color"
                            className={styles.colorPicker}
                            value={localCustomization.skinColor}
                            onChange={(e) => updateCustomization({ skinColor: e.target.value })}
                            title="커스텀 색상"
                        />
                    </div>
                </section>

                {/* 주요 색상 섹션 */}
                <section className={styles.section}>
                    <h4 className={styles.sectionTitle}>주요 색상</h4>
                    <div className={styles.colorGrid}>
                        {PRIMARY_COLOR_PRESETS.map((color) => (
                            <button
                                key={color}
                                className={`${styles.colorButton} ${localCustomization.primaryColor === color ? styles.selected : ''
                                    }`}
                                style={{ backgroundColor: color }}
                                onClick={() => updateCustomization({ primaryColor: color })}
                                aria-label={`주요 색상 ${color}`}
                            />
                        ))}
                        <input
                            type="color"
                            className={styles.colorPicker}
                            value={localCustomization.primaryColor}
                            onChange={(e) => updateCustomization({ primaryColor: e.target.value })}
                            title="커스텀 색상"
                        />
                    </div>
                </section>

                {/* 보조 색상 섹션 */}
                <section className={styles.section}>
                    <h4 className={styles.sectionTitle}>보조 색상</h4>
                    <div className={styles.colorGrid}>
                        {PRIMARY_COLOR_PRESETS.map((color) => (
                            <button
                                key={color}
                                className={`${styles.colorButton} ${localCustomization.secondaryColor === color ? styles.selected : ''
                                    }`}
                                style={{ backgroundColor: color }}
                                onClick={() => updateCustomization({ secondaryColor: color })}
                                aria-label={`보조 색상 ${color}`}
                            />
                        ))}
                        <input
                            type="color"
                            className={styles.colorPicker}
                            value={localCustomization.secondaryColor}
                            onChange={(e) => updateCustomization({ secondaryColor: e.target.value })}
                            title="커스텀 색상"
                        />
                    </div>
                </section>

                {/* 눈 스타일 섹션 */}
                <section className={styles.section}>
                    <h4 className={styles.sectionTitle}>눈 스타일</h4>
                    <div className={styles.styleGrid}>
                        {EYE_STYLE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                className={`${styles.styleButton} ${localCustomization.eyeStyle === option.value ? styles.selected : ''
                                    }`}
                                onClick={() => updateCustomization({ eyeStyle: option.value })}
                            >
                                <span className={styles.styleIcon}>{option.icon}</span>
                                <span className={styles.styleLabel}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* 입 스타일 섹션 */}
                <section className={styles.section}>
                    <h4 className={styles.sectionTitle}>입 스타일</h4>
                    <div className={styles.styleGrid}>
                        {MOUTH_STYLE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                className={`${styles.styleButton} ${localCustomization.mouthStyle === option.value ? styles.selected : ''
                                    }`}
                                onClick={() => updateCustomization({ mouthStyle: option.value })}
                            >
                                <span className={styles.styleIcon}>{option.icon}</span>
                                <span className={styles.styleLabel}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* 액션 버튼 */}
            <div className={styles.actions}>
                <button className={styles.resetButton} onClick={handleReset}>
                    초기화
                </button>
                <button className={styles.saveButton} onClick={handleSave}>
                    저장
                </button>
            </div>
        </div>
    );
}

export default AvatarCustomizer;
