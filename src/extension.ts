import * as vscode from 'vscode';
import { generateAndInjectCommitMessage } from './commitGenerator';
import { storeApiToken, deleteApiToken, getApiToken } from './opencodeClient';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100,
    );
    statusBarItem.command = 'opencommit.generateCommitMessage';
    statusBarItem.text = '$(git-commit) AI Commit';
    statusBarItem.tooltip = 'Generate commit message with OpenCode AI';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register command: Generate Commit Message
    const generateCmd = vscode.commands.registerCommand(
        'opencommit.generateCommitMessage',
        async () => {
            await generateAndInjectCommitMessage(context, statusBarItem);
        },
    );
    context.subscriptions.push(generateCmd);

    // Register command: Regenerate Commit Message
    const regenerateCmd = vscode.commands.registerCommand(
        'opencommit.regenerateCommitMessage',
        async () => {
            await generateAndInjectCommitMessage(context, statusBarItem);
        },
    );
    context.subscriptions.push(regenerateCmd);

    // Register command: Set API Token
    const setTokenCmd = vscode.commands.registerCommand(
        'opencommit.setApiToken',
        async () => {
            const existingToken = await getApiToken(context.secrets);

            const token = await vscode.window.showInputBox({
                title: 'OpenCode API Token',
                prompt: 'Enter your AI API token (OpenAI, OpenRouter, Groq, DeepSeek, etc.)',
                placeHolder: 'sk-...',
                password: true,
                ignoreFocusOut: true,
                value: existingToken || '',
                validateInput: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return 'Token cannot be empty';
                    }
                    if (value.trim().length < 10) {
                        return 'Token seems too short. Please enter a valid API token.';
                    }
                    return null;
                },
            });

            if (token !== undefined) {
                if (token.trim().length === 0) {
                    // User wants to remove the token
                    await deleteApiToken(context.secrets);
                    vscode.window.showInformationMessage(
                        'OpenCommit: API token has been removed.',
                    );
                } else {
                    await storeApiToken(context.secrets, token.trim());
                    // Also mask the token in the notification
                    const masked = token.trim().slice(0, 4) + '...' + token.trim().slice(-4);
                    vscode.window.showInformationMessage(
                        `OpenCommit: API token saved (${masked}).`,
                    );
                }
            }
        },
    );
    context.subscriptions.push(setTokenCmd);

    // Log activation (without any sensitive data)
    console.log('OpenCommit extension activated.');
}

export function deactivate(): void {
    // Clean up
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    console.log('OpenCommit extension deactivated.');
}
