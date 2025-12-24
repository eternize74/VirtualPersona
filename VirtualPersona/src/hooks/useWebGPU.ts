/**
 * @file useWebGPU.ts
 * @brief WebGPU 감지 및 초기화 훅
 * @description 브라우저 WebGPU 지원 여부 확인 및 GPU 디바이스 초기화
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    WebGPUStatus,
    GPUMode,
    GPUModeInfo,
    DEFAULT_WEBGPU_STATUS
} from '../types/avatarV3';

/**
 * @brief useWebGPU 훅 반환 타입
 */
export interface UseWebGPUReturn {
    /** @brief WebGPU 상태 */
    status: WebGPUStatus;
    /** @brief 사용 가능한 GPU 모드 목록 */
    availableModes: GPUModeInfo[];
    /** @brief 현재 선택된 GPU 모드 */
    currentMode: GPUMode;
    /** @brief GPU 모드 변경 함수 */
    setMode: (mode: GPUMode) => void;
    /** @brief WebGPU 초기화 함수 */
    initialize: () => Promise<void>;
    /** @brief 초기화 진행 중 여부 */
    isInitializing: boolean;
}

/**
 * @brief WebGPU 지원 여부 확인
 * @returns WebGPU 지원 여부
 */
async function checkWebGPUSupport(): Promise<boolean> {
    if (typeof navigator === 'undefined') {
        return false;
    }

    if (!('gpu' in navigator)) {
        return false;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        return adapter !== null;
    } catch {
        return false;
    }
}

/**
 * @brief WebGL 지원 여부 확인
 * @returns WebGL 지원 여부
 */
function checkWebGLSupport(): boolean {
    if (typeof document === 'undefined') {
        return false;
    }

    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return gl !== null;
    } catch {
        return false;
    }
}

/**
 * @brief GPU 어댑터 정보 추출
 * @param adapter GPU 어댑터
 * @returns 어댑터 정보
 */
function extractAdapterInfo(adapter: GPUAdapter): WebGPUStatus['adapterInfo'] {
    // GPUAdapterInfo는 브라우저마다 다를 수 있음
    const info = adapter.info;

    if (info) {
        return {
            vendor: info.vendor || 'Unknown',
            architecture: info.architecture || 'Unknown',
            device: info.device || 'Unknown',
            description: info.description || 'Unknown GPU',
        };
    }

    return {
        vendor: 'Unknown',
        architecture: 'Unknown',
        device: 'Unknown',
        description: 'WebGPU Supported Device',
    };
}

/**
 * @brief WebGPU 감지 및 초기화 훅
 * @returns WebGPU 상태 및 제어 함수
 */
