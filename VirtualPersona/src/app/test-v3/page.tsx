/**
 * @file page.tsx
 * @brief Phase 3 테스트 페이지
 * @description WebGPU 감지, GPU 모드 선택, 성능 모니터 등 Phase 3 인프라를 테스트합니다.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { useWebGPU } from '@/hooks/useWebGPU';
import { useNeuralAvatar } from '@/hooks/useNeuralAvatar';
import { AvatarParams } from '@/types/avatar';
import { AvatarCustomization, DEFAULT_CUSTOMIZATION } from '@/types/avatarV2';
import { RenderMode, RenderQuality } from '@/types/avatarV3';
import AvatarRendererV2 from '@/components/AvatarRendererV2';
import GPUModePicker from '@/components/GPUModePicker';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import EmotionPresets from '@/components/EmotionPresets';
import styles from './page.module.css';

/**
 * @brief Phase 3 테스트 페이지 컴포넌트
 * @returns 테스트 UI
 */
export default function TestPageV3() {
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const [customization, setCustomization] = useState<AvatarCustomization>(DEFAULT_CUSTOMIZATION);
    const [overrideParams, setOverrideParams] = useState<AvatarParams | null>(null);
    const [showGPUPicker, setShowGPUPicker] = useState(true);
    const [currentRenderMode, setCurrentRenderMode] = useState<RenderMode>('basic');
    const [quality, setQuality] = useState<RenderQuality>('medium');

    // 얼굴 추적 훅
    const {
        isTracking,
        params: faceParams,
        error,
        startTracking,
        stopTracking,
        setVideoElement,
    } = useFaceTracking();

    // WebGPU 훅
    const {
        status: webgpuStatus,
        availableModes,
        currentMode,
        setMode,
        isInitializing,
    } = useWebGPU();

    // Neural Avatar 훅
    const {
        state: neuralState,
        isLoading: isNeuralLoading,
        isReady: isNeuralReady,
        loadingProgress,
        metrics: neuralMetrics,
        loadModels,
        unloadModels,
    } = useNeuralAvatar({
        autoLoad: false,
        config: {
            gpuMode: currentMode,
            quality: quality,
        },
    });

    const hasStartedRef = useRef(false);

    // 실제 사용할 파라미터
    const displayParams = overrideParams || faceParams;

    // 페이지 로드 시 자동으로 추적 시작
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        startTracking();

        return () => {
            stopTracking();
            hasStartedRef.current = false;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // GPU 모드에 따른 렌더 모드 설정
    useEffect(() => {
        switch (currentMode) {
            case 'webgpu':
                // Neural Avatar 준비 완료 시 'neural'로 변경
                setCurrentRenderMode('enhanced');
                break;
            case 'webgl':
                setCurrentRenderMode('enhanced');
                break;
            default:
                setCurrentRenderMode('basic');
        }
    }, [currentMode]);

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

    /**
     * @brief 렌더 모드 아이콘 반환
     */
    const getRenderModeIcon = (mode: RenderMode): string => {
        switch (mode) {
            case 'neural': return '🧠';
            case 'enhanced': return '✨';
            case 'basic': return '📦';
            default: return '❓';
        }
    };

    /**
     * @brief 렌더 모드 이름 반환
     */
    const getRenderModeName = (mode: RenderMode): string => {
        switch (mode) {
            case 'neural': return 'Neural Avatar';
            case 'enhanced': return 'Enhanced 2D';
            case 'basic': return 'Basic 2D';
            default: return 'Unknown';
        }
    };

    return (
        <div className={styles.container}>
            {/* 성능 모니터 */}
            <PerformanceMonitor
                visible={true}
                targetFPS={currentRenderMode === 'neural' ? 15 : 30}
                position="top-right"
            />

            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>🚀 Phase 3 테스트</h1>
                    <p>WebGPU & Neural Avatar 인프라 테스트</p>
                </div>
                <div className={styles.headerBadges}>
                    <span className={styles.modeBadge}>
                        {getRenderModeIcon(currentRenderMode)} {getRenderModeName(currentRenderMode)}
                    </span>
                    {webgpuStatus.isSupported && (
                        <span className={styles.gpuBadge}>
                            🎮 WebGPU
                        </span>
                    )}
                </div>
            </header>

            <main className={styles.main}>
                {/* 카메라 영상 (좌측) */}
                <section className={styles.section}>
                    <h2>📹 카메라 입력</h2>
                    <div className={styles.videoContainer} ref={videoContainerRef}>
                        <video
                            ref={(el) => {
                                videoElementRef.current = el;
                                setVideoElement(el);
                            }}
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
                    <h2>🎭 아바타 출력 (V3)</h2>
                    <div className={styles.avatarContainer}>
                        <AvatarRendererV2
                            avatarId="avatar1"
                            params={displayParams}
                            customization={customization}
                            width={400}
                            height={400}
                        />
                        {/* 렌더 모드 인디케이터 */}
                        <div className={styles.renderModeIndicator}>
                            {getRenderModeIcon(currentRenderMode)}
                        </div>
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

                {/* GPU 모드 선택 (우측) */}
                <section className={styles.section}>
                    <h2>🖥️ GPU 설정</h2>
                    <GPUModePicker
                        availableModes={availableModes}
                        currentMode={currentMode}
                        onModeChange={setMode}
                        status={webgpuStatus}
                        isInitializing={isInitializing}
                    />

                    {/* 품질 선택 */}
                    <div className={styles.qualitySection}>
                        <h3>🎨 렌더링 품질</h3>
                        <div className={styles.qualityButtons}>
                            {(['low', 'medium', 'high', 'ultra'] as RenderQuality[]).map((q) => (
                                <button
                                    key={q}
                                    className={`${styles.qualityButton} ${quality === q ? styles.active : ''}`}
                                    onClick={() => setQuality(q)}
                                >
                                    {q.charAt(0).toUpperCase() + q.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Neural Avatar 상태 */}
                    <div className={styles.neuralStatus}>
                        <h3>🧠 Neural Avatar</h3>
                        <div className={styles.statusBox}>
                            <span className={styles.statusLabel}>상태:</span>
                            <span className={styles.statusValue}>
                                {neuralState.modelStatus === 'idle' && '⏸️ 대기 중'}
                                {neuralState.modelStatus === 'downloading' && '📥 다운로드 중...'}
                                {neuralState.modelStatus === 'loading' && '⏳ 로딩 중...'}
                                {neuralState.modelStatus === 'warming_up' && '🔥 웜업 중...'}
                                {neuralState.modelStatus === 'ready' && '✅ 준비 완료'}
                                {neuralState.modelStatus === 'error' && `❌ 오류: ${neuralState.lastError}`}
                            </span>
                        </div>

                        {/* 진행률 바 */}
                        {loadingProgress && loadingProgress.status !== 'ready' && loadingProgress.status !== 'idle' && (
                            <div className={styles.progressWrapper}>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${loadingProgress.progress}%` }}
                                    />
                                </div>
                                <span className={styles.progressText}>
                                    {loadingProgress.message} ({Math.round(loadingProgress.progress)}%)
                                </span>
                            </div>
                        )}

                        {/* 모델 로드/언로드 버튼 */}
                        <div className={styles.neuralButtons}>
                            {!isNeuralReady ? (
                                <button
                                    className={styles.loadButton}
                                    onClick={loadModels}
                                    disabled={isNeuralLoading || !webgpuStatus.isSupported}
                                >
                                    {isNeuralLoading ? '로딩 중...' : '🚀 모델 로드'}
                                </button>
                            ) : (
                                <button
                                    className={styles.unloadButton}
                                    onClick={unloadModels}
                                >
                                    🗑️ 모델 해제
                                </button>
                            )}
                        </div>

                        <p className={styles.statusNote}>
                            * 모델 로드 시 ~200MB 다운로드가 필요합니다.
                            {!webgpuStatus.isSupported && ' (WebGPU 미지원)'}
                        </p>
                    </div>
                </section>
            </main>

            {/* 시스템 정보 */}
            <section className={styles.systemInfo}>
                <h3>💻 시스템 정보</h3>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>WebGPU</span>
                        <span className={styles.infoValue}>
                            {webgpuStatus.isSupported ? '✅ 지원' : '❌ 미지원'}
                        </span>
                    </div>
                    {webgpuStatus.adapterInfo && (
                        <>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>GPU</span>
                                <span className={styles.infoValue}>
                                    {webgpuStatus.adapterInfo.description}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>벤더</span>
                                <span className={styles.infoValue}>
                                    {webgpuStatus.adapterInfo.vendor}
                                </span>
                            </div>
                        </>
                    )}
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>폴백 모드</span>
                        <span className={styles.infoValue}>
                            {webgpuStatus.fallbackMode || 'N/A'}
                        </span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>렌더 모드</span>
                        <span className={styles.infoValue}>
                            {getRenderModeName(currentRenderMode)}
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
                <span>{isTracking ? '얼굴 추적 중' : '대기 중'}</span>
                {overrideParams && <span className={styles.emotionBadge}>감정 활성</span>}
            </div>

            {/* 네비게이션 */}
            <div className={styles.nav}>
                <a href="/test-v2" className={styles.navLink}>← Phase 2 테스트</a>
                <a href="/test" className={styles.navLink}>Phase 1 테스트</a>
                <a href="/" className={styles.navLink}>🏠 홈</a>
            </div>
        </div>
    );
}
