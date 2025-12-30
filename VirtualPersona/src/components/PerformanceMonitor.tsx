/**
 * @file PerformanceMonitor.tsx
 * @brief 실시간 성능 모니터링 컴포넌트
 * @description FPS, 추론 시간, 메모리 사용량 등 실시간 표시
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PerformanceMetrics, PerformanceWarning, DEFAULT_PERFORMANCE_METRICS } from '../types/avatarV3';
import styles from './PerformanceMonitor.module.css';

/**
 * @brief PerformanceMonitor 컴포넌트 Props
 */
export interface PerformanceMonitorProps {
    /** @brief 외부에서 전달받는 성능 메트릭 (선택) */
    externalMetrics?: Partial<PerformanceMetrics>;
    /** @brief 목표 FPS */
    targetFPS?: number;
    /** @brief 표시 여부 */
    visible?: boolean;
    /** @brief 컴팩트 모드 */
    compact?: boolean;
    /** @brief 위치 */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * @brief 경고 아이콘 반환
 * @param warning 경고 타입
 * @returns 아이콘 이모지
 */
function getWarningIcon(warning: PerformanceWarning): string {
    switch (warning) {
        case 'low_fps':
            return '🐌';
        case 'high_latency':
            return '⏱️';
        case 'memory_pressure':
            return '💾';
        case 'thermal_throttle':
            return '🌡️';
        default:
            return '⚠️';
    }
}

/**
 * @brief 경고 메시지 반환
 * @param warning 경고 타입
 * @returns 경고 메시지
 */
function getWarningMessage(warning: PerformanceWarning): string {
    switch (warning) {
        case 'low_fps':
            return 'FPS가 낮습니다';
        case 'high_latency':
            return '지연 시간이 높습니다';
        case 'memory_pressure':
            return '메모리가 부족합니다';
        case 'thermal_throttle':
            return '발열로 성능이 제한됩니다';
        default:
            return '알 수 없는 경고';
    }
}

/**
 * @brief FPS에 따른 색상 반환
 * @param fps 현재 FPS
 * @param target 목표 FPS
 * @returns CSS 색상 값
 */
function getFPSColor(fps: number, target: number): string {
    const ratio = fps / target;
    if (ratio >= 0.9) return '#10b981'; // 녹색 (양호)
    if (ratio >= 0.6) return '#fbbf24'; // 노란색 (보통)
    return '#ef4444'; // 빨간색 (나쁨)
}

/**
 * @brief 실시간 성능 모니터링 컴포넌트
 */
export function PerformanceMonitor({
    externalMetrics,
    targetFPS = 30,
    visible = true,
    compact = false,
    position = 'top-right',
}: PerformanceMonitorProps): React.ReactElement | null {
    const [metrics, setMetrics] = useState<PerformanceMetrics>(DEFAULT_PERFORMANCE_METRICS);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const frameTimesRef = useRef<number[]>([]);
    const lastFrameTimeRef = useRef<number>(performance.now());
    const rafIdRef = useRef<number | null>(null);

    /**
     * @brief FPS 측정 업데이트
     */
    const updateFPS = useCallback(() => {
        const now = performance.now();
        const delta = now - lastFrameTimeRef.current;
        lastFrameTimeRef.current = now;

        // 최근 30 프레임의 시간 저장 (줄임)
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 30) {
            frameTimesRef.current.shift();
        }

        // 500ms마다 UI 업데이트 (성능 최적화)
        if (frameTimesRef.current.length % 15 === 0) {
            // 평균 FPS 계산
            if (frameTimesRef.current.length > 0) {
                const avgFrameTime =
                    frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
                const fps = Math.round(1000 / avgFrameTime);

                // 경고 감지
                const warnings: PerformanceWarning[] = [];
                if (fps < targetFPS * 0.5) {
                    warnings.push('low_fps');
                }

                setMetrics(prev => ({
                    ...prev,
                    fps,
                    totalFrameTime: avgFrameTime,
                    warnings,
                    ...(externalMetrics || {}),
                }));
            }
        }

        rafIdRef.current = requestAnimationFrame(updateFPS);
    }, [targetFPS, externalMetrics]);

    // 성능 측정 시작/중지
    useEffect(() => {
        if (visible) {
            rafIdRef.current = requestAnimationFrame(updateFPS);
        }

        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [visible, updateFPS]);

    // 외부 메트릭 업데이트
    useEffect(() => {
        if (externalMetrics) {
            setMetrics(prev => ({
                ...prev,
                ...externalMetrics,
            }));
        }
    }, [externalMetrics]);

    if (!visible) return null;

    const fpsColor = getFPSColor(metrics.fps, targetFPS);

    return (
        <div
            className={`${styles.container} ${styles[position]} ${compact ? styles.compact : ''
                } ${isCollapsed ? styles.collapsed : ''}`}
        >
            {/* 헤더 */}
            <div
                className={styles.header}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <span className={styles.title}>📊 성능</span>
                <span className={styles.toggleIcon}>
                    {isCollapsed ? '▼' : '▲'}
                </span>
            </div>

            {!isCollapsed && (
                <div className={styles.content}>
                    {/* FPS */}
                    <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>FPS</span>
                        <span
                            className={styles.metricValue}
                            style={{ color: fpsColor }}
                        >
                            {metrics.fps}
                            <span className={styles.metricUnit}>/{targetFPS}</span>
                        </span>
                    </div>

                    {/* 프레임 시간 */}
                    {!compact && (
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>프레임</span>
                            <span className={styles.metricValue}>
                                {metrics.totalFrameTime.toFixed(1)}
                                <span className={styles.metricUnit}>ms</span>
                            </span>
                        </div>
                    )}

                    {/* 추론 시간 (외부 제공 시) */}
                    {metrics.inferenceTime > 0 && (
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>추론</span>
                            <span className={styles.metricValue}>
                                {metrics.inferenceTime.toFixed(1)}
                                <span className={styles.metricUnit}>ms</span>
                            </span>
                        </div>
                    )}

                    {/* 렌더링 시간 (외부 제공 시) */}
                    {metrics.renderTime > 0 && !compact && (
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>렌더</span>
                            <span className={styles.metricValue}>
                                {metrics.renderTime.toFixed(1)}
                                <span className={styles.metricUnit}>ms</span>
                            </span>
                        </div>
                    )}

                    {/* GPU 메모리 (가능한 경우) */}
                    {metrics.gpuMemoryUsage !== null && !compact && (
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>GPU 메모리</span>
                            <span className={styles.metricValue}>
                                {metrics.gpuMemoryUsage.toFixed(0)}
                                <span className={styles.metricUnit}>MB</span>
                            </span>
                        </div>
                    )}

                    {/* 드롭된 프레임 */}
                    {metrics.droppedFrames > 0 && !compact && (
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>드롭</span>
                            <span className={styles.metricValue} style={{ color: '#ef4444' }}>
                                {metrics.droppedFrames}
                            </span>
                        </div>
                    )}

                    {/* 경고 */}
                    {metrics.warnings.length > 0 && (
                        <div className={styles.warnings}>
                            {metrics.warnings.map((warning, index) => (
                                <div key={index} className={styles.warning}>
                                    <span>{getWarningIcon(warning)}</span>
                                    {!compact && <span>{getWarningMessage(warning)}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default PerformanceMonitor;
