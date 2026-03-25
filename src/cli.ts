// CLI — 메인 REPL + login + 원샷 모드

import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { loadConfig, saveConfig, getConfig, type JdiConfig } from './config.js';
import { sendMessages, type Message, type ContentBlock } from './client.js';
import { TOOL_DEFINITIONS, executeTool, buildToolResults } from './tools/index.js';
import { getSystemPrompt } from './system-prompt.js';
import {
  renderToolCall, renderToolResult, renderUsage,
  renderError, renderWelcome, renderHelp,
} from './renderer.js';

// =====================
// Login
// =====================
export async function login(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const ask = (q: string): Promise<string> =>
    new Promise(r => rl.question(q, r));

  console.error(chalk.bold.blue('\nJDI 로그인 설정\n'));

  const existing = loadConfig();

  const serverUrl = await ask(
    `서버 URL${existing?.serverUrl ? ` (${existing.serverUrl})` : ''}: `,
  );
  const apiKey = await ask('API Key (cpk_...): ');

  if (apiKey && !apiKey.startsWith('cpk_')) {
    console.error(chalk.yellow('경고: API Key는 보통 cpk_ 로 시작합니다.'));
  }

  const config: JdiConfig = {
    serverUrl: serverUrl || existing?.serverUrl || '',
    apiKey: apiKey || existing?.apiKey || '',
    model: existing?.model,
  };

  if (!config.serverUrl || !config.apiKey) {
    console.error(chalk.red('서버 URL과 API Key를 모두 입력해야 합니다.'));
    rl.close();
    process.exit(1);
  }

  saveConfig(config);
  console.error(chalk.green('\n✓ 설정이 저장되었습니다.'));
  console.error(chalk.gray(`  설정 파일: ~/.jdi/config.json`));
  console.error(chalk.gray(`  서버: ${config.serverUrl}`));
  console.error(chalk.gray(`  API Key: ${config.apiKey.slice(0, 8)}...`));
  console.error('');

  // Test connection
  console.error('서버 연결 테스트 중...');
  try {
    const healthUrl = config.serverUrl.replace(/\/proxy\/?$/, '').replace(/\/$/, '') + '/actuator/health';
    const resp = await fetch(healthUrl);
    if (resp.ok) {
      console.error(chalk.green('✓ 서버 연결 성공\n'));
    } else {
      console.error(chalk.yellow(`⚠ 서버 응답: ${resp.status}\n`));
    }
  } catch {
    console.error(chalk.yellow('⚠ 서버 연결을 확인할 수 없습니다. URL을 확인하세요.\n'));
  }

  rl.close();
}

// =====================
// Agent Loop
// =====================
async function agentLoop(
  initialMessage: string,
  messages: Message[],
  cwd: string,
): Promise<void> {
  // Add user message
  messages.push({ role: 'user', content: initialMessage });

  const systemPrompt = getSystemPrompt(cwd);
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Agent loop — keep going until Claude stops using tools
  while (true) {
    let textOutput = '';

    const response = await sendMessages(
      messages,
      systemPrompt,
      TOOL_DEFINITIONS,
      {
        onText: (text) => {
          process.stdout.write(text);
          textOutput += text;
        },
        onToolUseStart: (_id, name) => {
          // Tool calls are shown after the stream completes
        },
      },
    );

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    // Check for tool_use blocks
    const toolBlocks = response.content.filter(b => b.type === 'tool_use');

    if (toolBlocks.length === 0) {
      // No tools — we're done
      if (textOutput) process.stdout.write('\n');
      renderUsage(totalInputTokens, totalOutputTokens);
      break;
    }

    // Finish any text output
    if (textOutput) process.stdout.write('\n');

    // Execute tools
    const results = new Map<string, { content: string; is_error: boolean }>();

    for (const block of toolBlocks) {
      if (!block.id || !block.name) continue;

      renderToolCall(block.name, block.input || {});
      const result = await executeTool(block.name, block.input || {}, cwd);
      renderToolResult(block.name, result);
      results.set(block.id, result);
    }

    // Build conversation: assistant message + tool results
    messages.push({ role: 'assistant', content: response.content });
    const toolResults = buildToolResults(toolBlocks, results);
    messages.push({ role: 'user', content: toolResults });
  }
}

// =====================
// REPL Mode
// =====================
export async function repl(): Promise<void> {
  getConfig(); // Validate config exists

  renderWelcome();

  const cwd = process.cwd();
  const messages: Message[] = [];

  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
    prompt: chalk.blue('> '),
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Slash commands
    if (input.startsWith('/')) {
      switch (input) {
        case '/help':
          renderHelp();
          break;
        case '/clear':
          messages.length = 0;
          console.error(chalk.gray('대화 기록이 초기화되었습니다.'));
          break;
        case '/model': {
          const config = getConfig();
          console.error(chalk.gray(`현재 모델: ${config.model || 'claude-sonnet-4-20250514'}`));
          break;
        }
        case '/config': {
          const config = getConfig();
          console.error(chalk.gray(`서버: ${config.serverUrl}`));
          console.error(chalk.gray(`API Key: ${config.apiKey.slice(0, 8)}...`));
          console.error(chalk.gray(`모델: ${config.model || 'claude-sonnet-4-20250514'}`));
          console.error(chalk.gray(`작업 디렉터리: ${cwd}`));
          break;
        }
        case '/exit':
          process.exit(0);
          break;
        default:
          console.error(chalk.yellow(`알 수 없는 명령어: ${input}`));
          renderHelp();
      }
      rl.prompt();
      return;
    }

    // Pause readline during agent execution
    rl.pause();
    process.stderr.write('\n');

    try {
      await agentLoop(input, messages, cwd);
    } catch (err) {
      renderError(err instanceof Error ? err.message : String(err));
    }

    process.stderr.write('\n');
    rl.prompt();
  });

  rl.on('close', () => {
    console.error(chalk.gray('\n종료합니다.'));
    process.exit(0);
  });
}

// =====================
// One-shot Mode
// =====================
export async function oneshot(prompt: string): Promise<void> {
  getConfig(); // Validate config exists

  const cwd = process.cwd();
  const messages: Message[] = [];

  try {
    await agentLoop(prompt, messages, cwd);
  } catch (err) {
    renderError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
