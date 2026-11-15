# Tarn for VS Code

Tarn reads like Python, checks like Kotlin, and compiles to native code. This extension brings the compiler into the editor.

Everything it knows comes from `tarn lsp`, the language server built into the compiler, so the editor always agrees with `tarn build`.

## What you get

**Checking as you type.** Type errors and lints appear while you write, with the compiler's own hints (`help: use .to_float()`). Unused and unreachable code is faded out. Missing `match` cases are named ("`Rect(_, _)` and `Empty` are not covered"), and "`user` might be null" comes with the fix.

**Hover and inlay hints.** Hover shows the type of anything, including inferred types, smart casts (`val user: User`, smart-cast from `User?`), the values of constants (`val pi: Float = 3.141592653589793`) and `#` doc comments. `val total = price * qty` is shown as `val total: Float = price * qty`.

**Completion.** After `.` you get the fields and methods of that value's type, with real types even for generics (`get(key: String) -> Int?` on a `Map[String, Int]`). After `math.` or `geometry.`, a module's functions, types and constants. After `import` and `from`, the `.tr` files and folders next to yours. Completing after `.` on a value that might be null turns it into `?.`.

**Navigation.** Go to definition (F12) works on variables, functions, types, fields, methods, enum variants and operators (the `+` in `a + b` jumps to its `fn +`), also into your other files. Structs, enums and functions appear in the Outline view and in breadcrumbs.

**Many files.** Editing a module re-checks the open files that import it, even before you save. An error inside an imported file shows on the `import` line that leads to it.

**Run.** The Run button in the editor title bar saves the file and runs `tarn file.tr` in a terminal.

**Writing.** Syntax highlighting for everything from f-strings to `match` patterns, indentation that follows `:` blocks, and snippets: `main`, `fn`, `struct`, `enum`, `match`, `map`, `count`, `formap`, `hash`, `readlines`, `import` and more.

## Tarn Light and Tarn Dark

The extension comes with two color themes that match Tarn's look. **Tarn Light** has a white editor, warm off-white side bars with hairline borders, near-black text, and only a few muted colors for syntax. **Tarn Dark** is the same room at night. Choose one with **Preferences: Color Theme**.

## Setup

Install the `tarn` command from the Tarn repository:

```bash
./install.sh
```

The extension finds `tarn` on your `PATH`, or in `~/.local/bin` and `~/.cargo/bin`. When you reinstall `tarn`, the extension notices and restarts the language server by itself; the status bar tooltip shows the version in use.

| Setting | Default | |
|---|---|---|
| `tarn.path` | `""` | The `tarn` executable, if it isn't found on its own |
| `tarn.trace.server` | `off` | Log the language server's messages to the "Tarn" output |

| Command | |
|---|---|
| Tarn: Run Tarn File | Save the file and run it in the "Tarn" terminal |
| Tarn: Restart Language Server | Restart it, e.g. after reinstalling `tarn` |
| Tarn: Show Language Server Output | Open the log (or click "Tarn" in the status bar) |

## Development

```bash
npm install
npm run build      # bundle src/extension.ts into dist/extension.js
npm test           # tokenize sample code with the real TextMate engine
npm run package    # produce tarn-<version>.vsix
code --install-extension tarn-<version>.vsix
```

To debug the extension, open this folder in VS Code and press F5. To see the language server's messages, set `tarn.trace.server` to `verbose`.
