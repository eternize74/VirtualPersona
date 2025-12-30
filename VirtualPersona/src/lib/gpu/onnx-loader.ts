/**
 * @file onnx-loader.ts
 * @brief ONNX 모델 로더 유틸리티
 * @description LivePortrait ONNX 모델의 로딩, 캐싱, 세션 관리
 */

import * as ort from 'onnxruntime-web';
import { ModelLoadingProgress, ModelLoadingStatus } from '../../types/avatarV3';

/**
 * @brief ONNX Runtime 환경 초기화
 * @description WASM 파일 경로 설정 및 스레드 수 설정
 */
export function initONNXRuntime(): void {
    // WASM 파일 경로를 CDN에서 로드하도록 설정
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/';

    // 멀티스레드 비활성화 (브라우저 호환성)
    ort.env.wasm.numThreads = 1;

    // SIMD 활성화 (지원되는 경우)
    ort.env.wasm.simd = true;

    console.log('[ONNX] Runtime initialized with CDN WASM paths');
}

/**
 * @brief LivePortrait 모델 파일 정보
 */
export interface LivePortraitModelFiles {
    /** @brief Appearance Feature Extractor 모델 */
    appearanceExtractor: string;
    /** @brief Motion Extractor 모델 */
    motionExtractor: string;
    /** @brief Landmark 모델 */
    landmark: string;
    /** @brief Stitching 모델 */
    stitching: string;
    /** @brief Stitching Eye 모델 */
    stitchingEye: string;
    /** @brief Stitching Lip 모델 */
    stitchingLip: string;
}

/**
 * @brief ONNX 세션 컬렉션
 */
export interface LivePortraitSessions {
    appearanceExtractor: ort.InferenceSession | null;
    motionExtractor: ort.InferenceSession | null;
    landmark: ort.InferenceSession | null;
    stitching: ort.InferenceSession | null;
    stitchingEye: ort.InferenceSession | null;
    stitchingLip: ort.InferenceSession | null;
}

/**
 * @brief 모델 로더 설정
 */
export interface ModelLoaderConfig {
    /** @brief 모델 파일 URL들 */
    modelFiles: LivePortraitModelFiles;
    /** @brief 실행 제공자 (webgpu, webgl, wasm) */
    executionProviders?: ('webgpu' | 'webgl' | 'wasm')[];
    /** @brief 진행 콜백 */
    onProgress?: (progress: ModelLoadingProgress) => void;
    /** @brief 캐시 사용 여부 */
    useCache?: boolean;
}

/**
 * @brief 기본 모델 URL (public/models/liveportrait/ 폴더)
 */
export const DEFAULT_MODEL_URLS: LivePortraitModelFiles = {
    appearanceExtractor: '/models/liveportrait/appearance_feature_extractor.onnx',
    motionExtractor: '/models/liveportrait/motion_extractor.onnx',
    landmark: '/models/liveportrait/landmark.onnx',
    stitching: '/models/liveportrait/stitching.onnx',
    stitchingEye: '/models/liveportrait/stitching_eye.onnx',
    stitchingLip: '/models/liveportrait/stitching_lip.onnx',
};

/**
 * @brief 모델 크기 정보 (실제 파일 크기, 바이트)
 */
const MODEL_SIZES: Record<keyof LivePortraitModelFiles, number> = {
    appearanceExtractor: 3355896,    // ~3.4MB
    motionExtractor: 112648514,      // ~113MB
    landmark: 114666491,             // ~115MB
    stitching: 182363,               // ~182KB
    stitchingEye: 580926,            // ~581KB
    stitchingLip: 150609,            // ~151KB
};

/**
 * @brief IndexedDB 캐시 이름
 */
const CACHE_DB_NAME = 'liveportrait-models';
const CACHE_STORE_NAME = 'models';

/**
 * @brief 모델 데이터를 IndexedDB에 캐싱
 * @param modelName 모델 이름
 * @param data 모델 데이터
 */
async function cacheModel(modelName: string, data: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CACHE_DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME);
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
            const store = tx.objectStore(CACHE_STORE_NAME);
            store.put(data, modelName);
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        };
    });
}

/**
 * @brief IndexedDB에서 캐시된 모델 로드
 * @param modelName 모델 이름
 * @returns 모델 데이터 또는 null
 */
async function loadCachedModel(modelName: string): Promise<ArrayBuffer | null> {
    return new Promise((resolve) => {
        const request = indexedDB.open(CACHE_DB_NAME, 1);

        request.onerror = () => resolve(null);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME);
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            try {
                const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
                const store = tx.objectStore(CACHE_STORE_NAME);
                const getRequest = store.get(modelName);

                getRequest.onsuccess = () => {
                    db.close();
                    resolve(getRequest.result || null);
                };

                getRequest.onerror = () => {
                    db.close();
                    resolve(null);
                };
            } catch {
                db.close();
                resolve(null);
            }
        };
    });
}

