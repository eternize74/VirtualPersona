/**
 * @file avatarV2.ts
 * @brief Phase 2 아바타 확장 타입 정의
 * @description Phase 1 타입을 확장하여 커스터마이징, 감정 프리셋, 손 추적 등을 지원합니다.
 */

import { AvatarParams, AvatarInfo } from './avatar';

/**
 * @brief 손 랜드마크 포인트
 * @description MediaPipe Hands에서 추출된 21개 랜드마크
 */
export interface HandLandmark {
    /** @brief X 좌표 (0-1 정규화) */
    x: number;
    /** @brief Y 좌표 (0-1 정규화) */
    y: number;
    /** @brief Z 좌표 (깊이, 정규화) */
    z: number;
}

/**
 * @brief 손 추적 파라미터
 */
export interface HandParams {
    /** @brief 왼손 랜드마크 (21개 포인트) */
    leftHand: HandLandmark[] | null;
    /** @brief 오른손 랜드마크 (21개 포인트) */
    rightHand: HandLandmark[] | null;
    /** @brief 감지된 제스처 */
    gesture: HandGesture | null;
}

/**
 * @brief 손 제스처 타입
 */
export type HandGesture =
    | 'wave'       // 손흔들기
    | 'thumbsUp'   // 엄지척
    | 'thumbsDown' // 엄지 아래
    | 'peace'      // 평화 (V)
    | 'fist'       // 주먹
    | 'open'       // 손 펼침
    | 'point'      // 가리키기
    | null;

/**
 * @brief Phase 2 확장 아바타 파라미터
 * @description Phase 1 파라미터에 손/감정 등 추가
 */
export interface AvatarParamsV2 extends AvatarParams {
    /** @brief 손 추적 파라미터 */
    hands?: HandParams;

    /** @brief 활성화된 감정 프리셋 */
    emotionPreset?: EmotionType | null;

    /** @brief 감정 프리셋 강도 (0-1) */
    emotionIntensity?: number;
}

/**
 * @brief 감정 타입
 */
export type EmotionType =
    | 'happy'     // 기쁨
    | 'sad'       // 슬픔
    | 'surprised' // 놀람
    | 'angry'     // 화남
    | 'wink'      // 윙크
    | 'love';     // 사랑

/**
 * @brief 감정 프리셋 정의
 */
export interface EmotionPreset {
    /** @brief 감정 타입 */
    type: EmotionType;
    /** @brief 표시 이름 */
    name: string;
    /** @brief 아이콘 (이모지) */
    icon: string;
    /** @brief 키보드 단축키 */
    shortcut: string;
    /** @brief 오버라이드할 아바타 파라미터 */
    params: Partial<AvatarParams>;
}

/**
 * @brief 사전 정의된 감정 프리셋 목록
 */
export const EMOTION_PRESETS: EmotionPreset[] = [
    {
        type: 'happy',
        name: '기쁨',
        icon: '😊',
        shortcut: '1',
        params: {
            smile: 1.0,
            eyeBlinkLeft: 0.3,
            eyeBlinkRight: 0.3,
            mouthOpen: 0.3,
        },
    },
    {
        type: 'sad',
        name: '슬픔',
        icon: '😢',
        shortcut: '2',
        params: {
            smile: 0,
            eyeBlinkLeft: 0.5,
            eyeBlinkRight: 0.5,
            mouthOpen: 0.1,
            headRotation: [-0.1, 0, 0],
        },
    },
    {
        type: 'surprised',
        name: '놀람',
        icon: '😲',
        shortcut: '3',
        params: {
            smile: 0,
            eyeBlinkLeft: 0,
            eyeBlinkRight: 0,
            mouthOpen: 0.8,
        },
    },
    {
        type: 'angry',
        name: '화남',
        icon: '😠',
        shortcut: '4',
        params: {
            smile: 0,
            eyeBlinkLeft: 0.4,
            eyeBlinkRight: 0.4,
            mouthOpen: 0.2,
            headRotation: [0.1, 0, 0],
        },
    },
    {
        type: 'wink',
        name: '윙크',
        icon: '😉',
        shortcut: '5',
        params: {
            smile: 0.7,
            eyeBlinkLeft: 1.0,
            eyeBlinkRight: 0,
            mouthOpen: 0.1,
        },
    },
    {
        type: 'love',
        name: '사랑',
        icon: '😍',
        shortcut: '6',
        params: {
            smile: 0.9,
            eyeBlinkLeft: 0.2,
            eyeBlinkRight: 0.2,
            mouthOpen: 0.2,
        },
    },
];

/**
 * @brief 아바타 커스터마이징 옵션
 */
export interface AvatarCustomization {
    /** @brief 주요 색상 (헤어/악세서리) */
    primaryColor: string;
    /** @brief 보조 색상 */
    secondaryColor: string;
    /** @brief 피부색 */
    skinColor: string;
    /** @brief 눈 스타일 */
    eyeStyle: EyeStyle;
    /** @brief 입 스타일 */
    mouthStyle: MouthStyle;
}

/**
 * @brief 눈 스타일 옵션
 */
export type EyeStyle = 'round' | 'almond' | 'cat' | 'star';

/**
 * @brief 입 스타일 옵션
 */
export type MouthStyle = 'normal' | 'cat' | 'smile' | 'dot';

/**
 * @brief 기본 커스터마이징 설정
 */
export const DEFAULT_CUSTOMIZATION: AvatarCustomization = {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    skinColor: '#FFE4C4',
    eyeStyle: 'round',
    mouthStyle: 'normal',
};

/**
 * @brief 피부색 프리셋
 */
export const SKIN_COLOR_PRESETS: string[] = [
    '#FFE4C4', // 밝은 피부
    '#FFDAB9', // 복숭아
    '#DEB887', // 밀색
    '#D2B48C', // 탄색
    '#C19A6B', // 중간색
    '#8B7355', // 어두운 피부
];

/**
 * @brief 주요 색상 프리셋
 */
export const PRIMARY_COLOR_PRESETS: string[] = [
    '#6366f1', // 인디고
    '#ec4899', // 핑크
    '#10b981', // 에메랄드
    '#f59e0b', // 앰버
    '#ef4444', // 레드
    '#3b82f6', // 블루
    '#8b5cf6', // 바이올렛
    '#14b8a6', // 틸
];

/**
 * @brief Phase 2 확장 아바타 정보
 */
export interface AvatarInfoV2 extends AvatarInfo {
    /** @brief 커스터마이징 옵션 */
    customization?: AvatarCustomization;
    /** @brief 손 레이어 이미지 */
    handLayers?: {
        left: string;
        right: string;
    };
}

/**
 * @brief 기본 Phase 2 아바타 파라미터
 */
export const DEFAULT_AVATAR_PARAMS_V2: AvatarParamsV2 = {
    headRotation: [0, 0, 0],
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    mouthOpen: 0,
    smile: 0,
    timestamp: 0,
    hands: {
        leftHand: null,
        rightHand: null,
        gesture: null,
    },
    emotionPreset: null,
    emotionIntensity: 0,
};
