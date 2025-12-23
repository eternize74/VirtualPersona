/**
 * @file useWebRTC.ts
 * @brief WebRTC 연결 및 DataChannel 관리 훅
 * @description P2P 연결을 통해 아바타 파라미터를 송수신합니다.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AvatarParams, ConnectionState, DEFAULT_AVATAR_PARAMS } from '@/types/avatar';

/**
 * @brief WebRTC 설정
 */
const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

/**
 * @brief DataChannel 설정 (낮은 지연 우선)
 */
const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
    ordered: false,      // 순서 보장 안함 (낮은 지연)
    maxRetransmits: 0,   // 재전송 안함
};

/**
 * @brief 시그널링 메시지 타입
 */
interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'peer-joined' | 'peer-left';
    roomId: string;
    peerId?: string;
    avatarId?: string;
    payload?: any;
}

/**
 * @brief useWebRTC 훅 파라미터
 */
interface UseWebRTCParams {
    /** @brief 룸 ID */
    roomId: string;

    /** @brief 내 아바타 ID */
    myAvatarId: string;

    /** @brief 시그널링 서버 URL */
    signalingUrl: string;
}

/**
 * @brief WebRTC P2P 연결 훅
 * @param params - 연결 파라미터
 * @returns WebRTC 상태 및 제어 함수
 */
