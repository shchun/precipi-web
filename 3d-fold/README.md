# Fold Hologram 3D

Fold 폰(또는 90°로 접은 화면)에 올려두고 보는 3D 홀로그램 착시 데모. Three.js 기반.

- **개발용 진입점**: [index.html](index.html) — `app.js`, `styles.css`를 직접 로드. PWA(서비스워커 `sw.js`, `manifest.webmanifest`).
- **배포용 파일**: [fold3d-bundle.html](fold3d-bundle.html) — 자체 완결형 단일 파일 번들. precipi.com 데모 그리드(`/demos.js`의 art 항목)가 가리키는 게 **이 파일**.

> 사용법: Fold 폰을 90°로 굽힌 상태에서 한쪽 면을 바닥에 눕히면, 위쪽 화면은 벽 / 아래쪽 화면은 바닥이 되어 입체로 보입니다. (로드 시 안내 오버레이가 떴다가 10초 후 사라짐)

---

## 번들 구조 (중요)

`fold3d-bundle.html`은 빌드된 자체 완결형 파일이라, 일반적인 HTML처럼 보이지 않습니다.

- 페이지의 실제 내용은 `<script type="__bundler/template">`(JSON 문자열) 안에 들어 있고, 로드 시 번들러 스크립트가 `document.documentElement.replaceWith(...)`로 **문서 전체를 교체**합니다.
- 에셋(아이콘 png, `app.js`, 폰트 woff2 등)은 `<script type="__bundler/manifest">`에 **base64**로 들어 있고, 그중 `app.js`는 **gzip 압축**(`compressed: true`)되어 있습니다. → 평문 검색(`grep`)으로 `app.js` 내용이 안 잡힙니다.
- `app.js` 에셋은 소스 `app.js`와 **바이트 단위로 동일**하게 유지됩니다.

### 주의: `<script>` 안의 리터럴 `</script>` 금지

번들러 로직은 바깥 인라인 `<script>`에 들어 있습니다. 여기 **문자열이든 주석이든** `</script>` 글자가 그대로 들어가면 HTML 파서가 거기서 스크립트를 닫아버려, 언패킹이 멈추고 화면이 "Unpacking..."에서 멈춥니다. (실제로 한 번 이 버그를 냄 — 커밋 `be8ce35`)

→ 항상 `'</' + 'script>'` 처럼 쪼개서 작성. 주석에도 쓰지 말 것.

### 번들에 가한 커스텀(번들러 렌더 직후 주입)

문서가 통째로 교체되므로, 추가 UI는 교체 **이후** `document.body`에 붙여야 살아남습니다. 현재 `fold3d-bundle.html`의 번들러 `try` 블록 끝에 다음이 주입돼 있음:

- **전체화면 토글 버튼** (우상단)
- **셋업 안내 오버레이** (매 로드 시 표시, 10초 후 페이드아웃)
- **GTM(gtag.js, `G-K7BBKNKZYM`)** — 교체될 템플릿 `<head>`에 주입(메인 사이트와 동일 측정 ID)

### 소스를 고친 뒤 번들 반영하기

`app.js`(또는 다른 에셋)를 수정하면 번들의 매니페스트도 갱신해야 함. `app.js`는 소스를 gzip→base64 해서 `__bundler/manifest`의 해당 uuid `data`에 덮어쓰면 됩니다(소스와 동일 유지). 예전에 쓴 1회용 Node 스크립트 흐름:

1. 번들에서 `__bundler/manifest` JSON 추출 → 파싱
2. `zlib.gzipSync(소스 app.js)` → base64 → 해당 uuid의 `data`에 대입, `compressed: true`
3. JSON 다시 stringify 해서 그 자리에 교체, 파일 저장
4. 검증: 다시 gunzip 해서 소스와 일치하는지 확인

---

## 오브젝트 추가하는 법

오브젝트는 `app.js`의 레지스트리에 등록됩니다:

```js
const OBJECTS = [
  { id: 'diamond', name: '다이아몬드', accent: 0x35e8ff, make: createDiamond },
  // ...
];
```

각 `make()`는 **원점 중심, 반지름 ~0.5로 정규화된 `THREE.Group`** 을 반환하고, 선택적으로 `group.userData.update(t, dt)`에 프레임 애니메이션을 붙입니다. 새 도형은 팩토리 함수 하나 만들고 위 배열에 한 줄 추가하면 끝.

(참고: `planet`(행성)·`helmet`(헬멧)은 레지스트리에서 제거됨 — 함수 정의는 죽은 코드로 남아 있어 재활용 가능.)

---

## 외부 3D 모델(GLB/GLTF) 불러오기

가능함. 고려할 점:

1. **로더 import** — `GLTFLoader`는 three 기본 번들에 없음:
   ```js
   import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
   ```
   (three 자체는 `app.js` 상단에서 `https://unpkg.com/three@0.160.0/build/three.module.js` 로 로드 중)
2. **비동기 로딩** — 기존 팩토리는 동기로 Group 반환. GLB는 비동기이므로, 빈 Group을 먼저 반환하고 `loader.load()` 콜백에서 자식을 채움.
3. **정규화(필수)** — 착시는 원점 중심·반지름 ~0.5일 때만 맞음. 불러온 모델은 `THREE.Box3`로 중심·크기를 재서 **센터링 + 스케일 보정**.
4. **오프라인/번들** — 배포본은 자체 완결형 PWA. 모델은 (a) 외부 URL로 로드하거나 (b) 번들 매니페스트에 base64로 임베드(png·폰트와 같은 방식). base64는 용량 ~33%↑. 완전 오프라인이면 three 자체도 임베드 필요.
5. **재질 톤** — 기존 오브젝트는 네온/글로우. 불러온 모델은 머티리얼/엣지 글로우를 더해야 통일감.

### 무료 모델 구하는 곳

이 앱엔 **저폴리 + 작은 용량 + .glb 단일 파일**이 적합.

| 사이트 | 특징 | 라이선스 |
|---|---|---|
| Poly Pizza (poly.pizza) | 구 Google Poly 후속, 저폴리, .glb 바로 받기 | 대부분 CC-BY / CC0 |
| Quaternius (quaternius.com) | 저폴리 팩 | CC0 |
| Kenney (kenney.nl) | 깔끔한 저폴리 에셋 | CC0 |
| Sketchfab (sketchfab.com) | 최대 규모, "Downloadable + Free" 필터 | 모델마다 다름(확인) |
| Khronos glTF Sample Assets (GitHub) | 표준 테스트 모델(헬멧·오리 등) | 자유 사용 |
| Smithsonian 3D (3d.si.edu) | 실제 유물 스캔 | 다수 CC0 |

- 포맷은 `.glb` 우선(텍스처까지 한 파일). `.gltf`는 외부 텍스처 동반.
- 번들 임베드 시 가급적 1~2MB 이하.
- **CC0**는 출처 표기 불필요, **CC-BY**는 표기 의무. Sketchfab은 모델별 확인 필수.
