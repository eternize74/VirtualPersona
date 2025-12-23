/**
 * @file signaling-server.js
 * @brief WebSocket 시그널링 서버
 * @description WebRTC P2P 연결을 위한 시그널링 메시지를 중계합니다.
 * 
 * @usage node signaling-server.js
 */

const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.SIGNALING_PORT || 3001;

/**
 * @brief 룸별 클라이언트 저장소
 * @type {Map<string, Map<string, { ws: WebSocket, avatarId: string }>>}
 */
const rooms = new Map();

/**
 * @brief HTTP 서버 생성
 */
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('VirtualPersona Signaling Server\n');
});

/**
 * @brief WebSocket 서버 생성
 */
const wss = new WebSocket.Server({ server });

/**
 * @brief 클라이언트 연결 처리
 */
wss.on('connection', (ws) => {
    let currentRoomId = null;
    let currentPeerId = null;

    console.log('[Server] New client connected');

    /**
     * @brief 메시지 처리
     */
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('[Server] Received:', message.type, message.roomId);

            switch (message.type) {
                case 'join':
                    handleJoin(ws, message);
                    currentRoomId = message.roomId;
                    currentPeerId = message.peerId;
                    break;

                case 'offer':
                case 'answer':
                case 'ice-candidate':
                    broadcastToRoom(message, currentPeerId);
                    break;

                default:
                    console.log('[Server] Unknown message type:', message.type);
            }
        } catch (err) {
            console.error('[Server] Message parse error:', err);
        }
    });

    /**
     * @brief 연결 종료 처리
     */
    ws.on('close', () => {
        console.log('[Server] Client disconnected');

        if (currentRoomId && currentPeerId) {
            // 룸에서 피어 제거
            const room = rooms.get(currentRoomId);
            if (room) {
                room.delete(currentPeerId);

                // 나머지 피어들에게 알림
                const leaveMessage = {
                    type: 'peer-left',
                    roomId: currentRoomId,
                    peerId: currentPeerId,
                };

                room.forEach((peer, peerId) => {
                    if (peer.ws.readyState === WebSocket.OPEN) {
                        peer.ws.send(JSON.stringify(leaveMessage));
                    }
                });

                // 빈 룸 정리
                if (room.size === 0) {
                    rooms.delete(currentRoomId);
                    console.log('[Server] Room deleted:', currentRoomId);
                }
            }
        }
    });

    /**
     * @brief 에러 처리
     */
    ws.on('error', (err) => {
        console.error('[Server] WebSocket error:', err);
    });
});

/**
 * @brief 룸 입장 처리
 * @param ws - WebSocket 연결
 * @param message - 입장 메시지
 */
function handleJoin(ws, message) {
    const { roomId, peerId, avatarId } = message;

    // 룸 생성 또는 가져오기
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
        console.log('[Server] Room created:', roomId);
    }

    const room = rooms.get(roomId);

    // 기존 피어들에게 새 피어 알림
    room.forEach((peer, existingPeerId) => {
        if (peer.ws.readyState === WebSocket.OPEN) {
            const joinMessage = {
                type: 'peer-joined',
                roomId,
                peerId,
                avatarId,
            };
            peer.ws.send(JSON.stringify(joinMessage));

            // 새 피어에게 기존 피어 알림
            const existingPeerMessage = {
                type: 'peer-joined',
                roomId,
                peerId: existingPeerId,
                avatarId: peer.avatarId,
            };
            ws.send(JSON.stringify(existingPeerMessage));
        }
    });

    // 룸에 피어 추가
    room.set(peerId, { ws, avatarId });
    console.log('[Server] Peer joined:', peerId, 'to room:', roomId, '(total:', room.size, ')');
}

/**
 * @brief 룸 내 다른 피어들에게 메시지 브로드캐스트
 * @param message - 전송할 메시지
 * @param senderPeerId - 발신자 피어 ID
 */
function broadcastToRoom(message, senderPeerId) {
    const room = rooms.get(message.roomId);
    if (!room) return;

    room.forEach((peer, peerId) => {
        if (peerId !== senderPeerId && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(JSON.stringify(message));
        }
    });
}

/**
 * @brief 서버 시작
 */
server.listen(PORT, () => {
    console.log(`[Server] VirtualPersona Signaling Server running on port ${PORT}`);
    console.log(`[Server] WebSocket URL: ws://localhost:${PORT}`);
});
