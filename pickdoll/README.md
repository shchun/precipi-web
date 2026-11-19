# PickDoll web

브라우저에서 실행되는 7개 랜덤 인형 뽑기 게임. PC 키보드와 휴대폰 터치 조작을 지원한다.

- 물리 모델은 shchun/PickDoll의 claw.xml에서 가져왔다.
- physics.js는 Python 상태 전환과 집게 제어를 JavaScript로 옮긴 코드다.
- 공식 @mujoco/mujoco 4.0.1 단일 스레드 WASM과 Three.js 0.187.0을 고정 버전 CDN에서 불러온다.
- 음악·효과음은 원본 프로젝트에서 합성한 WAV 파일이며 시작 버튼을 누른 후 재생한다.
- 정적 HTTP 서버로 저장소 루트를 제공한 뒤 /pickdoll/을 연다. 설치나 빌드 단계는 없다.
- 인터넷 연결과 WebGL 2를 지원하는 브라우저가 필요하다.

방향키 이동, Shift 저속 이동, Ctrl+방향키 1mm 이동, Z/X 회전, Enter 뽑기, Tab/1~5 카메라, R 새 판, M 소리 켜기/끄기. 터치 화면에서는 방향키와 회전·뽑기 버튼을 사용한다.
