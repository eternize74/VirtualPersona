/**
 * @file ConnectionStatus.tsx
 * @brief 연결 상태 표시 컴포넌트
 * @description WebRTC 연결 상태를 시각적으로 표시합니다.
 */

'use client';

import { ConnectionState } from '@/types/avatar';
import styles from './ConnectionStatus.module.css';

/**
 * @brief ConnectionStatus Props
 */
interface ConnectionStatusProps {
    /** @brief 연결 상태 */
    state: ConnectionState;

    /** @brief 피어 이름 (선택) */
    peerName?: string;
}

/**
 * @brief 상태별 라벨
 */
const STATE_LABELS: Record<ConnectionState, string> = {
    disconnected: '연결 대기 중',
    connecting: '연결 중...',
    connected: '연결됨',
    failed: '연결 실패',
};

/**
 * @brief 연결 상태 표시 컴포넌트
 * @param state - 연결 상태
 * @param peerName - 피어 이름
 * @returns 연결 상태 UI
 */
export default function ConnectionStatus({ state, peerName }: ConnectionStatusProps) {
    return (
        <div className={styles.container}>
            <div className={`${styles.dot} ${styles[state]}`} />
            <span className={styles.label}>
                {peerName ? `${peerName}: ` : ''}
                {STATE_LABELS[state]}
            </span>
        </div>
    );
}
