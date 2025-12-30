/**
 * @file useNeuralAvatar.ts
 * @brief Neural Avatar (LivePortrait) 훅
 * @description ONNX Runtime Web을 사용한 LivePortrait 모델 추론
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as ort from 'onnxruntime-web';
import { AvatarParams } from '../types/avatar';
import {
    NeuralAvatarConfig,
    NeuralAvatarState,
    ModelLoadingProgress,
    ModelLoadingStatus,
    RenderMode,
    DEFAULT_NEURAL_CONFIG,
    DEFAULT_PERFORMANCE_METRICS,
    PerformanceMetrics,
} from '../types/avatarV3';
import {
    loadLivePortraitModels,
    disposeLivePortraitModels,
    initONNXRuntime,
    LivePortraitSessions,
    DEFAULT_MODEL_URLS,
} from '../lib/gpu/onnx-loader';

/**
 * @brief useNeuralAvatar 훅 반환 타입
 */
export interface UseNeuralAvatarReturn {
    /** @brief Neural Avatar 상태 */
    state: NeuralAvatarState;
    /** @brief 모델 로딩 중 여부 */
    isLoading: boolean;
    /** @brief 렌더링 가능 여부 */
    isReady: boolean;
    /** @brief 모델 로딩 진행 상황 */
    loadingProgress: ModelLoadingProgress | null;
    /** @brief 성능 메트릭 */
    metrics: PerformanceMetrics;
    /** @brief 모델 로드 함수 */
    loadModels: () => Promise<void>;
    /** @brief 모델 해제 함수 */
    unloadModels: () => Promise<void>;
    /** @brief 렌더링 함수 (Face Params → 결과 텐서) */
    render: (params: AvatarParams, referenceImage: HTMLImageElement | HTMLCanvasElement) => Promise<ImageData | null>;
    /** @brief 단순화된 렌더링 (Face Params → Canvas에 직접 렌더) */
    renderToCanvas: (params: AvatarParams, referenceImage: HTMLImageElement | HTMLCanvasElement, canvas: HTMLCanvasElement) => Promise<boolean>;
}

/**
 * @brief useNeuralAvatar 훅 옵션
 */
export interface UseNeuralAvatarOptions {
    /** @brief 자동 로드 여부 */
    autoLoad?: boolean;
    /** @brief Neural Avatar 설정 */
    config?: Partial<NeuralAvatarConfig>;
    /** @brief 웜업 추론 실행 여부 */
    warmup?: boolean;
}

/**
 * @brief Avatar 파라미터를 모델 입력 텐서로 변환
 * @param params Face Tracking 파라미터
 * @returns Motion 텐서
 */
function paramsToMotionTensor(params: AvatarParams): ort.Tensor {
    // LivePortrait가 기대하는 motion 벡터 형식으로 변환
    // 실제 구현에서는 정확한 텐서 형식에 맞춰야 함
    const motionData = new Float32Array([
        params.headRotation[0],  // pitch
        params.headRotation[1],  // yaw
        params.headRotation[2],  // roll
        params.eyeBlinkLeft,
        params.eyeBlinkRight,
        params.mouthOpen,
        params.smile,
        // 추가 파라미터들...
    ]);

    return new ort.Tensor('float32', motionData, [1, motionData.length]);
}

/**
 * @brief 이미지를 텐서로 변환
 * @param image 입력 이미지
 * @param width 타겟 너비
 * @param height 타겟 높이
 * @returns 이미지 텐서 (NCHW 형식)
 */
function imageToTensor(
    image: HTMLImageElement | HTMLCanvasElement,
    width: number = 256,
    height: number = 256
): ort.Tensor {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    // RGBA to RGB, 정규화 (0-1)
    const data = imageData.data;
    const rgbData = new Float32Array(3 * width * height);

    for (let i = 0; i < width * height; i++) {
        rgbData[i] = data[i * 4] / 255.0;                     // R
        rgbData[width * height + i] = data[i * 4 + 1] / 255.0; // G
        rgbData[2 * width * height + i] = data[i * 4 + 2] / 255.0; // B
    }

    return new ort.Tensor('float32', rgbData, [1, 3, height, width]);
}

