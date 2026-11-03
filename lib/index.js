/**
 * dsh-plugin-worktree host plugin.
 *
 * Mounts the `ctx.worktree` Typert remote service. The web client calls the
 * `worktree/create` RPC when the user confirms a worktree name in the
 * new-session workspace picker; this service creates the git worktree and
 * returns its path so the client can create the session inside it.
 *
 * A session's cwd is immutable after creation (dsh session headers store the
 * cwd durably and session/workspace attach validates against it), so once the
 * session is opened in the worktree, every following turn runs there.
 */
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { branchExists as checkBranchExists, createGitWorktree, removeGitWorktree } from "./worktree.js";

/**
 * Decorator initializers captured for the class below.
 *
 * The project is authored in plain JS (no TypeScript decorator emit), so we
 * drive the Typert `Remote` decorator by hand. Each captured initializer runs
 * with the service instance as `this` inside the constructor, exactly like the
 * TC39 decorator pipeline that compiled TypeScript emits.
 */
const remoteInitializers = [];

/**
 * Register one remote method on a service class with the Typert protocol.
 *
 * @param {typeof TypertRemoteService} constructor - service class.
 * @param {string} method - public instance method name.
 */
function markRemoteMethod(constructor, method) {
  Remote(method)(constructor.prototype[method], {
    kind: "method",
    name: method,
    private: false,
    static: false,
    addInitializer(initializer) {
      remoteInitializers.push(initializer);
    },
  });
}

/**
 * Host service for git worktree creation (`ctx.worktree`).
 */
export class WorktreeService extends TypertRemoteService {
  /** No service dependencies: git runs through the host process. */
  static inject = [];

  /**
   * @param {import('@deepseek-ai/cordis').Context} ctx - cordis context.
   * @param {object} [config] - optional row config.
   * @param {string} [config.root] - repo lookup root; defaults to `process.cwd()`.
   * @param {string} [config.worktreesDir] - worktree root; absolute or relative to repo top-level.
   */
  constructor(ctx, config = {}) {
    super(ctx, "worktree");
    for (const initializer of remoteInitializers) initializer.call(this);
    this.root = config.root ?? process.cwd();
    this.worktreesDir = config.worktreesDir ?? ".dsh/worktrees";
  }

  /**
   * Create a git worktree for a new session.
   *
   * @param {string} name - user-supplied worktree name, e.g. `feat/okta-sso`.
   * @param {string} [root] - repo root to create the worktree in; defaults to the configured root.
   * @param {string} [branch] - custom branch name; defaults to `dsh/<name>`.
   * @returns {Promise<{path: string, branch: string, repoRoot: string}>}
   */
  async create(name, root, branch) {
    return await createGitWorktree({
      root: root ?? this.root,
      worktreesDir: this.worktreesDir,
      name,
      branch,
    });
  }

  /**
   * Check whether a git branch already exists in the repository.
   *
   * @param {string} branch - branch name to check.
   * @param {string} [root] - repo root to check in; defaults to the configured root.
   * @returns {Promise<boolean>} true when the branch exists.
   */
  async branchExists(branch, root) {
    return await checkBranchExists(branch, root ?? this.root);
  }

  /**
   * Remove a worktree and its branch before the workspace registration is
   * deleted.
   *
   * @param {string} path - absolute worktree path to remove.
   * @param {string} [root] - repo root that owns the worktree; defaults to the configured root.
   * @returns {Promise<{removed: boolean, branch: string | null, branchDeleted: boolean, branchDeleteRefused: boolean}>}
   */
  async remove(path, root) {
    return await removeGitWorktree({
      root: root ?? this.root,
      worktreesDir: this.worktreesDir,
      path,
      deleteBranch: true,
    });
  }

  /**
   * Remove a worktree only, keeping its branch, before the workspace
   * registration is deleted.
   *
   * @param {string} path - absolute worktree path to remove.
   * @param {string} [root] - repo root that owns the worktree; defaults to the configured root.
   * @returns {Promise<{removed: boolean, branch: string | null, branchDeleted: boolean, branchDeleteRefused: boolean}>}
   */
  async removeWorktree(path, root) {
    return await removeGitWorktree({
      root: root ?? this.root,
      worktreesDir: this.worktreesDir,
      path,
      deleteBranch: false,
    });
  }
}

markRemoteMethod(WorktreeService, "create");
markRemoteMethod(WorktreeService, "remove");
markRemoteMethod(WorktreeService, "removeWorktree");
markRemoteMethod(WorktreeService, "branchExists");

export {
  branchExists,
  createGitWorktree,
  ensureGitExclude,
  normalizeWorktreeName,
  removeGitWorktree,
  resolveRepoRoot,
  resolveWorktreesDir,
  runGit,
} from "./worktree.js";

export default WorktreeService;
