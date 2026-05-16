# TODO (Solar System Sim / Demo site)

## UX: 코멘트 남기기
- 목표: 데모를 보는 사람이 “발견/의견/버그”를 즉시 남길 수 있게 해서 피드백 루프를 줄이기.
- 아이디어
  - 인앱 코멘트 패널(최소화 가능한 우측/하단 드로어)
  - 코멘트에 현재 상태 자동 첨부(체크박스)
    - 시드/초기 행성 각도(랜덤값)
    - 발사 시각(시뮬레이션 시간 `simTime`, wall time)
    - 선택된 후보 파라미터(Δv, 각도 등)
    - 최소 목성 근접거리 `dJ_min`, `E_final`, `maxR`
    - 현재 설정값(지구 1년=몇 분, `stepsPerFrame`, 소프트닝 on/off 등)
  - 전송 방식(선택)
    - (간단) `mailto:`로 내용 채워서 이메일 전송
    - (중간) GitHub Issue 생성 링크(템플릿 쿼리스트링으로 본문 자동 채움)
    - (확장) 간단한 서버리스 폼(예: Cloudflare/Netlify forms)로 저장
- 완료 기준(예시)
  - 코멘트 입력 → “복사하기” 또는 “전송” 2단계 이내
  - 재현 가능한 상태 정보가 1회 클릭으로 포함됨
  - 모바일/데스크톱 모두 최소화/복귀 UX가 깨지지 않음

## 경로(슬링샷) 로그 남기기
- 목표: “왜 이 경로가 나왔는지 / 왜 실패했는지”를 나중에 분석 가능하게 기록.
- 로그 범위
  - 경로 탐색 시작/종료 타임스탬프
  - trials, 랜덤 시드, 탐색 파라미터(dvMin/dvMax, 각도 범위)
  - best 후보의 요약 지표
    - `E_final`, `maxR`, `dJ_min`, (선택) 점수 분해(base/jupiterBonus 등)
  - 발사/재발사 이벤트(10초 자동 발사, 2년 타임아웃 재시작, 2×목성 반경 도달 재발사)
- 저장 방법(선택)
  - (기본) 화면 내 “로그 패널”(최근 N개) + “복사/다운로드(JSON)” 버튼
  - (브라우저 저장) `localStorage`에 세션 로그 저장(최대 용량 제한/삭제 버튼 포함)
  - (분석용) JSON Lines로 export 해서 재생/리포팅에 활용
- 완료 기준(예시)
  - 1회 “경로 찾기” 수행 시 로그 1개 생성
  - 1회 발사마다 로그에 연결(launchId로 매핑)
  - 다운로드한 JSON만으로 “그 상황 재현에 필요한 값”이 충분히 남아 있음

## (나중에) `solar-system-sim/index.html` 리팩토링 플랜 (안전하게 진행)
- 목표: 현재 단일 파일이 너무 커서 유지보수가 어려움. 동작을 최대한 유지하면서 점진적으로 분리.
- 권장 단계
  - 1단계(무위험): `<style>` → `solar-system-sim/styles.css`로 분리, `index.html`에 `<link rel="stylesheet">` 추가
  - 2단계(저위험): `<script>`를 그대로 `solar-system-sim/app.js`로 이동, `index.html`은 `<script src="./app.js" defer></script>`만 남김
  - 3단계(모듈화): `app.js`를 기능별 파일로 분해 후 ES Module 전환
    - `physics.js`: 상수(G/AU/YEAR), 벡터 유틸, `stepVerlet`, 가속도 계산
    - `bodies.js`: `BODIES_SEED`, `cloneBodies`, 초기조건/랜덤 초기각
    - `probe.js`: probe 적분, 궤적 기록, 자동 발사/재발사, 2년 타임아웃
    - `optimizer.js`: 후보 시뮬(`simulateCandidate`), 탐색(`findEscapeTrajectory`)
    - `render.js`: `draw`, 좌표 변환, 오토줌/fit 로직
    - `ui.js`: DOM 바인딩, 패널 최소화/복원, 상태/오버레이
    - `audio.js`: 우주 BGM start/stop
    - `main.js`: wire-up + 루프 시작 + fatal overlay
- 회귀(Regression) 체크리스트(필수)
  - 자동 발사(10초 후) / 재발사(2×목성 반경) / 재시작(2년 타임아웃) 동작 유지
  - “슬링샷 경로 찾기” 계산 중 일시정지 및 중앙 패널 표시 유지
  - 오토줌(태양+지구 유지) / 카메라 follow(지구/탐사선) 유지
  - 패널 최소화 상태 시작 + 복원 버튼 UX 유지
  - `ctrl+shift+R` 없이도 에러 원인 확인 가능한(fatal overlay) 상태 유지
