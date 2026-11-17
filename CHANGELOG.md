# Changelog

## 0.12.0

- Interfaces: `interface Shape:` and `interface Solid(Shape, Named):` are highlighted, and so are bounds in type parameters (`fn total[T: Shape + Named]`, `struct Gallery[T: Shape]`) and the interfaces a type says it fits (`struct Cube(Solid):`, `enum Tree(Container):`).
- Hover on an interface shows every method it asks for (also the ones it includes); on a call through an interface value (`s.area()`) or on a `T` with a bound, the method's signature and the interface it comes from. F12 jumps to the method in the interface.
- `.` completion on an interface value offers its methods, and the outline and completion show interfaces with the interface icon.
- The compiler's new errors appear live, e.g. "mismatched types: expected `Shape`, found `Point`" with why (`Point` has no method `area`, `Sq.area` returns `Int`, not `Float`) and the method to add, "`total` needs `T` to be a `Shape`, but `Int` isn't", and "`Sq` says it's a `Shape`, but ...".
- New snippets: `interface`, and `fnbound` for a generic function with a bound (`fn total[T: Shape]`).

## 0.11.0

- Lambdas and function types: in `fn(x, y: Int) -> x + y` and `fn(Int, String) -> Bool`, `fn` and the parameters are highlighted, also when a function type sits inside a parameter list (`fn apply(f: fn(Int) -> Int, x: Int)`).
- Hover on a lambda shows its type (`fn(Int) -> Int`), its parameters show the types they were given (`x: Int`, also as inlay hints when the types aren't written), and F12 on a captured name jumps to it outside the lambda.
- `.` completion and hover on a list include `map`, `filter`, `any`, `all`, `find`, `count`, `fold`, `sort_by`, `min_by` and `max_by`, with their real types (`map(transform: fn(Int) -> U) -> List[U]`).
- The compiler's new errors appear live, e.g. "a lambda can't capture `total`, a `var`", "cannot infer the type of parameter `x`", "`map` calls its function with 1 value, but this lambda takes 2" and "a lambda's block must start on a new line".
- New snippets: `lambda` (`fn(x) -> ...`) and `fnval` (a lambda with a block body, in a variable).

## 0.10.0

- **Tarn Dark**, the night-time sibling of Tarn Light: a near-black editor, hairline borders, light text and the same few muted syntax colors, softened for the dark. The Tarn website uses both themes for its code.

## 0.9.0

- Isma is now **Tarn**. Files end in `.tr` (and scripts can start with `#!/usr/bin/env tarn`), the executable is `tarn`, the settings are `tarn.path` and `tarn.trace.server`, and the commands are "Tarn: Run Tarn File", "Tarn: Restart Language Server" and "Tarn: Show Language Server Output".
- A new, quieter look: the icon is a white tile with Tarn's mark (a still lake: a disc above its faint reflection), and `.tr` files get the mark as their file icon, in gray for light and dark themes.
- **Tarn Light**, a color theme in the same spirit (Preferences: Color Theme): a white editor, warm off-white side bars with hairline borders, near-black text, and a few muted colors for syntax (blue keywords, green strings, amber numbers, gray comments). Its terminal colors match the recordings in Tarn's README.
- The old `isma-lang.isma` extension can be uninstalled.

## 0.8.0

- Maps: `Map[K, V]` is highlighted as a built-in type, and the braces of `{"a": 1}` map literals as punctuation. A `{` that ends a line after a value (`if x {`) is still marked as a block brace from another language.
- `.` completion and hover on a map list its methods with their real types (`get(key: String) -> Int?`, `keys() -> List[String]`...), and so on lists and strings for the new methods (`split`, `join`, `trim`, `replace`, `find`, `sort`, `contains`...).
- Top-level constants (`val pi = 3.14`): hover shows their value (`val limit: Int = 10`), F12 jumps to them, and `math.` completes `pi`, `e` and `inf` as constants next to the module's functions.
- `hash(...)` is highlighted as a built-in function.
- The compiler's new errors appear live, e.g. "`Point` can't be a map key" (with the `fn ==` and `fn hash` to add), "`Float` can't be a map key", "a top-level `val` must be a constant", and the "duplicate key" warning in a map literal.
- New snippets: `map`, `count` (counting into a map), `formap`, `hash` (`fn ==` + `fn hash`) and `readlines`.

## 0.7.0

- Generics: type parameters in `fn max[T]`, `struct Box[T]` and `enum Tree[T]` are highlighted, and so is a call that gives its type arguments explicitly, like `max[Int]` followed by its arguments.
- Hover over a generic function shows what each type parameter must support ("`T` can be any type that supports `<` and `>`"), worked out from its code. Hover over a call adds what the type parameters are there ("here `T` is `Int`").
- The compiler's new errors appear live, e.g. "`max` needs `T` to support `<` and `>`, but `Point` doesn't", with a second label on the line of generic code that needs it.
- `.` completion on a `Box[Int]` shows its members with their real types (`get() -> Int`), and F12 on a `T` jumps to where it's declared. The outline lists generic functions and types once, not once per type they're used with.
- New snippets: `fngen` (generic function) and `structgen` (generic struct).

## 0.6.0

- Operator functions (`fn +`, `fn <=>`, `fn []`, `fn []=` and the rest) are highlighted as definitions, and `<=>` as an operator.
- Hover over an operator (`+` in `a + b`, `-` in `time.now() - start`, the brackets of `grid[i]`) shows the operator function it calls, with its documentation. F12 on it jumps to that function, also into other files.
- `.` completion leaves operator functions out: you use them through their operator.
- The compiler's new errors appear live: a missing operator ("define `fn +(self, other: V) -> V` in `struct V`"), `2.0 * v` ("write `v * 2.0`"), a `Duration` expected where you wrote a number ("`time.seconds(5)`"), and `print` of a type without `to_string`.
- New snippets: `operator` and `tostring`.

## 0.5.0

- Programs can span files. `import geometry`, `import shapes.circle as c`, `from geometry import Point, area` and `from .. import util` are highlighted: modules, the names they bring in, and `as`.
- Completion inside import lines: after `import ` or `from ` it lists the `.tr` files and folders next to your file (and the standard library), after `import shapes.` the files in `shapes/`, and after `from geometry import ` the module's public functions and types.
- `geo.` completes through an alias (`import geometry as geo`), and names brought in with `from` complete like your own functions and types.
- F12 jumps into your other files: on an imported function, type or variant, and on the `import` line itself. Hover tells you which module a function comes from.
- Editing a module re-checks the open files that import it as you type, before you save. An error inside an imported file shows on the `import` line that leads to it, with the file, line and message. Changes on disk (a git checkout, a new file) are picked up too.
- New `from` snippet.

## 0.4.0

- Enums and `match`: `enum` declarations, their variants and fields, `match` and `case` lines (with guards, `|` and `as`), and `Shape.Circle`-style variant names are highlighted. `match` and `case` stay ordinary names elsewhere, as in Python (`val match = ...`).
- Typing `Shape.` lists the enum's variants, inserting `Circle(…)` with the cursor between the parentheses when the variant has fields.
- Hover over a variant (in an expression or a `case`) shows its fields, and F12 jumps to it. Names bound in a `case` get inlay type hints, e.g. `case Circle(r: Float)`.
- Enums appear in the outline with their variants.
- The compiler's exhaustiveness errors appear live: "this `match` doesn't handle every value: `Rect(_, _)` and `Empty` are not covered", and so do "unreachable `case`" warnings.
- Enter after `enum …:`, `match …:` or `case …:` indents the next line. New snippets: `enum`, `match`, `case`.

## 0.3.0

- Null safety: nullable types `T?`, `null`, `?.`, `?:` and `!!` are highlighted, and `-> Int?:` at the end of a signature reads as a nullable type followed by the block's colon.
- Completion after `?.` lists the members of the non-null type. Completing after a plain `.` on a value that might be null rewrites the `.` into `?.` for you.
- Hover shows smart casts: inside `if user != null:`, hovering `user` shows `val user: User` and says it was smart-cast from `User?`.
- The compiler's null-safety errors and lints appear live: "`u` might be null" (with fixes using `?.`, `?:` or `if u != null:`), "unnecessary `?.`", and "`n` is never `null`".
- New snippets: `ifnn` (`if x != null:`) and `orret` (`val x = maybe ?: return`).

## 0.2.1

- The language server restarts automatically when the `tarn` binary is updated (for example by `./install.sh`), so the editor never keeps checking your code with an outdated compiler.
- The status bar tooltip shows which `tarn` version is running.
- `time.` is highlighted as a module, and there are new `now` and `timeit` snippets.

## 0.2.0

- Support for `import` and the standard library's first module, `time`. Typing `time.` completes its functions and types, with their docs shown on hover. Typing `import ` lists the available modules.
- Doc comments: `#` comments directly above a function or struct appear when you hover over it.
- Highlighting for `import` lines, plus a new `import` snippet.

## 0.1.0

- First release. Live type checking and lints through `tarn lsp`.
- Hover types, inlay type hints, go to definition, completion (including `.` members) and the document outline.
- Syntax highlighting with f-string interpolation, snippets, indentation rules and a ▶ Run button.
