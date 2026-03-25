// Anthropic Messages API Client — SSE 스트리밍 + tool_use 루프

import { getConfig } from './config.js';

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface StreamEvent {
  type: string;
  // message_start
  message?: {
    id: string;
    model: string;
    usage?: { input_tokens: number; output_tokens: number };
  };
  // content_block_start
  index?: number;
  content_block?: ContentBlock;
  // content_block_delta
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
  };
  // message_delta
  usage?: { output_tokens: number };
}

export interface ApiResponse {
  id: string;
  type: string;
  role: string;
  content: ContentBlock[];
  model: string;
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

export type OnText = (text: string) => void;
export type OnToolUseStart = (id: string, name: string) => void;
export type OnToolUseInput = (partialJson: string) => void;
export type OnComplete = (response: ApiResponse) => void;

export interface StreamCallbacks {
  onText?: OnText;
  onToolUseStart?: OnToolUseStart;
  onToolUseInput?: OnToolUseInput;
  onComplete?: OnComplete;
}

export async function sendMessages(
  messages: Message[],
  systemPrompt: string,
  tools: ToolDefinition[],
  callbacks: StreamCallbacks = {},
  model?: string,
): Promise<ApiResponse> {
  const config = getConfig();
  const url = `${config.serverUrl}/proxy/v1/messages`;
  const selectedModel = model || config.model || 'claude-sonnet-4-20250514';

  const body: Record<string, unknown> = {
    model: selectedModel,
    max_tokens: 8192,
    stream: true,
    system: systemPrompt,
    messages,
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 요청 실패 (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('응답 스트림이 없습니다.');
  }

  return parseSSEStream(response.body, callbacks);
}

async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  callbacks: StreamCallbacks,
): Promise<ApiResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Accumulated response
  const result: ApiResponse = {
    id: '',
    type: 'message',
    role: 'assistant',
    content: [],
    model: '',
    stop_reason: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  };

  // Current content block being built
  let currentBlockIndex = -1;
  let currentToolInput = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let eventType = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
        continue;
      }

      if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        if (!dataStr) continue;

        let event: StreamEvent;
        try {
          event = JSON.parse(dataStr);
        } catch {
          continue;
        }

        // Override type with SSE event type if available
        if (eventType) {
          event.type = eventType;
          eventType = '';
        }

        switch (event.type) {
          case 'message_start':
            if (event.message) {
              result.id = event.message.id;
              result.model = event.message.model;
              if (event.message.usage) {
                result.usage.input_tokens = event.message.usage.input_tokens;
              }
            }
            break;

          case 'content_block_start':
            currentBlockIndex = event.index ?? result.content.length;
            if (event.content_block) {
              const block: ContentBlock = { type: event.content_block.type };
              if (event.content_block.type === 'text') {
                block.text = '';
              } else if (event.content_block.type === 'tool_use') {
                block.id = event.content_block.id;
                block.name = event.content_block.name;
                block.input = {};
                currentToolInput = '';
                callbacks.onToolUseStart?.(block.id!, block.name!);
              }
              result.content[currentBlockIndex] = block;
            }
            break;

          case 'content_block_delta':
            if (event.delta) {
              if (event.delta.type === 'text_delta' && event.delta.text) {
                const idx = event.index ?? currentBlockIndex;
                const block = result.content[idx];
                if (block && block.type === 'text') {
                  block.text = (block.text || '') + event.delta.text;
                }
                callbacks.onText?.(event.delta.text);
              } else if (event.delta.type === 'input_json_delta' && event.delta.partial_json) {
                currentToolInput += event.delta.partial_json;
                callbacks.onToolUseInput?.(event.delta.partial_json);
              }
            }
            break;

          case 'content_block_stop': {
            const idx = event.index ?? currentBlockIndex;
            const block = result.content[idx];
            if (block && block.type === 'tool_use' && currentToolInput) {
              try {
                block.input = JSON.parse(currentToolInput);
              } catch {
                block.input = { raw: currentToolInput };
              }
              currentToolInput = '';
            }
            break;
          }

          case 'message_delta':
            if (event.delta) {
              const delta = event.delta as unknown as { stop_reason?: string };
              if (delta.stop_reason) {
                result.stop_reason = delta.stop_reason;
              }
            }
            if (event.usage) {
              result.usage.output_tokens = event.usage.output_tokens;
            }
            break;

          case 'message_stop':
            callbacks.onComplete?.(result);
            break;

          case 'error': {
            const errData = event as unknown as { error?: { message?: string } };
            throw new Error(`API 에러: ${errData.error?.message || 'Unknown'}`);
          }
        }
      }
    }
  }

  return result;
}
