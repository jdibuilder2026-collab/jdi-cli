// Tool Executor — tool_use 요청을 로컬에서 실행

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { ContentBlock } from '../client.js';
import { createInterface } from 'node:readline';

const MAX_OUTPUT = 50000; // 50KB 출력 제한

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  cwd: string,
): Promise<{ content: string; is_error: boolean }> {
  try {
    switch (toolName) {
      case 'read_file':
        return readFile(toolInput, cwd);
      case 'write_file':
        return writeFile(toolInput, cwd);
      case 'edit_file':
        return editFile(toolInput, cwd);
      case 'list_files':
        return listFiles(toolInput, cwd);
      case 'search_files':
        return searchFiles(toolInput, cwd);
      case 'run_command':
        return runCommand(toolInput, cwd);
      case 'ask_user':
        return await askUser(toolInput);
      default:
        return { content: `알 수 없는 도구: ${toolName}`, is_error: true };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: `도구 실행 에러: ${msg}`, is_error: true };
  }
}

function resolvePath(p: string, cwd: string): string {
  return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}

function readFile(
  input: Record<string, unknown>,
  cwd: string,
): { content: string; is_error: boolean } {
  const filePath = resolvePath(input.path as string, cwd);

  if (!fs.existsSync(filePath)) {
    return { content: `파일을 찾을 수 없습니다: ${input.path}`, is_error: true };
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return { content: `경로가 디렉터리입니다: ${input.path}`, is_error: true };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const offset = (input.offset as number) || 1;
  const limit = (input.limit as number) || lines.length;

  const slice = lines.slice(offset - 1, offset - 1 + limit);
  let content = slice.join('\n');

  if (content.length > MAX_OUTPUT) {
    content = content.slice(0, MAX_OUTPUT) + '\n... (truncated)';
  }

  const totalLines = lines.length;
  const header = `[${input.path}] (${totalLines} lines)`;

  if (offset > 1 || limit < totalLines) {
    return {
      content: `${header}\nShowing lines ${offset}-${Math.min(offset - 1 + limit, totalLines)}:\n\n${content}`,
      is_error: false,
    };
  }

  return { content: `${header}\n\n${content}`, is_error: false };
}

function writeFile(
  input: Record<string, unknown>,
  cwd: string,
): { content: string; is_error: boolean } {
  const filePath = resolvePath(input.path as string, cwd);
  const content = input.content as string;

  // Create parent directories
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existed = fs.existsSync(filePath);
  fs.writeFileSync(filePath, content, 'utf-8');

  const lines = content.split('\n').length;
  const action = existed ? '덮어쓰기' : '생성';

  return {
    content: `✓ ${input.path} ${action} 완료 (${lines} lines)`,
    is_error: false,
  };
}

function editFile(
  input: Record<string, unknown>,
  cwd: string,
): { content: string; is_error: boolean } {
  const filePath = resolvePath(input.path as string, cwd);
  const oldText = input.oldText as string;
  const newText = input.newText as string;

  if (!fs.existsSync(filePath)) {
    return { content: `파일을 찾을 수 없습니다: ${input.path}`, is_error: true };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  if (!raw.includes(oldText)) {
    return {
      content: `oldText를 파일에서 찾을 수 없습니다. 정확히 일치하는 텍스트를 사용하세요.\n\n검색한 텍스트 (${oldText.length}자):\n${oldText.slice(0, 200)}`,
      is_error: true,
    };
  }

  const count = raw.split(oldText).length - 1;
  const updated = raw.replace(oldText, newText);
  fs.writeFileSync(filePath, updated, 'utf-8');

  return {
    content: `✓ ${input.path} 수정 완료 (${count}개 위치)`,
    is_error: false,
  };
}

function listFiles(
  input: Record<string, unknown>,
  cwd: string,
): { content: string; is_error: boolean } {
  const dirPath = resolvePath((input.path as string) || '.', cwd);
  const recursive = (input.recursive as boolean) || false;
  const maxDepth = (input.maxDepth as number) || 3;

  if (!fs.existsSync(dirPath)) {
    return { content: `디렉터리를 찾을 수 없습니다: ${input.path || '.'}`, is_error: true };
  }

  const entries: string[] = [];
  const gitignorePatterns = loadGitignore(cwd);

  function walk(dir: string, depth: number, prefix: string) {
    if (depth > maxDepth) return;
    if (entries.length > 500) return;

    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    // Sort: directories first, then files
    items.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const item of items) {
      const relativePath = path.relative(cwd, path.join(dir, item.name));

      // Skip common ignored dirs
      if (shouldIgnore(item.name, relativePath, gitignorePatterns)) continue;

      if (item.isDirectory()) {
        entries.push(`${prefix}📁 ${item.name}/`);
        if (recursive) {
          walk(path.join(dir, item.name), depth + 1, prefix + '  ');
        }
      } else {
        entries.push(`${prefix}📄 ${item.name}`);
      }
    }
  }

  walk(dirPath, 0, '');

  if (entries.length === 0) {
    return { content: '(비어 있음)', is_error: false };
  }

  let result = entries.join('\n');
  if (entries.length > 500) {
    result += '\n... (500개 이상, 잘림)';
  }

  return { content: result, is_error: false };
}

function searchFiles(
  input: Record<string, unknown>,
  cwd: string,
): { content: string; is_error: boolean } {
  const pattern = input.pattern as string;
  const searchPath = resolvePath((input.path as string) || '.', cwd);
  const include = input.include as string | undefined;

  try {
    let cmd = `grep -rn --include='*' "${pattern.replace(/"/g, '\\"')}" "${searchPath}"`;
    if (include) {
      cmd = `grep -rn --include='${include}' "${pattern.replace(/"/g, '\\"')}" "${searchPath}"`;
    }

    const output = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });

    // Make paths relative
    const lines = output.split('\n').filter(Boolean);
    const relativized = lines.map(line => {
      if (line.startsWith(cwd)) {
        return line.slice(cwd.length + 1);
      }
      return line;
    });

    let result = relativized.slice(0, 100).join('\n');
    if (relativized.length > 100) {
      result += `\n... (${relativized.length}개 결과 중 100개 표시)`;
    }

    return { content: result || '결과 없음', is_error: false };
  } catch (err) {
    const e = err as { status?: number; stdout?: string };
    if (e.status === 1) {
      return { content: '결과 없음', is_error: false };
    }
    return { content: `검색 에러: ${(err as Error).message}`, is_error: true };
  }
}

