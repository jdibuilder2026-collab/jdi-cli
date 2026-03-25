// Permission — 도구 실행 전 유저 확인 시스템

import { createInterface } from 'node:readline';
import chalk from 'chalk';

export type PermissionLevel = 'safe' | 'write' | 'danger';

// 위험 명령 패턴
const DANGER_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*[rf]|--recursive|--force)/i,
  /\bsudo\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bmkfs\b/i,
  /\bdd\b.*\bof=/i,
  /\b>\s*\/dev\//i,
  /\bkill\s+-9/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bformat\b/i,
  /\bdrop\s+(database|table)/i,
  /\btruncate\s+table/i,
  /\bdelete\s+from\b.*\bwhere\b/i,
  /\bgit\s+push\s+(-f|--force)/i,
  /\bgit\s+reset\s+--hard/i,
  /\bcurl\b.*\|\s*(bash|sh|zsh)/i,
];

// 쓰기 도구 (확인 필요)
const WRITE_TOOLS = new Set(['write_file', 'edit_file', 'run_command']);

// 안전한 도구 (확인 불필요)
const SAFE_TOOLS = new Set(['read_file', 'list_files', 'search_files', 'ask_user']);

export function classifyTool(
  toolName: string,
  toolInput: Record<string, unknown>,
): PermissionLevel {
  if (SAFE_TOOLS.has(toolName)) return 'safe';

  if (toolName === 'run_command') {
    const cmd = String(toolInput.command || '');
    for (const pattern of DANGER_PATTERNS) {
      if (pattern.test(cmd)) return 'danger';
    }
    return 'write';
  }

  if (WRITE_TOOLS.has(toolName)) return 'write';

  return 'write'; // Unknown tools require confirmation
}

export function getDangerWarning(command: string): string | null {
  for (const pattern of DANGER_PATTERNS) {
    if (pattern.test(command)) {
      if (/\brm\b/i.test(command)) return '파일/디렉터리 삭제 명령입니다.';
      if (/\bsudo\b/i.test(command)) return '관리자 권한으로 실행됩니다.';
      if (/\bgit\s+push\s+(-f|--force)/i.test(command)) return 'Git 강제 push입니다.';
      if (/\bgit\s+reset\s+--hard/i.test(command)) return 'Git 히스토리를 되돌립니다.';
      if (/\bdrop\s/i.test(command) || /\btruncate\b/i.test(command)) return 'DB 데이터가 삭제됩니다.';
      if (/\bcurl\b.*\|\s*(bash|sh)/i.test(command)) return '외부 스크립트를 직접 실행합니다.';
      return '위험할 수 있는 명령입니다.';
    }
  }
  return null;
}

let autoApproveSession = false;

export function setAutoApprove(value: boolean): void {
  autoApproveSession = value;
}

export async function requestPermission(
  toolName: string,
  toolInput: Record<string, unknown>,
  level: PermissionLevel,
): Promise<boolean> {
  // Safe tools always pass
  if (level === 'safe') return true;

  // Auto-approve mode (set by /yolo command)
  if (autoApproveSession) return true;

  const rl = createInterface({ input: process.stdin, output: process.stderr });

  return new Promise((resolve) => {
    if (level === 'danger') {
      const warning = getDangerWarning(String(toolInput.command || ''));
      process.stderr.write(chalk.red.bold(`\n  ⚠️  위험: ${warning || '위험한 작업입니다.'}\n`));
      process.stderr.write(chalk.red(`  명령: ${String(toolInput.command || toolInput.path || '')}\n`));
      process.stderr.write(chalk.yellow('  실행하시겠습니까? (y/N): '));
    } else {
      const target = String(toolInput.path || toolInput.command || '');
      process.stderr.write(chalk.yellow(`  ${toolName} → ${truncate(target, 60)} (y/N): `));
    }

    rl.once('line', (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === 'y' || a === 'yes');
    });
  });
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\n/g, ' ');
  return clean.length > max ? clean.slice(0, max - 3) + '...' : clean;
}
