/**
 * @file page.tsx
 * @brief Phase 2 테스트 페이지
 * @description 커스터마이징, 감정 프리셋 등 Phase 2 기능을 테스트합니다.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { AvatarParams } from '@/types/avatar';
import { AvatarCustomization, DEFAULT_CUSTOMIZATION } from '@/types/avatarV2';
import AvatarRendererV2 from '@/components/AvatarRendererV2';
import AvatarCustomizer from '@/components/AvatarCustomizer';
import EmotionPresets from '@/components/EmotionPresets';
import styles from './page.module.css';

/**
 * @brief Phase 2 테스트 페이지 컴포넌트
 * @returns 테스트 UI
 */
export default function TestPageV2() {
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [customization, setCustomization] = useState<AvatarCustomization>(DEFAULT_CUSTOMIZATION);
    const [overrideParams, setOverrideParams] = useState<AvatarParams | null>(null);

    const {
        isTracking,
        params: faceParams,
        error,
        startTracking,
        stopTracking,
        setVideoElement,
    } = useFaceTracking();

    const hasStartedRef = useRef(false);

    // 실제 사용할 파라미터 (감정 프리셋이 활성화되면 오버라이드)
    const displayParams = overrideParams || faceParams;

    // 페이지 로드 시 자동으로 추적 시작 (한 번만)
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        startTracking();

        return () => {
            stopTracking();
            hasStartedRef.current = false;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
     * @brief 감정 프리셋 적용 핸들러
     */
    const handleEmotionChange = useCallback((params: AvatarParams) => {
        setOverrideParams(params);
    }, []);

    /**
     * @brief 감정 해제 (카메라로 돌아가기)
     */
    const handleEmotionClear = useCallback(() => {
        setOverrideParams(null);
    }, []);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>🎨 Phase 2 테스트</h1>
                    <p>커스터마이징 & 감정 프리셋 테스트</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={`${styles.customizerToggle} ${showCustomizer ? styles.active : ''}`}
                        onClick={() => setShowCustomizer(!showCustomizer)}
                    >
                        🎨 커스터마이징
                    </button>
                </div>
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

                {/* 아바타 렌더링 (중앙) */}
                <section className={styles.section}>
                    <h2>🎭 아바타 출력 (V2)</h2>
                    <div className={styles.avatarContainer}>
                        <AvatarRendererV2
                            avatarId="avatar1"
                            params={displayParams}
                            customization={customization}
                            width={400}
                            height={400}
                        />
                    </div>

                    {/* 감정 프리셋 */}
                    <div className={styles.emotionPresetsWrapper}>
                        <EmotionPresets
                            currentParams={faceParams}
                            onParamsChange={handleEmotionChange}
                            onEmotionClear={handleEmotionClear}
                        />
                    </div>
                </section>

                {/* 커스터마이저 패널 */}
                {showCustomizer && (
                    <section className={styles.customizerPanel}>
                        <AvatarCustomizer
                            customization={customization}
                            onChange={setCustomization}
                            onClose={() => setShowCustomizer(false)}
                        />
                    </section>
                )}
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
                                style={{ width: `${displayParams.eyeBlinkLeft * 100}%` }}
                            />
                        </div>
                        <span>{(displayParams.eyeBlinkLeft * 100).toFixed(0)}%</span>
                    </div>
                    <div className={styles.param}>
                        <span>오른쪽 눈 깜빡임</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.barFill}
                                style={{ width: `${displayParams.eyeBlinkRight * 100}%` }}
                            />
                        </div>
                        <span>{(displayParams.eyeBlinkRight * 100).toFixed(0)}%</span>
                    </div>
                    <div className={styles.param}>
                        <span>입 벌림</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.barFill}
                                style={{ width: `${displayParams.mouthOpen * 100}%` }}
                            />
                        </div>
                        <span>{(displayParams.mouthOpen * 100).toFixed(0)}%</span>
                    </div>
                    <div className={styles.param}>
                        <span>미소</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.barFill}
                                style={{ width: `${displayParams.smile * 100}%` }}
                            />
                        </div>
                        <span>{(displayParams.smile * 100).toFixed(0)}%</span>
                    </div>
                    <div className={styles.param}>
                        <span>고개 (Pitch/Yaw/Roll)</span>
                        <span className={styles.mono}>
                            {displayParams.headRotation.map(v => (v * 180 / Math.PI).toFixed(1) + '°').join(' / ')}
                        </span>
                    </div>
                </div>

                {/* 커스터마이징 정보 */}
                <div className={styles.customizationInfo}>
                    <h4>🎨 현재 커스터마이징</h4>
                    <div className={styles.colorPreview}>
                        <span style={{ backgroundColor: customization.primaryColor }} title="주요색" />
                        <span style={{ backgroundColor: customization.secondaryColor }} title="보조색" />
                        <span style={{ backgroundColor: customization.skinColor }} title="피부색" />
                        <span className={styles.styleLabel}>눈: {customization.eyeStyle}</span>
                        <span className={styles.styleLabel}>입: {customization.mouthStyle}</span>
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
                {overrideParams && <span className={styles.emotionBadge}>감정 활성</span>}
            </div>

            {/* 네비게이션 */}
            <div className={styles.nav}>
                <a href="/test" className={styles.navLink}>← Phase 1 테스트</a>
                <a href="/" className={styles.navLink}>🏠 홈</a>
            </div>
        </div>
    );
}
