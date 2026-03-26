# JDI — Claude Code 내장 AI 코딩 에이전트

**Claude Code의 전체 기능**을 `jdi login` 한 번으로 바로 사용.  
로그인 우회, 환경변수 설정, 프록시 연결을 JDI가 자동 처리합니다.

## 설치

### 1. Claude Code 설치 (필수)

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. JDI 설치

```bash
curl -fsSL https://raw.githubusercontent.com/jdibuilder2026-collab/jdi-cli/main/install.sh | bash
```

또는 수동 설치:

```bash
git clone https://github.com/jdibuilder2026-collab/jdi-cli.git ~/.jdi/cli
cd ~/.jdi/cli && npm install && npm link
```

Node.js 18 이상 필요.

## 설정 (최초 1회)

```bash
jdi login
```

```
서버 URL: http://your-server:9090
API Key: cpk_발급받은_키

✓ JDI 설정 저장 완료
✓ Claude Code 로그인 우회 설정 완료
✓ 서버 연결 성공
✓ API Key 인증 성공 (잔액: 11,500,000 tokens)
```

이후 `jdi`만 실행하면 됩니다. 다른 설정 불필요.

## 사용법

```bash
cd ~/my-project

jdi                              # 대화형 모드
jdi "이 프로젝트를 분석해줘"       # 단일 프롬프트
jdi "버그를 찾아서 수정해줘"       # 코드 자동 수정
jdi "테스트 코드를 작성해줘"       # 테스트 생성
```

Claude Code의 **모든 기능** 그대로 사용 가능:
- 파일 읽기/쓰기/수정
- 터미널 명령 실행
- 이미지 분석
- Git 작업
- MCP 서버 연동
- 스킬 / 에이전트 / 플러그인

## 플랫폼 명령어

```bash
jdi credits      # 💰 크레딧 잔액 조회
jdi usage        # 📊 사용량 조회 (최근 30일)
jdi status       # 🔌 서버 연결 + 인증 상태 확인
```

## 동작 원리

```
jdi login (최초 1회)
  → ~/.jdi/config.json    서버 URL + API Key 저장
  → ~/.claude/.config.json  로그인 우회 자동 설정

jdi 실행 (매번)
  → 환경변수 자동 주입
     ANTHROPIC_BASE_URL = http://server:9090/proxy
     ANTHROPIC_API_KEY  = cpk_xxx
  → 로그인 우회 보장 (.config.json 갱신)
  → Claude Code CLI 실행 (전체 기능)
```

## 업데이트

```bash
cd ~/.jdi/cli && git pull && npm install
```

## vs Claude Code 직접 설치

| 항목 | Claude Code 직접 | JDI |
|------|-----------------|-----|
| 설치 | npm install + 환경변수 수동 설정 + .config.json 수동 생성 | 설치 스크립트 + `jdi login` |
| 로그인 | "3rd-party platform" 선택 필요 / .config.json 해킹 필요 | 자동 우회 |
| 환경변수 | .zshrc/.bashrc에 직접 추가 | 자동 주입 (셸 오염 없음) |
| 크레딧 조회 | 웹 브라우저 필요 | `jdi credits` |
| 업데이트 | npm update + 환경변수 재확인 | `git pull && npm install` |

## License

MIT
