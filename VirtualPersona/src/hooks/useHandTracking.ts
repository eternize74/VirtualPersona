/**
 * @file useHandTracking.ts
 * @brief 손 추적 커스텀 훅 (MediaPipe GestureRecognizer API)
 * @description MediaPipe GestureRecognizer를 사용하여 손 랜드마크와 제스처를 
 *              정확하게 인식합니다.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { HandLandmark, HandParams, HandGesture } from '@/types/avatarV2';

/**
 * @brief 손 랜드마크 인덱스 (21개)
 */
export const HAND_LANDMARKS = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
    RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

/**
 * @brief 손가락 연결 정보 (시각화용)
 */
export const HAND_CONNECTIONS = [
    // 손목에서 각 손가락 MCP로
    [0, 1], [0, 5], [0, 9], [0, 13], [0, 17],
    // 엄지
    [1, 2], [2, 3], [3, 4],
    // 검지
    [5, 6], [6, 7], [7, 8],
    // 중지
    [9, 10], [10, 11], [11, 12],
    // 약지
    [13, 14], [14, 15], [15, 16],
    // 소지
    [17, 18], [18, 19], [19, 20],
    // MCP 연결
    [5, 9], [9, 13], [13, 17],
];

/**
 * @brief MediaPipe 제스처를 우리 타입으로 매핑
 */
const GESTURE_MAP: Record<string, HandGesture> = {
    'Closed_Fist': 'fist',
    'Open_Palm': 'open',
    'Pointing_Up': 'point',
    'Thumb_Up': 'thumbsUp',
    'Thumb_Down': 'thumbsDown',
    'Victory': 'peace',
    'ILoveYou': 'love',
};

/**
 * @brief 손 추적 훅 Props
 */
interface UseHandTrackingProps {
    /** @brief 비디오 요소 (카메라 공유) */
    videoElement: HTMLVideoElement | null;
    /** @brief 활성화 여부 */
    enabled?: boolean;
}

/**
 * @brief 손 추적 훅 반환 타입
 */
interface UseHandTrackingReturn {
    /** @brief 추적 중 여부 */
    isTracking: boolean;
    /** @brief 손 파라미터 */
    handParams: HandParams;
    /** @brief 에러 메시지 */
    error: string | null;
    /** @brief 추적 시작 */
    startTracking: () => Promise<void>;
    /** @brief 추적 중지 */
    stopTracking: () => void;
}

/**
 * @brief 기본 손 파라미터
 */
const DEFAULT_HAND_PARAMS: HandParams = {
    leftHand: null,
    rightHand: null,
    gesture: null,
};

/**
 * @brief 손 추적 훅 (MediaPipe GestureRecognizer 사용)
 * @param props - 비디오 요소 및 활성화 여부
 * @returns 손 추적 상태 및 제어 함수
 */
