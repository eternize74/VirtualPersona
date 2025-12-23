/**
 * @file page.tsx
 * @brief 통화 룸 페이지
 * @description 1:1 아바타 화상채팅이 진행되는 메인 화면입니다.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { useWebRTC } from '@/hooks/useWebRTC';
import AvatarRenderer from '@/components/AvatarRenderer';
import ConnectionStatus from '@/components/ConnectionStatus';
import styles from './page.module.css';

/**
 * @brief 시그널링 서버 URL
 * @description 개발 환경에서는 로컬 서버 사용
 */
const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:3001';

/**
 * @brief 파라미터 전송 주기 (ms)
 */
const SEND_INTERVAL = 33; // ~30Hz

/**
 * @brief 통화 룸 페이지 컴포넌트
 * @returns 통화 화면 UI
 */
export default function RoomPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const roomId = params.roomId as string;
    const myAvatarId = searchParams.get('avatar') || 'avatar1';

    const sendIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 얼굴 추적 훅
    const {
        isTracking,
        params: faceParams,
        error: trackingError,
        startTracking,
        stopTracking,
        setVideoElement,
        videoRef,
    } = useFaceTracking();

    // WebRTC 훅
    const {
        connectionState,
        peerAvatarId,
        peerParams,
        error: rtcError,
        connect,
        disconnect,
        sendParams,
    } = useWebRTC({
        roomId,
        myAvatarId,
        signalingUrl: SIGNALING_URL,
    });

    const hasInitializedRef = useRef(false);

    /**
     * @brief 초기화 및 연결 (한 번만 실행)
     */
    useEffect(() => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        console.log('[Room] Initializing...', roomId);

        // 얼굴 추적 시작
        startTracking();

        // WebRTC 연결
        connect();

        // 페이지 이탈 시 cleanup (브라우저 닫기/새로고침)
        const handleBeforeUnload = () => {
            stopTracking();
            disconnect();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // React Strict Mode에서는 cleanup 하지 않음
            // 실제 페이지 이탈은 handleLeave 또는 beforeunload에서 처리
        };
    }, []); // 빈 의존성 - eslint-disable-line

    /**
     * @brief 파라미터 주기적 전송
     */
    useEffect(() => {
        if (connectionState === 'connected') {
            sendIntervalRef.current = setInterval(() => {
                sendParams(faceParams);
            }, SEND_INTERVAL);
        }

        return () => {
            if (sendIntervalRef.current) {
                clearInterval(sendIntervalRef.current);
                sendIntervalRef.current = null;
            }
        };
    }, [connectionState, faceParams, sendParams]);

    /**
     * @brief 룸 나가기
     */
    const handleLeave = useCallback(() => {
        stopTracking();
        disconnect();
        router.push('/');
    }, [stopTracking, disconnect, router]);

    /**
     * @brief 룸 ID 복사
     */
    const handleCopyRoomId = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            alert('룸 ID가 클립보드에 복사되었습니다.');
        } catch {
            prompt('룸 ID를 복사하세요:', roomId);
        }
    }, [roomId]);

    return (
        <div className={styles.container}>
            {/* Background */}
            <div className={styles.bgGradient} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.roomInfo}>
                    <h1 className={styles.title}>VirtualPersona</h1>
                    <button className={styles.roomIdBtn} onClick={handleCopyRoomId}>
                        <span className={styles.roomId}>{roomId}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                    </button>
                </div>
                <div className={styles.headerActions}>
                    <ConnectionStatus state={connectionState} />
                    <button className="btn btn-danger" onClick={handleLeave}>
                        나가기
                    </button>
                </div>
            </header>

            {/* Video Container (숨김) */}
            <video
                ref={(el) => setVideoElement(el)}
                className={styles.hiddenVideo}
                playsInline
                muted
            />

            {/* Main Content - 아바타 영역 */}
            <main className={styles.main}>
                {/* 상대방 아바타 */}
                <section className={styles.peerSection}>
                    <div className={styles.avatarCard}>
                        <div className={styles.avatarLabel}>상대방</div>
                        <div className={styles.avatarWrapper}>
                            {connectionState === 'connected' ? (
                                <AvatarRenderer
                                    avatarId={peerAvatarId}
                                    params={peerParams}
                                    width={400}
                                    height={400}
                                />
                            ) : (
                                <div className={styles.waitingOverlay}>
                                    <div className={styles.waitingIcon}>👤</div>
                                    <p>
                                        {connectionState === 'connecting'
                                            ? '연결 중...'
                                            : '상대방을 기다리는 중...'}
                                    </p>
                                    <p className={styles.hint}>
                                        룸 ID를 공유하세요
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 내 아바타 (미리보기) */}
                <section className={styles.mySection}>
                    <div className={styles.myAvatarCard}>
                        <div className={styles.avatarLabel}>나</div>
                        <div className={styles.myAvatarWrapper}>
                            <AvatarRenderer
                                avatarId={myAvatarId}
                                params={faceParams}
                                width={200}
                                height={200}
                            />
                        </div>
                        {!isTracking && (
                            <div className={styles.trackingStatus}>
                                {trackingError || '카메라 초기화 중...'}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Error Display */}
            {(trackingError || rtcError) && (
                <div className={styles.errorBanner}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{trackingError || rtcError}</span>
                </div>
            )}
        </div>
    );
}
