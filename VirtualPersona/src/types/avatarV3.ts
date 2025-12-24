/**
 * @file avatarV3.ts
 * @brief Phase 3 Neural Avatar 타입 정의
 * @description WebGPU, ONNX Runtime, LivePortrait 통합을 위한 타입 정의
 */

import { AvatarParams } from './avatar';
import { AvatarParamsV2, AvatarCustomization } from './avatarV2';

// ============================================================================
// GPU Mode Types
// ============================================================================

/**
 * @brief GPU 모드 옵션
 * @description 렌더링에 사용할 GPU 백엔드 선택
 */
export type GPUMode = 'auto' | 'webgpu' | 'webgl' | 'cpu';

/**
 * @brief GPU 모드별 상세 정보
 */
export interface GPUModeInfo {
    /** @brief 모드 ID */
    mode: GPUMode;
    /** @brief 표시 이름 */
    name: string;
    /** @brief 설명 */
    description: string;
    /** @brief 지원 여부 */
    isSupported: boolean;
    /** @brief 권장 여부 */
    isRecommended: boolean;
}

// ============================================================================
// WebGPU Types
// ============================================================================

/**
 * @brief WebGPU 상태 정보
 */
export interface WebGPUStatus {
    /** @brief WebGPU 지원 여부 */
    isSupported: boolean;
    /** @brief GPU 어댑터 정보 */
    adapterInfo: GPUAdapterInfo | null;
    /** @brief GPU 디바이스 */
    device: GPUDevice | null;
    /** @brief 폴백 모드 */
    fallbackMode: 'webgl' | 'cpu' | null;
    /** @brief 에러 메시지 */
    error: string | null;
    /** @brief 초기화 상태 */
    initialized: boolean;
}

/**
 * @brief GPU 어댑터 정보
 */
export interface GPUAdapterInfo {
    /** @brief 벤더 이름 */
    vendor: string;
    /** @brief 아키텍처 */
    architecture: string;
    /** @brief 디바이스 이름 */
    device: string;
    /** @brief 설명 */
    description: string;
}

// ============================================================================
// Render Quality Types
// ============================================================================

/**
 * @brief 렌더링 품질 레벨
 */
export type RenderQuality = 'low' | 'medium' | 'high' | 'ultra';

/**
 * @brief 렌더링 품질 설정
 */
export interface RenderQualitySettings {
    /** @brief 품질 레벨 */
    quality: RenderQuality;
    /** @brief 출력 해상도 */
    resolution: { width: number; height: number };
    /** @brief 추론 FPS */
    targetFPS: number;
    /** @brief 프레임 보간 활성화 */
    interpolation: boolean;
}

/**
 * @brief 품질 프리셋 정의
 */
export const RENDER_QUALITY_PRESETS: Record<RenderQuality, RenderQualitySettings> = {
    low: {
        quality: 'low',
        resolution: { width: 128, height: 128 },
        targetFPS: 10,
        interpolation: true,
    },
    medium: {
        quality: 'medium',
        resolution: { width: 256, height: 256 },
        targetFPS: 15,
        interpolation: true,
    },
    high: {
        quality: 'high',
        resolution: { width: 384, height: 384 },
        targetFPS: 20,
        interpolation: false,
    },
    ultra: {
        quality: 'ultra',
        resolution: { width: 512, height: 512 },
        targetFPS: 30,
        interpolation: false,
    },
};

// ============================================================================
// Performance Metrics Types
// ============================================================================

/**
 * @brief 성능 측정 데이터
 */
export interface PerformanceMetrics {
    /** @brief 현재 FPS */
    fps: number;
    /** @brief 추론 시간 (ms) */
    inferenceTime: number;
    /** @brief 렌더링 시간 (ms) */
    renderTime: number;
    /** @brief 총 프레임 시간 (ms) */
    totalFrameTime: number;
    /** @brief GPU 메모리 사용량 (MB, 가능한 경우) */
    gpuMemoryUsage: number | null;
    /** @brief 드롭된 프레임 수 */
    droppedFrames: number;
    /** @brief 성능 경고 */
    warnings: PerformanceWarning[];
}

/**
 * @brief 성능 경고 타입
 */