/**
 * @brief 텐서를 ImageData로 변환
 * @param tensor 출력 텐서 (NCHW 형식)
 * @returns ImageData
 */
function tensorToImageData(tensor: ort.Tensor): ImageData {
    const data = tensor.data as Float32Array;
    const [, channels, height, width] = tensor.dims;

    const imageData = new ImageData(width, height);
    const pixels = imageData.data;

    for (let i = 0; i < width * height; i++) {
        const r = Math.min(255, Math.max(0, Math.round(data[i] * 255)));
        const g = Math.min(255, Math.max(0, Math.round(data[width * height + i] * 255)));
        const b = Math.min(255, Math.max(0, Math.round(data[2 * width * height + i] * 255)));

        pixels[i * 4] = r;
        pixels[i * 4 + 1] = g;
        pixels[i * 4 + 2] = b;
        pixels[i * 4 + 3] = 255;
    }

    return imageData;
}

/**
 * @brief Neural Avatar (LivePortrait) 훅
 * @param options 옵션
 * @returns Neural Avatar 상태 및 제어 함수
 */
export function useNeuralAvatar(options: UseNeuralAvatarOptions = {}): UseNeuralAvatarReturn {
    const {
        autoLoad = false,
        config: userConfig,
        warmup = true,
    } = options;

    const config = { ...DEFAULT_NEURAL_CONFIG, ...userConfig };

    const [state, setState] = useState<NeuralAvatarState>({
        modelStatus: 'idle',
        renderMode: 'basic',
        metrics: DEFAULT_PERFORMANCE_METRICS,
        lastError: null,
    });

    const [loadingProgress, setLoadingProgress] = useState<ModelLoadingProgress | null>(null);
    const [metrics, setMetrics] = useState<PerformanceMetrics>(DEFAULT_PERFORMANCE_METRICS);

    const sessionsRef = useRef<LivePortraitSessions | null>(null);
    const frameTimesRef = useRef<number[]>([]);

    /**
     * @brief 모델 로드
     */
    const loadModels = useCallback(async () => {
        if (state.modelStatus === 'loading' || state.modelStatus === 'downloading') {
            return;
        }

        setState(prev => ({
            ...prev,
            modelStatus: 'downloading',
            lastError: null,
        }));

        try {
            // ONNX Runtime 환경 초기화 (WASM 경로 설정)
            initONNXRuntime();

            // 실행 제공자 설정
            const providers: ('webgpu' | 'webgl' | 'wasm')[] =
                config.gpuMode === 'webgpu' ? ['webgpu', 'wasm'] :
                    config.gpuMode === 'webgl' ? ['webgl', 'wasm'] :
                        ['wasm'];

            const sessions = await loadLivePortraitModels({
                modelFiles: DEFAULT_MODEL_URLS,
                executionProviders: providers,
                useCache: true,
                onProgress: setLoadingProgress,
            });

            sessionsRef.current = sessions;

            // 모델 정보 로깅
            import('../lib/gpu/liveportrait-pipeline').then(({ logAllModelInfo }) => {
                logAllModelInfo(sessions);
            });

            // 웜업 추론
            if (warmup) {
                setState(prev => ({ ...prev, modelStatus: 'warming_up' }));
                setLoadingProgress({
                    status: 'warming_up',
                    progress: 95,
                    message: '웜업 추론 실행 중...',
                    bytesLoaded: 0,
                    bytesTotal: 0,
                });

                // 모델 정보만 확인 (실제 추론은 아직 미구현)
                console.log('[NeuralAvatar] Warmup complete - models ready');
            }

            setState(prev => ({
                ...prev,
                modelStatus: 'ready',
                renderMode: 'neural',
            }));

            setLoadingProgress({
                status: 'ready',
                progress: 100,
                message: 'Neural Avatar 준비 완료',
                bytesLoaded: 0,
                bytesTotal: 0,
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[NeuralAvatar] Load failed:', errorMessage);

            setState(prev => ({
                ...prev,
                modelStatus: 'error',
                lastError: errorMessage,
                renderMode: config.enableFallback ? 'enhanced' : 'basic',
            }));

            setLoadingProgress({
                status: 'error',
                progress: 0,
                message: `로드 실패: ${errorMessage}`,
                bytesLoaded: 0,
                bytesTotal: 0,
            });
        }
    }, [state.modelStatus, config, warmup]);

    /**
     * @brief 모델 해제
     */
    const unloadModels = useCallback(async () => {
        if (sessionsRef.current) {
            await disposeLivePortraitModels(sessionsRef.current);
            sessionsRef.current = null;
        }

        setState(prev => ({
            ...prev,
            modelStatus: 'idle',
            renderMode: 'basic',
        }));

        setLoadingProgress(null);
    }, []);

    /**
     * @brief Neural Avatar 렌더링
     * @param params Face Tracking 파라미터
     * @param referenceImage 레퍼런스 이미지
     * @returns 렌더링된 ImageData
     */
    const render = useCallback(async (
        params: AvatarParams,
        referenceImage: HTMLImageElement | HTMLCanvasElement
    ): Promise<ImageData | null> => {
        if (!sessionsRef.current || state.modelStatus !== 'ready') {
            return null;
        }

        const startTime = performance.now();

        try {
            const sessions = sessionsRef.current;

            // 1. 레퍼런스 이미지를 텐서로 변환
            const imageTensor = imageToTensor(referenceImage, 256, 256);

            // 2. Motion 파라미터를 텐서로 변환
            const motionTensor = paramsToMotionTensor(params);

            // 3. Appearance Feature 추출
            // 실제 구현에서는 모델 입력/출력 형식에 맞춰야 함
            if (sessions.appearanceExtractor) {
                // const appearanceResult = await sessions.appearanceExtractor.run({
                //     input: imageTensor
                // });
            }

            // 4. Motion 추출
            if (sessions.motionExtractor) {
                // const motionResult = await sessions.motionExtractor.run({
                //     motion: motionTensor
                // });
            }

            // 5. Landmark 처리
            if (sessions.landmark) {
                // const landmarkResult = await sessions.landmark.run({
                //     input: imageTensor
                // });
            }

            // 임시: 더미 출력 (실제 모델 통합 전)
            const dummyOutput = new Float32Array(3 * 256 * 256).fill(0.5);
            const outputTensor = new ort.Tensor('float32', dummyOutput, [1, 3, 256, 256]);
            const result = tensorToImageData(outputTensor);

            // 성능 측정
            const endTime = performance.now();
            const inferenceTime = endTime - startTime;

            frameTimesRef.current.push(inferenceTime);
            if (frameTimesRef.current.length > 30) {
                frameTimesRef.current.shift();
            }

            const avgTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
            const fps = Math.round(1000 / avgTime);

            setMetrics(prev => ({
                ...prev,
                fps,
                inferenceTime,
                totalFrameTime: inferenceTime,
            }));

            return result;

        } catch (error) {
            console.error('[NeuralAvatar] Render failed:', error);
            return null;
        }
    }, [state.modelStatus]);

    /**
     * @brief Canvas에 직접 렌더링
     */
    const renderToCanvas = useCallback(async (
        params: AvatarParams,
        referenceImage: HTMLImageElement | HTMLCanvasElement,
        canvas: HTMLCanvasElement
    ): Promise<boolean> => {
        const imageData = await render(params, referenceImage);

        if (!imageData) {
            return false;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return false;
        }

        // Canvas 크기 조정
        if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
            canvas.width = imageData.width;
            canvas.height = imageData.height;
        }

        ctx.putImageData(imageData, 0, 0);
        return true;
    }, [render]);

    // 자동 로드
    useEffect(() => {
        if (autoLoad) {
            loadModels();
        }

        return () => {
            unloadModels();
        };
    }, [autoLoad]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        state,
        isLoading: state.modelStatus === 'downloading' || state.modelStatus === 'loading' || state.modelStatus === 'warming_up',
        isReady: state.modelStatus === 'ready',
        loadingProgress,
        metrics,
        loadModels,
        unloadModels,
        render,
        renderToCanvas,
    };
}

export default useNeuralAvatar;
