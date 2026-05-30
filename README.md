# Precipi Web

인터랙티브 웹 데모 모음집입니다. 시뮬레이션, 크리에이티브 코딩, 유틸리티성 웹 작품을 정적 페이지로 제공합니다.

## 📋 목차

- [소개](#소개)
- [주요 데모](#주요-데모)
- [아카이브 데모](#아카이브-데모)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [사용 방법](#사용-방법)
- [데모 상세 설명](#데모-상세-설명)

## 소개

Precipi Web은 다양한 웹 기술을 활용한 인터랙티브 데모들의 모음입니다. 교육, 전시, 실험 목적으로 사용할 수 있는 웹 애플리케이션을 포함하고 있으며 GitHub Pages로 배포됩니다.

## 주요 데모

### 🪐 태양계 N-body 시뮬레이션 (`solar-system-sim/`)
- 태양·수성·금성·지구·화성·목성을 실제 질량/거리로 2D(탑뷰)에서 시뮬레이션합니다.
- 탐사선 자동 발사 및 목성 슬링샷 경로 탐색(간이 최적화) 기능이 포함되어 있습니다.

### 🌌 랜덤 3체 관찰기 (`three-body-random/`)
- 랜덤·안정 궤도 프리셋으로 3체계를 관찰합니다.
- 선택한 물체에서 본 하늘과 질량, 속도, 중심거리 변화를 함께 확인할 수 있습니다.

### 🏢 엘리베이터 시뮬레이션 (`elevator-sim/`)
- 10층 타워의 여러 엘리베이터가 호출, 탑승, 하차 요청을 처리하는 운영 시뮬레이션입니다.
- 독립 실행형 HTML 번들로 배포됩니다.

### 🌀 프랙탈 탐색기 (`fractal_explorer/`)
- 만델브로·줄리아 등 복소평면 프랙탈을 실시간으로 탐색합니다.
- 줌/이동, 반복 횟수·팔레트 조절을 지원합니다.

### 🚀 Falcon 9 1단 회수 시뮬레이터 (`falcon9_sim_10/`)
- 발사부터 단 분리, 부스트백·역추진·착륙 번까지 Falcon 9 1단 회수를 물리 기반으로 시뮬레이션합니다.
- 착륙 제어 파라미터를 자동 튜닝하는 탭이 포함되어 있습니다.

### 🎆 한강 불꽃축제 (`hanang_fireworks/`)
- 다리 너머에서 터지는 폭죽을 파티클로 연출하고 거리 기반 지연 사운드를 합성합니다.
- 클릭·드래그로 직접 발사하거나 자동 발사를 켤 수 있습니다.

### 🐙 문어 네뷸라 (`octo.html`)
- 네뷸라 배경에서 떠다니는 문어 시뮬레이션
- 문어들이 생각을 말풍선으로 표시
- 클릭 시 새로운 생각 생성 및 색상 변화
- 부드러운 애니메이션과 파도치는 촉수 효과

## 아카이브 데모

현재 메인 목록에서는 제외했지만 `archive/index.html`에서 접근할 수 있는 이전 데모입니다. 관련 파일은 모두 `archive/` 폴더 안에 모여 있습니다.

### 🤖 AI P5.js Agent (외부 링크)
- AI 에이전트가 생각하고 p5.js로 시각화하는 인터랙티브 프로젝트입니다.
- 외부 Vercel 앱으로 배포되어 있습니다: [바로가기](https://p5-agent-732idlgl8-shchuns-projects.vercel.app/)

### ⚽ 심판 카드 (`archive/refcard/`)
- 축구 심판 카드 시뮬레이터
- 초록색(그린) → 노란색(옐로) → 빨간색(레드) 순환
- 화면 클릭 또는 스페이스바로 전환
- 전체 화면 사용 가능

### 📷 카메라 테스트 (`archive/CameraTest.html`)
- 웹캠 접근 권한 테스트 페이지
- 브라우저의 카메라 API 지원 확인
- 실시간 비디오 스트림 표시

### 🤖 로봇 강아지 (`archive/robo-dog.html`)
- 클릭하면 짖는 귀여운 로봇 강아지
- p5.js로 구현된 간단한 인터랙티브 애니메이션
- 사운드 효과 포함

### 🎲 시각적 추첨 프로그램 (`archive/lotp/`)
- p5.js로 구현된 인터랙티브 추첨 게임
- 원형 캐릭터를 클릭하여 당첨자 선택
- 축하 애니메이션과 사운드 효과, 3~15개의 캐릭터 설정 가능

### 🎯 랜덤 당첨 이벤트 (`archive/lot/`)
- 랜덤 당첨 이벤트를 위한 추첨 프로그램
- 시각적 피드백 제공

## 기술 스택

- **HTML5** - 마크업
- **CSS3** - 스타일링 및 반응형 디자인
- **JavaScript (ES6+)** - 인터랙티브 기능
- **p5.js** - 크리에이티브 코딩 라이브러리
  - p5.js 1.9.0+ (추첨 프로그램)
  - p5.js 1.4.0+ (로봇 강아지)
  - p5.sound - 사운드 재생
- **SVG** - 벡터 그래픽 (로고)
- **GitHub Pages** - 정적 웹 배포

## 프로젝트 구조

```
precipi-web/
├── index.html              # 메인 인덱스 페이지
├── octo.html               # 문어 네뷸라
├── CNAME                   # GitHub Pages 커스텀 도메인 설정
├── README.md
├── assets/                 # 공용 이미지 에셋
├── solar-system-sim/       # 태양계 N-body 시뮬레이션
│   └── index.html
├── three-body-random/      # 랜덤 3체 관찰기
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── elevator-sim/           # 엘리베이터 시뮬레이션 (React/JSX 번들)
│   ├── index.html
│   ├── src/
│   └── vendor/
├── fractal_explorer/       # 프랙탈 탐색기
│   ├── index.html
│   ├── styles.css
│   └── src/                # palettes·iterate·engine·controls·fullscreen
├── falcon9_sim_10/         # Falcon 9 1단 회수 시뮬레이터
│   ├── index.html
│   ├── styles.css
│   └── src/                # core·audio·octaweb·physics·render·tuner·main·fullscreen
├── hanang_fireworks/       # 한강 불꽃축제
│   ├── index.html
│   ├── styles.css
│   └── src/                # core·audio·particles·scene·effects·interaction·fullscreen
├── vita/                   # 비타미술 안내 페이지
│   ├── index-vita.html
│   └── vita_logo.jpg
└── archive/                # 아카이브 데모 모음
    ├── index.html          # 아카이브 목록
    ├── CameraTest.html     # 카메라 테스트
    ├── robo-dog.html       # 로봇 강아지
    ├── small-dog.wav       # 강아지 짖는 소리
    ├── refcard/            # 심판 카드
    ├── lotp/               # 시각적 추첨 프로그램
    └── lot/                # 랜덤 당첨 이벤트
```

## 사용 방법

### GitHub Pages로 배포하기

1. **저장소 생성 및 푸시**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repository-url>
   git push -u origin main
   ```

2. **GitHub Pages 활성화**
   - GitHub 저장소 페이지로 이동
   - Settings → Pages 메뉴 선택
   - Source에서 "Deploy from a branch" 선택
   - Branch를 `main` (또는 `master`) 선택
   - 폴더는 `/ (root)` 선택
   - Save 클릭

3. **커스텀 도메인 설정 (선택사항)**
   - `CNAME` 파일이 이미 포함되어 있습니다 (`www.precipi.com`)
   - GitHub Pages 설정에서 Custom domain에 `www.precipi.com` 입력
   - DNS 설정에서 `www.precipi.com`을 GitHub Pages IP로 설정
     - A 레코드: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     - 또는 CNAME 레코드: `your-username.github.io`

4. **배포 확인**
   - 몇 분 후 `https://www.precipi.com` 또는 `https://your-username.github.io/precipi-web`에서 확인 가능

### 로컬에서 실행하기

1. 프로젝트를 클론하거나 다운로드합니다.

```bash
git clone <repository-url>
cd precipi-web
```

2. 웹 서버를 실행합니다.

**Python 3 사용:**
```bash
python -m http.server 8000
```

**Node.js (http-server) 사용:**
```bash
npx http-server -p 8000
```

**VS Code Live Server 확장 사용:**
- `index.html`을 우클릭하고 "Open with Live Server" 선택

3. 브라우저에서 접속합니다.

```
http://localhost:8000
```

### 직접 파일 열기

대부분의 데모는 브라우저에서 HTML 파일을 직접 열어도 작동합니다. 다만 일부 기능(카메라 접근 등)은 웹 서버를 통해 실행해야 할 수 있습니다.

## 데모 상세 설명

### 시각적 추첨 프로그램 (`archive/lotp/index.html`)

**기능:**
- 시작 시 추첨할 캐릭터 개수 입력 (3~15개)
- 원형으로 배치된 귀여운 캐릭터들
- 각 캐릭터는 랜덤한 표정과 색상
- 클릭하면 눌림 애니메이션 표시
- 당첨자 선택 시 컨페티 애니메이션과 축하 사운드
- 재시작 버튼으로 다시 시작 가능

**사용법:**
1. 페이지 로드 시 캐릭터 개수 입력
2. 원하는 캐릭터를 클릭
3. 당첨자가 선택되면 축하 화면 표시
4. "재시작" 버튼으로 다시 시작

### 문어 네뷸라 (`octo.html`)

**기능:**
- 20마리의 문어가 화면을 떠다님
- 각 문어는 독립적으로 움직임
- 문어들이 한국어 생각을 말풍선으로 표시
- 클릭하면 새로운 생각 생성 및 색상 변화
- 네뷸라 배경 애니메이션
- 파도치는 촉수 애니메이션

**특징:**
- 반응형 디자인 (화면 크기 자동 조절)
- 부드러운 물리 시뮬레이션
- HSB 색상 모드 사용

### 심판 카드 (`archive/refcard/index.html`)

**기능:**
- 전체 화면 심판 카드 시뮬레이터
- 초록색 → 노란색 → 빨간색 순환
- 화면 클릭 또는 스페이스바로 전환
- 현재 상태 표시 (상단 왼쪽)
- 모바일 터치 지원

**사용 사례:**
- 스포츠 이벤트
- 교육 목적
- 프레젠테이션

## 브라우저 호환성

- Chrome/Edge (권장)
- Firefox
- Safari
- 모바일 브라우저 (대부분의 데모 지원)

## 라이선스

이 프로젝트는 교육 및 개인 사용 목적으로 제공됩니다.

## 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.

## 참고 자료

- [p5.js 공식 문서](https://p5js.org/)
- [p5.js 레퍼런스](https://p5js.org/reference/)
- [MDN Web Docs](https://developer.mozilla.org/)

---

Made with ❤️ by Precipi
