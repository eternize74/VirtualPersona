/**
 * @file AvatarSelector.tsx
 * @brief 아바타 선택 컴포넌트
 * @description 사용자가 사용할 아바타를 선택하는 그리드 UI
 */

'use client';

import { useCallback } from 'react';
import { PRESET_AVATARS } from '@/types/avatar';
import styles from './AvatarSelector.module.css';

/**
 * @brief AvatarSelector Props
 */
interface AvatarSelectorProps {
    /** @brief 현재 선택된 아바타 ID */
    selectedAvatar: string;

    /** @brief 아바타 선택 콜백 */
    onSelect: (avatarId: string) => void;
}

/**
 * @brief 아바타 선택 그리드 컴포넌트
 * @param selectedAvatar - 현재 선택된 아바타 ID
 * @param onSelect - 아바타 선택 시 호출되는 콜백
 * @returns 아바타 선택 UI
 */
export default function AvatarSelector({ selectedAvatar, onSelect }: AvatarSelectorProps) {
    const handleSelect = useCallback((avatarId: string) => {
        onSelect(avatarId);
    }, [onSelect]);

    return (
        <div className={styles.grid}>
            {PRESET_AVATARS.map((avatar) => (
                <button
                    key={avatar.id}
                    className={`${styles.avatarCard} ${selectedAvatar === avatar.id ? styles.selected : ''}`}
                    onClick={() => handleSelect(avatar.id)}
                    aria-label={`아바타 ${avatar.name} 선택`}
                    aria-pressed={selectedAvatar === avatar.id}
                >
                    <div className={styles.avatarPreview}>
                        {/* SVG 아바타 미리보기 - 인라인 SVG로 대체 */}
                        <svg viewBox="0 0 100 100" className={styles.avatarSvg}>
                            <defs>
                                <linearGradient id={`grad-${avatar.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: getAvatarColor(avatar.id, 0) }} />
                                    <stop offset="100%" style={{ stopColor: getAvatarColor(avatar.id, 1) }} />
                                </linearGradient>
                            </defs>
                            {/* 얼굴 베이스 */}
                            <circle cx="50" cy="50" r="40" fill={`url(#grad-${avatar.id})`} />
                            {/* 눈 */}
                            <ellipse cx="35" cy="45" rx="6" ry="8" fill="#fff" />
                            <ellipse cx="65" cy="45" rx="6" ry="8" fill="#fff" />
                            <circle cx="35" cy="45" r="4" fill="#333" />
                            <circle cx="65" cy="45" r="4" fill="#333" />
                            {/* 입 */}
                            <path d="M 35 65 Q 50 75 65 65" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
                        </svg>
                    </div>
                    <span className={styles.avatarName}>{avatar.name}</span>
                    {selectedAvatar === avatar.id && (
                        <div className={styles.checkmark}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20,6 9,17 4,12" />
                            </svg>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}

/**
 * @brief 아바타 ID에 따른 그라데이션 색상 반환
 * @param avatarId - 아바타 ID
 * @param index - 색상 인덱스 (0: 시작, 1: 끝)
 * @returns 색상 코드
 */
function getAvatarColor(avatarId: string, index: number): string {
    const colors: Record<string, [string, string]> = {
        avatar1: ['#6366f1', '#8b5cf6'],  // 블루베리
        avatar2: ['#ec4899', '#f472b6'],  // 피치
        avatar3: ['#10b981', '#34d399'],  // 민트
        avatar4: ['#f59e0b', '#fbbf24'],  // 레몬
    };
    return colors[avatarId]?.[index] ?? '#6366f1';
}