export function useWebRTC({ roomId, myAvatarId, signalingUrl }: UseWebRTCParams) {
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [peerAvatarId, setPeerAvatarId] = useState<string>('avatar1');
    const [peerParams, setPeerParams] = useState<AvatarParams>(DEFAULT_AVATAR_PARAMS);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const myPeerIdRef = useRef<string>(`peer-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const isInitiatorRef = useRef<boolean>(false);

    /**
     * @brief DataChannel 이벤트 설정
     */
    const setupDataChannel = useCallback((channel: RTCDataChannel) => {
        channel.onopen = () => {
            console.log('[WebRTC] DataChannel opened');
            setConnectionState('connected');
        };

        channel.onclose = () => {
            console.log('[WebRTC] DataChannel closed');
            setConnectionState('disconnected');
        };

        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'params') {
                    setPeerParams(data.params);
                } else if (data.type === 'avatar') {
                    setPeerAvatarId(data.avatarId);
                }
            } catch (err) {
                console.error('[WebRTC] Message parse error:', err);
            }
        };

        channel.onerror = (event) => {
            console.error('[WebRTC] DataChannel error:', event);
        };

        dataChannelRef.current = channel;
    }, []);

    /**
     * @brief PeerConnection 생성 및 설정
     */
    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection(RTC_CONFIG);

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);

            switch (pc.iceConnectionState) {
                case 'connected':
                case 'completed':
                    setConnectionState('connected');
                    break;
                case 'failed':
                    setConnectionState('failed');
                    setError('P2P 연결에 실패했습니다.');
                    break;
                case 'disconnected':
                    setConnectionState('disconnected');
                    break;
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
                const msg: SignalingMessage = {
                    type: 'ice-candidate',
                    roomId,
                    peerId: myPeerIdRef.current,
                    payload: event.candidate.toJSON(),
                };
                wsRef.current.send(JSON.stringify(msg));
            }
        };

        pc.ondatachannel = (event) => {
            console.log('[WebRTC] Received DataChannel');
            setupDataChannel(event.channel);
        };

        pcRef.current = pc;
        return pc;
    }, [roomId, setupDataChannel]);

    /**
     * @brief Offer 생성 및 전송 (Initiator)
     */
    const createOffer = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc) return;

        try {
            // DataChannel 생성 (initiator만)
            const channel = pc.createDataChannel('avatar-params', DATA_CHANNEL_CONFIG);
            setupDataChannel(channel);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const msg: SignalingMessage = {
                    type: 'offer',
                    roomId,
                    peerId: myPeerIdRef.current,
                    avatarId: myAvatarId,
                    payload: offer,
                };
                wsRef.current.send(JSON.stringify(msg));
            }
        } catch (err) {
            console.error('[WebRTC] Offer creation failed:', err);
            setError('연결 요청 생성에 실패했습니다.');
        }
    }, [roomId, myAvatarId, setupDataChannel]);

    /**
     * @brief Answer 생성 및 전송
     */
    const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit) => {
        const pc = pcRef.current;
        if (!pc) return;

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const msg: SignalingMessage = {
                    type: 'answer',
                    roomId,
                    peerId: myPeerIdRef.current,
                    avatarId: myAvatarId,
                    payload: answer,
                };
                wsRef.current.send(JSON.stringify(msg));
            }
        } catch (err) {
            console.error('[WebRTC] Answer creation failed:', err);
            setError('연결 응답 생성에 실패했습니다.');
        }
    }, [roomId, myAvatarId]);

    /**
     * @brief 시그널링 메시지 처리
     */
    const handleSignalingMessage = useCallback(async (msg: SignalingMessage) => {
        switch (msg.type) {
            case 'peer-joined':
                console.log('[Signaling] Peer joined:', msg.peerId);
                if (msg.avatarId) {
                    setPeerAvatarId(msg.avatarId);
                }
                // 먼저 들어온 사람이 initiator
                if (!isInitiatorRef.current) {
                    isInitiatorRef.current = true;
                    setConnectionState('connecting');
                    createPeerConnection();
                    await createOffer();
                }
                break;

            case 'offer':
                console.log('[Signaling] Received offer');
                if (msg.avatarId) {
                    setPeerAvatarId(msg.avatarId);
                }
                setConnectionState('connecting');
                createPeerConnection();
                await createAnswer(msg.payload);
                break;

            case 'answer':
                console.log('[Signaling] Received answer');
                if (pcRef.current && msg.payload) {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.payload));
                }
                break;

            case 'ice-candidate':
                if (pcRef.current && msg.payload) {
                    try {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.payload));
                    } catch (err) {
                        console.error('[WebRTC] ICE candidate error:', err);
                    }
                }
                break;

            case 'peer-left':
                console.log('[Signaling] Peer left');
                setConnectionState('disconnected');
                setPeerParams(DEFAULT_AVATAR_PARAMS);
                break;
        }
    }, [createPeerConnection, createOffer, createAnswer]);

    /**
     * @brief 시그널링 서버 연결
     */
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setError(null);
        setConnectionState('connecting');

        const ws = new WebSocket(signalingUrl);

        ws.onopen = () => {
            console.log('[Signaling] Connected to server');

            // 룸 입장
            const joinMsg: SignalingMessage = {
                type: 'join',
                roomId,
                peerId: myPeerIdRef.current,
                avatarId: myAvatarId,
            };
            ws.send(JSON.stringify(joinMsg));
        };

        ws.onmessage = (event) => {
            try {
                const msg: SignalingMessage = JSON.parse(event.data);
                handleSignalingMessage(msg);
            } catch (err) {
                console.error('[Signaling] Parse error:', err);
            }
        };

        ws.onerror = () => {
            console.error('[Signaling] WebSocket error');
            setError('시그널링 서버 연결에 실패했습니다.');
            setConnectionState('failed');
        };

        ws.onclose = () => {
            console.log('[Signaling] Connection closed');
            setConnectionState('disconnected');
        };

        wsRef.current = ws;
    }, [signalingUrl, roomId, myAvatarId, handleSignalingMessage]);

    /**
     * @brief 연결 해제
     */
    const disconnect = useCallback(() => {
        if (dataChannelRef.current) {
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setConnectionState('disconnected');
        setPeerParams(DEFAULT_AVATAR_PARAMS);
        isInitiatorRef.current = false;
    }, []);

    /**
     * @brief 아바타 파라미터 전송
     */
    const sendParams = useCallback((params: AvatarParams) => {
        if (dataChannelRef.current?.readyState === 'open') {
            const data = JSON.stringify({ type: 'params', params });
            dataChannelRef.current.send(data);
        }
    }, []);

    /**
     * @brief 아바타 ID 전송
     */
    const sendAvatarId = useCallback((avatarId: string) => {
        if (dataChannelRef.current?.readyState === 'open') {
            const data = JSON.stringify({ type: 'avatar', avatarId });
            dataChannelRef.current.send(data);
        }
    }, []);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        connectionState,
        peerAvatarId,
        peerParams,
        error,
        connect,
        disconnect,
        sendParams,
        sendAvatarId,
    };
}

export default useWebRTC;
