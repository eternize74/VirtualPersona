# Phase 2 구현 태스크

## 진행 상태

### 1. 타입 확장
- [x] `avatarV2.ts` 생성 - Phase 2 전용 타입 정의

### 2. 아바타 커스터마이징
- [x] `AvatarCustomizer.tsx` 생성
- [x] `AvatarCustomizer.module.css` 생성

### 3. 감정 프리셋
- [x] `EmotionPresets.tsx` 생성 (수동 해제 기능 포함)
- [x] `EmotionPresets.module.css` 생성

### 4. 테스트 페이지 V2
- [x] `/test-v2/page.tsx` 생성
- [x] `/test-v2/page.module.css` 생성

### 5. 확장 렌더러
- [x] `AvatarRendererV2.tsx` 생성

### 6. 메인 채팅창 Phase 2
- [x] `/home-v2/page.tsx` 생성
- [x] `/home-v2/page.module.css` 생성
- [x] `/room-v2/[roomId]/page.tsx` 생성
- [x] `/room-v2/[roomId]/page.module.css` 생성

### 7. 손 추적 (후순위)
- [ ] `useHandTracking.ts` 생성
- [ ] `HandsOverlay.tsx` 생성

### 8. 검증
- [ ] Phase 1 `/test`, `/room` 정상 동작 확인
- [ ] Phase 2 `/test-v2`, `/room-v2` 기능 테스트

---

## Phase 분리 구조

### Phase 1 (기존)
| 경로 | 설명 |
|------|------|
| `/` | 홈 - 아바타 선택 |
| `/room/[roomId]` | 통화 룸 |
| `/test` | 로컬 테스트 |

### Phase 2 (신규)
| 경로 | 설명 |
|------|------|
| `/home-v2` | 홈 V2 - 커스터마이징 포함 |
| `/room-v2/[roomId]` | 통화 룸 V2 - 감정 프리셋 포함 |
| `/test-v2` | Phase 2 테스트 |

---

## 테스트 방법

```bash
cd VirtualPersona
npm run dev:all
```

### Phase 1 테스트
- 홈: http://localhost:3000
- 테스트: http://localhost:3000/test
- 룸: http://localhost:3000/room/xxx

### Phase 2 테스트
- 홈 V2: http://localhost:3000/home-v2
- 테스트 V2: http://localhost:3000/test-v2
- 룸 V2: http://localhost:3000/room-v2/xxx

### Phase 2 기능 확인
1. 🎨 커스터마이징: 색상, 스타일 변경
2. 😊 감정 프리셋: 버튼 클릭 또는 1-6 키
3. 📹 카메라로 돌아가기: ESC 키 또는 버튼
4. 💾 설정 저장: localStorage 자동 저장
