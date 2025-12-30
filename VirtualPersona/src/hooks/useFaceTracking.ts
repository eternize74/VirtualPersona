/**
 * @file useFaceTracking.ts
 * @brief 얼굴 추적 커스텀 훅 (MediaPipe Tasks Vision API)
 * @description 최신 MediaPipe Face Landmarker를 사용하여 얼굴 랜드마크를 추적하고
 *              아바타 파라미터로 변환합니다.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AvatarParams, DEFAULT_AVATAR_PARAMS } from '@/types/avatar';

/**
 * @brief 주요 랜드마크 인덱스 (478개 중)
 */
const LANDMARKS = {
    // 왼쪽 눈
    LEFT_EYE_TOP: 159,
    LEFT_EYE_BOTTOM: 145,
    LEFT_EYE_OUTER: 33,
    LEFT_EYE_INNER: 133,

    // 오른쪽 눈
    RIGHT_EYE_TOP: 386,
    RIGHT_EYE_BOTTOM: 374,
    RIGHT_EYE_OUTER: 263,
    RIGHT_EYE_INNER: 362,

    // 입
    MOUTH_TOP: 13,
    MOUTH_BOTTOM: 14,
    MOUTH_LEFT: 61,
    MOUTH_RIGHT: 291,

    // 얼굴 윤곽
    NOSE_TIP: 1,
    CHIN: 152,
    LEFT_EAR: 234,
    RIGHT_EAR: 454,
};

/**
 * @brief 두 점 사이의 유클리드 거리 계산
 */
