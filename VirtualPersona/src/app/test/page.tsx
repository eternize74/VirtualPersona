/**
 * @file page.tsx
 * @brief 로컬 테스트 페이지
 * @description 서버 연결 없이 카메라 입력과 아바타 렌더링을 테스트합니다.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import AvatarRenderer from '@/components/AvatarRenderer';
import styles from './page.module.css';

/**
 * @brief 로컬 테스트 페이지 컴포넌트
 * @returns 테스트 UI
 */
export default function TestPage() {
    const videoContainerRef = useRef<HTMLDivElement>(null);

    const {
        isTracking,
        params,
        error,
        startTracking,
        stopTracking,
        setVideoElement,
        videoRef,
    } = useFaceTracking();

    const hasStartedRef = useRef(false);

    // 페이지 로드 시 자동으로 추적 시작 (한 번만)
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        startTracking();

        return () => {
            stopTracking();
            hasStartedRef.current = false;
        };
    }, []); // 빈 의존성 배열 - eslint-disable-line

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>로컬 테스트 모드</h1>
                <p>서버 연결 없이 카메라 → 아바타 렌더링 테스트</p>
            </header>

            <main className={styles.main}>
                {/* 카메라 영상 (좌측) */}
                <section className={styles.section}>
                    <h2>📹 카메라 입력</h2>
                    <div className={styles.videoContainer} ref={videoContainerRef}>
                        <video
                            ref={(el) => setVideoElement(el)}
                            className={styles.video}
                            playsInline
                            muted
                            autoPlay
                        />
                        {!isTracking && (
                            <div className={styles.overlay}>
                                {error || '카메라 연결 중...'}
                            </div>
                        )}
                    </div>
                </section>

                {/* 아바타 렌더링 (우측) */}
                <section className={styles.section}>
                    <h2>🎭 아바타 출력</h2>
                    <div className={styles.avatarContainer}>
                        <AvatarRenderer
                            avatarId="avatar1"
                            params={params}
                            width={400}
                            height={400}
                        />
                    </div>
                </section>
            </main>

            {/* 파라미터 디버그 정보 */}
            <section className={styles.debug}>
                <h3>📊 추적 파라미터</h3>
                <div className={styles.paramGrid}>
                    <div className={styles.param}>
                        <span>왼쪽 눈 깜빡임</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.barFill}
                                style={{ width: `${params.eyeBlinkLeft * 100}%` }}
                            />
                        </div>
                        <span>{(params.eyeBlinkLeft * 100).toFixed(0)}%</span>
                    </div>
                    <div className={styles.param}>
                        <span>오른쪽 눈 깜빡임</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.barFill}
                                style={{ width: `${params.eyeBlinkRight * 100}%` }}
                            />
                        </div>
                        <span>{(params.eyeBlinkRight * 100).toFixed(0)}%</span>
                    </div>
                    <div className={styles.param}>
                        <span>입 벌림</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.barFill}
                                style={{ width: `${params.mouthOpen * 100}%` }}
                            />
                        </div>
                        <span>{(params.mouthOpen * 100).toFixed(0)}%</span>
                    </div>
                    <div className={styles.param}>
                        <span>미소</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.barFill}
                                style={{ width: `${params.smile * 100}%` }}
                            />
                        </div>
                        <span>{(params.smile * 100).toFixed(0)}%</span>
                    </div>
                    <div className={styles.param}>
                        <span>고개 (Pitch/Yaw/Roll)</span>
                        <span className={styles.mono}>
                            {params.headRotation.map(v => (v * 180 / Math.PI).toFixed(1) + '°').join(' / ')}
                        </span>
                    </div>
                </div>
            </section>

            {/* 에러 표시 */}
            {error && (
                <div className={styles.errorBanner}>
                    ⚠️ {error}
                </div>
            )}

            {/* 상태 표시 */}
            <div className={styles.status}>
                <div className={`${styles.statusDot} ${isTracking ? styles.active : ''}`} />
                <span>{isTracking ? '추적 중' : '대기 중'}</span>
            </div>

            {/* 홈으로 돌아가기 */}
            <a href="/" className={styles.backLink}>← 홈으로 돌아가기</a>
        </div>
    );
}
