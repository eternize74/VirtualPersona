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
 * @brief DataChannel 설정
 */
const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
    ordered: false,
    maxRetransmits: 0,
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
    roomId: string;
    myAvatarId: string;
    signalingUrl: string;
}

/**
 * @brief WebRTC P2P 연결 훅
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
    const makingOfferRef = useRef(false);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

    /**
     * @brief DataChannel 이벤트 설정
     */
    const setupDataChannel = useCallback((channel: RTCDataChannel) => {
        channel.onopen = () => {
            console.log('[WebRTC] DataChannel opened');
            setConnectionState('connected');
            setError(null);
        };

        channel.onclose = () => {
            console.log('[WebRTC] DataChannel closed');
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
     * @brief ICE 큐 처리
     */
    const processIceQueue = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc || !pc.remoteDescription) return;

        while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('[WebRTC] Failed to add ICE candidate:', e);
                }
            }
        }
    }, []);

    /**
     * @brief PeerConnection 생성
     */
    const createPeerConnection = useCallback(() => {
        // 기존 연결 정리
        if (pcRef.current) {
            pcRef.current.close();
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        console.log('[WebRTC] PeerConnection created');

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed') {
                setConnectionState('failed');
                setError('P2P 연결에 실패했습니다.');
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
     * @brief Offer 전송 (polite peer 패턴)
     */
    const sendOffer = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc) return;

        makingOfferRef.current = true;

        try {
            // DataChannel 생성
            if (!dataChannelRef.current) {
                const channel = pc.createDataChannel('avatar-params', DATA_CHANNEL_CONFIG);
                setupDataChannel(channel);
            }

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const msg: SignalingMessage = {
                    type: 'offer',
                    roomId,
                    peerId: myPeerIdRef.current,
                    avatarId: myAvatarId,
                    payload: pc.localDescription,
                };
                wsRef.current.send(JSON.stringify(msg));
                console.log('[WebRTC] Offer sent');
            }
        } catch (err) {
            console.error('[WebRTC] Offer failed:', err);
        } finally {
            makingOfferRef.current = false;
        }
    }, [roomId, myAvatarId, setupDataChannel]);

    /**
     * @brief 시그널링 메시지 처리
     */
    const handleSignalingMessage = useCallback(async (msg: SignalingMessage) => {
        const pc = pcRef.current;

        switch (msg.type) {
            case 'peer-joined':
                console.log('[Signaling] Peer joined:', msg.peerId);
                if (msg.avatarId) {
                    setPeerAvatarId(msg.avatarId);
                }

                // PeerConnection이 없으면 생성
                if (!pcRef.current) {
                    createPeerConnection();
                }

                setConnectionState('connecting');

                // Peer ID가 더 큰 쪽만 offer 전송 (충돌 방지)
                // 이렇게 하면 둘 중 한 명만 offer를 보냄
                if (myPeerIdRef.current > (msg.peerId || '')) {
                    console.log('[WebRTC] I am the offerer (higher peer ID)');
                    await sendOffer();
                } else {
                    console.log('[WebRTC] Waiting for offer (lower peer ID)');
                }
                break;

            case 'offer':
                console.log('[Signaling] Received offer');
                if (msg.avatarId) {
                    setPeerAvatarId(msg.avatarId);
                }
                setConnectionState('connecting');

                // Glare 처리: 동시에 offer를 보낸 경우
                const offerCollision = makingOfferRef.current ||
                    (pcRef.current?.signalingState !== 'stable' && pcRef.current?.signalingState !== undefined);

                if (offerCollision) {
                    console.log('[WebRTC] Offer collision detected, I am polite - rolling back');
                    // Polite peer: rollback and accept
                    if (pcRef.current) {
                        await pcRef.current.setLocalDescription({ type: 'rollback' });
                    }
                }

                // PC가 없으면 생성
                if (!pcRef.current) {
                    createPeerConnection();
                }

                try {
                    await pcRef.current!.setRemoteDescription(new RTCSessionDescription(msg.payload));
                    await processIceQueue();

                    const answer = await pcRef.current!.createAnswer();
                    await pcRef.current!.setLocalDescription(answer);

                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        const answerMsg: SignalingMessage = {
                            type: 'answer',
                            roomId,
                            peerId: myPeerIdRef.current,
                            avatarId: myAvatarId,
                            payload: pcRef.current!.localDescription,
                        };
                        wsRef.current.send(JSON.stringify(answerMsg));
                        console.log('[WebRTC] Answer sent');
                    }
                } catch (err) {
                    console.error('[WebRTC] Answer creation failed:', err);
                }
                break;

            case 'answer':
                console.log('[Signaling] Received answer');
                if (pc && pc.signalingState === 'have-local-offer') {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
                        await processIceQueue();
                        console.log('[WebRTC] Answer applied');
                    } catch (err) {
                        console.error('[WebRTC] setRemoteDescription failed:', err);
                    }
                } else {
                    console.warn('[WebRTC] Ignoring answer - not in have-local-offer state');
                }
                break;

            case 'ice-candidate':
                if (msg.payload) {
                    if (pc && pc.remoteDescription) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
                        } catch (err) {
                            console.error('[WebRTC] ICE candidate error:', err);
                        }
                    } else {
                        // 아직 remote description이 없으면 큐에 저장
                        iceCandidatesQueue.current.push(msg.payload);
                    }
                }
                break;

            case 'peer-left':
                console.log('[Signaling] Peer left');
                setConnectionState('disconnected');
                setPeerParams(DEFAULT_AVATAR_PARAMS);
                // PC 정리
                if (pcRef.current) {
                    pcRef.current.close();
                    pcRef.current = null;
                }
                dataChannelRef.current = null;
                break;
        }
    }, [roomId, myAvatarId, createPeerConnection, sendOffer, processIceQueue]);

    /**
     * @brief 시그널링 서버 연결
     */
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setError(null);
        setConnectionState('connecting');

        try {
            const ws = new WebSocket(signalingUrl);

            ws.onopen = () => {
                console.log('[Signaling] Connected');
                setError(null); // 연결 성공 시 이전 에러 클리어
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

            ws.onerror = (e) => {
                console.error('[Signaling] Error:', e);
                setError('시그널링 서버 연결에 실패했습니다.');
                setConnectionState('failed');
            };

            ws.onclose = () => {
                console.log('[Signaling] Closed');
            };

            wsRef.current = ws;
        } catch (err) {
            console.error('[Signaling] Connection failed:', err);
            setError('시그널링 서버 연결에 실패했습니다.');
            setConnectionState('failed');
        }
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
        iceCandidatesQueue.current = [];
    }, []);

    /**
     * @brief 아바타 파라미터 전송
     */
    const sendParams = useCallback((params: AvatarParams) => {
        if (dataChannelRef.current?.readyState === 'open') {
            dataChannelRef.current.send(JSON.stringify({ type: 'params', params }));
        }
    }, []);

    /**
     * @brief 아바타 ID 전송
     */
    const sendAvatarId = useCallback((avatarId: string) => {
        if (dataChannelRef.current?.readyState === 'open') {
            dataChannelRef.current.send(JSON.stringify({ type: 'avatar', avatarId }));
        }
    }, []);

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
