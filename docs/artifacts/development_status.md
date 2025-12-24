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

### 라우팅
- `/` - 홈 (아바타 선택)
- `/room/[roomId]` - 통화 룸
- `/test` - 로컬 테스트

---

## Phase 2 - 고도화 (✅ 완료)

### 구현 완료
- [x] 아바타 커스터마이징 (색상, 눈/입 스타일)
- [x] 감정 프리셋 (6종: 기쁨, 슬픔, 놀람, 화남, 윙크, 사랑)
- [x] 카메라로 돌아가기 기능 (ESC 키, 버튼)
- [x] 확장 아바타 렌더러 (AvatarRendererV2)
- [x] Phase 2 테스트 페이지 (`/test-v2`)
- [x] Phase 2 메인 채팅창 (`/home-v2`, `/room-v2`)
- [x] 손 추적 (MediaPipe GestureRecognizer)
- [x] 제스처 인식 (7종 내장 + 정확도 높음)
- [x] 제스처 상대방 전송 (WebRTC DataChannel)
- [x] 상대방 제스처 표시

### 핵심 파일 (Phase 2)
| 파일 | 역할 |
|------|------|
| `src/types/avatarV2.ts` | Phase 2 확장 타입 |
| `src/components/AvatarRendererV2.tsx` | 확장 아바타 렌더러 |
| `src/components/AvatarCustomizer.tsx` | 커스터마이징 UI |
| `src/components/EmotionPresets.tsx` | 감정 프리셋 UI |
| `src/hooks/useHandTracking.ts` | 손 추적 (GestureRecognizer) |
| `src/components/HandsOverlay.tsx` | 손 랜드마크 시각화 |

### 라우팅 (Phase 2)
- `/home-v2` - 홈 V2 (커스터마이징 포함)
- `/room-v2/[roomId]` - 통화 룸 V2 (모든 Phase 2 기능)
- `/test-v2` - Phase 2 테스트

### 제스처 지원 (MediaPipe 내장)
| 제스처 | 아이콘 |
|--------|--------|
| Closed Fist | ✊ |
| Open Palm | 🖐️ |
| Pointing Up | 👆 |
| Thumbs Up | 👍 |
| Thumbs Down | 👎 |
| Victory | ✌️ |
| I Love You | 🤟 |

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
4. **제스처 정확도**: `HandLandmarker` → `GestureRecognizer`로 변경

### Phase 분리 전략
- Phase 1 파일 수정 없이 Phase 2 기능 추가
- `AvatarRenderer.tsx` (Phase 1) vs `AvatarRendererV2.tsx` (Phase 2)
- `/test` vs `/test-v2`, `/room` vs `/room-v2` 분리

### 환경
- Node.js 18+
- Next.js 14.2.18
- 포트: 3000 (Next.js), 3001 (시그널링)
