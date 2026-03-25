// Renderer — 터미널에 Markdown + tool 실행 상태 출력

import chalk from 'chalk';

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

export function renderUsage(input: number, output: number): void {
  process.stderr.write(
    chalk.gray(`\n  tokens: ${input.toLocaleString()} in / ${output.toLocaleString()} out\n`)
  );
}

export function renderError(message: string): void {
  process.stderr.write(`\n${chalk.red('Error:')} ${message}\n`);
}

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
  ${chalk.cyan('/exit')}      종료
  ${chalk.cyan('Ctrl+C')}     종료
\n`);
}

// --- Helpers ---

const TOOL_ICONS: Record<string, string> = {
  read_file: '📖',
  write_file: '📝',
  edit_file: '✏️',
  list_files: '📁',
  search_files: '🔍',
  run_command: '⚡',
  ask_user: '❓',
};

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