export function useWebGPU(): UseWebGPUReturn {
    const [status, setStatus] = useState<WebGPUStatus>(DEFAULT_WEBGPU_STATUS);
    const [currentMode, setCurrentMode] = useState<GPUMode>('auto');
    const [isInitializing, setIsInitializing] = useState(false);
    const [availableModes, setAvailableModes] = useState<GPUModeInfo[]>([]);

    /**
     * @brief 사용 가능한 GPU 모드 감지
     */
    const detectAvailableModes = useCallback(async () => {
        const webgpuSupported = await checkWebGPUSupport();
        const webglSupported = checkWebGLSupport();

        const modes: GPUModeInfo[] = [
            {
                mode: 'auto',
                name: '자동',
                description: '시스템이 최적의 모드를 자동 선택합니다',
                isSupported: true,
                isRecommended: true,
            },
            {
                mode: 'webgpu',
                name: 'WebGPU',
                description: 'Neural Avatar (LivePortrait) - 최고 품질',
                isSupported: webgpuSupported,
                isRecommended: webgpuSupported,
            },
            {
                mode: 'webgl',
                name: 'WebGL',
                description: 'GPU 가속 2D 렌더링 - 호환성 우선',
                isSupported: webglSupported,
                isRecommended: !webgpuSupported && webglSupported,
            },
            {
                mode: 'cpu',
                name: 'CPU',
                description: '기본 2D 렌더링 - 모든 기기 지원',
                isSupported: true,
                isRecommended: !webgpuSupported && !webglSupported,
            },
        ];

        setAvailableModes(modes);
        return { webgpuSupported, webglSupported };
    }, []);

    /**
     * @brief WebGPU 초기화
     */
    const initialize = useCallback(async () => {
        if (isInitializing) return;

        setIsInitializing(true);

        try {
            // 사용 가능한 모드 감지
            const { webgpuSupported, webglSupported } = await detectAvailableModes();

            if (!webgpuSupported) {
                // WebGPU 미지원 - 폴백 설정
                setStatus({
                    isSupported: false,
                    adapterInfo: null,
                    device: null,
                    fallbackMode: webglSupported ? 'webgl' : 'cpu',
                    error: 'WebGPU is not supported in this browser',
                    initialized: true,
                });

                // 자동 모드일 경우 폴백으로 전환
                if (currentMode === 'auto') {
                    setCurrentMode(webglSupported ? 'webgl' : 'cpu');
                }

                return;
            }

            // WebGPU 어댑터 요청
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });

            if (!adapter) {
                setStatus({
                    isSupported: false,
                    adapterInfo: null,
                    device: null,
                    fallbackMode: webglSupported ? 'webgl' : 'cpu',
                    error: 'Failed to get GPU adapter',
                    initialized: true,
                });
                return;
            }

            // 어댑터 정보 추출
            const adapterInfo = extractAdapterInfo(adapter);

            // GPU 디바이스 요청
            const device = await adapter.requestDevice({
                requiredFeatures: [],
                requiredLimits: {},
            });

            // 디바이스 에러 핸들링
            device.lost.then((info) => {
                console.error('WebGPU device lost:', info.message);
                setStatus(prev => ({
                    ...prev,
                    device: null,
                    error: `Device lost: ${info.message}`,
                }));
            });

            setStatus({
                isSupported: true,
                adapterInfo,
                device,
                fallbackMode: null,
                error: null,
                initialized: true,
            });

            // 자동 모드일 경우 WebGPU로 설정
            if (currentMode === 'auto') {
                setCurrentMode('webgpu');
            }

            console.log('WebGPU initialized successfully:', adapterInfo);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('WebGPU initialization failed:', errorMessage);

            const webglSupported = checkWebGLSupport();

            setStatus({
                isSupported: false,
                adapterInfo: null,
                device: null,
                fallbackMode: webglSupported ? 'webgl' : 'cpu',
                error: errorMessage,
                initialized: true,
            });

            if (currentMode === 'auto') {
                setCurrentMode(webglSupported ? 'webgl' : 'cpu');
            }
        } finally {
            setIsInitializing(false);
        }
    }, [isInitializing, currentMode, detectAvailableModes]);

    /**
     * @brief GPU 모드 변경
     */
    const setMode = useCallback((mode: GPUMode) => {
        const modeInfo = availableModes.find(m => m.mode === mode);

        if (!modeInfo || !modeInfo.isSupported) {
            console.warn(`GPU mode "${mode}" is not supported, falling back to CPU`);
            setCurrentMode('cpu');
            return;
        }

        setCurrentMode(mode);

        // auto 모드일 경우 최적의 모드 선택
        if (mode === 'auto') {
            if (status.isSupported) {
                setCurrentMode('webgpu');
            } else if (status.fallbackMode) {
                setCurrentMode(status.fallbackMode);
            } else {
                setCurrentMode('cpu');
            }
        }
    }, [availableModes, status]);

    // 컴포넌트 마운트 시 초기화
    useEffect(() => {
        initialize();
    }, [initialize]);

    return {
        status,
        availableModes,
        currentMode,
        setMode,
        initialize,
        isInitializing,
    };
}

export default useWebGPU;
