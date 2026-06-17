import * as vscode from 'vscode';

const OPENCODE_API_URL = 'https://opencode.ai/api/chat';

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
 * Call the OpenCode AI API to generate a commit message from git diff.
 */
export async function generateCommitMessage(
    diff: string,
    model: string,
    apiToken: string,
    conventionalCommit: boolean,
    multiLine: boolean,
): Promise<string> {
    const systemPrompt = buildSystemPrompt(conventionalCommit, multiLine);
    const userPrompt = buildUserPrompt(diff);

    const requestBody: OpenCodeRequest = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    };

    const response = await fetch(OPENCODE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication failed. Please check your OpenCode API token. Use "OpenCommit: Set OpenCode API Token" to update it.');
        }
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        throw new Error(`OpenCode API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as OpenCodeResponse;

    if (data.error) {
        throw new Error(`OpenCode API error: ${data.error.message}`);
    }

    const message = data.choices?.[0]?.message?.content;
    if (!message) {
        throw new Error('No commit message was returned from the API. The response was empty.');
    }

    return cleanCommitMessage(message);
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
