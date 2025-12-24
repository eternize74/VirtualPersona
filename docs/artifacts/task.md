# Phase 3 구현 태스크

## 진행 상태

### Phase 3-1: 인프라 구축 ✅ 완료
- [x] `avatarV3.ts` - GPU/Neural 관련 타입 정의
- [x] `useWebGPU.ts` - WebGPU 감지 및 초기화 훅
- [x] `GPUModePicker.tsx` - GPU 모드 선택 UI
- [x] `PerformanceMonitor.tsx` - 성능 모니터 컴포넌트
- [x] `/test-v3/page.tsx` - Phase 3 테스트 페이지

### Phase 3-2: 모델 통합 ✅ 완료
- [x] `onnx-loader.ts` - ONNX 모델 로더 (다운로드, 캐싱)
- [x] `useNeuralAvatar.ts` - Neural Avatar 훅
- [x] `onnxruntime-web.d.ts` - 타입 선언
- [x] test-v3 페이지에 모델 로드 UI 통합
- [ ] 실제 LivePortrait ONNX 모델 배포 (CDN)

### Phase 3-3: 브라우저 추론 (예정)
- [ ] 실제 모델 추론 파이프라인 완성
- [ ] `AvatarRendererV3.tsx` - Neural 렌더러
- [ ] 폴백 로직 구현

---

## 생성된 파일

| 파일 | 역할 |
|------|------|
| `src/types/avatarV3.ts` | GPU/Neural 타입 정의 |
| `src/types/onnxruntime-web.d.ts` | ONNX 타입 선언 |
| `src/hooks/useWebGPU.ts` | WebGPU 감지 훅 |
| `src/hooks/useNeuralAvatar.ts` | Neural Avatar 훅 |
| `src/lib/gpu/onnx-loader.ts` | ONNX 모델 로더 |
| `src/components/GPUModePicker.tsx` | GPU 모드 UI |
| `src/components/PerformanceMonitor.tsx` | 성능 모니터 |
| `src/app/test-v3/` | 테스트 페이지 |

---

## 테스트

```bash
npm run dev:all
```

→ http://localhost:3000/test-v3

### 테스트 항목
1. WebGPU 자동 감지
2. GPU 모드 선택 UI
3. 성능 모니터 표시
4. 🚀 모델 로드 버튼 클릭

---

## 다음 단계

1. LivePortrait ONNX 모델 파일 준비 및 CDN 배포
2. 실제 추론 파이프라인 완성
3. Neural Avatar 렌더러 구현
