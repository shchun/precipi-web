# Nebula Thoughts — Windows 스크린세이버

[`nebula.html`](../nebula.html) 데모를 그대로 Windows 스크린세이버(`.scr`)로 띄웁니다.
WebView2로 렌더링하므로 모던 캔버스/p5.js가 그대로 동작합니다.

빌드 결과는 **단일 자가포함 `.scr`** 입니다 — WebView2 관리 DLL, 네이티브
`WebView2Loader.dll`, `nebula.html`, `p5.min.js`를 파일 하나에 임베드하고 실행 시
`%LOCALAPPDATA%\NebulaScreensaver\rt`로 추출합니다. 그래서 파일 하나만 받으면 됩니다.

## 받기 / 설치 (사용자)

precipi.com 메인의 **네뷸라 카드 → "🖥️ 윈도우 스크린세이버"** 버튼으로 받거나
[Releases](https://github.com/shchun/precipi-web/releases/tag/screensaver-v1)에서
`NebulaThoughts.scr`을 직접 받습니다.

1. `NebulaThoughts.scr` 다운로드
2. **우클릭 → 설치** → 화면 보호기 설정창이 열리고 선택됨
3. (서명되지 않아 SmartScreen이 한 번 경고 — "추가 정보 → 실행")

> 미리보기만: 받은 파일 우클릭 → **테스트**, 또는 `NebulaThoughts.scr /s` 실행.
> WebView2 런타임이 필요합니다(Win10/11엔 기본 설치).

## 옵션에 대해

스크린세이버는 **인앱 설정 UI를 둘 수 없습니다** — 마우스·키 입력이 들어오는 순간
종료되는 것이 동작이기 때문입니다. 그래서 빌드 시 기어·전체화면 버튼과 설정 오버레이를
숨기고, 커서를 감추고, 텍스트 소스를 재미있는 `mixed`로 고정합니다(오프라인이면
주요뉴스는 아재개그·직장인 속마음·일본어로 자동 폴백). 설정창의 "설정" 버튼(`/c`)은
바꿀 항목이 없어 안내만 보여줍니다.

## 빌드 (개발자)

필요 조건 — Windows 10/11 (내장 .NET Framework C# 컴파일러 + WebView2 런타임).
**.NET SDK / Visual Studio 불필요.**

```powershell
pwsh ./build.ps1     # 의존성 다운로드 -> 번들 -> 단일 Nebula.scr 컴파일
```

산출물: `dist/Nebula.scr` (자가포함), 그리고 배포용 사본 `../downloads/NebulaThoughts.scr`.
배포 사본은 `.gitignore` 처리되어 있으며 GitHub Releases로 업로드합니다(APK와 동일 방식).

새 버전 릴리스 예:

```powershell
gh release upload screensaver-v1 ../downloads/NebulaThoughts.scr --clobber
```

로컬에서 현재 사용자 스크린세이버로 적용/해제:

```powershell
pwsh ./install.ps1     # %LOCALAPPDATA%에 설치 + 활성화
pwsh ./uninstall.ps1   # 해제 + 제거
```

## 구성 / 동작

- [`Program.cs`](Program.cs) — 진입점. 임베드 어셈블리 리졸버 등록 → 런타임 파일 추출 →
  네이티브 로더 로드 → 폼 실행. 명령행: `/s` 실행, `/p` 미리보기(빈 동작), `/c`·무인자 안내.
- [`SaverForm.cs`](SaverForm.cs) — 가상 화면 전체를 덮는 `WebView2` 폼. 페이지에 입력 감지
  스크립트를 주입해 실제 입력이 들어오면 종료(시작 직후 1초·미세 이동은 무시).
- [`build.ps1`](build.ps1) / [`install.ps1`](install.ps1) / [`uninstall.ps1`](uninstall.ps1) / [`app.manifest`](app.manifest)
