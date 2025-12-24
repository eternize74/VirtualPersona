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
- [x] 손 추적 토글 버튼 추가

### 5. 확장 렌더러
- [x] `AvatarRendererV2.tsx` 생성

### 6. 메인 채팅창 Phase 2
- [x] `/home-v2/page.tsx` 생성
- [x] `/room-v2/[roomId]/page.tsx` 생성

### 7. 손 추적 ✅ 완료
- [x] `useHandTracking.ts` 생성
- [x] `HandsOverlay.tsx` 생성
- [x] `HandsOverlay.module.css` 생성
- [x] test-v2 페이지에 통합

### 8. 검증
- [ ] Phase 1 `/test`, `/room` 정상 동작 확인
- [ ] Phase 2 `/test-v2` 손 추적 테스트

---

## 손 추적 기능

### 생성된 파일
| 파일 | 역할 |
|------|------|
| `src/hooks/useHandTracking.ts` | MediaPipe Hand Landmarker 훅 |
| `src/components/HandsOverlay.tsx` | 손 랜드마크 시각화 |
| `src/components/HandsOverlay.module.css` | 오버레이 스타일 |

### 기능
- 21개 손 랜드마크 추적
- 양손 동시 감지
- 제스처 인식 (5종):
  - 👍 thumbsUp (엄지척)
  - ✌️ peace (피스)
  - 👆 point (가리키기)
  - ✊ fist (주먹)
  - 🖐️ open (손 펴기)

---

## 테스트 방법

```bash
cd VirtualPersona
npm run dev:all
```

### Phase 2 손 추적 테스트
1. http://localhost:3000/test-v2 접속
2. "🖐️ 손 추적" 버튼 클릭하여 활성화
3. 카메라에 손 보이기
4. 손 랜드마크 오버레이 및 제스처 인식 확인
