/**
 * @file page.tsx
 * @brief Neural Avatar 테스트 페이지
 * @description Python 추론 서버 연동 테스트
 */

'use client';

import { useEffect, useRef, useState, useCallback, ChangeEvent } from 'react';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { useInferenceServer } from '@/hooks/useInferenceServer';
import AvatarRendererV3 from '@/components/AvatarRendererV3';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import styles from './page.module.css';

/**
 * @brief Neural Avatar 테스트 페이지
 */
export default function NeuralTestPage() {
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [serverUrl, setServerUrl] = useState('ws://localhost:8765/ws');

    // Face Tracking
    const {
        isTracking,
        params: faceParams,
        error: trackingError,
        startTracking,
        stopTracking,
        setVideoElement,
    } = useFaceTracking();

    // 추론 서버
    const {
        state: serverState,
        connect,
        disconnect,
        sendMotion,
        uploadReference,
        isConnected,
    } = useInferenceServer({ serverUrl });

    const hasStartedRef = useRef(false);

    // 페이지 로드 시 Face Tracking 시작
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;
        startTracking();

        return () => {
            stopTracking();
            hasStartedRef.current = false;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 비디오 요소 설정
    useEffect(() => {
        if (videoContainerRef.current && !videoElementRef.current) {
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.transform = 'scaleX(-1)';

            videoContainerRef.current.appendChild(video);
            videoElementRef.current = video;
            setVideoElement(video);
        }
    }, [setVideoElement]);

    // Face Tracking 데이터를 서버로 전송
    useEffect(() => {
        if (isConnected && isTracking && serverState.referenceLoaded && serverState.pipelineReady) {
            sendMotion(faceParams);
        }
    }, [isConnected, isTracking, faceParams, serverState.referenceLoaded, serverState.pipelineReady, sendMotion]);

    // Reference 이미지 업로드 핸들러
    const handleFileUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const success = await uploadReference(file);
        if (success) {
            console.log('Reference uploaded successfully');
        }
    }, [uploadReference]);

    // 파일 선택 트리거
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={styles.container}>
            {/* 헤더 */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>🧠 Neural Avatar Test</h1>
                    <p>Python 추론 서버 연동 테스트</p>
                </div>
                <div className={styles.headerBadges}>
                    <span className={`${styles.badge} ${isConnected ? styles.connected : styles.disconnected}`}>
                        {isConnected ? '🟢 연결됨' : '🔴 연결 안됨'}
                    </span>
                    <span className={styles.badge}>
                        FPS: {serverState.fps}
                    </span>
                </div>
            </header>

            {/* 성능 모니터 */}
            <PerformanceMonitor
                visible={true}
                targetFPS={30}
                externalMetrics={{
                    fps: serverState.fps,
                }}
            />

            {/* 메인 콘텐츠 */}
            <main className={styles.main}>
                {/* 카메라 영역 */}
                <section className={styles.section}>
                    <h2>📹 카메라</h2>
                    <div className={styles.videoContainer} ref={videoContainerRef}>
                        {!isTracking && (
                            <div className={styles.overlay}>
                                카메라 시작 중...
                            </div>
                        )}
                    </div>
                    {trackingError && (
                        <p className={styles.error}>{trackingError}</p>
                    )}
                </section>

                {/* Neural Avatar 출력 */}
                <section className={styles.section}>
                    <h2>🎭 Neural Avatar</h2>
                    <div className={styles.avatarContainer}>
                        <AvatarRendererV3
                            imageSrc={serverState.lastFrame}
                            width={256}
                            height={256}
                            loading={isConnected && !serverState.lastFrame}
                            placeholder="Reference 이미지를 업로드하세요"
                        />
                    </div>

                    {/* Reference 업로드 */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        className={styles.uploadButton}
                        onClick={triggerFileInput}
                        disabled={!isConnected}
                    >
                        📷 Reference 이미지 업로드
                    </button>
                </section>

                {/* 서버 연결 */}
                <section className={styles.section}>
                    <h2>🔌 서버 연결</h2>

                    <div className={styles.serverStatus}>
                        <div className={styles.statusRow}>
                            <span>연결 상태:</span>
                            <span>{serverState.connectionState}</span>
                        </div>
                        <div className={styles.statusRow}>
                            <span>파이프라인:</span>
                            <span>{serverState.pipelineReady ? '✅ 준비' : '❌ 미준비'}</span>
                        </div>
                        <div className={styles.statusRow}>
                            <span>Reference:</span>
                            <span>{serverState.referenceLoaded ? '✅ 로드됨' : '❌ 없음'}</span>
                        </div>
                    </div>

                    <div className={styles.serverInput}>
                        <label>서버 URL:</label>
                        <input
                            type="text"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            placeholder="ws://localhost:8765/ws"
                        />
                    </div>

                    <div className={styles.serverButtons}>
                        {!isConnected ? (
                            <button
                                className={styles.connectButton}
                                onClick={connect}
                            >
                                🔗 연결
                            </button>
                        ) : (
                            <button
                                className={styles.disconnectButton}
                                onClick={disconnect}
                            >
                                ❌ 연결 해제
                            </button>
                        )}
                    </div>

                    {serverState.lastError && (
                        <p className={styles.error}>{serverState.lastError}</p>
                    )}
                </section>
            </main>

            {/* 네비게이션 */}
            <nav className={styles.nav}>
                <a href="/test-v3" className={styles.navLink}>← Phase 3 테스트</a>
                <a href="/test-v2" className={styles.navLink}>Phase 2 테스트</a>
            </nav>
        </div>
    );
}
