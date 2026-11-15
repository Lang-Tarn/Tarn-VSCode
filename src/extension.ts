// Tarn for VS Code.
//
// All the language smarts (type errors, lints, hover, go-to-definition,
// completion, outline, inlay hints) come from `tarn lsp`, the language server
// built into the Tarn compiler. This file starts it, adds a Run button and
// a status bar item.

import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, State } from "vscode-languageclient/node";

let client: LanguageClient | undefined;
let output: vscode.LogOutputChannel;
let status: vscode.StatusBarItem;
let binaryWatcher: fs.FSWatcher | undefined;
let restartTimer: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    output = vscode.window.createOutputChannel("Tarn", { log: true });
    status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    status.command = "tarn.showOutput";
    context.subscriptions.push(
        output,
        status,
        vscode.commands.registerCommand("tarn.runFile", runFile),
        vscode.commands.registerCommand("tarn.restartServer", restartServer),
        vscode.commands.registerCommand("tarn.showOutput", () => output.show(true)),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("tarn.path")) {
                void restartServer();
            }
        }),
        vscode.window.onDidChangeActiveTextEditor(updateStatusVisibility),
    );
    await startServer();
    updateStatusVisibility();
}

export async function deactivate(): Promise<void> {
    binaryWatcher?.close();
    clearTimeout(restartTimer);
    await client?.stop();
    client = undefined;
}

/** `tarn --version`, e.g. "tarn 0.0.1" (undefined if it can't be run). */
function tarnVersion(tarn: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        execFile(tarn, ["--version"], { timeout: 5000 }, (err, stdout) => resolve(err ? undefined : stdout.trim()));
    });
}

/**
 * Restart the language server whenever the `tarn` binary is replaced (for
 * example by ./install.sh), so the editor never keeps checking code with an
 * outdated compiler. The directory is watched because installers replace the
 * file rather than editing it in place.
 */
function watchBinary(tarn: string): void {
    binaryWatcher?.close();
    binaryWatcher = undefined;
    const dir = path.dirname(tarn);
    const base = path.basename(tarn);
    try {
        binaryWatcher = fs.watch(dir, (_event, filename) => {
            if (filename !== null && filename.toString() !== base) {
                return;
            }
            clearTimeout(restartTimer);
            restartTimer = setTimeout(async () => {
                if (!isExecutable(tarn)) {
                    return; // removed or still being written; a later event will follow
                }
                output.info(`${tarn} changed on disk: restarting the language server`);
                await restartServer();
                const version = await tarnVersion(tarn);
                vscode.window.setStatusBarMessage(`$(sync) Tarn language server restarted${version ? ` (${version})` : ""}`, 5000);
            }, 1500);
        });
    } catch (err) {
        output.warn(`Cannot watch ${dir} for tarn updates: ${String(err)}`);
    }
}

// ------------------------------------------------------------------ server

