# Worklog — 2026-06-21

## 오늘 한 일

### 1. web-reader 데모 카드 추가 (`9b1fed8`)

`demos.js`에 "웹 리더 / Web Reader" 카드를 신규 추가했다.

| 항목 | 값 |
|---|---|
| `href` | `https://web-reader-nine.vercel.app/` |
| `path` (표시 라벨) | `web-reader-nine.vercel.app` |
| `tags` | `["tool"]` |
| 비고 | 외부 도메인이므로 새 탭으로 열림 |

- `main`에 커밋·푸시 후 GitHub Pages 빌드 성공 → https://www.precipi.com/ 반영.

### 2. web-reader 아키텍처 검토 및 배포 결정

web-reader는 Next.js 16 앱으로 아래 서버사이드 의존성을 갖는다.

- **NextAuth** — Google OAuth 세션 관리
- **프록시 라우트** — 웹 페이지 원문 가져오기
- **Google Drive API** — 노트 저장·불러오기

정적 GitHub Pages로는 서버사이드 코드를 실행할 수 없으므로 사용자가 **Vercel에 직접 배포**했다.
배포 URL: `https://web-reader-nine.vercel.app/`

로그인·노트 저장이 정상 동작하려면 Vercel 배포 도메인이 Google Cloud Console OAuth 클라이언트의 **승인된 리디렉션 URI**와 환경 변수 `NEXTAUTH_URL` 양쪽에 등록돼 있어야 한다.

## 배운 점

- **정적 호스팅 한계 확인**: 서버사이드 코드(인증, 프록시, API 연동)가 필요한 Next.js 앱은 GitHub Pages 대상이 아니다. Vercel/Railway 등 서버리스 or 컨테이너 환경으로 분리하고, precipi-web에는 외부 링크 카드만 추가하는 패턴이 깔끔하다.
- **OAuth 리디렉션 URI**: Vercel 배포 시 Google OAuth redirect URI를 빠뜨리면 로그인이 `redirect_uri_mismatch`로 실패한다. 배포 URL 확정 직후 바로 등록해야 한다.

## 내일 할 일

- [ ] web-reader Vercel 배포 후 Google OAuth redirect URI 등록 완료 여부 확인
- [ ] web-reader 카드 한국어·영어 설명 문구 다듬기 (필요 시)
