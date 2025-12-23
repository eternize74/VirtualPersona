
# 실시간 아바타 기반 1:1 화상채팅 서비스

## 1. 프로젝트 개요

본 프로젝트는 사용자가 실제 얼굴 대신 **실시간으로 동작하는 아바타**를 통해 1:1 화상채팅을 진행할 수 있는 커뮤니케이션 서비스를 구축하는 것을 목표로 한다.  
모든 고비용 연산은 **클라이언트 로컬**에서 처리하며, 서버는 최소한의 시그널링 및 세션 제어만 담당한다.

핵심 철학은 다음과 같다.

> 영상이 아닌 의미를 전달하고,  
> 서버가 아닌 사용자 단에서 존재를 렌더링한다.

---

## 2. 목표 및 범위

### 2.1 목표
- 실시간 아바타 기반 1:1 통신
- 저지연 (<120ms) 상호작용
- 개인정보 보호 (영상 미전송 구조)
- 확장 가능한 아바타 파이프라인

### 2.2 범위
- Web 기반 MVP 우선
- 2D Live Avatar → 3D Avatar → Neural Avatar 순차 확장
- 모바일은 후순위

---

## 3. 사용자 시나리오

1. 사용자가 서비스 접속
2. 아바타 선택 (사전 정의 이미지)
3. 상대방과 1:1 세션 생성
4. 카메라는 로컬 추적에만 사용
5. 상대방 화면에는 선택된 아바타가 실시간으로 표시됨
6. 표정, 고개, 눈깜빡임 등이 실시간 반영

---

## 4. 시스템 아키텍처

### 4.1 전체 구조

- Client A
  - 카메라 입력
  - 얼굴/포즈 추적
  - 아바타 로컬 렌더링
  - 파라미터 전송

- Client B
  - 동일 구조

- Signaling Server
  - WebRTC offer/answer
  - ICE 교환
  - 룸 관리
  - 아바타 메타데이터 전달

---

## 5. 클라이언트 기술 스펙

### 5.1 입력 추적

| 기능 | 기술 |
|---|---|
| 얼굴 랜드마크 | MediaPipe FaceMesh |
| 표정 계수 | BlendShape 기반 |
| 고개 회전 | Head Pose Estimation |
| 손/상체 (확장) | MediaPipe Hands / Pose |

### 5.2 아바타 표현 (MVP)

- 2D Live Avatar
- 레이어 구조 (눈, 입, 얼굴, 고개)
- Canvas 또는 WebGL 렌더링
- 30~60 FPS 유지

### 5.3 아바타 파라미터 모델

```json
{
  "headRotation": [0.1, -0.05, 0.0],
  "eyeBlinkLeft": 0.32,
  "eyeBlinkRight": 0.30,
  "mouthOpen": 0.61,
  "smile": 0.44,
  "timestamp": 123456789
}
```

---

## 6. 네트워크 및 통신

### 6.1 통신 방식

- WebRTC 사용
- VideoTrack: 사용하지 않음 (MVP 기준)
- DataChannel:
  - 표정/포즈 파라미터 전송
  - 20~30Hz 전송

### 6.2 서버 역할

- 시그널링 전용
- GPU 불필요
- 상태 비저장 (stateless)

---

## 7. 서버 기술 스펙

- Node.js 또는 Go
- WebSocket 기반 signaling
- coturn (STUN/TURN)

---

## 8. 성능 요구사항

| 항목 | 목표 |
|---|---|
| End-to-End Latency | < 120ms |
| Face Tracking FPS | ≥ 30 |
| Avatar Render FPS | ≥ 60 |
| Data Payload | < 5KB / frame |

---

## 9. 보안 및 프라이버시

- 원본 영상 외부 전송 없음
- 얼굴 데이터 서버 저장 금지
- 세션 종료 시 모든 상태 폐기

---

## 10. 단계별 개발 로드맵

### Phase 1 – MVP
- WebRTC 1:1 연결
- 얼굴 추적
- 2D 아바타 렌더
- 파라미터 전송

### Phase 2 – 고도화
- 손/상체 추가
- 감정 프리셋
- 아바타 커스터마이징

### Phase 3 – Neural Avatar
- GPU 선택 모드
- PersonaLive / LivePortrait 계열 통합
- 성능 fallback 구조

---

## 11. 성공 기준 (KPI)

- 5분 이상 안정적 통화 성공률 99%
- 평균 지연 < 120ms
- 사용자 카메라 ON 상태에서도 CPU 사용률 60% 이하

---

## 12. 비전

이 시스템은 화상채팅이 아니라  
**존재를 대체하는 인터페이스**다.

얼굴을 보내지 않고,  
의미와 감정을 보낸다.

---

## 13. 프로젝트 구조

