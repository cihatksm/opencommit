import * as vscode from 'vscode';
import { simpleGit, SimpleGit, DiffResult } from 'simple-git';
import * as path from 'path';

/**
 * Extract git diff from the current workspace.
 * - Prefers staged changes.
 * - Falls back to unstaged changes if nothing is staged.
 * - Uses simple-git for reliable git interaction.
 */
export async function getGitDiff(workspaceRoot: string): Promise<GitDiffResult> {
    const git: SimpleGit = simpleGit(workspaceRoot);

    // Check if we're in a git repo
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error('The current workspace is not a git repository.');
    }

    // Get staged diff
    const stagedDiff = await git.diff(['--cached', '--unified=3']);
    if (stagedDiff && stagedDiff.trim().length > 0) {
        return {
            diff: stagedDiff,
            source: 'staged',
        };
    }

    // Fallback: unstaged changes
    const unstagedDiff = await git.diff(['--unified=3']);
    if (unstagedDiff && unstagedDiff.trim().length > 0) {
        return {
            diff: unstagedDiff,
            source: 'unstaged',
        };
    }

    // Fallback: check for untracked files by staging them temporarily? No.
    // Instead, check working tree status
    const status = await git.status();
    const hasChanges = status.files.length > 0;

    if (!hasChanges) {
        throw new Error('No changes detected in the repository. Stage some changes first and try again.');
    }

    // If we have files but no diff (unlikely), try to get diff of working tree vs HEAD
    const workingDiff = await git.diff(['HEAD', '--unified=3']);
    return {
        diff: workingDiff || '',
        source: 'working-tree',
    };
}

/**
 * Summarize a large diff to fit within the API's context window.
 * Keeps the most important parts: file names, function signatures, and first/last chunks.
 */
export function summarizeDiff(diff: string, maxLength: number): string {
    if (diff.length <= maxLength) {
        return diff;
    }

    const lines = diff.split('\n');
    const headerLines: string[] = [];
    const bodyLines: string[] = [];
    let inHeader = true;

    for (const line of lines) {
        if (inHeader) {
            headerLines.push(line);
            if (line.startsWith('@@')) {
                inHeader = false;
                bodyLines.push(line);
            }
        } else {
            bodyLines.push(line);
        }
    }

    // Always include: file headers + first chunk + last chunk
    const availableBody = maxLength - headerLines.join('\n').length - 200; // reserve for summary note
    if (availableBody <= 0) {
        return headerLines.join('\n') + '\n\n[Diff truncated — too large to display fully]';
    }

    const half = Math.floor(availableBody / 2);
    const firstHalf = bodyLines.slice(0, Math.min(half, bodyLines.length)).join('\n');
    const secondHalf = bodyLines.slice(Math.max(0, bodyLines.length - half)).join('\n');

    const separator = '\n\n... [middle of diff truncated for brevity] ...\n\n';

    return headerLines.join('\n') + '\n' + firstHalf + separator + secondHalf;
}

export interface GitDiffResult {
    diff: string;
    source: 'staged' | 'unstaged' | 'working-tree';
}

/**
 * Get the list of changed files for context.
 */
export async function getChangedFiles(workspaceRoot: string): Promise<string[]> {
    const git: SimpleGit = simpleGit(workspaceRoot);
    const status = await git.status();
    return [
        ...status.staged,
        ...status.modified,
        ...status.not_added,
        ...status.created,
        ...status.renamed.map(r => r.to),
    ];
}
