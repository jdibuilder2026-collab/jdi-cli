// Context Manager — 토큰 예산 관리 + 대화 히스토리 압축

import type { Message, ContentBlock } from './client.js';

// 대략적인 토큰 추정 (영문 4자 = 1토큰, 한글 2자 = 1토큰)
function estimateTokens(text: string): number {
  // 한글 비율 계산
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  const nonKorean = text.length - koreanChars;
  return Math.ceil(koreanChars / 2 + nonKorean / 4);
}

function messageTokens(msg: Message): number {
  if (typeof msg.content === 'string') {
    return estimateTokens(msg.content);
  }
  if (Array.isArray(msg.content)) {
    let total = 0;
    for (const block of msg.content) {
      if (block.type === 'text' && block.text) {
        total += estimateTokens(block.text);
      } else if (block.type === 'tool_result' && block.content) {
        total += estimateTokens(block.content);
      } else if (block.type === 'tool_use') {
        total += estimateTokens(JSON.stringify(block.input || {}));
      }
    }
    return total;
  }
  return 0;
}

// 메시지 배열의 총 토큰 추정
export function estimateTotalTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + messageTokens(msg), 0);
}

// 토큰 예산 초과 시 오래된 메시지 제거
// 최근 대화를 유지하면서 budget 이내로 줄임
const MAX_CONTEXT_TOKENS = 100_000; // 100K 토큰 제한
const TRIM_TARGET = 60_000;         // 줄일 때 60K까지

export function trimMessages(messages: Message[]): Message[] {
  const total = estimateTotalTokens(messages);
  if (total <= MAX_CONTEXT_TOKENS) return messages;

  // 가장 오래된 메시지부터 제거하되, 첫 유저 메시지는 최소한 보존
  const trimmed = [...messages];
  
  // 앞에서부터 쌍으로 제거 (user + assistant 쌍)
  while (estimateTotalTokens(trimmed) > TRIM_TARGET && trimmed.length > 4) {
    // 첫 2개 메시지 (user + assistant 한 쌍) 제거
    trimmed.splice(0, 2);
  }

  // 대화 잘렸음을 알리는 시스템 메시지 삽입
  if (trimmed.length < messages.length) {
    const removed = messages.length - trimmed.length;
    trimmed.unshift({
      role: 'user',
      content: `[이전 ${removed}개 메시지가 토큰 제한으로 생략되었습니다. 현재 대화의 맥락에 집중하세요.]`,
    });
  }

  return trimmed;
}

// tool_result 내용이 너무 길면 축약
const MAX_TOOL_RESULT_TOKENS = 10_000;

export function truncateToolResult(content: string): string {
  const tokens = estimateTokens(content);
  if (tokens <= MAX_TOOL_RESULT_TOKENS) return content;

  // 앞뒤 보존, 중간 잘라냄
  const maxChars = MAX_TOOL_RESULT_TOKENS * 4; // 대략적 변환
  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = Math.floor(maxChars * 0.2);

  return (
    content.slice(0, headSize) +
    '\n\n... [중간 생략: 출력이 너무 길어 일부만 표시합니다] ...\n\n' +
    content.slice(-tailSize)
  );
}

// 대화 히스토리에서 토큰 사용량 보고
export function getContextStats(messages: Message[]): {
  messageCount: number;
  estimatedTokens: number;
  budgetPercent: number;
} {
  const tokens = estimateTotalTokens(messages);
  return {
    messageCount: messages.length,
    estimatedTokens: tokens,
    budgetPercent: Math.round((tokens / MAX_CONTEXT_TOKENS) * 100),
  };
}
