import * as vscode from 'vscode';
import { getGitDiff, summarizeDiff, getChangedFiles } from './git';
import { generateCommitMessage, getApiToken } from './opencodeClient';

// Curated model list with cost hints — keep in sync with package.json enum
const MODEL_CHOICES = [
    { label: 'deepseek-v4-flash-free', description: '🆓 Free — fast, lightweight' },
    { label: 'deepseek-v4-flash', description: '💰 Paid — fast' },
    { label: 'deepseek-v4-pro', description: '💰💰 Paid — powerful' },
    { label: 'mimo-v2.5-free', description: '🆓 Free — lightweight' },
    { label: 'mimo-v2.5', description: '💰 Paid — balanced' },
    { label: 'mimo-v2.5-pro', description: '💰💰 Paid — powerful' },
    { label: 'minimax-m3-free', description: '🆓 Free — lightweight' },
    { label: 'minimax-m3', description: '💰 Paid — powerful' },
    { label: 'minimax-m2.7', description: '💰 Paid — balanced' },
    { label: 'minimax-m2.5', description: '💰 Paid — legacy' },
    { label: 'nemotron-3-super-free', description: '🆓 Free' },
    { label: 'qwen3.6-plus-free', description: '🆓 Free — lightweight' },
    { label: 'qwen3.7-plus', description: '💰 Paid — fast' },
    { label: 'qwen3.7-max', description: '💰💰 Paid — powerful' },
    { label: 'qwen3.6-plus', description: '💰 Paid — balanced' },
    { label: 'kimi-k2.5', description: '💰 Paid — balanced' },
    { label: 'kimi-k2.6', description: '💰💰 Paid — powerful' },
    { label: 'glm-5', description: '💰 Paid — balanced' },
    { label: 'glm-5.1', description: '💰💰 Paid — powerful' },
    { label: 'opencode-gen/kimi-k2.6', description: '💰 Paid — OpenCode hosted' },
    { label: 'gpt-4o-mini', description: '💰 Paid — OpenAI small' },
    { label: 'gpt-4o', description: '💰💰💰 Paid — OpenAI flagship' },
    { label: 'claude-3-5-sonnet', description: '💰💰💰 Paid — Anthropic' },
];

const LAST_MODEL_KEY = 'opencommit.lastModel';

/**
 * Prompt the user to pick an AI model via quick pick.
 * Pre-selects the last used model or config default.
 * Returns the chosen model label, or undefined if the user cancelled.
 */
async function promptModel(config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext): Promise<string | undefined> {
    const promptModelSetting = config.get<boolean>('promptModel', true);
    const configDefault = config.get<string>('model', 'deepseek-v4-flash-free');
    const lastUsed = context.globalState.get<string>(LAST_MODEL_KEY);

    // If promptModel is disabled, just use the default silently
    if (!promptModelSetting) {
        return lastUsed || configDefault;
    }

    // Prefer last used, then config default
    const defaultModel = lastUsed || configDefault;

    const pick = await vscode.window.showQuickPick(
        MODEL_CHOICES.map(m => ({
            label: m.label,
            description: m.description,
            picked: m.label === defaultModel,
        })),
        {
            title: '✨ Select AI Model for Commit Message',
            placeHolder: `Default: ${defaultModel} — use ↑↓ to change, Enter to confirm`,
            matchOnDescription: true,
            ignoreFocusOut: true,
        },
    );

    if (!pick) {
        return undefined; // user cancelled
    }

    // Remember for next time
    await context.globalState.update(LAST_MODEL_KEY, pick.label);
    return pick.label;
}

/**
 * Main orchestrator for the commit message generation workflow:
 * 1. Get the git diff
 * 2. Call the OpenCode API
 * 3. Inject the result into the Source Control input box
 */
