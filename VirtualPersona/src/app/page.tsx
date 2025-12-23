/**
 * @file page.tsx
 * @brief 홈 페이지 (아바타 선택 및 룸 입장)
 * @description 사용자가 아바타를 선택하고 룸에 입장하는 메인 화면입니다.
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AvatarSelector from '@/components/AvatarSelector';
import styles from './page.module.css';

/**
 * @brief 홈 페이지 컴포넌트
 * @returns 아바타 선택 및 룸 입장 UI
 */
export default function HomePage() {
    const router = useRouter();
    const [selectedAvatar, setSelectedAvatar] = useState<string>('avatar1');
    const [roomId, setRoomId] = useState<string>('');
    const [isCreating, setIsCreating] = useState<boolean>(false);

    /**
     * @brief 새 룸 생성
     */
    const handleCreateRoom = useCallback(() => {
        const newRoomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        router.push(`/room/${newRoomId}?avatar=${selectedAvatar}`);
    }, [router, selectedAvatar]);

    /**
     * @brief 기존 룸 입장
     */
    const handleJoinRoom = useCallback(() => {
        if (!roomId.trim()) return;
        router.push(`/room/${roomId.trim()}?avatar=${selectedAvatar}`);
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
                <h1 className={styles.title}>VirtualPersona</h1>
                <p className={styles.subtitle}>
                    얼굴이 아닌 <span className={styles.highlight}>의미</span>를 전달하세요
                </p>
            </header>

            {/* Main Content */}
            <section className={styles.main}>
                {/* Avatar Selection */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>아바타 선택</h2>
                    <AvatarSelector
                        selectedAvatar={selectedAvatar}
                        onSelect={setSelectedAvatar}
                    />
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

            {/* Features */}
            <section className={styles.features}>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>🔒</div>
                    <h3>프라이버시 보호</h3>
                    <p>실제 영상은 절대 전송되지 않습니다</p>
                </div>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>⚡</div>
                    <h3>실시간 동기화</h3>
                    <p>120ms 이하의 초저지연 통신</p>
                </div>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>🎭</div>
                    <h3>자연스러운 표현</h3>
                    <p>표정과 움직임이 실시간 반영</p>
                </div>
            </section>
        </div>
    );
}