function distance(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * @brief 눈 깜빡임 계산
 */
function calculateEyeBlink(landmarks: any[], isLeft: boolean): number {
    const topIdx = isLeft ? LANDMARKS.LEFT_EYE_TOP : LANDMARKS.RIGHT_EYE_TOP;
    const bottomIdx = isLeft ? LANDMARKS.LEFT_EYE_BOTTOM : LANDMARKS.RIGHT_EYE_BOTTOM;
    const outerIdx = isLeft ? LANDMARKS.LEFT_EYE_OUTER : LANDMARKS.RIGHT_EYE_OUTER;
    const innerIdx = isLeft ? LANDMARKS.LEFT_EYE_INNER : LANDMARKS.RIGHT_EYE_INNER;

    const top = landmarks[topIdx];
    const bottom = landmarks[bottomIdx];
    const outer = landmarks[outerIdx];
    const inner = landmarks[innerIdx];

    if (!top || !bottom || !outer || !inner) return 0;

    const verticalDist = distance(top, bottom);
    const horizontalDist = distance(outer, inner);
    const ear = verticalDist / (horizontalDist + 0.001);
    const blink = Math.max(0, Math.min(1, 1 - (ear - 0.05) / 0.25));
    return blink;
}

/**
 * @brief 입 벌림 계산
 */
function calculateMouthOpen(landmarks: any[]): number {
    const top = landmarks[LANDMARKS.MOUTH_TOP];
    const bottom = landmarks[LANDMARKS.MOUTH_BOTTOM];
    const left = landmarks[LANDMARKS.MOUTH_LEFT];
    const right = landmarks[LANDMARKS.MOUTH_RIGHT];

    if (!top || !bottom || !left || !right) return 0;

    const verticalDist = distance(top, bottom);
    const horizontalDist = distance(left, right);
    const ratio = verticalDist / (horizontalDist + 0.001);
    return Math.max(0, Math.min(1, ratio * 2));
}

/**
 * @brief 미소 계산
 */
function calculateSmile(landmarks: any[]): number {
    const left = landmarks[LANDMARKS.MOUTH_LEFT];
    const right = landmarks[LANDMARKS.MOUTH_RIGHT];
    const top = landmarks[LANDMARKS.MOUTH_TOP];

    if (!left || !right || !top) return 0;

    const avgCornerY = (left.y + right.y) / 2;
    const smileRatio = (top.y - avgCornerY) * 10;
    return Math.max(0, Math.min(1, smileRatio + 0.3));
}

/**
 * @brief Head Pose 계산
 */
function calculateHeadPose(landmarks: any[]): [number, number, number] {
    const nose = landmarks[LANDMARKS.NOSE_TIP];
    const chin = landmarks[LANDMARKS.CHIN];
    const leftEar = landmarks[LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[LANDMARKS.RIGHT_EAR];

    if (!nose || !chin || !leftEar || !rightEar) {
        return [0, 0, 0];
    }

    const faceWidth = distance(leftEar, rightEar);
    const noseToCenter = (nose.x - (leftEar.x + rightEar.x) / 2) / (faceWidth + 0.001);
    const yaw = noseToCenter * Math.PI / 4;

    const faceHeight = distance(nose, chin);
    const noseToChinRatio = (chin.y - nose.y) / (faceHeight + 0.001);
    const pitch = (noseToChinRatio - 0.5) * Math.PI / 6;

    const roll = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x);

    return [pitch, yaw, roll];
}

/**
 * @brief 얼굴 추적 훅
 */
export function useFaceTracking() {
    const [isTracking, setIsTracking] = useState(false);
    const [params, setParams] = useState<AvatarParams>(DEFAULT_AVATAR_PARAMS);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const faceLandmarkerRef = useRef<any>(null);
    const animationFrameRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    const isInitializingRef = useRef(false);

    /**
     * @brief Face Landmarker 초기화
     */
    const initFaceLandmarker = useCallback(async () => {
        if (isInitializingRef.current) return null;
        isInitializingRef.current = true;

        try {
            const vision = await import('@mediapipe/tasks-vision');
            const { FaceLandmarker, FilesetResolver } = vision;

            console.log('[FaceTracking] FilesetResolver 로딩 중...');
            const filesetResolver = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
            );

            console.log('[FaceTracking] FaceLandmarker 생성 중...');
            const faceLandmarker = await FaceLandmarker.createFromOptions(
                filesetResolver,
                {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                    numFaces: 1,
                    outputFaceBlendshapes: true,
                    outputFacialTransformationMatrixes: true,
                }
            );

            console.log('[FaceTracking] FaceLandmarker 초기화 완료');
            faceLandmarkerRef.current = faceLandmarker;
            return faceLandmarker;
        } catch (err) {
            console.error('[FaceTracking] 초기화 실패:', err);
            setError('얼굴 추적 초기화에 실패했습니다.');
            return null;
        } finally {
            isInitializingRef.current = false;
        }
    }, []);

    /**
     * @brief 카메라 시작
     */
    const startCamera = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            if (videoDevices.length === 0) {
                setError('카메라가 연결되어 있지 않습니다.');
                return false;
            }

            console.log('[FaceTracking] 카메라 장치:', videoDevices.length);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise<void>((resolve) => {
                    if (videoRef.current) {
                        videoRef.current.onloadedmetadata = () => resolve();
                    }
                });
                await videoRef.current.play();
                console.log('[FaceTracking] 카메라 시작 완료');
            }

            setError(null);
            return true;
        } catch (err: any) {
            console.error('[FaceTracking] 카메라 오류:', err);
            if (err.name === 'NotFoundError') {
                setError('카메라를 찾을 수 없습니다.');
            } else if (err.name === 'NotAllowedError') {
                setError('카메라 권한이 거부되었습니다.');
            } else if (err.name === 'NotReadableError') {
                setError('카메라가 다른 프로그램에서 사용 중입니다.');
            } else {
                setError(`카메라 오류: ${err.message}`);
            }
            return false;
        }
    }, []);

    /**
     * @brief 추적 시작
     */
    const startTracking = useCallback(async () => {
        if (isTracking) return;

        setError(null);
        console.log('[FaceTracking] 추적 시작...');

        const cameraOk = await startCamera();
        if (!cameraOk) return;

        const faceLandmarker = await initFaceLandmarker();
        if (!faceLandmarker) return;

        setIsTracking(true);

        let lastTime = performance.now();
        let lastParams: AvatarParams = DEFAULT_AVATAR_PARAMS;
        const TARGET_FPS = 15; // 15Hz로 낮춤 (배터리/성능)
        const FRAME_INTERVAL = 1000 / TARGET_FPS;
        const SMOOTHING = 0.3; // 보간 계수 (0.3 = 30% 새 값, 70% 이전 값)

        /**
         * @brief 파라미터 보간 (부드러운 전환)
         */
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        const detect = () => {
            const video = videoRef.current;
            const landmarker = faceLandmarkerRef.current;

            if (video && landmarker && video.readyState >= 2) {
                const now = performance.now();

                // 타겟 FPS로 제한
                if (now - lastTime >= FRAME_INTERVAL) {
                    try {
                        const results = landmarker.detectForVideo(video, now);

                        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                            const landmarks = results.faceLandmarks[0];

                            const rawParams: AvatarParams = {
                                headRotation: calculateHeadPose(landmarks),
                                eyeBlinkLeft: calculateEyeBlink(landmarks, true),
                                eyeBlinkRight: calculateEyeBlink(landmarks, false),
                                mouthOpen: calculateMouthOpen(landmarks),
                                smile: calculateSmile(landmarks),
                                timestamp: Date.now(),
                            };

                            // 보간 적용 (부드러운 움직임)
                            const smoothedParams: AvatarParams = {
                                headRotation: [
                                    lerp(lastParams.headRotation[0], rawParams.headRotation[0], SMOOTHING),
                                    lerp(lastParams.headRotation[1], rawParams.headRotation[1], SMOOTHING),
                                    lerp(lastParams.headRotation[2], rawParams.headRotation[2], SMOOTHING),
                                ],
                                eyeBlinkLeft: lerp(lastParams.eyeBlinkLeft, rawParams.eyeBlinkLeft, SMOOTHING),
                                eyeBlinkRight: lerp(lastParams.eyeBlinkRight, rawParams.eyeBlinkRight, SMOOTHING),
                                mouthOpen: lerp(lastParams.mouthOpen, rawParams.mouthOpen, SMOOTHING),
                                smile: lerp(lastParams.smile, rawParams.smile, SMOOTHING),
                                timestamp: rawParams.timestamp,
                            };

                            lastParams = smoothedParams;
                            setParams(smoothedParams);
                        }
                    } catch (e) {
                        // 프레임 처리 오류 무시
                    }
                    lastTime = now;
                }
            }

            animationFrameRef.current = requestAnimationFrame(detect);
        };

        detect();
    }, [isTracking, startCamera, initFaceLandmarker]);

    /**
     * @brief 추적 중지
     */
    const stopTracking = useCallback(() => {
        setIsTracking(false);

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (faceLandmarkerRef.current) {
            faceLandmarkerRef.current.close();
            faceLandmarkerRef.current = null;
        }

        setParams(DEFAULT_AVATAR_PARAMS);
    }, []);

    /**
     * @brief 비디오 요소 설정
     */
    const setVideoElement = useCallback((video: HTMLVideoElement | null) => {
        videoRef.current = video;
    }, []);

    const setCanvasElement = useCallback(() => { }, []);

    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    return {
        isTracking,
        params,
        error,
        startTracking,
        stopTracking,
        setVideoElement,
        setCanvasElement,
        videoRef,
    };
}

export default useFaceTracking;
