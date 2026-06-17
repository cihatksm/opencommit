import * as vscode from 'vscode';
import { getGitDiff, summarizeDiff, getChangedFiles } from './git';
import { generateCommitMessage, getApiToken } from './opencodeClient';

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

                // Step 4: Get settings
                const model = config.get<string>('model', 'gpt-4o-mini');
                const conventionalCommit = config.get<boolean>('conventionalCommit', true);
                const multiLine = config.get<boolean>('multiLine', false);

                // Step 5: Update progress
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
