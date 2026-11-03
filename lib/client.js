/**
 * dsh-plugin-worktree browser half.
 *
 * UI/UX integration:
 * 1. The new-session hero gets a Worktree chip right after the workspace
 *    selector. It lists existing worktree workspaces and can create a new
 *    git worktree through its New worktree… action.
 * 2. Worktree workspaces are marked in the workspace store so the sidebar
 *    renders a `⑂` branch badge after their name.
 * 3. Deleting a worktree workspace asks whether to also remove the git
 *    worktree and its dsh branch before deleting the workspace registration.
 */
window.__ModuleLoader__.load({
  id: "dsh-plugin-worktree",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");
    let react_dom_client = require("react-dom/client");
    let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

    const { Fragment, jsx, jsxs } = react_jsx_runtime;
    const { useCallback, useEffect, useRef, useState } = react;
    const { createRoot } = react_dom_client;
    const {
      Button,
      IconFolderClose16,
      IconPlusOutline16,
      Input,
      Menu,
      Modal,
      Toast
    } = primitives;

    /** Locale namespace owned by this plugin. */
    const NS = "worktree";

    /** Separator between root workspace name and worktree name. */
    const WORKTREE_SEPARATOR = " \u{168C2}\uFE0E ";

    /** Badge used as the sidebar worktree marker (same separator). */
    const WORKTREE_BADGE = WORKTREE_SEPARATOR;

    const zh = {
      "hero.chooseWorkspace": "选择工作区",
      "worktreeChip": "Worktree",
      "mainWorktree": "主工作区",
      "worktreeChip.aria": "选择或创建 git worktree",
      "worktree.new": "新建 worktree…",
      "addWorkspace": "添加工作区",
      "picker.loading": "正在加载…",
      "folderError.title": "无法添加工作区",
      "cancel": "取消",
      "retry": "重试",
      "close": "关闭",
      "worktree.title": "新建 Git Worktree",
      "worktree.description": "在当前仓库的 .dsh/worktrees 下创建 git worktree，并把新会话打开到该目录。",
      "worktree.name.label": "Worktree 名称",
      "worktree.name.placeholder": "例如 feat/okta-sso",
      "worktree.name.action": "创建 worktree",
      "worktree.name.creating": "正在创建…",
      "worktree.branch.label": "分支名称",
      "worktree.branch.exists": "该分支已存在",
      "worktree.folder.label": "或使用已有目录",
      "worktree.folder.placeholder": "输入绝对路径，例如 /Users/me/repo/.dsh/worktrees/feat/okta-sso",
      "worktree.folder.action": "打开目录",
      "worktree.folder.browse": "浏览…",
      "delete.title": "删除工作区",
      "delete.worktree.description": "“{name}” 是一个 git worktree 工作区。",
      "delete.worktree.checkbox": "删除 worktree",
      "delete.branch.checkbox": "删除分支",
      "delete.workspace.action": "删除工作区",
      "delete.pending": "正在删除…",
      "delete.cancel": "取消",
      "delete.failed": "删除失败",
      "delete.toast.workspace": "工作区已删除",
      "delete.toast.worktree": "工作区和 worktree 已删除",
      "delete.toast.worktreeBranch": "工作区、worktree 和分支已删除",
      "delete.toast.worktreeBranchKept": "工作区和 worktree 已删除，分支因未合并已保留"
    };

    const en = {
      "hero.chooseWorkspace": "Choose workspace",
      "worktreeChip": "Worktree",
      "mainWorktree": "Main",
      "worktreeChip.aria": "Select or create a git worktree",
      "worktree.new": "New worktree…",
      "addWorkspace": "Add workspace",
      "picker.loading": "Loading…",
      "folderError.title": "Could not add workspace",
      "cancel": "Cancel",
      "retry": "Retry",
      "close": "Close",
      "worktree.title": "New Git Worktree",
      "worktree.description": "Create a git worktree under .dsh/worktrees in the current repository and open the new session there.",
      "worktree.name.label": "Worktree name",
      "worktree.name.placeholder": "e.g. feat/okta-sso",
      "worktree.name.action": "Create worktree",
      "worktree.name.creating": "Creating…",
      "worktree.branch.label": "Branch name",
      "worktree.branch.exists": "This branch already exists",
      "worktree.folder.label": "Or use an existing folder",
      "worktree.folder.placeholder": "Enter an absolute path, e.g. /Users/me/repo/.dsh/worktrees/feat/okta-sso",
      "worktree.folder.action": "Open folder",
      "worktree.folder.browse": "Browse…",
      "delete.title": "Delete workspace",
      "delete.worktree.description": "\"{name}\" is a git worktree workspace.",
      "delete.worktree.checkbox": "Delete worktree",
      "delete.branch.checkbox": "Delete branch",
      "delete.workspace.action": "Delete workspace",
      "delete.pending": "Deleting…",
      "delete.cancel": "Cancel",
      "delete.failed": "Delete failed",
      "delete.toast.workspace": "Workspace deleted",
      "delete.toast.worktree": "Workspace and worktree deleted",
      "delete.toast.worktreeBranch": "Workspace, worktree, and branch deleted",
      "delete.toast.worktreeBranchKept": "Workspace and worktree deleted; branch kept (unmerged)"
    };

    /** Last path segment, without a trailing separator. */
    function pathBasename(path) {
      if (typeof path !== "string") return path;
      return path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? path;
    }

    /** Split a worktree path into `{ rootPath, name }`, or null when it is not a worktree path. */
    function worktreePathInfo(path) {
      if (typeof path !== "string") return null;
      const normalized = path.replace(/\\/g, "/");
      const marker = "/.dsh/worktrees/";
      const index = normalized.indexOf(marker);
      if (index === -1) return null;
      const rootPath = normalized.slice(0, index);
      const name = normalized.slice(index + marker.length);
      if (rootPath === "" || name === "") return null;
      return { rootPath, name };
    }

    /** Whether a workspace path points inside the dsh worktrees directory. */
    function isWorktreePath(path) {
      return worktreePathInfo(path) !== null;
    }

    /**
     * Worktree icon from Microsoft vscode-codicons
     * (https://github.com/microsoft/vscode-codicons), used under the
     * CC BY 4.0 license.
     */
    function WorktreeIcon({ size = 16, className, style }) {
      return jsx("svg", {
        width: size,
        height: size,
        className,
        style,
        viewBox: "0 0 16 16",
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        "aria-hidden": true,
        children: jsx("path", {
          d: "M12.854 14.8542L14.854 12.8542C15.049 12.6592 15.049 12.3422 14.854 12.1472L12.854 10.1472C12.659 9.95223 12.342 9.95223 12.147 10.1472C11.952 10.3422 11.952 10.6592 12.147 10.8542L13.293 12.0002H8.5C8.225 12.0002 8 11.7752 8 11.5002V5.50023C8 5.22523 8.225 5.00023 8.5 5.00023H13.293L12.147 6.14623C12.049 6.24423 12.001 6.37223 12.001 6.50023C12.001 6.62823 12.05 6.75623 12.147 6.85423C12.342 7.04923 12.659 7.04923 12.854 6.85423L14.854 4.85423C15.049 4.65923 15.049 4.34223 14.854 4.14723L12.854 2.14723C12.659 1.95223 12.342 1.95223 12.147 2.14723C11.952 2.34223 11.952 2.65923 12.147 2.85423L13.293 4.00023H8.5C7.673 4.00023 7 4.67323 7 5.50023V8.00023H1.5C1.224 8.00023 1 8.22423 1 8.50023C1 8.77623 1.224 9.00023 1.5 9.00023H7V11.5002C7 12.3272 7.673 13.0002 8.5 13.0002H13.293L12.147 14.1462C12.049 14.2442 12.001 14.3722 12.001 14.5002C12.001 14.6282 12.05 14.7562 12.147 14.8542C12.342 15.0492 12.659 15.0492 12.854 14.8542Z",
          fill: "currentColor",
          stroke: "currentColor",
          strokeWidth: 0.25
        })
      });
    }

    /**
     * Directory-flow occupant: a modal that creates a git worktree and hands
     * the resulting path (or an existing typed/browsed path) back to the owner
     * through `onPicked(path)`.
     */
    function WorktreeDirectoryFlow(props) {
      const { open, busy, onPicked, onCancel, createWorktree, branchExists, pickDirectory, root, t } = props;
      const [name, setName] = useState("");
      const [branch, setBranch] = useState("");
      const [branchDirty, setBranchDirty] = useState(false);
      const [path, setPath] = useState("");
      const [error, setError] = useState(null);
      const [creating, setCreating] = useState(false);
      const [picking, setPicking] = useState(false);
      const [branchExistsWarning, setBranchExistsWarning] = useState(false);

      useEffect(() => {
        if (open) {
          setName("");
          setBranch("");
          setBranchDirty(false);
          setPath("");
          setError(null);
          setCreating(false);
          setPicking(false);
          setBranchExistsWarning(false);
        }
      }, [open]);

      const trimmedName = name.trim();
      const defaultBranch = trimmedName === "" ? "" : `dsh/${trimmedName}`;
      const branchValue = branchDirty ? branch : defaultBranch;
      const effectiveBranch = branchValue.trim() === "" ? defaultBranch : branchValue.trim();

      useEffect(() => {
        if (!open || effectiveBranch === "" || typeof branchExists !== "function") {
          setBranchExistsWarning(false);
          return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
          try {
            const exists = await branchExists(effectiveBranch, root);
            if (!cancelled) setBranchExistsWarning(exists);
          } catch {
            if (!cancelled) setBranchExistsWarning(false);
          }
        }, 300);
        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }, [open, effectiveBranch, root, branchExists]);

      if (!open) return null;

      const trimmedPath = path.trim();
      const adoptPath = (value) => {
        if (value === "") return;
        onPicked(value);
      };

      const browseDirectory = async () => {
        if (picking || busy) return;
        setPicking(true);
        setError(null);
        try {
          const picked = await pickDirectory();
          if (picked !== null) onPicked(picked);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
          setPicking(false);
        }
      };

      const submitWorktree = async () => {
        if (trimmedName === "" || creating || busy || branchExistsWarning) return;
        setCreating(true);
        setError(null);
        try {
          const created = await createWorktree(trimmedName, root, effectiveBranch);
          onPicked(created.path);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setCreating(false);
        }
      };

      return jsx(Modal, {
        open: true,
        onClose: onCancel,
        title: t("worktree.title"),
        description: t("worktree.description"),
        children: jsxs(Fragment, {
          children: [
            jsxs("div", {
              style: { display: "flex", flexDirection: "column", gap: 8 },
              children: [
                jsx("label", {
                  style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" },
                  children: t("worktree.name.label")
                }),
                jsx(Input, {
                  value: name,
                  onChange: (event) => {
                    setName(event.target.value);
                    setBranchExistsWarning(false);
                  },
                  onKeyDown: (event) => {
                    if (event.key === "Enter" && trimmedName !== "" && !creating && !busy && !branchExistsWarning) submitWorktree();
                  },
                  placeholder: t("worktree.name.placeholder"),
                  autoFocus: true,
                  disabled: creating || busy
                }),
                jsx("label", {
                  style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" },
                  children: t("worktree.branch.label")
                }),
                jsx(Input, {
                  value: branchValue,
                  onChange: (event) => {
                    const value = event.target.value;
                    setBranch(value);
                    setBranchDirty(value.trim() !== "");
                    setBranchExistsWarning(false);
                  },
                  onKeyDown: (event) => {
                    if (event.key === "Enter" && trimmedName !== "" && !creating && !busy && !branchExistsWarning) submitWorktree();
                  },
                  placeholder: defaultBranch,
                  disabled: creating || busy
                }),
                branchExistsWarning && jsx("div", {
                  role: "alert",
                  style: { fontSize: 12, color: "var(--dsw-alias-state-error-primary)" },
                  children: t("worktree.branch.exists")
                }),
                jsx(Button, {
                  variant: "primary",
                  disabled: trimmedName === "" || creating || busy || branchExistsWarning,
                  onClick: submitWorktree,
                  children: creating ? t("worktree.name.creating") : t("worktree.name.action")
                })
              ]
            }),
            jsxs("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid var(--dsw-alias-border-l2)"
              },
              children: [
                jsx("label", {
                  style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" },
                  children: t("worktree.folder.label")
                }),
                jsx(Input, {
                  value: path,
                  onChange: (event) => setPath(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === "Enter" && trimmedPath !== "" && !busy) adoptPath(trimmedPath);
                  },
                  placeholder: t("worktree.folder.placeholder"),
                  disabled: busy
                }),
                jsxs("div", {
                  style: { display: "flex", gap: 8 },
                  children: [
                    jsx(Button, {
                      variant: "outline",
                      disabled: trimmedPath === "" || busy,
                      onClick: () => adoptPath(trimmedPath),
                      children: t("worktree.folder.action")
                    }),
                    jsx(Button, {
                      variant: "ghost",
                      disabled: picking || busy,
                      onClick: browseDirectory,
                      children: t("worktree.folder.browse")
                    })
                  ]
                })
              ]
            }),
            error !== null && jsx("div", {
              role: "alert",
              style: { fontSize: 12, color: "var(--dsw-alias-state-error-primary)", marginTop: 8 },
              children: error
            })
          ]
        }),
        footer: jsx(Button, {
          variant: "outline",
          onClick: onCancel,
          children: t("cancel")
        })
      });
    }

    const ADD_WORKSPACE = "::add-workspace";
    const NEW_WORKTREE = "::new-worktree";

    /**
     * Shadowing occupant for `conversation.hero.workspace`.
     *
     * The owner (ui-conversation) already renders the workspace chip and gives
     * us the picker popover. We add a Worktree chip inline (so it appears right
     * after the workspace selector), re-create the workspace picker menu, and
     * render the worktree creation flow directly.
     */
    function WorkspacePicker(props) {
      const {
        anchorRef,
        selectedId,
        onPick,
        onClose,
        useSessions,
        useWorkspaces,
        createWorkspace,
        createWorktree,
        branchExists,
        pickDirectory,
        archiveSession,
        t
      } = props;

      const workspaceSnapshot = useWorkspaces((state) => state);
      const workspaces = workspaceSnapshot.items;
      const phase = workspaceSnapshot.phase;
      const sessions = useSessions((state) => state);
      const currentSessionId = sessions.current;
      const currentSession = currentSessionId === undefined ? undefined : sessions.byId[currentSessionId];
      const currentWorkspace = currentSessionId === undefined
        ? undefined
        : workspaces.find((workspace) => workspace.sessionIds.includes(currentSessionId));

      const [worktreeFlowOpen, setWorktreeFlowOpen] = useState(false);
      const [pickingFolder, setPickingFolder] = useState(false);
      const [pickingWorkspace, setPickingWorkspace] = useState(false);
      const [errorOpen, setErrorOpen] = useState(false);
      const [modalError, setModalError] = useState(null);
      const [errorRetry, setErrorRetry] = useState(null);
      const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
      const [worktreeMenuOpen, setWorktreeMenuOpen] = useState(false);
      const worktreeAnchorRef = useRef(null);

      const busy = pickingFolder || pickingWorkspace;

      const getWorkspaceAnchorRect = useCallback(
        () => anchorRef?.current?.getBoundingClientRect() ?? null,
        [anchorRef]
      );
      const getWorktreeAnchorRect = useCallback(
        () => worktreeAnchorRef.current?.getBoundingClientRect() ?? null,
        []
      );

      const selectedWorkspace = workspaces.find((workspace) => workspace.workspaceId === selectedId);
      const displayWorkspace = selectedWorkspace ?? currentWorkspace;
      const workspaceChipLabel = displayWorkspace?.worktree
        ? displayWorkspace.rootWorkspaceTitle
        : displayWorkspace?.title ?? (currentSession?.cwd !== undefined ? pathBasename(currentSession.cwd) : undefined);

      // Worktrees are per repository. The list must follow the current root
      // workspace (the repo the selected/current workspace belongs to).
      const currentRootPath = displayWorkspace?.worktree
        ? displayWorkspace.rootPath
        : displayWorkspace?.path;
      const rootWorkspace = currentRootPath === undefined
        ? undefined
        : workspaces.find((workspace) => workspace.path === currentRootPath && !workspace.worktree);
      const workspaceMenuSelectedId = displayWorkspace?.worktree
        ? (displayWorkspace.rootWorkspaceId ?? rootWorkspace?.workspaceId)
        : displayWorkspace?.workspaceId;
      const worktreeChipLabel = displayWorkspace?.worktree
        ? displayWorkspace.worktreeName
        : rootWorkspace !== undefined && displayWorkspace?.workspaceId === rootWorkspace.workspaceId
          ? t("mainWorktree")
          : t("worktreeChip");
      const worktreeWorkspaces = workspaces.filter(
        (workspace) => workspace.worktree === true && workspace.rootPath === currentRootPath
      );

      // Switching to a different workspace/repo invalidates the worktree menu.
      useEffect(() => {
        setWorktreeMenuOpen(false);
      }, [currentRootPath]);

      // Keep the original WorkspaceChip (and its exact style). We only patch the
      // visible label text after React renders it: the workspace chip should show
      // the root workspace name when the current workspace is a worktree. The
      // effect deliberately runs after every render so React text updates can
      // never stick with the old worktree title.
      //
      // We also own the chip's click behavior with a native listener that stops
      // propagation in the bubble phase: the original React onClick toggles
      // ui-conversation's `pickerOpen`, while our menu is driven by local state.
      // Letting both run makes the menu look "always open" (outside-pointerdown
      // closes it, then the chip click toggles it right back open). Stopping the
      // native event before it reaches React's root delegation prevents the
      // React onClick from firing at all.
      const workspaceChipLabelRef = useRef(workspaceChipLabel);
      workspaceChipLabelRef.current = workspaceChipLabel;
      useEffect(() => {
        const node = anchorRef?.current;
        if (node === undefined || node === null) return;
        const label = workspaceChipLabelRef.current;
        if (label === undefined) return;
        const span = node.querySelector("span");
        if (span !== null) span.textContent = label;
      });
      useEffect(() => {
        const node = anchorRef?.current;
        if (node === undefined || node === null) return;
        const onClick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          setWorkspaceMenuOpen((value) => !value);
        };
        node.addEventListener("click", onClick);
        node.setAttribute("aria-expanded", String(workspaceMenuOpen));
        return () => {
          node.removeEventListener("click", onClick);
        };
      }, [anchorRef, workspaceMenuOpen]);

      const showError = useCallback((message, retry) => {
        setModalError(message);
        setErrorRetry(typeof retry === "function" ? retry : null);
        setErrorOpen(true);
      }, []);

      const openWorktreeFlow = useCallback(() => {
        setErrorOpen(false);
        setModalError(null);
        setErrorRetry(null);
        setWorktreeFlowOpen(true);
        onClose();
      }, [onClose]);

      // "Add workspace" keeps its original meaning: pick an existing folder.
      const openWorkspaceFlow = useCallback(async () => {
        setErrorOpen(false);
        setModalError(null);
        setErrorRetry(null);
        onClose();
        setPickingWorkspace(true);
        try {
          const path = await pickDirectory();
          if (path === null) return;
          const workspace = await createWorkspace({ path });
          onPick(workspace.workspaceId);
        } catch (reason) {
          showError(reason instanceof Error ? reason.message : String(reason), openWorkspaceFlow);
        } finally {
          setPickingWorkspace(false);
        }
      }, [createWorkspace, onClose, onPick, pickDirectory, showError]);

      const adoptDirectory = (path) =>
        createWorkspace({ path })
          .then((workspace) => {
            setWorktreeFlowOpen(false);
            onPick(workspace.workspaceId);
          })
          .catch((reason) => {
            setWorktreeFlowOpen(false);
            showError(reason instanceof Error ? reason.message : String(reason), openWorktreeFlow);
          });

      const worktreeFlowOwner = {
        open: worktreeFlowOpen,
        busy: pickingFolder,
        onPicked: (path) => {
          setPickingFolder(true);
          adoptDirectory(path).finally(() => {
            setPickingFolder(false);
          });
        },
        onCancel: () => {
          setWorktreeFlowOpen(false);
        }
      };

      const workspaceItems = workspaces
        .filter((workspace) => workspace.worktree !== true)
        .map((workspace) => ({
          id: workspace.workspaceId,
          label: workspace.title,
          icon: jsx(IconFolderClose16, {}),
          disabled: busy
        }));
      const workspaceFooter = [{
        id: ADD_WORKSPACE,
        label: t("addWorkspace"),
        icon: jsx(IconPlusOutline16, {}),
        disabled: busy
      }];

      const worktreeItems = [
        ...(rootWorkspace === undefined
          ? []
          : [{
              id: rootWorkspace.workspaceId,
              label: "Main",
              icon: jsx(WorktreeIcon, {}),
              disabled: busy
            }]),
        ...worktreeWorkspaces.map((workspace) => ({
          id: workspace.workspaceId,
          label: workspace.worktreeName,
          icon: jsx(WorktreeIcon, {}),
          disabled: busy
        }))
      ];
      const worktreeFooter = [{
        id: NEW_WORKTREE,
        label: t("worktree.new"),
        icon: jsx(IconPlusOutline16, {}),
        disabled: busy
      }];

      // Select a workspace. When the current session is a blank session sitting
      // in a worktree and the target is a DIFFERENT worktree (or the main root
      // workspace of the same repo), archive the old blank session so the
      // sidebar "New Session" item appears to move into the target workspace.
      const switchWorkspace = (workspaceId) => {
        const targetWorkspace = workspaces.find((workspace) => workspace.workspaceId === workspaceId);
        const oldSessionId = currentSessionId;
        const oldWorkspace = currentWorkspace;
        const oldSessionBlank = currentSession?.blank === true;
        const targetIsSameRepoMain = targetWorkspace !== undefined &&
          targetWorkspace.worktree !== true &&
          oldWorkspace?.rootPath === targetWorkspace.path;
        onPick(workspaceId);
        if (
          oldWorkspace?.worktree === true &&
          oldSessionBlank &&
          oldSessionId !== undefined &&
          targetWorkspace !== undefined &&
          targetWorkspace.workspaceId !== oldWorkspace.workspaceId &&
          (targetWorkspace.worktree === true || targetIsSameRepoMain)
        ) {
          Promise.resolve()
            .then(() => archiveSession(oldSessionId))
            .catch(() => {});
        }
      };

      const handleWorkspaceSelect = (id) => {
        setWorkspaceMenuOpen(false);
        if (id === ADD_WORKSPACE) {
          openWorkspaceFlow();
          return;
        }
        switchWorkspace(id);
      };

      const handleWorktreeSelect = (id) => {
        setWorktreeMenuOpen(false);
        if (id === NEW_WORKTREE) {
          openWorktreeFlow();
          return;
        }
        switchWorkspace(id);
      };

      return jsxs(Fragment, {
        children: [
          jsxs("button", {
            ref: worktreeAnchorRef,
            type: "button",
            "aria-label": t("worktreeChip.aria"),
            "aria-haspopup": "menu",
            "aria-expanded": worktreeMenuOpen,
            onClick: () => setWorktreeMenuOpen((value) => !value),
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              border: "1px solid var(--dsw-alias-border-l2)",
              borderRadius: 999,
              background: "var(--dsw-alias-button-elevated-fill)",
              color: "var(--dsw-alias-label-primary)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              lineHeight: "20px",
              whiteSpace: "nowrap",
              maxWidth: 260
            },
            children: [
              jsx(WorktreeIcon, { size: 16 }),
              jsx("span", {
                style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                children: worktreeChipLabel
              })
            ]
          }),
          jsx(Menu, {
            open: workspaceMenuOpen,
            anchor: null,
            items: workspaceItems,
            footer: workspaceFooter,
            selectedId: workspaceMenuSelectedId,
            onSelect: handleWorkspaceSelect,
            onClose: () => setWorkspaceMenuOpen(false),
            side: "bottom",
            portal: true,
            getAnchorRect: getWorkspaceAnchorRect
          }),
          workspaceMenuOpen && phase === "pending" && jsx("div", {
            role: "status",
            style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)" },
            children: t("picker.loading")
          }),
          jsx(Menu, {
            open: worktreeMenuOpen,
            anchor: null,
            items: worktreeItems,
            footer: worktreeFooter,
            selectedId,
            onSelect: handleWorktreeSelect,
            onClose: () => setWorktreeMenuOpen(false),
            side: "bottom",
            portal: true,
            getAnchorRect: getWorktreeAnchorRect
          }),
          jsx(WorktreeDirectoryFlow, {
            open: worktreeFlowOpen,
            busy: pickingFolder,
            onPicked: worktreeFlowOwner.onPicked,
            onCancel: worktreeFlowOwner.onCancel,
            createWorktree,
            branchExists,
            pickDirectory,
            root: currentRootPath,
            t
          }),
          jsx(Modal, {
            open: errorOpen,
            onClose: () => setErrorOpen(false),
            closeLabel: t("close"),
            title: t("folderError.title"),
            footer: jsxs(Fragment, {
              children: [
                jsx(Button, {
                  variant: "outline",
                  onClick: () => setErrorOpen(false),
                  children: t("cancel")
                }),
                errorRetry !== null && jsx(Button, {
                  variant: "primary",
                  onClick: () => {
                    setErrorOpen(false);
                    errorRetry();
                  },
                  children: t("retry")
                })
              ]
            }),
            children: jsx("div", {
              role: "alert",
              style: { fontSize: 13, color: "var(--dsw-alias-label-secondary)" },
              children: modalError
            })
          })
        ]
      });
    }
    /**
     * Confirmation dialog for deleting a worktree workspace.
     *
     * The workspace itself is always deleted. The user may optionally delete
     * the git worktree directory, and if so may also delete its branch. The
     * dialog stays open until the workspace deletion succeeds.
     */
    function WorktreeDeleteDialog({ workspace, t, officialT, onCancel, performDelete, onDeleted }) {
      const [deleteWorktree, setDeleteWorktree] = useState(false);
      const [deleteBranch, setDeleteBranch] = useState(false);
      const [deleting, setDeleting] = useState(false);
      const [error, setError] = useState(null);

      const confirm = async () => {
        if (deleting) return;
        setDeleting(true);
        setError(null);
        try {
          const result = await performDelete(deleteWorktree, deleteBranch);
          onDeleted(result);
        } catch (reason) {
          setDeleting(false);
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      };

      const checkboxStyle = {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: "var(--dsw-alias-label-secondary)"
      };

      return jsx(Modal, {
        open: true,
        onClose: deleting ? () => {} : onCancel,
        closeLabel: t("cancel"),
        title: t("delete.title"),
        description: officialT("delete.desc", { name: workspace.title }),
        footer: jsxs(Fragment, {
          children: [
            jsx(Button, {
              variant: "outline",
              disabled: deleting,
              onClick: onCancel,
              children: t("delete.cancel")
            }),
            jsx(Button, {
              variant: "primary",
              disabled: deleting,
              onClick: confirm,
              children: t("delete.workspace.action")
            })
          ]
        }),
        children: jsxs(Fragment, {
          children: [
            jsx("div", {
              style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)", marginBottom: 8 },
              children: t("delete.worktree.description", { name: workspace.title })
            }),
            jsxs("label", {
              style: checkboxStyle,
              children: [
                jsx("input", {
                  type: "checkbox",
                  checked: deleteWorktree,
                  disabled: deleting,
                  onChange: (event) => {
                    setDeleteWorktree(event.target.checked);
                    if (!event.target.checked) setDeleteBranch(false);
                  }
                }),
                jsx("span", { children: t("delete.worktree.checkbox") })
              ]
            }),
            jsxs("label", {
              style: { ...checkboxStyle, marginTop: 8, opacity: deleteWorktree ? 1 : 0.5 },
              children: [
                jsx("input", {
                  type: "checkbox",
                  checked: deleteBranch,
                  disabled: deleting || !deleteWorktree,
                  onChange: (event) => setDeleteBranch(event.target.checked)
                }),
                jsx("span", { children: t("delete.branch.checkbox") })
              ]
            }),
            deleting && jsx("div", {
              role: "status",
              style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)", marginTop: 8 },
              children: t("delete.pending")
            }),
            error !== null && jsx("div", {
              role: "alert",
              style: { fontSize: 12, color: "var(--dsw-alias-state-error-primary)", marginTop: 8 },
              children: error
            })
          ]
        })
      });
    }

    /** Required client services. */
    const inject = ["slots", "workspaces", "connection", "locale"];

    /**
     * Mount a promise-based modal. Resolves `"deleted"` only after the
     * workspace deletion succeeds, or `"cancel"` when the user cancels.
     */
    function requestWorktreeDelete(workspace, t, officialT, performDelete, onDeleted) {
      return new Promise((resolve) => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        const settle = (value) => {
          root.unmount();
          container.remove();
          resolve(value);
        };
        root.render(
          jsx(WorktreeDeleteDialog, {
            workspace,
            t,
            officialT,
            onCancel: () => settle("cancel"),
            performDelete,
            onDeleted: (result) => {
              settle("deleted");
              onDeleted(result);
            }
          })
        );
      });
    }

    /** Recursively replace the workspace delete request callback in the sidebar tree. */
    function patchDeleteRequest(node, helpers) {
      if (!react.isValidElement(node)) return node;
      const { props } = node;
      if (typeof props?.onDeleteRequest === "function") {
        const originalOnDeleteRequest = props.onDeleteRequest;
        return react.cloneElement(node, {
          onDeleteRequest: (workspaceId, title) => {
            const workspace = helpers.workspaces.find((item) => item.workspaceId === workspaceId);
            if (workspace === undefined || !isWorktreePath(workspace.path)) {
              originalOnDeleteRequest(workspaceId, title);
              return;
            }
            handleWorktreeDeleteRequest(workspace, helpers);
          }
        });
      }
      const children = props?.children;
      if (children === undefined || children === null) return node;
      const nextChildren = Array.isArray(children)
        ? children.map((child) => patchDeleteRequest(child, helpers))
        : patchDeleteRequest(children, helpers);
      return react.cloneElement(node, { children: nextChildren });
    }

    /** Render a workspace title string with the worktree icon in place of the glyph separator. */
    function titleWithIcon(text) {
      const separator = /\u{168C2}\uFE0E/u;
      if (typeof text !== "string" || !separator.test(text)) return text;
      const parts = text.split(separator);
      const children = [];
      parts.forEach((part, index) => {
        if (index > 0) {
          children.push(jsx(WorktreeIcon, {
            key: `worktree-sep-${index}`,
            size: 14,
            style: { verticalAlign: "-0.125em", margin: "0 2px" }
          }));
        }
        if (part !== "") children.push(part);
      });
      return jsxs(Fragment, { children });
    }

    /** Recursively replace the text worktree separator with the worktree icon in sidebar labels. */
    function patchWorktreeTitles(node) {
      if (typeof node === "string") return titleWithIcon(node);
      if (!react.isValidElement(node)) return node;
      let next = node;
      const props = node.props;
      if (Array.isArray(props?.workspaces)) {
        const nextWorkspaces = props.workspaces.map((workspace) => {
          if (workspace && workspace.worktree === true && typeof workspace.title === "string") {
            const nextTitle = titleWithIcon(workspace.title);
            if (nextTitle !== workspace.title) return { ...workspace, title: nextTitle };
          }
          return workspace;
        });
        next = react.cloneElement(node, { workspaces: nextWorkspaces });
      }
      const nextProps = next.props;
      const children = nextProps?.children;
      if (children === undefined || children === null) return next;
      const nextChildren = Array.isArray(children)
        ? children.map((child) => patchWorktreeTitles(child))
        : patchWorktreeTitles(children);
      return react.cloneElement(next, { children: nextChildren });
    }

    /** Run the plugin's worktree deletion flow before dsh's own confirm modal. */
    async function handleWorktreeDeleteRequest(workspace, helpers) {
      await requestWorktreeDelete(
        workspace,
        helpers.t,
        helpers.officialT,
        async (deleteWorktree, deleteBranch) => {
          let branchDeleted = false;
          let branchDeleteRefused = false;
          if (deleteWorktree) {
            const method = deleteBranch ? "worktree/remove" : "worktree/removeWorktree";
            const result = await helpers.connection.rpc.call(
              "/api",
              method,
              { args: { path: workspace.path, root: workspace.rootPath } }
            );
            if (!result.ok) {
              throw new Error(result.error?.message ?? helpers.t("delete.failed"));
            }
            if (deleteBranch) {
              branchDeleted = result.value?.branchDeleted === true;
              branchDeleteRefused = result.value?.branchDeleteRefused === true;
            }
          }
          await helpers.deleteWorkspace(workspace.workspaceId);
          return { deleteWorktree, deleteBranch, branchDeleted, branchDeleteRefused };
        },
        (result) => helpers.onDeleted(result)
      );
    }

    /**
     * Patch the sidebar workspace browser so deleting a worktree workspace asks
     * first (before dsh's own confirm modal). Non-worktree workspaces keep the
     * original delete confirmation.
     */
    function patchSidebarDeleteFlow(ctx, connection, tWorktree) {
      const patchedEntries = new WeakSet();
      const restorers = [];
      const patch = () => {
        const entries = ctx.slots.entries("sidebar.workspaces");
        for (const entry of entries) {
          if ((entry.options.priority ?? 0) !== 0 || typeof entry.component !== "function") continue;
          if (patchedEntries.has(entry)) continue;
          patchedEntries.add(entry);
          const OriginalWorkspaceBrowser = entry.component;
          const Wrapped = function WorktreeSidebarBrowser(props) {
            const [toast, setToast] = useState(null);
            const toastSeq = useRef(0);
            const showToast = useCallback((text) => {
              toastSeq.current += 1;
              setToast({ seq: toastSeq.current, text });
            }, []);
            const dismissToast = useCallback(() => setToast(null), []);
            const workspaceSnapshot = props.useWorkspaces((state) => state);
            const originalElement = OriginalWorkspaceBrowser(props);
            const patchedElement = patchWorktreeTitles(patchDeleteRequest(originalElement, {
              workspaces: workspaceSnapshot.items,
              connection,
              t: tWorktree,
              officialT: props.t,
              deleteWorkspace: props.deleteWorkspace,
              onDeleted: (result) => showToast(
                result.deleteWorktree
                  ? result.deleteBranch
                    ? result.branchDeleted
                      ? tWorktree("delete.toast.worktreeBranch")
                      : result.branchDeleteRefused
                        ? tWorktree("delete.toast.worktreeBranchKept")
                        : tWorktree("delete.toast.worktree")
                    : tWorktree("delete.toast.worktree")
                  : tWorktree("delete.toast.workspace")
              )
            }));
            return jsxs(Fragment, {
              children: [
                patchedElement,
                toast !== null && jsx(Toast, {
                  key: toast.seq,
                  text: toast.text,
                  onDone: dismissToast
                })
              ]
            });
          };
          entry.component = Wrapped;
          restorers.push(() => {
            if (entry.component === Wrapped) entry.component = OriginalWorkspaceBrowser;
          });
        }
      };
      patch();
      const unsubscribe = ctx.slots.subscribe("sidebar.workspaces", patch);
      return () => {
        unsubscribe();
        for (const restore of restorers.splice(0)) restore();
      };
    }

    /** Decorate the workspace list with worktree markers and badges. */
    function decorateWorkspaceSnapshot(source) {
      if (source === null || typeof source !== "object" || !Array.isArray(source.items)) return source;
      const byPath = new Map(source.items.map((workspace) => [workspace.path, workspace]));
      let changed = false;
      const items = source.items.map((workspace) => {
        const info = worktreePathInfo(workspace.path);
        if (info !== null) {
          const rootWorkspace = byPath.get(info.rootPath);
          const rootWorkspaceTitle = rootWorkspace !== undefined && worktreePathInfo(rootWorkspace.path) === null
            ? rootWorkspace.title
            : pathBasename(info.rootPath);
          const next = {
            ...workspace,
            worktree: true,
            worktreeName: info.name,
            rootPath: info.rootPath,
            rootWorkspaceId: rootWorkspace?.workspaceId,
            rootWorkspaceTitle,
            title: `${rootWorkspaceTitle}${WORKTREE_BADGE}${info.name}`
          };
          if (next.title !== workspace.title || next.worktreeName !== workspace.worktreeName || next.rootWorkspaceTitle !== workspace.rootWorkspaceTitle || next.rootWorkspaceId !== workspace.rootWorkspaceId) {
            changed = true;
          }
          return next;
        }
        const next = workspace.worktree === false ? workspace : { ...workspace, worktree: false };
        if (next !== workspace) changed = true;
        return next;
      });
      return changed ? { ...source, items } : source;
    }

    /**
     * Patch the workspace snapshot store so every consumer (sidebar, hero,
     * pickers) sees `worktree: true` plus the branch badge on worktree titles.
     */
    function patchWorkspaceSnapshot(workspaces) {
      const store = workspaces.list;
      const originalGetSnapshot = store.getSnapshot.bind(store);
      let cachedSource;
      let cachedValue;
      store.getSnapshot = () => {
        const source = originalGetSnapshot();
        if (source === cachedSource) return cachedValue;
        cachedSource = source;
        cachedValue = decorateWorkspaceSnapshot(source);
        return cachedValue;
      };
    }

    /**
     * Client plugin body.
     * @param {import('@deepseek-ai/cordis').Context} ctx - client root context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "worktree: dictionaries");

      const workspaces = ctx.workspaces;
      const connection = ctx.connection;
      const t = ctx.locale.bind(NS);

      patchWorkspaceSnapshot(workspaces);
      const disposeSidebarDeletePatch = patchSidebarDeleteFlow(ctx, connection, t);
      ctx.effect(() => disposeSidebarDeletePatch, "worktree: sidebar delete patch");

      const injected = () => ({
        createWorktree: async (name, root, branch, signal) => {
          const args = { name, ...(root ? { root } : {}), ...(branch ? { branch } : {}) };
          const result = await connection.rpc.call(
            "/api",
            "worktree/create",
            { args },
            signal
          );
          if (!result.ok) {
            throw new Error(result.error?.message ?? "worktree creation failed");
          }
          return result.value;
        },
        branchExists: async (branch, root) => {
          const result = await connection.rpc.call(
            "/api",
            "worktree/branchExists",
            { args: { branch, root } }
          );
          if (!result.ok) {
            throw new Error(result.error?.message ?? "branch existence check failed");
          }
          return result.value;
        },
        pickDirectory: () => workspaces.pickDirectory(),
        createWorkspace: (input) => workspaces.create(input),
        archiveSession: (sessionId) => workspaces.archiveSession(sessionId)
      });

      // Shadow the hero workspace picker so we can add the Worktree chip right
      // after the workspace selector while keeping workspace selection working.
      ctx.slots.inject("conversation.hero.workspace", () =>
        ctx.slots.register(
          {
            name: "conversation.hero.workspace",
            priority: -1,
            locale: NS,
            inject: injected
          },
          WorkspacePicker
        )
      );
    }

    exports.apply = apply;
    exports.inject = inject;

    // Internal test surface. Not part of the public plugin API; used only by
    // the Node test suite to exercise pure browser-side helpers in isolation.
    exports.__test = {
      pathBasename,
      worktreePathInfo,
      isWorktreePath,
      decorateWorkspaceSnapshot,
      titleWithIcon,
      WORKTREE_BADGE,
      WORKTREE_SEPARATOR
    };

    return module.exports;
  }
});
