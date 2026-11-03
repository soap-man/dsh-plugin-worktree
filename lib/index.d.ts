import type { Context } from "@deepseek-ai/cordis";
import type { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

export interface WorktreeCreateResult {
  path: string;
  branch: string;
  repoRoot: string;
}

export interface WorktreeRemoveResult {
  removed: boolean;
  branch: string | null;
  branchDeleted: boolean;
  branchDeleteRefused: boolean;
}

export interface WorktreeServiceConfig {
  root?: string;
  worktreesDir?: string;
}

export class WorktreeService extends TypertRemoteService {
  constructor(ctx: Context, config?: WorktreeServiceConfig);
  create(name: string, root?: string, branch?: string): Promise<WorktreeCreateResult>;
  remove(path: string, root?: string): Promise<WorktreeRemoveResult>;
  removeWorktree(path: string, root?: string): Promise<WorktreeRemoveResult>;
  branchExists(branch: string, root?: string): Promise<boolean>;
}

export const DEFAULT_WORKTREES_DIR: string;
export function normalizeWorktreeName(value: unknown): string;
export function runGit(args: string[], cwd: string): Promise<string>;
export function resolveRepoRoot(root: string): Promise<string>;
export function resolveWorktreesDir(repoRoot: string, worktreesDir?: string): string;
export function ensureGitExclude(repoRoot: string, base: string): Promise<void>;
export function branchExists(branch: string, root: string): Promise<boolean>;
export function parseWorktreePorcelain(
  porcelain: string,
  targetPath: string,
): { registered: boolean; branch: string | null };
export function createGitWorktree(options: {
  root: string;
  worktreesDir?: string;
  name: string;
  branch?: string;
}): Promise<WorktreeCreateResult>;
export function removeGitWorktree(options: {
  root: string;
  worktreesDir?: string;
  path: string;
  deleteBranch?: boolean;
}): Promise<WorktreeRemoveResult>;

export default WorktreeService;