export async function generateAndInjectCommitMessage(
    context: vscode.ExtensionContext,
    statusBarItem: vscode.StatusBarItem,
): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('OpenCommit: No workspace folder is open.');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration('commitMessageGenerator');

    // Check API token
    const apiToken = await getApiToken(context.secrets);
    if (!apiToken) {
        const setTokenAction = 'Set API Token';
        const result = await vscode.window.showErrorMessage(
            'OpenCommit: No API token configured. Please set your OpenCode API token first.',
            setTokenAction,
        );
        if (result === setTokenAction) {
            await vscode.commands.executeCommand('opencommit.setApiToken');
        }
        return;
    }

    // Prompt for model selection
    const model = await promptModel(config, context);
    if (!model) {
        // User cancelled
        statusBarItem.text = '✨ AI Commit';
        statusBarItem.tooltip = 'Generate commit message with AI';
        return;
    }

    // Read remaining settings
    const conventionalCommit = config.get<boolean>('conventionalCommit', true);
    const multiLine = config.get<boolean>('multiLine', false);

    // Show loading state
    statusBarItem.text = '✨ Analyzing...';
    statusBarItem.tooltip = 'Analyzing your changes...';
    statusBarItem.show();

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.SourceControl,
            title: 'OpenCommit',
            cancellable: false,
        },
        async (progress) => {
            progress.report({ message: 'Analyzing git diff...' });

            try {
                // Step 1: Get the git diff
                const diffResult = await getGitDiff(workspaceRoot);
                const sourceLabel =
                    diffResult.source === 'staged'
                        ? 'staged changes'
                        : diffResult.source === 'unstaged'
                            ? 'unstaged changes'
                            : 'working tree';

                progress.report({
                    message: `Processing ${sourceLabel}...`,
                });

                // Step 2: Get changed files for context
                let changedFiles: string[] = [];
                try {
                    changedFiles = await getChangedFiles(workspaceRoot);
                } catch {
                    // Non-critical — continue without file list
                }

                // Step 3: Summarize diff if needed
                const maxDiffLength = config.get<number>('maxDiffLength', 4000);
                const processedDiff = summarizeDiff(diffResult.diff, maxDiffLength);

                // Step 4: Update progress
                progress.report({
                    message: `Calling AI API (${model})...`,
                });

                // Step 6: Call the API
                const commitMessage = await generateCommitMessage(
                    processedDiff,
                    model,
                    apiToken,
                    conventionalCommit,
                    multiLine,
                );

                // Step 7: Inject the message into Source Control input
                await injectCommitMessage(commitMessage);

                // Step 8: Show success
                const sourceControlLabel =
                    diffResult.source === 'staged'
                        ? 'Staged'
                        : 'Unstaged';

                statusBarItem.text = '✅ Ready';
                statusBarItem.tooltip = `Generated from ${sourceControlLabel.toLowerCase()} changes using ${model}`;
                setTimeout(() => statusBarItem.hide(), 5000);

                vscode.window.showInformationMessage(
                    `OpenCommit: Commit message generated from ${sourceControlLabel.toLowerCase()} changes. You can edit it before committing.`,
                );
            } catch (error) {
                statusBarItem.hide();
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`OpenCommit: ${message}`);
            }
        },
    );
}

/**
 * Inject the generated commit message into the VS Code Source Control input box.
 * Uses the built-in Git extension's API for reliable injection.
 * Falls back to clipboard if injection fails.
 */
async function injectCommitMessage(message: string): Promise<void> {
    // Approach 1: Use the built-in Git extension's API (most reliable)
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (gitExtension) {
            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }
            const gitApi = gitExtension.exports.getAPI(1);
            if (gitApi?.repositories?.length > 0) {
                gitApi.repositories[0].inputBox.value = message;
                return;
            }
        }
    } catch {
        // Git extension not available — fall through to next approach
    }

    // Approach 2: Try the generic scm.inputBox (works when SCM view is focused)
    if (vscode.scm.inputBox) {
        vscode.scm.inputBox.value = message;
        return;
    }

    // Approach 3: Last fallback — copy to clipboard
    await vscode.env.clipboard.writeText(message);
    vscode.window.showInformationMessage(
        'OpenCommit: Commit message copied to clipboard (could not inject into SCM input).',
    );
}
