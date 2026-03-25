// Tool definitions — Anthropic tool_use 스펙

import type { ToolDefinition } from '../client.js';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file. For large files, use offset and limit to read specific portions.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path (relative to working directory or absolute)' },
        offset: { type: 'number', description: 'Line number to start reading from (1-indexed). Optional.' },
        limit: { type: 'number', description: 'Maximum number of lines to read. Optional.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Creates the file if it doesn\'t exist, overwrites if it does. Automatically creates parent directories.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write to' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Edit a file by replacing exact text. The oldText must match exactly (including whitespace). Use for precise, surgical edits.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to edit' },
        oldText: { type: 'string', description: 'Exact text to find and replace (must match exactly)' },
        newText: { type: 'string', description: 'New text to replace the old text with' },
      },
      required: ['path', 'oldText', 'newText'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories. Returns names with type indicators (file/directory).',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list. Defaults to current directory.' },
        recursive: { type: 'boolean', description: 'If true, list recursively. Default: false.' },
        maxDepth: { type: 'number', description: 'Maximum depth for recursive listing. Default: 3.' },
      },
      required: [],
    },
  },
  {
    name: 'search_files',
    description: 'Search file contents using a regex pattern. Like grep -rn. Returns matching lines with file paths and line numbers.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        path: { type: 'string', description: 'Directory or file to search in. Defaults to current directory.' },
        include: { type: 'string', description: 'Glob pattern for files to include (e.g. "*.ts")' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'run_command',
    description: 'Execute a shell command in the working directory. Returns stdout, stderr, and exit code.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        timeout: { type: 'number', description: 'Timeout in seconds. Default: 30.' },
      },
      required: ['command'],
    },
  },
  {
    name: 'ask_user',
    description: 'Ask the user a question and wait for their response. Use when you need clarification or a decision.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question to ask the user' },
      },
      required: ['question'],
    },
  },
];
