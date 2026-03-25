# JDI — AI Coding Agent CLI

로컬 파일 시스템에서 직접 동작하는 AI 코딩 에이전트.  
파일 읽기/쓰기, 코드 수정, 셸 명령 실행을 CLI에서 바로 수행합니다.

## 설치

```bash
# GitHub에서 직접 설치 (자동 빌드됨)
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

### 도구 (7개)

| 도구 | 설명 |
|------|------|
| `read_file` | 파일 읽기 (부분 읽기 지원) |
| `write_file` | 파일 생성/덮어쓰기 |
| `edit_file` | 파일 부분 수정 (search & replace) |
| `list_files` | 디렉터리 목록 (재귀 지원) |
| `search_files` | 파일 내용 검색 (grep) |
| `run_command` | 셸 명령 실행 |
| `ask_user` | 유저에게 질문 |

### 보안

- **권한 확인**: 파일 쓰기/수정, 명령 실행 시 사전 확인 (y/N)
- **위험 명령 경고**: `rm -rf`, `sudo`, `git push -f` 등 빨간 경고 표시
- **무한 루프 방지**: 도구 호출 최대 30회 제한
- **YOLO 모드**: `/yolo`로 자동 승인 (신뢰할 수 있는 작업 시)

### UX

- **스피너**: AI 응답 대기 중 로딩 표시
- **Diff 표시**: 파일 수정 시 변경 전/후 컬러 diff
- **토큰 예산**: 대화가 길어지면 자동 정리 (100K 토큰 제한)
- **컨텍스트 경고**: 토큰 70% 이상 사용 시 경고

### 대화형 명령어

| 명령어 | 설명 |
|--------|------|
| `/help` | 도움말 |
| `/clear` | 대화 기록 초기화 |
| `/model [이름]` | 현재 모델 표시/변경 |
| `/config` | 설정 정보 표시 |
| `/status` | 컨텍스트 상태 (토큰 사용량 프로그레스 바) |
| `/yolo` | 권한 확인 건너뛰기 모드 |
| `/exit` | 종료 |

## 동작 원리

```
┌─────────────────┐
│  JDI CLI        │  로컬 PC
│  - 파일 읽기/쓰기│
│  - 코드 수정    │
│  - 셸 명령 실행  │
│  - 권한 확인    │
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

AI가 `tool_use`로 도구를 요청하면 CLI가 로컬에서 실행하고, 결과를 `tool_result`로 다시 전달하는 에이전트 루프입니다.

## 요구사항

- Node.js 18 이상
- 플랫폼 API Key (`cpk_...`)

## License

MIT
