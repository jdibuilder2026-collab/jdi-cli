// Renderer — 터미널 출력, diff 표시, 스피너

import chalk from 'chalk';

// =====================
// Spinner
// =====================
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private message: string;

  constructor(message = '처리 중...') {
    this.message = message;
  }

  start(): void {
    this.frameIndex = 0;
    this.interval = setInterval(() => {
      const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length];
      process.stderr.write(`\r  ${chalk.cyan(frame)} ${chalk.gray(this.message)}`);
      this.frameIndex++;
    }, 80);
  }

  update(message: string): void {
    this.message = message;
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stderr.write('\r' + ' '.repeat(60) + '\r'); // Clear line
    if (finalMessage) {
      process.stderr.write(`  ${finalMessage}\n`);
    }
  }
}

// =====================
// Tool rendering
// =====================
const TOOL_ICONS: Record<string, string> = {
  read_file: '📖',
  write_file: '📝',
  edit_file: '✏️',
  list_files: '📁',
  search_files: '🔍',
  run_command: '⚡',
  ask_user: '❓',
};

export function renderToolCall(name: string, input: Record<string, unknown>): void {
  const icon = TOOL_ICONS[name] || '🔧';
  const summary = getToolSummary(name, input);
  process.stderr.write(`\n  ${icon} ${chalk.cyan(name)} ${chalk.gray(summary)}\n`);
}

export function renderToolResult(name: string, result: { content: string; is_error: boolean }): void {
  if (result.is_error) {
    process.stderr.write(`  ${chalk.red('✗')} ${chalk.red(truncate(result.content, 200))}\n`);
  } else {
    const preview = truncate(result.content, 150);
    process.stderr.write(`  ${chalk.green('✓')} ${chalk.gray(preview)}\n`);
  }
}

export function renderToolDenied(name: string): void {
  process.stderr.write(`  ${chalk.yellow('⊘')} ${chalk.yellow(`${name} — 사용자가 거부함`)}\n`);
}

// =====================
// Diff display
// =====================
export function renderDiff(filePath: string, oldText: string, newText: string): void {
  process.stderr.write(chalk.gray(`\n  ─── ${filePath} ───\n`));

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Show context around changes (simplified diff)
  const maxLines = Math.min(15, Math.max(oldLines.length, newLines.length));

  for (let i = 0; i < Math.min(oldLines.length, maxLines); i++) {
    process.stderr.write(chalk.red(`  - ${oldLines[i]}\n`));
  }
  if (oldLines.length > maxLines) {
    process.stderr.write(chalk.gray(`  ... (${oldLines.length - maxLines}줄 더)\n`));
  }

  for (let i = 0; i < Math.min(newLines.length, maxLines); i++) {
    process.stderr.write(chalk.green(`  + ${newLines[i]}\n`));
  }
  if (newLines.length > maxLines) {
    process.stderr.write(chalk.gray(`  ... (${newLines.length - maxLines}줄 더)\n`));
  }

  process.stderr.write(chalk.gray('  ───────────────\n'));
}

// =====================
// Usage & status
// =====================
export function renderUsage(input: number, output: number): void {
  process.stderr.write(
    chalk.gray(`\n  tokens: ${input.toLocaleString()} in / ${output.toLocaleString()} out\n`)
  );
}

export function renderLoopWarning(iteration: number, maxIterations: number): void {
  process.stderr.write(
    chalk.yellow(`\n  ⚠ 도구 호출 ${iteration}/${maxIterations}회 — `) +
    chalk.gray('무한 루프 방지 제한에 가까워지고 있습니다.\n')
  );
}

export function renderLoopLimit(): void {
  process.stderr.write(
    chalk.red('\n  ✗ 도구 호출 횟수 제한(30회)에 도달했습니다. 에이전트를 중단합니다.\n') +
    chalk.gray('    대화를 이어가려면 새 프롬프트를 입력하세요.\n')
  );
}

export function renderContextWarning(percent: number): void {
  process.stderr.write(
    chalk.yellow(`\n  ⚠ 컨텍스트 ${percent}% 사용 중 — `) +
    chalk.gray('오래된 대화가 곧 잘릴 수 있습니다.\n')
  );
}

export function renderError(message: string): void {
  process.stderr.write(`\n${chalk.red('Error:')} ${message}\n`);
}

// =====================
// Welcome & help
// =====================
export function renderWelcome(): void {
  process.stderr.write(`
${chalk.bold.blue('JDI')} ${chalk.gray('— AI Coding Agent')}
${chalk.gray('파일 읽기/쓰기, 코드 수정, 명령 실행을 지원합니다.')}
${chalk.gray('종료: Ctrl+C | 도움말: /help')}
\n`);
}

export function renderHelp(): void {
  process.stderr.write(`
${chalk.bold('명령어:')}
  ${chalk.cyan('/help')}      이 도움말 표시
  ${chalk.cyan('/clear')}     대화 기록 초기화
  ${chalk.cyan('/model')}     현재 모델 표시/변경
  ${chalk.cyan('/config')}    설정 정보 표시
  ${chalk.cyan('/status')}    컨텍스트 상태 (토큰 사용량)
  ${chalk.cyan('/yolo')}      이 세션에서 권한 확인 건너뛰기
  ${chalk.cyan('/exit')}      종료
  ${chalk.cyan('Ctrl+C')}     종료
\n`);
}

// =====================
// Helpers
// =====================
function getToolSummary(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'read_file':
      return String(input.path || '');
    case 'write_file':
      return String(input.path || '');
    case 'edit_file':
      return String(input.path || '');
    case 'list_files':
      return String(input.path || '.');
    case 'search_files':
      return `"${input.pattern}" in ${input.path || '.'}`;
    case 'run_command':
      return truncate(String(input.command || ''), 60);
    case 'ask_user':
      return truncate(String(input.question || ''), 60);
    default:
      return '';
  }
}

function truncate(str: string, max: number): string {
  const oneLine = str.replace(/\n/g, ' ');
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 3) + '...';
}
