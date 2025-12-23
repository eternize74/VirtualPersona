# VirtualPersona 개발 상태

## Phase 1 (MVP) - ✅ 완료

### 구현 완료
- [x] Next.js 14 프로젝트 설정
- [x] MediaPipe Tasks Vision 얼굴 추적
- [x] Canvas 2D 아바타 렌더링
- [x] WebRTC DataChannel P2P 통신
- [x] WebSocket 시그널링 서버
- [x] 1:1 아바타 화상채팅 동작 확인

### 핵심 파일
| 파일 | 역할 |
|------|------|
| `src/hooks/useFaceTracking.ts` | MediaPipe FaceLandmarker |
| `src/hooks/useWebRTC.ts` | P2P DataChannel |
| `src/components/AvatarRenderer.tsx` | 2D 아바타 |
| `signaling-server.js` | 룸 관리 |

---

## Phase 2 - 고도화 (예정)

### 우선순위 높음
- [ ] 지연 시간 측정 및 최적화 (<120ms 목표)
- [ ] TURN 서버 설정 (NAT 환경 지원)
- [ ] 아바타 커스터마이징 (색상, 스타일)

### 우선순위 중간
- [ ] 손 추적 (MediaPipe Hands)
- [ ] 감정 프리셋 (기쁨, 슬픔 등)
- [ ] 음성 채팅 통합

### 우선순위 낮음
- [ ] 3D 아바타 (Three.js/WebGL)
- [ ] 모바일 반응형 UI

---

## Phase 3 - Neural Avatar (예정)

- [ ] GPU 선택 모드
- [ ] PersonaLive / LivePortrait 통합
- [ ] 성능 fallback 구조

---

## 기술 메모

### 해결된 이슈
1. **MediaPipe WASM 호환성**: `@mediapipe/tasks-vision@0.10.18` 사용
2. **React Strict Mode**: `reactStrictMode: false` 설정
3. **Offer 충돌**: Peer ID 비교로 한 쪽만 offer 전송

### 환경
- Node.js 18+
- Next.js 14.2.18
- 포트: 3000 (Next.js), 3001 (시그널링)
