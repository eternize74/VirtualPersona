/**
 * @file page.tsx
 * @brief Phase 2 홈 페이지 (아바타 선택 및 룸 입장)
 * @description 사용자가 아바타를 선택하고 Phase 2 기능이 포함된 룸에 입장합니다.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarCustomization, DEFAULT_CUSTOMIZATION } from '@/types/avatarV2';
import AvatarSelector from '@/components/AvatarSelector';
import AvatarCustomizer from '@/components/AvatarCustomizer';
import styles from './page.module.css';

/**
 * @brief Phase 2 홈 페이지 컴포넌트
 * @returns 아바타 선택, 커스터마이징 및 룸 입장 UI
 */
export default function HomePageV2() {
    const router = useRouter();
    const [selectedAvatar, setSelectedAvatar] = useState<string>('avatar1');
    const [roomId, setRoomId] = useState<string>('');
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [customization, setCustomization] = useState<AvatarCustomization>(DEFAULT_CUSTOMIZATION);

    // 저장된 커스터마이징 로드
    useEffect(() => {
        const saved = localStorage.getItem('avatarCustomization');
        if (saved) {
            try {
                setCustomization(JSON.parse(saved));
            } catch (e) {
                console.warn('커스터마이징 로드 실패:', e);
            }
        }
    }, []);

    /**
     * @brief 새 룸 생성 (Phase 2)
     */
    const handleCreateRoom = useCallback(() => {
        const newRoomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        router.push(`/room-v2/${newRoomId}?avatar=${selectedAvatar}`);
    }, [router, selectedAvatar]);

    /**
     * @brief 기존 룸 입장 (Phase 2)
     */
    const handleJoinRoom = useCallback(() => {
        if (!roomId.trim()) return;
        router.push(`/room-v2/${roomId.trim()}?avatar=${selectedAvatar}`);
    }, [router, roomId, selectedAvatar]);

    return (
        <div className={styles.container}>
            {/* Background Effects */}
            <div className={styles.bgGradient} />
            <div className={styles.bgOrbs}>
                <div className={styles.orb} style={{ '--delay': '0s' } as React.CSSProperties} />
                <div className={styles.orb} style={{ '--delay': '2s' } as React.CSSProperties} />
                <div className={styles.orb} style={{ '--delay': '4s' } as React.CSSProperties} />
            </div>

            {/* Hero Section */}
            <header className={styles.header}>
                <h1 className={styles.title}>
                    VirtualPersona <span className={styles.v2Badge}>V2</span>
                </h1>
                <p className={styles.subtitle}>
                    얼굴이 아닌 <span className={styles.highlight}>의미</span>를 전달하세요
                </p>
            </header>

            {/* Main Content */}
            <section className={styles.main}>
                {/* Avatar Selection */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>아바타 선택</h2>
                        <button
                            className={`${styles.customizerBtn} ${showCustomizer ? styles.active : ''}`}
                            onClick={() => setShowCustomizer(!showCustomizer)}
                            title="커스터마이징"
                        >
                            🎨
                        </button>
                    </div>
                    <AvatarSelector
                        selectedAvatar={selectedAvatar}
                        onSelect={setSelectedAvatar}
                    />

                    {/* 현재 커스터마이징 미리보기 */}
                    <div className={styles.customizationPreview}>
                        <span>현재 스타일:</span>
                        <div className={styles.colorDots}>
                            <span style={{ backgroundColor: customization.primaryColor }} title="주요색" />
                            <span style={{ backgroundColor: customization.secondaryColor }} title="보조색" />
                            <span style={{ backgroundColor: customization.skinColor }} title="피부색" />
                        </div>
                    </div>
                </div>

                {/* Room Controls */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>대화 시작하기</h2>

                    <div className={styles.actions}>
                        {/* Create Room */}
                        <button
                            className="btn btn-primary"
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            새 대화 시작
                        </button>

                        {/* Divider */}
                        <div className={styles.divider}>
                            <span>또는</span>
                        </div>

                        {/* Join Room */}
                        <div className={styles.joinGroup}>
                            <input
                                type="text"
                                className="input"
                                placeholder="룸 ID 입력"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={handleJoinRoom}
                                disabled={!roomId.trim()}
                            >
                                입장
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 커스터마이저 오버레이 */}
            {showCustomizer && (
                <div className={styles.customizerOverlay}>
                    <AvatarCustomizer
                        customization={customization}
                        onChange={setCustomization}
                        onClose={() => setShowCustomizer(false)}
                    />
                </div>
            )}

            {/* Features */}
            <section className={styles.features}>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>🔒</div>
                    <h3>프라이버시 보호</h3>
                    <p>실제 영상은 절대 전송되지 않습니다</p>
                </div>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>🎨</div>
                    <h3>커스터마이징</h3>
                    <p>나만의 아바타 스타일 설정</p>
                </div>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>😊</div>
                    <h3>감정 표현</h3>
                    <p>원클릭 감정 프리셋 전송</p>
                </div>
            </section>

            {/* Navigation */}
            <nav className={styles.nav}>
                <a href="/" className={styles.navLink}>Phase 1 홈</a>
                <span className={styles.navDivider}>|</span>
                <a href="/test-v2" className={styles.navLink}>Phase 2 테스트</a>
            </nav>
        </div>
    );
}
