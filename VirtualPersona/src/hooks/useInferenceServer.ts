/**
 * @file useInferenceServer.ts
 * @brief 추론 서버 연결 훅
 * @description Python 추론 서버와 WebSocket 통신
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AvatarParams } from '@/types/avatar';

/**
 * @brief 연결 상태
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * @brief 추론 서버 상태
 */
export interface InferenceServerState {
    /** @brief 연결 상태 */
    connectionState: ConnectionState;
    /** @brief 파이프라인 준비 여부 */
    pipelineReady: boolean;
    /** @brief Reference 이미지 로드 여부 */
    referenceLoaded: boolean;
    /** @brief 마지막 오류 */
    lastError: string | null;
    /** @brief 마지막 프레임 이미지 (data URL) */
    lastFrame: string | null;
    /** @brief FPS */
    fps: number;
}

/**
 * @brief 훅 옵션
 */
export interface UseInferenceServerOptions {
    /** @brief 서버 URL */
    serverUrl?: string;
    /** @brief 자동 연결 */
    autoConnect?: boolean;
}

/**
 * @brief 추론 서버 연결 훅
 * @param options 옵션
 */
export function useInferenceServer(options: UseInferenceServerOptions = {}) {
    const {
        serverUrl = 'ws://localhost:8765/ws',
        autoConnect = false,
    } = options;

    const [state, setState] = useState<InferenceServerState>({
        connectionState: 'disconnected',
        pipelineReady: false,
        referenceLoaded: false,
        lastError: null,
        lastFrame: null,
        fps: 0,
    });

    const wsRef = useRef<WebSocket | null>(null);
    const frameCountRef = useRef(0);
    const lastFpsUpdateRef = useRef(Date.now());

    /**
     * @brief 서버 연결
     */
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setState(prev => ({ ...prev, connectionState: 'connecting' }));

        try {
            const ws = new WebSocket(serverUrl);

            ws.onopen = async () => {
                console.log('[InferenceServer] Connected');
                setState(prev => ({
                    ...prev,
                    connectionState: 'connected',
                    lastError: null,
                }));

                // 연결 후 서버 상태 자동 확인
                const apiUrl = serverUrl.replace('ws://', 'http://').replace('/ws', '');
                try {
                    const response = await fetch(`${apiUrl}/status`);
                    if (response.ok) {
                        const status = await response.json();
                        console.log('[InferenceServer] Server status:', status);
                        setState(prev => ({
                            ...prev,
                            pipelineReady: status.pipeline_ready,
                            referenceLoaded: status.reference_loaded,
                        }));
                    }
                } catch (e) {
                    console.warn('[InferenceServer] Status check failed:', e);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'frame') {
                        // 프레임 수신
                        frameCountRef.current++;

                        // FPS 계산 (1초마다)
                        const now = Date.now();
                        if (now - lastFpsUpdateRef.current >= 1000) {
                            const fps = frameCountRef.current;
                            frameCountRef.current = 0;
                            lastFpsUpdateRef.current = now;

                            setState(prev => ({
                                ...prev,
                                lastFrame: message.image,
                                fps,
                            }));
                        } else {
                            setState(prev => ({
                                ...prev,
                                lastFrame: message.image,
                            }));
                        }
                    } else if (message.type === 'status') {
                        console.log('[InferenceServer] Status:', message.message);
                    } else if (message.type === 'error') {
                        console.error('[InferenceServer] Error:', message.message);
                        setState(prev => ({
                            ...prev,
                            lastError: message.message,
                        }));
                    }
                } catch (e) {
                    console.error('[InferenceServer] Parse error:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('[InferenceServer] Error:', error);
                setState(prev => ({
                    ...prev,
                    connectionState: 'error',
                    lastError: 'Connection error',
                }));
            };

            ws.onclose = () => {
                console.log('[InferenceServer] Disconnected');
                setState(prev => ({
                    ...prev,
                    connectionState: 'disconnected',
                }));
                wsRef.current = null;
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('[InferenceServer] Connection failed:', error);
            setState(prev => ({
                ...prev,
                connectionState: 'error',
                lastError: String(error),
            }));
        }
    }, [serverUrl]);

    /**
     * @brief 연결 해제
     */
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    /**
     * @brief Motion 파라미터 전송
     */
    const sendMotion = useCallback((params: AvatarParams) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
            return;
        }

        wsRef.current.send(JSON.stringify({
            type: 'motion',
            params: {
                headRotation: params.headRotation,
                eyeBlinkLeft: params.eyeBlinkLeft,
                eyeBlinkRight: params.eyeBlinkRight,
                mouthOpen: params.mouthOpen,
                smile: params.smile,
            },
        }));
    }, []);

    /**
     * @brief Reference 이미지 업로드
     */
    const uploadReference = useCallback(async (file: File): Promise<boolean> => {
        const apiUrl = serverUrl.replace('ws://', 'http://').replace('/ws', '');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${apiUrl}/reference`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                console.log('[InferenceServer] Reference uploaded successfully');

                // 업로드 후 서버 상태 재확인
                const statusResponse = await fetch(`${apiUrl}/status`);
                if (statusResponse.ok) {
                    const status = await statusResponse.json();
                    console.log('[InferenceServer] Updated status:', status);
                    setState(prev => ({
                        ...prev,
                        referenceLoaded: status.reference_loaded,
                        pipelineReady: status.pipeline_ready,
                    }));
                }

                return true;
            } else {
                const error = await response.text();
                console.error('[InferenceServer] Upload failed:', error);
                return false;
            }
        } catch (error) {
            console.error('[InferenceServer] Upload error:', error);
            return false;
        }
    }, [serverUrl]);

    /**
     * @brief 서버 상태 확인
     */
    const checkStatus = useCallback(async () => {
        const apiUrl = serverUrl.replace('ws://', 'http://').replace('/ws', '');

        try {
            const response = await fetch(`${apiUrl}/status`);
            if (response.ok) {
                const status = await response.json();
                setState(prev => ({
                    ...prev,
                    pipelineReady: status.pipeline_ready,
                    referenceLoaded: status.reference_loaded,
                }));
                return status;
            }
        } catch (error) {
            console.error('[InferenceServer] Status check failed:', error);
        }
        return null;
    }, [serverUrl]);

    // 자동 연결
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    return {
        state,
        connect,
        disconnect,
        sendMotion,
        uploadReference,
        checkStatus,
        isConnected: state.connectionState === 'connected',
    };
}

export default useInferenceServer;