/**
 * @brief 단일 ONNX 모델 다운로드 및 로드
 * @param url 모델 URL
 * @param modelName 모델 이름
 * @param executionProviders 실행 제공자
 * @param useCache 캐시 사용 여부
 * @param onProgress 진행 콜백
 */
export async function loadONNXModel(
    url: string,
    modelName: string,
    executionProviders: ('webgpu' | 'webgl' | 'wasm')[] = ['webgpu', 'wasm'],
    useCache: boolean = true,
    onProgress?: (loaded: number, total: number) => void
): Promise<ort.InferenceSession> {
    let modelData: ArrayBuffer;

    // 캐시 확인
    if (useCache) {
        const cached = await loadCachedModel(modelName);
        if (cached) {
            console.log(`[ONNX] ${modelName} loaded from cache`);
            modelData = cached;
        } else {
            modelData = await downloadModel(url, onProgress);
            await cacheModel(modelName, modelData);
            console.log(`[ONNX] ${modelName} cached`);
        }
    } else {
        modelData = await downloadModel(url, onProgress);
    }

    // ONNX 세션 생성 (wasm만 사용 - 브라우저 호환성)
    // Note: webgpu/webgl은 onnxruntime-web 빌드에 따라 지원되지 않을 수 있음
    const session = await ort.InferenceSession.create(modelData, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
    });

    console.log(`[ONNX] ${modelName} session created with WASM backend`);
    return session;
}

/**
 * @brief 모델 다운로드
 * @param url 모델 URL
 * @param onProgress 진행 콜백
 */
async function downloadModel(
    url: string,
    onProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
        return response.arrayBuffer();
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        if (onProgress && total > 0) {
            onProgress(loaded, total);
        }
    }

    // 청크들을 하나의 ArrayBuffer로 합치기
    const result = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result.buffer;
}

/**
 * @brief LivePortrait 모델 세트 전체 로드
 * @param config 로더 설정
 * @returns ONNX 세션 컬렉션
 */
export async function loadLivePortraitModels(
    config: ModelLoaderConfig
): Promise<LivePortraitSessions> {
    const {
        modelFiles,
        executionProviders = ['webgpu', 'wasm'],
        onProgress,
        useCache = true,
    } = config;

    const sessions: LivePortraitSessions = {
        appearanceExtractor: null,
        motionExtractor: null,
        landmark: null,
        stitching: null,
        stitchingEye: null,
        stitchingLip: null,
    };

    const modelKeys = Object.keys(modelFiles) as (keyof LivePortraitModelFiles)[];
    const totalSize = modelKeys.reduce((sum, key) => sum + MODEL_SIZES[key], 0);
    let loadedSize = 0;

    for (let i = 0; i < modelKeys.length; i++) {
        const key = modelKeys[i];
        const url = modelFiles[key];

        if (onProgress) {
            onProgress({
                status: 'downloading',
                progress: (loadedSize / totalSize) * 100,
                message: `${key} 다운로드 중...`,
                bytesLoaded: loadedSize,
                bytesTotal: totalSize,
            });
        }

        try {
            sessions[key] = await loadONNXModel(
                url,
                key,
                executionProviders,
                useCache,
                (loaded, total) => {
                    if (onProgress) {
                        const currentProgress = loadedSize + loaded;
                        onProgress({
                            status: 'downloading',
                            progress: (currentProgress / totalSize) * 100,
                            message: `${key} 다운로드 중... (${Math.round(loaded / 1024 / 1024)}MB)`,
                            bytesLoaded: currentProgress,
                            bytesTotal: totalSize,
                        });
                    }
                }
            );

            loadedSize += MODEL_SIZES[key];
        } catch (error) {
            console.error(`[ONNX] Failed to load ${key}:`, error);
            throw new Error(`Failed to load ${key}: ${error}`);
        }
    }

    if (onProgress) {
        onProgress({
            status: 'ready',
            progress: 100,
            message: '모든 모델 로드 완료',
            bytesLoaded: totalSize,
            bytesTotal: totalSize,
        });
    }

    return sessions;
}

/**
 * @brief 모델 세션 해제
 * @param sessions 해제할 세션들
 */
export async function disposeLivePortraitModels(
    sessions: LivePortraitSessions
): Promise<void> {
    const keys = Object.keys(sessions) as (keyof LivePortraitSessions)[];

    for (const key of keys) {
        const session = sessions[key];
        if (session) {
            await session.release();
            sessions[key] = null;
        }
    }

    console.log('[ONNX] All sessions released');
}

/**
 * @brief IndexedDB 캐시 삭제
 */
export async function clearModelCache(): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(CACHE_DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
