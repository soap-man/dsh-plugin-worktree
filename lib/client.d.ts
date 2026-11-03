import type { Context } from "@deepseek-ai/cordis";

export const inject: string[];
export function apply(ctx: Context): void;

export const __test: {
  pathBasename(path: string): string;
  worktreePathInfo(
    path: string,
  ): { rootPath: string; name: string } | null;
  isWorktreePath(path: string): boolean;
  decorateWorkspaceSnapshot<T extends { items: any[] }>(source: T): T;
  titleWithIcon(text: string): string | ReturnType<typeof import("react").createElement>;
  WORKTREE_BADGE: string;
  WORKTREE_SEPARATOR: string;
};
