/**
 * @file avatar.ts
 * @brief 아바타 관련 타입 정의
 * @description 아바타 파라미터 및 관련 인터페이스를 정의합니다.
 */

/**
 * @brief 아바타 표정/포즈 파라미터
 * @description 얼굴 추적으로부터 추출된 파라미터를 담는 인터페이스
 */
export interface AvatarParams {
    /** @brief 고개 회전 [pitch, yaw, roll] (라디안) */
    headRotation: [number, number, number];

    /** @brief 왼쪽 눈 깜빡임 (0: 열림, 1: 닫힘) */
    eyeBlinkLeft: number;

    /** @brief 오른쪽 눈 깜빡임 (0: 열림, 1: 닫힘) */
    eyeBlinkRight: number;

    /** @brief 입 벌림 정도 (0: 닫힘, 1: 완전히 열림) */
    mouthOpen: number;

    /** @brief 미소 정도 (0: 무표정, 1: 최대 미소) */
    smile: number;

    /** @brief 타임스탬프 (ms) */
    timestamp: number;

    /** @brief 손 제스처 (Phase 2, 선택적) */
    gesture?: string | null;
}

/**
 * @brief 아바타 정보
 */
export interface AvatarInfo {
    /** @brief 아바타 고유 ID */
    id: string;

    /** @brief 아바타 이름 */
    name: string;

    /** @brief 미리보기 이미지 URL */
    previewUrl: string;

    /** @brief 아바타 레이어 이미지 URLs */
    layers: {
        base: string;
        eyes: string;
        mouth: string;
    };
}

/**
 * @brief WebRTC 연결 상태
 */
export type ConnectionState =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'failed';

/**
 * @brief 피어 정보
 */
export interface PeerInfo {
    /** @brief 피어 ID */
    peerId: string;

    /** @brief 선택한 아바타 ID */
    avatarId: string;

    /** @brief 현재 아바타 파라미터 */
    params: AvatarParams | null;
}

/**
 * @brief 시그널링 메시지 타입
 */
export type SignalingMessageType =
    | 'join'
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'peer-joined'
    | 'peer-left';

/**
 * @brief 시그널링 메시지
 */
export interface SignalingMessage {
    type: SignalingMessageType;
    roomId: string;
    peerId?: string;
    avatarId?: string;
    payload?: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

/**
 * @brief 기본 아바타 파라미터
 */
export const DEFAULT_AVATAR_PARAMS: AvatarParams = {
    headRotation: [0, 0, 0],
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    mouthOpen: 0,
    smile: 0,
    timestamp: 0,
};

/**
 * @brief 사전 정의된 아바타 목록
 */
export const PRESET_AVATARS: AvatarInfo[] = [
    {
        id: 'avatar1',
        name: '블루베리',
        previewUrl: '/avatars/avatar1/preview.svg',
        layers: {
            base: '/avatars/avatar1/base.svg',
            eyes: '/avatars/avatar1/eyes.svg',
            mouth: '/avatars/avatar1/mouth.svg',
        },
    },
    {
        id: 'avatar2',
        name: '피치',
        previewUrl: '/avatars/avatar2/preview.svg',
        layers: {
            base: '/avatars/avatar2/base.svg',
            eyes: '/avatars/avatar2/eyes.svg',
            mouth: '/avatars/avatar2/mouth.svg',
        },
    },
    {
        id: 'avatar3',
        name: '민트',
        previewUrl: '/avatars/avatar3/preview.svg',
        layers: {
            base: '/avatars/avatar3/base.svg',
            eyes: '/avatars/avatar3/eyes.svg',
            mouth: '/avatars/avatar3/mouth.svg',
        },
    },
    {
        id: 'avatar4',
        name: '레몬',
        previewUrl: '/avatars/avatar4/preview.svg',
        layers: {
            base: '/avatars/avatar4/base.svg',
            eyes: '/avatars/avatar4/eyes.svg',
            mouth: '/avatars/avatar4/mouth.svg',
        },
    },
];
