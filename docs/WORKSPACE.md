# Rimvio — Cursor workspace

Rimvio and **Silent Ghost** (`ghostsilence-programmer`) are **separate repos**. Open the correct workspace so Cursor rules and tests apply to the right project.

## Rimvio only (recommended for Rimvio work)

1. **File → Open Workspace from File…**
2. Select:
   ```
   c:\Users\userguest\Desktop\new-project\rimvio.code-workspace
   ```

Or from terminal:

```powershell
cursor "c:\Users\userguest\Desktop\new-project\rimvio.code-workspace"
```

**Applies:** `.cursor/rules/rimvio-*.mdc`  
**Dev:** `npm run dev` → http://localhost:3000  
**Tests:** `npm test` in `new-project`

## Both projects (multi-root)

```
c:\Users\userguest\Desktop\rimvio-and-silent-ghost.code-workspace
```

| Folder | Port | Rules |
|--------|------|--------|
| **Rimvio** (`new-project`) | 3000 | `rimvio-*.mdc` |
| **Silent Ghost** (`ghostsilence-programmer`) | 38471 bridge | `engine-site-separation`, etc. |

When editing a file, match the **folder name** — do not apply Silent Ghost truth-log patterns to Rimvio chat/orchestrator.

## Do not

- Open Rimvio files from **only** the Silent Ghost workspace root (SG rules leak into Rimvio edits).
- Run Silent Ghost `npm test` to verify Rimvio orchestrator changes.
- Import across repos.

See also: [RIMVIO_HANDOFF.md](./RIMVIO_HANDOFF.md) · `.cursor/rules/rimvio-isolation.mdc`