export type PerformanceWarning =
    | 'low_fps'           // FPS가 목표 이하
    | 'high_latency'      // 높은 지연 시간
    | 'memory_pressure'   // 메모리 부족
    | 'thermal_throttle'; // 발열로 인한 스로틀링

// ============================================================================
// Neural Avatar Types
// ============================================================================

/**
 * @brief Neural Avatar 설정
 */
export interface NeuralAvatarConfig {
    /** @brief 레퍼런스 이미지 URL */
    referenceImage: string;
    /** @brief 렌더링 품질 */
    quality: RenderQuality;
    /** @brief GPU 모드 */
    gpuMode: GPUMode;
    /** @brief 자동 품질 조절 활성화 */
    autoQuality: boolean;
    /** @brief 폴백 활성화 */
    enableFallback: boolean;
}

/**
 * @brief Neural Avatar 상태
 */
export interface NeuralAvatarState {
    /** @brief 모델 로딩 상태 */
    modelStatus: ModelLoadingStatus;
    /** @brief 현재 렌더링 모드 */
    renderMode: RenderMode;
    /** @brief 성능 메트릭 */
    metrics: PerformanceMetrics;
    /** @brief 마지막 에러 */
    lastError: string | null;
}

/**
 * @brief 모델 로딩 상태
 */
export type ModelLoadingStatus =
    | 'idle'        // 대기 중
    | 'downloading' // 다운로드 중
    | 'loading'     // 로딩 중
    | 'warming_up'  // 웜업 중
    | 'ready'       // 준비 완료
    | 'error';      // 오류

/**
 * @brief 모델 로딩 진행 상황
 */
export interface ModelLoadingProgress {
    /** @brief 상태 */
    status: ModelLoadingStatus;
    /** @brief 진행률 (0-100) */
    progress: number;
    /** @brief 현재 단계 메시지 */
    message: string;
    /** @brief 다운로드된 바이트 */
    bytesLoaded: number;
    /** @brief 총 바이트 */
    bytesTotal: number;
}

/**
 * @brief 렌더링 모드
 */
export type RenderMode =
    | 'neural'     // Neural Avatar (LivePortrait)
    | 'enhanced'   // GPU 가속 2D
    | 'basic';     // 기본 2D Canvas

// ============================================================================
// Phase 3 Avatar Params
// ============================================================================

/**
 * @brief Phase 3 확장 아바타 파라미터
 * @description Phase 2 파라미터에 Neural Avatar 관련 정보 추가
 */
export interface AvatarParamsV3 extends AvatarParamsV2 {
    /** @brief 현재 렌더링 모드 */
    renderMode?: RenderMode;
    /** @brief 품질 설정 */
    quality?: RenderQuality;
}

/**
 * @brief Phase 3 확장 커스터마이징
 */
export interface AvatarCustomizationV3 extends AvatarCustomization {
    /** @brief 레퍼런스 이미지 (Neural Avatar용) */
    referenceImage?: string;
    /** @brief 스타일 프리셋 */
    stylePreset?: NeuralStylePreset;
}

/**
 * @brief Neural 스타일 프리셋
 */
export type NeuralStylePreset =
    | 'realistic'   // 실사풍
    | 'anime'       // 애니메이션풍
    | 'cartoon'     // 만화풍
    | 'watercolor'  // 수채화풍
    | 'pixel';      // 픽셀아트

// ============================================================================
// Default Values
// ============================================================================

/**
 * @brief 기본 Neural Avatar 설정
 */
export const DEFAULT_NEURAL_CONFIG: NeuralAvatarConfig = {
    referenceImage: '',
    quality: 'medium',
    gpuMode: 'auto',
    autoQuality: true,
    enableFallback: true,
};

/**
 * @brief 기본 성능 메트릭
 */
export const DEFAULT_PERFORMANCE_METRICS: PerformanceMetrics = {
    fps: 0,
    inferenceTime: 0,
    renderTime: 0,
    totalFrameTime: 0,
    gpuMemoryUsage: null,
    droppedFrames: 0,
    warnings: [],
};

/**
 * @brief 기본 WebGPU 상태
 */
export const DEFAULT_WEBGPU_STATUS: WebGPUStatus = {
    isSupported: false,
    adapterInfo: null,
    device: null,
    fallbackMode: null,
    error: null,
    initialized: false,
};