```
VirtualPersona/
├── VirtualPersona/                 # Next.js 애플리케이션
│   ├── src/
│   │   ├── app/                    # App Router 페이지
│   │   │   ├── layout.tsx          # 루트 레이아웃
│   │   │   ├── page.tsx            # 홈 (아바타 선택)
│   │   │   └── room/[roomId]/      # 통화 룸 페이지
│   │   ├── components/             # UI 컴포넌트
│   │   │   ├── AvatarSelector.tsx  # 아바타 선택 그리드
│   │   │   ├── AvatarRenderer.tsx  # Canvas 2D 렌더러
│   │   │   └── ConnectionStatus.tsx # 연결 상태 표시
│   │   ├── hooks/                  # 커스텀 훅
│   │   │   ├── useFaceTracking.ts  # MediaPipe 얼굴 추적
│   │   │   └── useWebRTC.ts        # P2P DataChannel 통신
│   │   ├── types/avatar.ts         # 타입 정의
│   │   └── styles/globals.css      # 전역 스타일
│   ├── signaling-server.js         # WebSocket 시그널링 서버
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js
├── docs/artifacts/                 # 개발 문서
└── README.md
```

---

## 14. 의존성 라이브러리

### 런타임 의존성 (dependencies)

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| next | 14.2.18 | React 프레임워크 (App Router) |
| react | ^18.3.1 | UI 라이브러리 |
| react-dom | ^18.3.1 | React DOM 렌더링 |
| @mediapipe/face_mesh | ^0.4.x | 얼굴 랜드마크 추적 (478점) |
| @mediapipe/camera_utils | ^0.3.x | 카메라 스트림 유틸리티 |
| ws | ^8.18.0 | WebSocket 시그널링 서버 |

### 개발 의존성 (devDependencies)

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| typescript | ^5.7.2 | 정적 타입 검사 |
| @types/node | ^20.17.10 | Node.js 타입 정의 |
| @types/react | ^18.3.14 | React 타입 정의 |
| @types/react-dom | ^18.3.2 | React DOM 타입 정의 |
| eslint | ^8.57.1 | 코드 품질 검사 |
| eslint-config-next | 14.2.18 | Next.js ESLint 설정 |
| concurrently | ^9.1.0 | 다중 프로세스 실행 |

---

## 15. 빌드 및 실행 방법

### 15.1 사전 요구사항

- **Node.js**: v18.17.0 이상
- **npm**: v9.0.0 이상
- **브라우저**: Chrome, Edge, Firefox (WebRTC 지원)
- **카메라**: 얼굴 추적용 웹캠

### 15.2 설치

```bash
# 프로젝트 클론 후 디렉터리 이동
cd VirtualPersona/VirtualPersona

# 의존성 설치
npm install
```

### 15.3 개발 모드 실행

#### 방법 1: 동시 실행 (권장)

```bash
npm run dev:all
```

이 명령은 다음 두 서버를 동시에 실행합니다:
- Next.js 개발 서버: http://localhost:3000
- 시그널링 서버: ws://localhost:3001

#### 방법 2: 개별 실행

```bash
# 터미널 1: Next.js 개발 서버
npm run dev

# 터미널 2: 시그널링 서버
npm run signaling
```

### 15.4 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 시그널링 서버는 별도 실행 필요
npm run signaling
```

### 15.5 사용 방법

1. 브라우저에서 http://localhost:3000 접속
2. 카메라 권한 허용
3. 아바타 선택
4. "새 대화 시작" 클릭하여 룸 생성
5. 생성된 룸 ID를 상대방에게 공유
6. 상대방은 룸 ID를 입력하여 입장
7. 실시간 아바타 대화 시작!

### 15.6 테스트 방법 (로컬)

동일 PC에서 테스트하려면:
1. 브라우저 탭 A에서 룸 생성
2. 브라우저 탭 B에서 동일 룸 ID로 입장
3. 양쪽 탭에서 아바타가 실시간으로 움직이는지 확인

---

## 16. 스크립트 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Next.js 개발 서버 실행 (포트 3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 코드 검사 |
| `npm run signaling` | 시그널링 서버 실행 (포트 3001) |
| `npm run dev:all` | Next.js + 시그널링 동시 실행 |

---

## 17. 환경 변수 (선택)

`.env.local` 파일을 생성하여 설정할 수 있습니다:

```env
# 시그널링 서버 URL (기본값: ws://localhost:3001)
NEXT_PUBLIC_SIGNALING_URL=ws://your-server:3001

# 시그널링 서버 포트 (기본값: 3001)
SIGNALING_PORT=3001
```

---

## 18. 문제 해결

### 카메라가 작동하지 않는 경우
- 브라우저에서 카메라 권한이 허용되었는지 확인
- HTTPS 환경이 아닌 경우 localhost에서만 카메라 접근 가능

### 연결이 되지 않는 경우
- 시그널링 서버가 실행 중인지 확인 (`npm run signaling`)
- 방화벽에서 포트 3000, 3001이 열려있는지 확인
- NAT 환경에서는 TURN 서버 설정 필요 (Phase 2 예정)

### 상대방 아바타가 보이지 않는 경우
- 양쪽 모두 동일한 룸 ID로 입장했는지 확인
- 브라우저 콘솔에서 WebRTC 연결 상태 확인