function runCommand(
  input: Record<string, unknown>,
  cwd: string,
): { content: string; is_error: boolean } {
  const command = input.command as string;
  const timeout = ((input.timeout as number) || 30) * 1000;

  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      timeout,
      maxBuffer: 5 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let content = output;
    if (content.length > MAX_OUTPUT) {
      content = content.slice(0, MAX_OUTPUT) + '\n... (truncated)';
    }

    return { content: content || '(출력 없음)', is_error: false };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    let content = '';
    if (e.stdout) content += e.stdout;
    if (e.stderr) content += (content ? '\n' : '') + 'STDERR:\n' + e.stderr;
    content += `\nExit code: ${e.status ?? 'unknown'}`;

    if (content.length > MAX_OUTPUT) {
      content = content.slice(0, MAX_OUTPUT) + '\n... (truncated)';
    }

    return { content: content || `명령 실행 실패: ${(err as Error).message}`, is_error: true };
  }
}

async function askUser(
  input: Record<string, unknown>,
): Promise<{ content: string; is_error: boolean }> {
  const question = input.question as string;

  const rl = createInterface({
    input: process.stdin,
    output: process.stderr, // stderr로 출력 (stdout은 프로그램 출력용)
  });

  return new Promise((resolve) => {
    process.stderr.write(`\n❓ ${question}\n> `);
    rl.once('line', (answer) => {
      rl.close();
      resolve({ content: answer || '(응답 없음)', is_error: false });
    });
  });
}

// --- Gitignore helpers ---

const ALWAYS_IGNORE = new Set([
  'node_modules', '.git', '.next', '.nuxt', '__pycache__',
  '.venv', 'venv', '.tox', 'dist', 'build', '.cache',
  '.DS_Store', 'Thumbs.db', '.idea', '.vscode',
  'target', '.gradle', '.terraform',
]);

function shouldIgnore(name: string, _relativePath: string, _patterns: string[]): boolean {
  return ALWAYS_IGNORE.has(name) || name.startsWith('.');
}

function loadGitignore(cwd: string): string[] {
  const gitignorePath = path.join(cwd, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];
  try {
    return fs.readFileSync(gitignorePath, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  } catch {
    return [];
  }
}

// --- Tool result builder ---

export function buildToolResults(
  toolBlocks: ContentBlock[],
  results: Map<string, { content: string; is_error: boolean }>,
): ContentBlock[] {
  return toolBlocks
    .filter(b => b.type === 'tool_use' && b.id)
    .map(b => {
      const r = results.get(b.id!);
      return {
        type: 'tool_result' as const,
        tool_use_id: b.id!,
        content: r?.content || 'No result',
        is_error: r?.is_error || false,
      };
    });
}