function expandHome(p: string): string {
    return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function isExecutable(p: string): boolean {
    try {
        const st = fs.statSync(p);
        if (!st.isFile()) {
            return false;
        }
        fs.accessSync(p, fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

/** `tarn.path` setting, else PATH, else the places install.sh / cargo put it. */
function findTarn(): string | undefined {
    const configured = vscode.workspace.getConfiguration("tarn").get<string>("path")?.trim();
    if (configured) {
        return expandHome(configured);
    }
    const exe = process.platform === "win32" ? "tarn.exe" : "tarn";
    const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
    dirs.push(path.join(os.homedir(), ".local", "bin"), path.join(os.homedir(), ".cargo", "bin"), "/usr/local/bin");
    for (const dir of dirs) {
        const candidate = path.join(dir, exe);
        if (isExecutable(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

function setStatus(icon: string, text: string, tooltip: string): void {
    status.text = `$(${icon}) ${text}`;
    status.tooltip = tooltip;
}

async function startServer(): Promise<void> {
    const tarn = findTarn();
    if (!tarn) {
        setStatus("error", "Tarn", "tarn executable not found. Click for details.");
        output.appendLine("Could not find the `tarn` executable on PATH, ~/.local/bin or ~/.cargo/bin.");
        output.appendLine("Install it by running ./install.sh in the Tarn repo, or set the `tarn.path` setting.");
        const pick = await vscode.window.showErrorMessage(
            "Tarn: could not find the `tarn` executable. Install it with ./install.sh, or point the `tarn.path` setting at it.",
            "Open Settings",
        );
        if (pick === "Open Settings") {
            void vscode.commands.executeCommand("workbench.action.openSettings", "tarn.path");
        }
        return;
    }

    const version = (await tarnVersion(tarn)) ?? "tarn (unknown version)";
    watchBinary(tarn);
    const serverOptions: ServerOptions = { command: tarn, args: ["lsp"] };
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ language: "tarn" }],
        // Imported files that change on disk (a git checkout, another editor)
        // re-check the open files that import them.
        synchronize: { fileEvents: vscode.workspace.createFileSystemWatcher("**/*.tr") },
        outputChannel: output,
        traceOutputChannel: output,
    };
    client = new LanguageClient("tarn", "Tarn Language Server", serverOptions, clientOptions);
    client.onDidChangeState((e) => {
        if (e.newState === State.Running) {
            setStatus("check", "Tarn", `${version} language server is running\n${tarn}\n\nRestarts automatically when tarn is updated.`);
        } else if (e.newState === State.Stopped) {
            setStatus("debug-disconnect", "Tarn", "Tarn language server stopped. Run `Tarn: Restart Language Server`.");
        }
    });
    setStatus("sync~spin", "Tarn", "Starting the Tarn language server...");
    try {
        await client.start();
        output.appendLine(`Tarn language server started: ${tarn} lsp (${version})`);
    } catch (err) {
        setStatus("error", "Tarn", "The Tarn language server failed to start. Click for details.");
        output.appendLine(`Failed to start \`${tarn} lsp\`: ${String(err)}`);
        output.appendLine("If your tarn is older than the `lsp` command, update it with ./install.sh in the Tarn repo.");
        void vscode.window.showErrorMessage(
            "Tarn: the language server failed to start. Is your `tarn` up to date? (re-run ./install.sh)",
            "Show Output",
        ).then((pick) => pick && output.show(true));
        client = undefined;
    }
}

async function restartServer(): Promise<void> {
    if (client) {
        try {
            await client.stop();
        } catch {
            // already stopped
        }
        client = undefined;
    }
    await startServer();
}

function updateStatusVisibility(): void {
    if (vscode.window.activeTextEditor?.document.languageId === "tarn") {
        status.show();
    } else {
        status.hide();
    }
}

// ------------------------------------------------------------------ run

function shellQuote(s: string): string {
    if (process.platform === "win32") {
        return `"${s.replace(/"/g, '\\"')}"`;
    }
    return /^[\w./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Save the file and run it with `tarn <file>` in a "Tarn" terminal. */
async function runFile(uri?: vscode.Uri): Promise<void> {
    const document = uri instanceof vscode.Uri ? await vscode.workspace.openTextDocument(uri) : vscode.window.activeTextEditor?.document;
    if (!document || document.languageId !== "tarn") {
        void vscode.window.showWarningMessage("Tarn: open a .tr file to run it.");
        return;
    }
    if (document.isUntitled) {
        void vscode.window.showWarningMessage("Tarn: save the file first so it can be run.");
        return;
    }
    if (document.isDirty && !(await document.save())) {
        return;
    }
    const tarn = findTarn() ?? "tarn";
    let terminal = vscode.window.terminals.find((t) => t.name === "Tarn");
    if (!terminal) {
        terminal = vscode.window.createTerminal({ name: "Tarn", iconPath: new vscode.ThemeIcon("play") });
    }
    terminal.show(true);
    terminal.sendText(`${shellQuote(tarn)} ${shellQuote(document.fileName)}`);
}
