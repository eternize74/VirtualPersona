/**
 * @file useFaceTracking.ts
 * @brief 얼굴 추적 커스텀 훅
 * @description MediaPipe FaceMesh를 사용하여 얼굴 랜드마크를 추적하고
 *              아바타 파라미터로 변환합니다.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AvatarParams, DEFAULT_AVATAR_PARAMS } from '@/types/avatar';

/**
 * @brief FaceMesh 랜드마크 인덱스 (478개 중 주요 포인트)
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

    // 얼굴 윤곽 (Head Pose용)
    NOSE_TIP: 1,
    CHIN: 152,
    LEFT_EAR: 234,
    RIGHT_EAR: 454,
    LEFT_EYE_OUTER_CORNER: 33,
    RIGHT_EYE_OUTER_CORNER: 263,
};

/**
 * @brief 두 점 사이의 유클리드 거리 계산
 * @param p1 - 첫 번째 점
 * @param p2 - 두 번째 점
 * @returns 거리
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * @brief 눈 깜빡임 비율 계산 (EAR: Eye Aspect Ratio)
 * @param landmarks - 얼굴 랜드마크 배열
 * @param isLeft - 왼쪽 눈 여부
 * @returns 깜빡임 정도 (0: 열림, 1: 닫힘)
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

    // EAR (Eye Aspect Ratio)
    const ear = verticalDist / (horizontalDist + 0.001);

    // 정규화: 일반적으로 열린 눈은 EAR ~0.25-0.3, 닫힌 눈은 ~0.05-0.1
    const blink = Math.max(0, Math.min(1, 1 - (ear - 0.05) / 0.25));
    return blink;
}

/**
 * @brief 입 벌림 정도 계산
 * @param landmarks - 얼굴 랜드마크 배열
 * @returns 입 벌림 정도 (0~1)
 */
function calculateMouthOpen(landmarks: any[]): number {
    const top = landmarks[LANDMARKS.MOUTH_TOP];
    const bottom = landmarks[LANDMARKS.MOUTH_BOTTOM];
    const left = landmarks[LANDMARKS.MOUTH_LEFT];
    const right = landmarks[LANDMARKS.MOUTH_RIGHT];

    if (!top || !bottom || !left || !right) return 0;

    const verticalDist = distance(top, bottom);
    const horizontalDist = distance(left, right);

    // 정규화
    const ratio = verticalDist / (horizontalDist + 0.001);
    return Math.max(0, Math.min(1, ratio * 2));
}

/**
 * @brief 미소 정도 계산
 * @param landmarks - 얼굴 랜드마크 배열
 * @returns 미소 정도 (0~1)
 */
function calculateSmile(landmarks: any[]): number {
    const left = landmarks[LANDMARKS.MOUTH_LEFT];
    const right = landmarks[LANDMARKS.MOUTH_RIGHT];
    const top = landmarks[LANDMARKS.MOUTH_TOP];

    if (!left || !right || !top) return 0;

    // 입꼬리가 위로 올라가면 미소
    const avgCornerY = (left.y + right.y) / 2;
    const smileRatio = (top.y - avgCornerY) * 10; // 스케일 조정

    return Math.max(0, Math.min(1, smileRatio + 0.3));
}

/**
 * @brief Head Pose 추정 (간단한 2D 기반)
 * @param landmarks - 얼굴 랜드마크 배열
 * @returns [pitch, yaw, roll] 라디안
 */
function calculateHeadPose(landmarks: any[]): [number, number, number] {
    const nose = landmarks[LANDMARKS.NOSE_TIP];
    const chin = landmarks[LANDMARKS.CHIN];
    const leftEar = landmarks[LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[LANDMARKS.RIGHT_EAR];

    if (!nose || !chin || !leftEar || !rightEar) {
        return [0, 0, 0];
    }

    // Yaw: 좌우 회전 (코와 귀의 상대적 위치)
    const faceWidth = distance(leftEar, rightEar);
    const noseToCenter = (nose.x - (leftEar.x + rightEar.x) / 2) / (faceWidth + 0.001);
    const yaw = noseToCenter * Math.PI / 4; // ±45도 범위

    // Pitch: 상하 회전 (코와 턱의 상대적 위치)
    const faceHeight = distance(nose, chin);
    const noseToChinRatio = (chin.y - nose.y) / (faceHeight + 0.001);
    const pitch = (noseToChinRatio - 0.5) * Math.PI / 6; // ±30도 범위

    // Roll: 기울기 (양쪽 귀의 y 좌표 차이)
    const roll = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x);

    return [pitch, yaw, roll];
}

/**
 * @brief 얼굴 추적 훅
 * @returns 얼굴 추적 상태 및 제어 함수
 */
export function useFaceTracking() {
    const [isTracking, setIsTracking] = useState(false);
    const [params, setParams] = useState<AvatarParams>(DEFAULT_AVATAR_PARAMS);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const faceMeshRef = useRef<any>(null);
    const animationFrameRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);

    /**
     * @brief MediaPipe FaceMesh 초기화
     */
    const initFaceMesh = useCallback(async () => {
        try {
            // @mediapipe/face_mesh 동적 임포트
            const FaceMesh = (await import('@mediapipe/face_mesh')).FaceMesh;

            const faceMesh = new FaceMesh({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
                },
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            faceMesh.onResults((results: any) => {
                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    const landmarks = results.multiFaceLandmarks[0];

                    const newParams: AvatarParams = {
                        headRotation: calculateHeadPose(landmarks),
                        eyeBlinkLeft: calculateEyeBlink(landmarks, true),
                        eyeBlinkRight: calculateEyeBlink(landmarks, false),
                        mouthOpen: calculateMouthOpen(landmarks),
                        smile: calculateSmile(landmarks),
                        timestamp: Date.now(),
                    };

                    setParams(newParams);
                }
            });

            faceMeshRef.current = faceMesh;
            return faceMesh;
        } catch (err) {
            console.error('FaceMesh 초기화 실패:', err);
            setError('얼굴 추적 초기화에 실패했습니다.');
            return null;
        }
    }, []);

    /**
     * @brief 카메라 스트림 시작
     */
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            return true;
        } catch (err) {
            console.error('카메라 접근 실패:', err);
            setError('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
            return false;
        }
    }, []);

    /**
     * @brief 추적 루프 시작
     */
    const startTracking = useCallback(async () => {
        if (isTracking) return;

        setError(null);

        // 카메라 시작
        const cameraOk = await startCamera();
        if (!cameraOk) return;

        // FaceMesh 초기화
        const faceMesh = await initFaceMesh();
        if (!faceMesh) return;

        setIsTracking(true);

        // 추적 루프
        const track = async () => {
            if (videoRef.current && faceMeshRef.current && videoRef.current.readyState >= 2) {
                await faceMeshRef.current.send({ image: videoRef.current });
            }
            animationFrameRef.current = requestAnimationFrame(track);
        };

        // 30Hz로 추적 (33ms 간격)
        const trackLoop = () => {
            track();
        };

        trackLoop();
    }, [isTracking, startCamera, initFaceMesh]);

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

        if (faceMeshRef.current) {
            faceMeshRef.current.close();
            faceMeshRef.current = null;
        }

        setParams(DEFAULT_AVATAR_PARAMS);
    }, []);

    /**
     * @brief 비디오/캔버스 ref 설정
     */
    const setVideoElement = useCallback((video: HTMLVideoElement | null) => {
        videoRef.current = video;
    }, []);

    const setCanvasElement = useCallback((canvas: HTMLCanvasElement | null) => {
        canvasRef.current = canvas;
    }, []);

    // 컴포넌트 언마운트 시 정리
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
