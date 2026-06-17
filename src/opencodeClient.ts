import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DEFAULT_API_URL = 'https://opencode.ai/zen/v1/chat/completions';

export interface OpenCodeMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenCodeRequest {
    model: string;
    messages: OpenCodeMessage[];
}

export interface OpenCodeResponse {
    choices?: Array<{
        message?: {
            content?: string;
        };
    }>;
    error?: {
        message: string;
        type?: string;
    };
}

/**
 * Securely retrieve the API token from VS Code SecretStorage.
 * Falls back to workspace configuration for backward compatibility.
 */
export async function getApiToken(secrets: vscode.SecretStorage): Promise<string | undefined> {
    // Prefer SecretStorage (secure)
    const secretToken = await secrets.get('opencommit.apiToken');
    if (secretToken) {
        return secretToken;
    }

    // Fallback to configuration (less secure, but convenient for team sharing)
    const config = vscode.workspace.getConfiguration('commitMessageGenerator');
    const configToken = config.get<string>('apiToken');
    return configToken || undefined;
}

/**
 * Securely store the API token in VS Code SecretStorage.
 */
export async function storeApiToken(secrets: vscode.SecretStorage, token: string): Promise<void> {
    await secrets.store('opencommit.apiToken', token);
}

/**
 * Delete the stored API token.
 */
export async function deleteApiToken(secrets: vscode.SecretStorage): Promise<void> {
    await secrets.delete('opencommit.apiToken');
}

/**
 * Get the API base URL from configuration.
 */
export function getApiBaseUrl(): string {
    const config = vscode.workspace.getConfiguration('commitMessageGenerator');
    return config.get<string>('apiBaseUrl', DEFAULT_API_URL);
}

/**
 * Call the AI API (OpenAI-compatible) to generate a commit message from git diff.
 * Falls back to OpenCode CLI if the user has it installed and configured.
 */
export async function generateCommitMessage(
    diff: string,
    model: string,
    apiToken: string,
    conventionalCommit: boolean,
    multiLine: boolean,
): Promise<string> {
    const apiBaseUrl = getApiBaseUrl();
    const systemPrompt = buildSystemPrompt(conventionalCommit, multiLine);
    const userPrompt = buildUserPrompt(diff);

    // Try OpenCode CLI first if the user has configured it
    if (apiBaseUrl === 'opencode-cli') {
        return generateViaOpenCodeCli(diff, conventionalCommit, multiLine);
    }

    // Standard OpenAI-compatible API call
    const requestBody: OpenCodeRequest = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    };

    const response = await fetch(apiBaseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication failed. Check your API token. Use "OpenCommit: Set API Token" to update it.');
        }
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Wait a moment and try again.');
        }
        if (response.status === 404) {
            throw new Error(
                `API endpoint not found: ${apiBaseUrl}\n\n` +
                'The URL may be wrong. Go to VS Code Settings → OpenCommit → Api Base Url and set:\n' +
                '- OpenAI: https://api.openai.com/v1/chat/completions\n' +
                '- OpenRouter: https://openrouter.ai/api/v1/chat/completions\n' +
                '- LM Studio (local): http://localhost:1234/v1/chat/completions\n' +
                '- Ollama (local): http://localhost:11434/v1/chat/completions\n' +
                '- Or type "opencode-cli" to use the OpenCode CLI tool.',
            );
        }
        throw new Error(`API error (${response.status}): ${errorText.slice(0, 300)}`);
    }

    const data = (await response.json()) as OpenCodeResponse;

    if (data.error) {
        throw new Error(`API error: ${data.error.message}`);
    }

    const message = data.choices?.[0]?.message?.content;
    if (!message) {
        throw new Error('No commit message returned from the API. The response was empty.');
    }

    return cleanCommitMessage(message);
}

/**
 * Use the locally installed OpenCode CLI to generate a commit message.
 */
async function generateViaOpenCodeCli(
    diff: string,
    conventionalCommit: boolean,
    multiLine: boolean,
): Promise<string> {
    const format = conventionalCommit ? 'conventional' : 'simple';
    const style = multiLine ? 'multi-line' : 'single-line';

    const prompt = `Generate a ${format} ${style} git commit message for this diff. Output ONLY the message, nothing else:\n\n${diff}`;

    // Escape for shell
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const cmd = `opencode -p "${escaped}" --no-tools`;

    try {
        const { stdout, stderr } = await execAsync(cmd, {
            timeout: 30000,
            maxBuffer: 1024 * 1024,
            env: { ...process.env, OPENCODE_NO_COLOR: '1' },
        });

        if (stderr && !stdout) {
            throw new Error(`OpenCode CLI error: ${stderr}`);
        }

        const cleaned = cleanCommitMessage(stdout.trim());
        if (!cleaned || cleaned.length < 3) {
            throw new Error('OpenCode CLI returned an empty commit message.');
        }
        return cleaned;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
            `OpenCode CLI failed: ${msg}\n\n` +
            'Make sure OpenCode is installed (https://opencode.ai/docs) and available in your PATH.\n' +
            'Or switch to an API provider in VS Code Settings → OpenCommit → Api Base Url.',
        );
    }
}

function buildSystemPrompt(conventionalCommit: boolean, multiLine: boolean): string {
    let prompt = `You are an expert git commit message generator. Your ONLY job is to output a perfect git commit message based on the provided diff.

RULES:
- Output ONLY the commit message text — no explanations, no markdown, no code fences.
- Use imperative mood ("Add feature" not "Added feature").
- Keep the subject line under 72 characters.`;

    if (conventionalCommit) {
        prompt += `
- Use Conventional Commits format: <type>: <description>
  Types: feat, fix, refactor, perf, style, test, docs, chore, ci, build, revert
- Include a scope if obvious from the diff: feat(scope): description`;
    }

    if (multiLine) {
        prompt += `
- Format as multi-line:
  Line 1: Subject line (conventional commit format)
  Line 2: Blank
  Line 3+: Body explaining WHAT changed and WHY (not how)
  Wrap body at 72 characters.`;
    } else {
        prompt += `
- Output a single-line commit message only.`;
    }

    prompt += `
- Be specific and descriptive — mention key files, functions, or features changed.
- If the diff includes breaking changes, add "BREAKING CHANGE:" prefix or "!" after type/scope.`;

    return prompt;
}

function buildUserPrompt(diff: string): string {
    return `Here is the git diff. Generate the commit message now:

\`\`\`diff
${diff}
\`\`\``;
}

function cleanCommitMessage(message: string): string {
    // Remove code fences if the AI wrapped the message
    let cleaned = message
        .replace(/^```[a-z]*\n?/gm, '')
        .replace(/\n?```$/gm, '')
        .replace(/^commit message:?\s*/i, '')
        .trim();

    // Remove leading/trailing quotes
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // Ensure first line is not empty and starts with a letter
    if (cleaned.length === 0) {
        return 'chore: update code';
    }

    return cleaned;
}
