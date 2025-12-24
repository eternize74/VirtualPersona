# Phase 2 구현 계획: VirtualPersona 고도화

## 개요

Phase 1 MVP가 완료된 상태에서 Phase 2 고도화 기능을 구현합니다. Phase 1과 Phase 2는 분리하여 각각 독립적으로 동작할 수 있도록 설계합니다.

---

## Phase 1 현재 상태 (✅ 완료)

| 기능 | 파일 | 상태 |
|------|------|------|
| 얼굴 추적 (MediaPipe) | `useFaceTracking.ts` | ✅ |
| 2D 아바타 렌더링 | `AvatarRenderer.tsx` | ✅ |
| WebRTC P2P 연결 | `useWebRTC.ts` | ✅ |
| 시그널링 서버 | `signaling-server.js` | ✅ |

---

## Phase 2 구현 범위

README.md 로드맵 기준:
1. **손/상체 추가** (MediaPipe Hands/Pose)
2. **감정 프리셋** (기쁨, 슬픔, 놀람 등)
3. **아바타 커스터마이징** (색상, 스타일)

development_status.md 기준 우선순위:
- ✅ **높음**: 지연 시간 측정, TURN 서버, 아바타 커스터마이징
- ⏳ **중간**: 손 추적, 감정 프리셋, 음성 채팅
- 🔜 **낮음**: 3D 아바타, 모바일 반응형

---

## 사용자 검토 필요 사항

> [!IMPORTANT]
> **구현 우선순위 확인 필요**
> 
> Phase 2에서 우선적으로 구현할 기능을 선택해주세요:
> 
> **Option A: 아바타 커스터마이징 우선**
> - 색상 커스터마이징 (피부색, 주요색, 보조색)
> - 스타일 옵션 (눈 모양, 입 스타일 등)
> - 감정 프리셋 버튼 UI
> 
> **Option B: 손/상체 추적 우선**
> - MediaPipe Hands 통합
> - 손 랜드마크 기반 제스처 인식
> - 아바타에 손 레이어 추가
> 
> **Option C: 전체 고도화 통합**
> - 모든 Phase 2 기능을 단계적으로 구현

---

## 제안 변경 사항

### 📁 디렉터리 구조 (Phase 2 분리)

```
VirtualPersona/src/
├── app/
│   ├── page.tsx              # 홈 (아바타 선택) - Phase 1
│   ├── room/[roomId]/        # 통화 룸 - Phase 1
│   └── test/                 # 테스트 페이지 - Phase 1
├── components/
│   ├── AvatarRenderer.tsx    # 기본 렌더러 - Phase 1
│   ├── AvatarRendererV2.tsx  # [NEW] 확장 렌더러 - Phase 2
│   ├── AvatarCustomizer.tsx  # [NEW] 커스터마이저 - Phase 2
│   ├── EmotionPresets.tsx    # [NEW] 감정 프리셋 - Phase 2
│   └── HandsOverlay.tsx      # [NEW] 손 오버레이 - Phase 2
├── hooks/
│   ├── useFaceTracking.ts    # 얼굴 추적 - Phase 1
│   ├── useHandTracking.ts    # [NEW] 손 추적 - Phase 2
│   └── useWebRTC.ts          # P2P 통신 - Phase 1
└── types/
    ├── avatar.ts             # 기본 타입 - Phase 1
    └── avatarV2.ts           # [NEW] 확장 타입 - Phase 2
```

---

### Component: 확장 타입 정의

#### [NEW] avatarV2.ts

Phase 2 전용 타입 확장:
- `AvatarParamsV2`: 손/상체 파라미터 추가
- `EmotionPreset`: 감정 프리셋 정의
- `AvatarCustomization`: 커스터마이징 옵션
- `HandParams`: 손 추적 파라미터

---

### Component: 아바타 커스터마이징

#### [NEW] AvatarCustomizer.tsx

기능:
- 색상 선택기 (피부색, 주요색, 보조색)
- 스타일 프리셋 선택
- 실시간 미리보기
- 커스터마이징 상태 저장/로드

---

### Component: 감정 프리셋

#### [NEW] EmotionPresets.tsx

기능:
- 빠른 감정 표현 버튼 (기쁨, 슬픔, 놀람, 화남 등)
- 클릭 시 아바타 파라미터 일시적 오버라이드
- 애니메이션 트랜지션
- 키보드 단축키 지원 (1-6)

---

### Component: 손 추적

#### [NEW] useHandTracking.ts

기능:
- MediaPipe Hands 통합
- 21개 손 랜드마크 추적
- 제스처 인식 (손흔들기, 엄지척 등)
- useFaceTracking과 독립적으로 동작

#### [NEW] HandsOverlay.tsx

기능:
- 손 랜드마크 시각화
- 아바타 렌더러와 합성

---

### Component: 확장 아바타 렌더러

#### [NEW] AvatarRendererV2.tsx

기능:
- Phase 1 `AvatarRenderer` 기능 상속
- 커스터마이징 색상 적용
- 손 랜드마크 오버레이
- 감정 프리셋 애니메이션

---

## 검증 계획

### 자동화 테스트

```bash
# 개발 서버 실행
npm run dev:all

# Phase 1 테스트: http://localhost:3000/test
# Phase 2 테스트: http://localhost:3000/test-v2 (새 페이지)
```

### 수동 검증

1. **Phase 1 독립 동작 확인**
   - 기존 `/test` 페이지에서 얼굴 추적 및 아바타 렌더링 정상 동작
   - Phase 2 코드 추가 후에도 Phase 1 기능 영향 없음

2. **Phase 2 기능 테스트**
   - `/test-v2` 페이지에서 확장 기능 테스트
   - 커스터마이징 UI 동작 확인
   - 감정 프리셋 버튼 동작 확인
   - 손 추적 시 랜드마크 표시 확인

---

## 구현 순서 (제안)

1. **타입 확장** (`avatarV2.ts`)
2. **아바타 커스터마이징** (`AvatarCustomizer.tsx`)
3. **감정 프리셋** (`EmotionPresets.tsx`)
4. **테스트 페이지 V2** (`/test-v2`)
5. **손 추적** (`useHandTracking.ts`, `HandsOverlay.tsx`)
6. **확장 렌더러** (`AvatarRendererV2.tsx`)

---

## 기술적 고려사항

### Phase 분리 전략

- Phase 1 파일은 수정하지 않음 (기존 동작 보장)
- Phase 2 전용 컴포넌트/훅을 새로 생성
- 공통 타입은 `avatarV2.ts`에서 Phase 1 타입을 확장
- 테스트 페이지 분리 (`/test` vs `/test-v2`)

### 성능 최적화

- 손 추적은 선택적 활성화 (사용자 토글)
- 감정 프리셋 애니메이션은 requestAnimationFrame 사용
- 커스터마이징 상태는 localStorage에 캐싱

---

## 다음 단계

사용자 선택에 따라 구현을 진행합니다:
- Option A/B/C 중 선택 확인
- 선택된 옵션에 따른 상세 구현
