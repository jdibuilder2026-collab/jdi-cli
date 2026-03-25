# JDI — AI Coding Agent CLI

로컬 파일 시스템에서 직접 동작하는 AI 코딩 에이전트.  
파일 읽기/쓰기, 코드 수정, 셸 명령 실행을 CLI에서 바로 수행합니다.

## 설치

```bash
# GitHub에서 직접 설치
npm install -g github:YOUR_ORG/jdi-cli

# 또는 로컬에서 설치
git clone https://github.com/YOUR_ORG/jdi-cli.git
cd jdi-cli
npm install && npm run build
npm link
```

## 설정

```bash
jdi login
```

서버 URL과 API Key를 입력하면 `~/.jdi/config.json`에 저장됩니다.

```
서버 URL: http://your-server:9090
API Key (cpk_...): cpk_your_api_key_here
```

## 사용법

```bash
# 대화형 모드
cd ~/my-project
jdi

# 단일 프롬프트
jdi "이 프로젝트를 분석해줘"
jdi "버그를 찾아서 수정해줘"
jdi "테스트 코드를 작성해줘"
```

## 기능

| 도구 | 설명 |
|------|------|
| `read_file` | 파일 읽기 (부분 읽기 지원) |
| `write_file` | 파일 생성/덮어쓰기 |
| `edit_file` | 파일 부분 수정 (search & replace) |
| `list_files` | 디렉터리 목록 (재귀 지원) |
| `search_files` | 파일 내용 검색 (grep) |
| `run_command` | 셸 명령 실행 |
| `ask_user` | 유저에게 질문 |

## 대화형 명령어

| 명령어 | 설명 |
|--------|------|
| `/help` | 도움말 |
| `/clear` | 대화 기록 초기화 |
| `/model` | 현재 모델 표시 |
| `/config` | 설정 정보 표시 |
| `/exit` | 종료 |

## 동작 원리

```
┌─────────────────┐
│  JDI CLI        │  로컬 PC
│  - 파일 읽기/쓰기│
│  - 코드 수정    │
│  - 셸 명령 실행  │
└────────┬────────┘
         │ POST /proxy/v1/messages
         │ Bearer cpk_xxx
         ▼
┌─────────────────┐
│  플랫폼 서버     │  인증 / 과금
└────────┬────────┘
         ▼
┌─────────────────┐
│  Anthropic API  │  Claude AI
└─────────────────┘
```

## 요구사항

- Node.js 18 이상
- 플랫폼 API Key (`cpk_...`)

## License

MIT
