/**
 * @file liveportrait-pipeline.ts
 * @brief LivePortrait 추론 파이프라인
 * @description 브라우저에서 LivePortrait ONNX 모델을 사용한 추론 파이프라인
 */

import * as ort from 'onnxruntime-web';
import { LivePortraitSessions } from './onnx-loader';

/**
 * @brief 추론 결과
 */
export interface InferenceResult {
    /** @brief 성공 여부 */
    success: boolean;
    /** @brief 출력 이미지 데이터 */
    outputImage?: ImageData;
    /** @brief 추론 시간 (ms) */
    inferenceTime: number;
    /** @brief 오류 메시지 */
    error?: string;
}

/**
 * @brief 모델 입력 정보
 */
export interface ModelInputInfo {
    name: string;
    shape: readonly number[];
    type: string;
}

/**
 * @brief 모델 정보 조회
 * @param session ONNX 세션
 * @returns 입력/출력 정보
 */
export function getModelInfo(session: ort.InferenceSession): {
    inputs: ModelInputInfo[];
    outputs: ModelInputInfo[];
} {
    const inputs: ModelInputInfo[] = session.inputNames.map((name, i) => ({
        name,
        shape: [], // ONNX Runtime Web에서 shape 정보 제한적
        type: 'float32',
    }));

    const outputs: ModelInputInfo[] = session.outputNames.map((name) => ({
        name,
        shape: [],
        type: 'float32',
    }));

    return { inputs, outputs };
}

/**
 * @brief 이미지를 256x256 텐서로 변환
 * @param image 입력 이미지
 * @returns NCHW 형식 텐서 [1, 3, 256, 256]
 */
export function imageToTensor256(
    image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): ort.Tensor {
    const width = 256;
    const height = 256;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 이미지 그리기 (크기 조정)
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    // RGBA → RGB (NCHW 형식), 정규화 [0, 1]
    const data = imageData.data;
    const rgbData = new Float32Array(3 * width * height);

    for (let i = 0; i < width * height; i++) {
        rgbData[i] = data[i * 4] / 255.0;                       // R
        rgbData[width * height + i] = data[i * 4 + 1] / 255.0;   // G
        rgbData[2 * width * height + i] = data[i * 4 + 2] / 255.0; // B
    }

    return new ort.Tensor('float32', rgbData, [1, 3, height, width]);
}

/**
 * @brief 텐서를 ImageData로 변환
 * @param tensor NCHW 형식 텐서
 * @returns ImageData
 */
