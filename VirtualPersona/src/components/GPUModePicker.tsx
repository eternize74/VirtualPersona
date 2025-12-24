/**
 * @file GPUModePicker.tsx
 * @brief GPU 모드 선택 UI 컴포넌트
 * @description 사용자가 렌더링 GPU 모드를 선택할 수 있는 UI
 */

'use client';

import React from 'react';
import { GPUMode, GPUModeInfo, WebGPUStatus } from '../types/avatarV3';
import styles from './GPUModePicker.module.css';

/**
 * @brief GPUModePicker 컴포넌트 Props
 */
export interface GPUModePickerProps {
    /** @brief 사용 가능한 GPU 모드 목록 */
    availableModes: GPUModeInfo[];
    /** @brief 현재 선택된 모드 */
    currentMode: GPUMode;
    /** @brief 모드 변경 콜백 */
    onModeChange: (mode: GPUMode) => void;
    /** @brief WebGPU 상태 */
    status: WebGPUStatus;
    /** @brief 초기화 중 여부 */
    isInitializing: boolean;
    /** @brief 컴팩트 모드 */
    compact?: boolean;
}

/**
 * @brief GPU 모드 아이콘 반환
 * @param mode GPU 모드
 * @returns 아이콘 이모지
 */
function getModeIcon(mode: GPUMode): string {
    switch (mode) {
        case 'auto':
            return '🔄';
        case 'webgpu':
            return '🚀';
        case 'webgl':
            return '🎨';
        case 'cpu':
            return '💻';
        default:
            return '❓';
    }
}

/**
 * @brief GPU 모드 선택 UI 컴포넌트
 */
export function GPUModePicker({
    availableModes,
    currentMode,
    onModeChange,
    status,
    isInitializing,
    compact = false,
}: GPUModePickerProps): React.ReactElement {
    return (
        <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
            <div className={styles.header}>
                <span className={styles.title}>🖥️ GPU 모드</span>
                {isInitializing && (
                    <span className={styles.loading}>초기화 중...</span>
                )}
            </div>

            <div className={styles.modeList}>
                {availableModes.map((modeInfo) => (
                    <button
                        key={modeInfo.mode}
                        className={`${styles.modeButton} ${currentMode === modeInfo.mode ? styles.active : ''
                            } ${!modeInfo.isSupported ? styles.disabled : ''}`}
                        onClick={() => onModeChange(modeInfo.mode)}
                        disabled={!modeInfo.isSupported || isInitializing}
                        title={modeInfo.description}
                    >
                        <span className={styles.modeIcon}>
                            {getModeIcon(modeInfo.mode)}
                        </span>
                        <span className={styles.modeName}>{modeInfo.name}</span>
                        {modeInfo.isRecommended && modeInfo.isSupported && (
                            <span className={styles.recommended}>추천</span>
                        )}
                        {!modeInfo.isSupported && (
                            <span className={styles.unsupported}>미지원</span>
                        )}
                    </button>
                ))}
            </div>

            {/* GPU 정보 표시 */}
            {status.initialized && !compact && (
                <div className={styles.gpuInfo}>
                    {status.isSupported && status.adapterInfo ? (
                        <>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>GPU:</span>
                                <span className={styles.infoValue}>
                                    {status.adapterInfo.description}
                                </span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>벤더:</span>
                                <span className={styles.infoValue}>
                                    {status.adapterInfo.vendor}
                                </span>
                            </div>
                        </>
                    ) : status.fallbackMode ? (
                        <div className={styles.fallbackInfo}>
                            <span className={styles.warningIcon}>⚠️</span>
                            <span>
                                WebGPU 미지원. {status.fallbackMode === 'webgl' ? 'WebGL' : 'CPU'} 모드로 동작합니다.
                            </span>
                        </div>
                    ) : null}
                </div>
            )}

            {/* 에러 표시 */}
            {status.error && !compact && (
                <div className={styles.error}>
                    <span className={styles.errorIcon}>❌</span>
                    <span>{status.error}</span>
                </div>
            )}
        </div>
    );
}

export default GPUModePicker;