export function useHandTracking({
    videoElement,
    enabled = true
}: UseHandTrackingProps): UseHandTrackingReturn {
    const [isTracking, setIsTracking] = useState(false);
    const [handParams, setHandParams] = useState<HandParams>(DEFAULT_HAND_PARAMS);
    const [error, setError] = useState<string | null>(null);

    const gestureRecognizerRef = useRef<any>(null);
    const animationFrameRef = useRef<number>(0);
    const isInitializingRef = useRef(false);

    /**
     * @brief GestureRecognizer 초기화
     */
    const initGestureRecognizer = useCallback(async () => {
        if (isInitializingRef.current || gestureRecognizerRef.current) return true;
        isInitializingRef.current = true;

        try {
            const vision = await import('@mediapipe/tasks-vision');
            const { GestureRecognizer, FilesetResolver } = vision;

            console.log('[HandTracking] FilesetResolver 로딩 중...');
            const filesetResolver = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
            );

            console.log('[HandTracking] GestureRecognizer 생성 중...');
            const gestureRecognizer = await GestureRecognizer.createFromOptions(
                filesetResolver,
                {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                    numHands: 2,
                }
            );

            console.log('[HandTracking] GestureRecognizer 초기화 완료');
            gestureRecognizerRef.current = gestureRecognizer;
            return true;
        } catch (err) {
            console.error('[HandTracking] 초기화 실패:', err);
            setError('손 추적 초기화에 실패했습니다.');
            return false;
        } finally {
            isInitializingRef.current = false;
        }
    }, []);

    /**
     * @brief 추적 시작
     */
    const startTracking = useCallback(async () => {
        if (isTracking || !videoElement) return;

        setError(null);
        console.log('[HandTracking] 추적 시작...');

        const initialized = await initGestureRecognizer();
        if (!initialized) return;

        setIsTracking(true);

        let lastTime = performance.now();

        const detect = () => {
            const recognizer = gestureRecognizerRef.current;

            if (videoElement && recognizer && videoElement.readyState >= 2) {
                const now = performance.now();

                // 15Hz로 제한 (손 추적은 CPU 부하가 높음)
                if (now - lastTime >= 66) {
                    try {
                        const results = recognizer.recognizeForVideo(videoElement, now);

                        let leftHand: HandLandmark[] | null = null;
                        let rightHand: HandLandmark[] | null = null;
                        let gesture: HandGesture = null;

                        if (results.landmarks && results.landmarks.length > 0) {
                            // 첫 번째 손
                            const hand1 = results.landmarks[0].map((lm: any) => ({
                                x: lm.x,
                                y: lm.y,
                                z: lm.z,
                            }));

                            // handedness로 왼손/오른손 구분
                            const handedness1 = results.handednesses?.[0]?.[0]?.categoryName;

                            if (handedness1 === 'Left') {
                                // 카메라 미러링으로 인해 반대
                                rightHand = hand1;
                            } else {
                                leftHand = hand1;
                            }

                            // MediaPipe 제스처 인식 결과 사용
                            const gestureName = results.gestures?.[0]?.[0]?.categoryName;
                            if (gestureName && gestureName !== 'None') {
                                gesture = GESTURE_MAP[gestureName] || null;
                                console.log('[HandTracking] 감지된 제스처:', gestureName, '->', gesture);
                            }

                            // 두 번째 손
                            if (results.landmarks.length > 1) {
                                const hand2 = results.landmarks[1].map((lm: any) => ({
                                    x: lm.x,
                                    y: lm.y,
                                    z: lm.z,
                                }));

                                const handedness2 = results.handednesses?.[1]?.[0]?.categoryName;

                                if (handedness2 === 'Left') {
                                    rightHand = hand2;
                                } else {
                                    leftHand = hand2;
                                }
                            }
                        }

                        setHandParams({ leftHand, rightHand, gesture });
                    } catch (e) {
                        // 프레임 처리 오류 무시
                    }
                    lastTime = now;
                }
            }

            animationFrameRef.current = requestAnimationFrame(detect);
        };

        detect();
    }, [isTracking, videoElement, initGestureRecognizer]);

    /**
     * @brief 추적 중지
     */
    const stopTracking = useCallback(() => {
        setIsTracking(false);

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = 0;
        }

        setHandParams(DEFAULT_HAND_PARAMS);
    }, []);

    /**
     * @brief enabled 상태에 따라 자동 시작/중지
     */
    useEffect(() => {
        if (enabled && videoElement && !isTracking) {
            startTracking();
        } else if (!enabled && isTracking) {
            stopTracking();
        }
    }, [enabled, videoElement, isTracking, startTracking, stopTracking]);

    /**
     * @brief 컴포넌트 언마운트 시 정리
     */
    useEffect(() => {
        return () => {
            stopTracking();
            if (gestureRecognizerRef.current) {
                gestureRecognizerRef.current.close();
                gestureRecognizerRef.current = null;
            }
        };
    }, [stopTracking]);

    return {
        isTracking,
        handParams,
        error,
        startTracking,
        stopTracking,
    };
}

export default useHandTracking;