export function tensorToImageData256(tensor: ort.Tensor): ImageData {
    const data = tensor.data as Float32Array;
    const dims = tensor.dims;
    const height = dims[2] || 256;
    const width = dims[3] || 256;

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
 * @brief Appearance Feature 추출
 * @param session Appearance Extractor 세션
 * @param imageTensor 입력 이미지 텐서
 * @returns 특징 텐서
 */
export async function extractAppearanceFeatures(
    session: ort.InferenceSession,
    imageTensor: ort.Tensor
): Promise<ort.Tensor | null> {
    try {
        const inputName = session.inputNames[0];
        const feeds: Record<string, ort.Tensor> = {
            [inputName]: imageTensor,
        };

        const results = await session.run(feeds);
        const outputName = session.outputNames[0];
        return results[outputName];
    } catch (error) {
        console.error('[Pipeline] Appearance extraction failed:', error);
        return null;
    }
}

/**
 * @brief Motion Feature 추출
 * @param session Motion Extractor 세션
 * @param imageTensor 입력 이미지 텐서
 * @returns 모션 특징 텐서
 */
export async function extractMotionFeatures(
    session: ort.InferenceSession,
    imageTensor: ort.Tensor
): Promise<ort.Tensor | null> {
    try {
        const inputName = session.inputNames[0];
        const feeds: Record<string, ort.Tensor> = {
            [inputName]: imageTensor,
        };

        const results = await session.run(feeds);
        const outputName = session.outputNames[0];
        return results[outputName];
    } catch (error) {
        console.error('[Pipeline] Motion extraction failed:', error);
        return null;
    }
}

/**
 * @brief 간소화된 추론 파이프라인
 * @description 현재는 appearance + motion 추출만 수행 (warping 미지원)
 * @param sessions ONNX 세션들
 * @param sourceImage 소스 이미지
 * @param drivingImage 드라이빙 이미지 (현재 프레임)
 * @returns 추론 결과
 */
export async function runSimplePipeline(
    sessions: LivePortraitSessions,
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    drivingImage: HTMLVideoElement | HTMLCanvasElement
): Promise<InferenceResult> {
    const startTime = performance.now();

    try {
        // 1. 이미지를 텐서로 변환
        const sourceTensor = imageToTensor256(sourceImage);
        const drivingTensor = imageToTensor256(drivingImage);

        // 2. Appearance Feature 추출
        let appearanceFeatures: ort.Tensor | null = null;
        if (sessions.appearanceExtractor) {
            console.log('[Pipeline] Extracting appearance features...');
            console.log('  Input names:', sessions.appearanceExtractor.inputNames);
            console.log('  Output names:', sessions.appearanceExtractor.outputNames);

            appearanceFeatures = await extractAppearanceFeatures(
                sessions.appearanceExtractor,
                sourceTensor
            );

            if (appearanceFeatures) {
                console.log('  Output shape:', appearanceFeatures.dims);
            }
        }

        // 3. Motion Feature 추출
        let motionFeatures: ort.Tensor | null = null;
        if (sessions.motionExtractor) {
            console.log('[Pipeline] Extracting motion features...');
            console.log('  Input names:', sessions.motionExtractor.inputNames);
            console.log('  Output names:', sessions.motionExtractor.outputNames);

            motionFeatures = await extractMotionFeatures(
                sessions.motionExtractor,
                drivingTensor
            );

            if (motionFeatures) {
                console.log('  Output shape:', motionFeatures.dims);
            }
        }

        const inferenceTime = performance.now() - startTime;

        // 현재는 warping 없이 소스 이미지 반환 (데모용)
        // 실제 warping은 grid_sample 5D 지원 필요
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(sourceImage, 0, 0, 256, 256);
        const outputImage = ctx.getImageData(0, 0, 256, 256);

        console.log(`[Pipeline] Inference completed in ${inferenceTime.toFixed(2)}ms`);
        console.log('  Appearance features:', appearanceFeatures ? 'extracted' : 'failed');
        console.log('  Motion features:', motionFeatures ? 'extracted' : 'failed');

        return {
            success: true,
            outputImage,
            inferenceTime,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Pipeline] Inference failed:', errorMessage);

        return {
            success: false,
            inferenceTime: performance.now() - startTime,
            error: errorMessage,
        };
    }
}

/**
 * @brief 모델 세션 정보 로깅
 * @param sessions 모든 세션
 */
export function logAllModelInfo(sessions: LivePortraitSessions): void {
    console.log('=== LivePortrait Model Info ===');

    if (sessions.appearanceExtractor) {
        console.log('Appearance Extractor:');
        console.log('  Inputs:', sessions.appearanceExtractor.inputNames);
        console.log('  Outputs:', sessions.appearanceExtractor.outputNames);
    }

    if (sessions.motionExtractor) {
        console.log('Motion Extractor:');
        console.log('  Inputs:', sessions.motionExtractor.inputNames);
        console.log('  Outputs:', sessions.motionExtractor.outputNames);
    }

    if (sessions.landmark) {
        console.log('Landmark:');
        console.log('  Inputs:', sessions.landmark.inputNames);
        console.log('  Outputs:', sessions.landmark.outputNames);
    }

    if (sessions.stitching) {
        console.log('Stitching:');
        console.log('  Inputs:', sessions.stitching.inputNames);
        console.log('  Outputs:', sessions.stitching.outputNames);
    }

    console.log('================================');
}
