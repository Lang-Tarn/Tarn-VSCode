// Tokenizes Tarn code with the same TextMate engine VS Code uses and checks
// that important tokens get the right scopes.  Run: npm test
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vsctm from "vscode-textmate";
import oniguruma from "vscode-oniguruma";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const wasm = fs.readFileSync(path.join(root, "node_modules/vscode-oniguruma/release/onig.wasm")).buffer;
await oniguruma.loadWASM(wasm);

const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
        createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
        createOnigString: (s) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async () =>
        vsctm.parseRawGrammar(fs.readFileSync(path.join(root, "syntaxes/tarn.tmLanguage.json"), "utf8"), "tarn.tmLanguage.json"),
});
const grammar = await registry.loadGrammar("source.tarn");

function tokenize(src) {
    const out = [];
    let state = vsctm.INITIAL;
    for (const line of src.split("\n")) {
        const r = grammar.tokenizeLine(line, state);
        for (const t of r.tokens) {
            out.push({ text: line.slice(t.startIndex, t.endIndex), scopes: t.scopes });
        }
        state = r.ruleStack;
    }
    return out;
}

const src = `#!/usr/bin/env tarn
import time
import shapes.circle as circ
from ..geometry import Point, area as surface
from . import util
# a comment
struct Vec2:
    var x: Float
    y: Float

    fn length(self) -> Float:
        return sqrt(self.x * self.x)

fn main():
    val count = 0x1F + 1_000
    var xs: List[Int] = []
    for i in 0..=10:
        xs.push(i)
    if count > 2 and not false:
        print(f"n = {count + 1} {{literal}} \\n")
    val p = Vec2(1.5e3, 2.0)
    val t = time.now()
    print(p.x)
    while true {

struct Node:
    var next: Node?

fn find(xs: List[Int]?, name: String?) -> List[Int]?:
    val n = name?.len() ?: return null
    val first = xs!!.len()
    if name != null:
        print(name.len())
    return xs

enum Shape:
    Circle(radius: Float)
    Empty

    fn area(self) -> Float:
        match self:
            case Circle(r) if r > 1.0:
                return r
            case Shape.Empty | _ as e: return 0.0

fn other():
    val match = Shape.Circle(1.0)

struct Money:
    cents: Int

    fn %(self, k: Int) -> Int:
        return self.cents % k

    fn <=>(self, other: Money) -> Int:
        return self.cents <=> other.cents

    fn []=(self, i: Int, v: Int):
        pass

fn max[T](a: T, b: T) -> T:
    return max[Int](1, 2)

struct Pair[A, B]:
    first: A

enum Tree[T]:
    Leaf

val limit = 10

fn maps():
    val ages: Map[String, Int] = {"ana": 31}
    if "ana" not in ages:
        print(hash(1, 2))
`;

const tokens = tokenize(src);
let failures = 0;
function expectScope(text, scope, nth = 0) {
    const matches = tokens.filter((t) => t.text.trim() === text);
    const tok = matches[nth];
    if (!tok) {
        console.log(`✗ token ${JSON.stringify(text)} (#${nth}) not found`);
        failures++;
        return;
    }
    const ok = tok.scopes.some((s) => s.startsWith(scope));
    console.log(`${ok ? "✓" : "✗"} ${JSON.stringify(text).padEnd(14)} ${scope}${ok ? "" : `   got: ${tok.scopes.join(" ")}`}`);
    if (!ok) failures++;
}

expectScope("#!/usr/bin/env tarn", "comment.line.shebang");
expectScope("a comment", "comment.line.number-sign");
expectScope("import", "keyword.control.import");
expectScope("time", "entity.name.namespace");
// imports of your own files
expectScope("shapes", "entity.name.namespace");
expectScope("circle", "entity.name.namespace");
expectScope("as", "keyword.control.import");
expectScope("circ", "entity.name.namespace");
expectScope("from", "keyword.control.import");
expectScope("geometry", "entity.name.namespace");
expectScope("import", "keyword.control.import", 1);
expectScope("Point", "entity.name.type");
expectScope("area", "entity.name.function");
expectScope("as", "keyword.control.import", 1);
expectScope("surface", "entity.name.namespace");
expectScope("struct", "storage.type.struct");
expectScope("Vec2", "entity.name.type.struct");
expectScope("var", "storage.type.variable");
expectScope("x", "variable.other.declaration");
expectScope("y", "variable.other.property");
expectScope("Float", "support.type.primitive");
expectScope("fn", "storage.type.function");
expectScope("length", "entity.name.function");
expectScope("self", "variable.language.self");
expectScope("->", "keyword.operator.arrow");
expectScope("return", "keyword.control");
expectScope("sqrt", "support.function.builtin");
expectScope("x", "variable.other.property", 1);
expectScope("main", "entity.name.function");
expectScope("count", "variable.other.declaration");
expectScope("0x1F", "constant.numeric.hex");
expectScope("1_000", "constant.numeric.integer");
expectScope("List", "support.type.primitive");
expectScope("for", "keyword.control");
expectScope("in", "keyword.control");
expectScope("..=", "keyword.operator.range");
expectScope("push", "entity.name.function.member");
expectScope("and", "keyword.operator.logical");
expectScope("not", "keyword.operator.logical");
expectScope("false", "constant.language.boolean");
expectScope("print", "support.function.builtin");
expectScope("f", "storage.type.string");
expectScope("n =", "string.quoted.double.interpolated");
expectScope("{", "punctuation.section.interpolation.begin");
expectScope("count", "meta.embedded.line", 2);
expectScope("{{", "constant.character.escape");
expectScope("\\n", "constant.character.escape");
expectScope("Vec2", "entity.name.type", 1);
expectScope("1.5e3", "constant.numeric.float");
expectScope("time", "entity.name.namespace", 1);
expectScope("now", "entity.name.function.member");
expectScope("{", "invalid.illegal.brace", 1);
// maps and constants
expectScope("Map", "support.type.primitive");
expectScope("{", "punctuation.section.braces", 2);
expectScope("}", "punctuation.section.braces", 1);
expectScope("limit", "variable.other.declaration");
expectScope("hash", "support.function.builtin");
// null safety
expectScope("Node", "entity.name.type", 1);
expectScope("?", "keyword.operator.optional");
expectScope("?", "keyword.operator.optional", 1);
expectScope("?", "keyword.operator.optional", 2);
expectScope("?", "keyword.operator.optional", 3);
expectScope(":", "punctuation.separator.colon", 6);
expectScope("?.", "punctuation.accessor.optional");
expectScope("len", "entity.name.function.member", 0);
expectScope("?:", "keyword.operator.elvis");
expectScope("return", "keyword.control", 1);
expectScope("null", "constant.language.null");
expectScope("!!", "keyword.operator.non-null-assertion");
expectScope("null", "constant.language.null", 1);
// enums and match
expectScope("enum", "storage.type.enum");
expectScope("Shape", "entity.name.type.enum");
expectScope("Circle", "variable.other.enummember");
expectScope("radius", "variable.other.property");
expectScope("Empty", "variable.other.enummember");
expectScope("match", "keyword.control.flow.match");
expectScope("case", "keyword.control.flow.case");
expectScope("Circle", "variable.other.enummember", 1);
expectScope("if", "keyword.control.flow", 2);
expectScope("Shape", "entity.name.type", 2);
expectScope("|", "keyword.operator.pattern.or");
expectScope("_", "variable.language.wildcard");
expectScope("as", "keyword.control.flow", 2);
expectScope("match", "variable.other.declaration", 1);
expectScope("Circle", "variable.other.enummember", 2);

// operator functions
expectScope("%", "entity.name.function.operator");
expectScope("<=>", "entity.name.function.operator");
expectScope("<=>", "keyword.operator.comparison", 1);
expectScope("[]=", "entity.name.function.operator");

// generics
expectScope("max", "entity.name.function");
expectScope("[", "punctuation.definition.type-parameters.begin", 4);
expectScope("[", "punctuation.brackets", 5); // `max[Int](...)`: type arguments at a call
expectScope("T", "entity.name.type.parameter");
expectScope("max", "entity.name.function.call", 1);
expectScope("Pair", "entity.name.type.struct");
expectScope("B", "entity.name.type.parameter");
expectScope("Tree", "entity.name.type.enum");
expectScope("T", "entity.name.type.parameter", 4);
expectScope("Leaf", "variable.other.enummember");

// The Tarn Light and Tarn Dark themes: valid, with the same keys, and every
// main kind of token gets a color.
// lambdas and function types
{
    const lam = tokenize(`fn apply(f: fn(Int) -> Int, x: Int) -> Int:\n    val g = fn(y, z: String) -> y * 2\n    return xs.map(fn(v) -> v + x)`);
    const scopesOf = (text, nth = 0) => lam.filter((t) => t.text === text)[nth]?.scopes.join(" ") ?? "(missing)";
    const check = (text, scope, nth = 0) => {
        const got = scopesOf(text, nth);
        if (!got.includes(scope)) {
            console.error(`FAIL ${JSON.stringify(text)} #${nth}: expected ${scope}, got ${got}`);
            failures++;
        } else {
            console.log(`ok   ${JSON.stringify(text)} #${nth} -> ${scope}`);
        }
    };
    check("apply", "entity.name.function");
    check("fn", "storage.type.function", 1); // the parameter's function type
    check("Int", "support.type.primitive", 0);
    check("x", "variable.parameter", 0); // still a parameter after the nested type's `)`
    check("fn", "storage.type.function", 2); // a lambda
    check("y", "variable.parameter", 0);
    check("z", "variable.parameter", 0);
    check("String", "support.type.primitive", 0);
    check("v", "variable.parameter", 0);
}

// recoverable errors and bytes: `Result`, `Ok`/`Err`, the postfix `?`, `Bytes`
{
    const res = tokenize(`fn total(a: String) -> Result[Int, String]:\n    val n = parse(a)?\n    val b: Bytes = Bytes([1]) + a.encode()\n    val r = xs[0]?.len() ?: 0\n    return Ok(n + b.len())`);
    const scopesOf = (text, nth = 0) => res.filter((t) => t.text === text)[nth]?.scopes.join(" ") ?? "(missing)";
    const check = (text, scope, nth = 0) => {
        const got = scopesOf(text, nth);
        if (!got.includes(scope)) {
            console.error(`FAIL ${JSON.stringify(text)} #${nth}: expected ${scope}, got ${got}`);
            failures++;
        } else {
            console.log(`ok   ${JSON.stringify(text)} #${nth} -> ${scope}`);
        }
    };
    check("Result", "support.type.primitive");
    check("?", "keyword.operator.try"); // `parse(a)?`
    check("Bytes", "support.type.primitive", 0); // the annotation
    check("Bytes", "support.function.builtin", 1); // `Bytes([1])`
    check("?.", "punctuation.accessor.optional", 0); // still a safe call
    check("?:", "keyword.operator.elvis");
    check("Ok", "support.function.builtin");
}

// interfaces: declarations, bounds, and the interfaces a type says it fits
{
    const src = `interface Shape:\n    fn area(self) -> Float\n\ninterface Solid(Shape, geo.Named):\n    fn volume(self) -> Float\n\nstruct Cube(Solid):\n    side: Float\n\nstruct Gallery[T: Shape + geo.Named, U](Shape):\n    items: List[T]\n\nenum Tree[T: Shape](Container):\n    Leaf\n\nfn total[T: Shape](xs: List[T]) -> Float:\n    return 0.0\n\nfn main():\n    val interface = 1`;
    const toks = tokenize(src);
    const scopesOf = (text, nth = 0) => toks.filter((t) => t.text.trim() === text)[nth]?.scopes.join(" ") ?? "(missing)";
    const check = (text, scope, nth = 0) => {
        const got = scopesOf(text, nth);
        if (!got.includes(scope)) {
            console.error(`FAIL ${JSON.stringify(text)} #${nth}: expected ${scope}, got ${got}`);
            failures++;
        } else {
            console.log(`ok   ${JSON.stringify(text)} #${nth} -> ${scope}`);
        }
    };
    check("interface", "storage.type.interface", 0);
    check("Shape", "entity.name.type.interface", 0);
    check("area", "entity.name.function", 0);
    check("Solid", "entity.name.type.interface", 0);
    check("Shape", "entity.name.type.tarn", 1); // included interface
    check("geo", "entity.name.namespace", 0);
    check("Named", "entity.name.type.tarn", 0);
    check("Cube", "entity.name.type.struct", 0);
    check("Solid", "entity.name.type.tarn", 1); // `struct Cube(Solid)`
    check("Gallery", "entity.name.type.struct", 0);
    check("T", "entity.name.type.parameter", 0);
    check("Shape", "entity.name.type.tarn", 2); // a bound
    check("+", "keyword.operator.bound", 0);
    check("Named", "entity.name.type.tarn", 1);
    check("U", "entity.name.type.parameter", 0);
    check("Shape", "entity.name.type.tarn", 3); // `struct Gallery[...](Shape)`
    check("Tree", "entity.name.type.enum", 0);
    check("Container", "entity.name.type.tarn", 0);
    check("Leaf", "variable.other.enummember", 0);
    check("T", "entity.name.type.parameter", 3); // `fn total[T: Shape]`
    check("total", "entity.name.function", 0);
    check("interface", "storage.type.interface", 1);
    check("interface", "variable.other.declaration", 2); // just a name elsewhere
}

{
    // Phase 2: generic interfaces with default methods, `match` as a value, tuples, field defaults.
    const src = `interface Source[T](Named):\n    fn next(self) -> T?\n\n    fn take(self, n: Int) -> List[T]:\n        return []\n\nstruct Config:\n    port: Int = 8080\n    pair: (Int, String)\n\nfn main():\n    val label = match code:\n        case 200: "ok"\n    total += match n:\n        case _: 1\n    val t = (1, "a")\n    print(t.0)\n    print(t.1.2)\n    val match = 3`;
    const toks = tokenize(src);
    const scopesOf = (text, nth = 0) => toks.filter((t) => t.text.trim() === text)[nth]?.scopes.join(" ") ?? "(missing)";
    const check = (text, scope, nth = 0) => {
        const got = scopesOf(text, nth);
        if (!got.includes(scope)) {
            console.error(`FAIL ${JSON.stringify(text)} #${nth}: expected ${scope}, got ${got}`);
            failures++;
        } else {
            console.log(`ok   ${JSON.stringify(text)} #${nth} -> ${scope}`);
        }
    };
    check("Source", "entity.name.type.interface", 0);
    check("T", "entity.name.type.parameter", 0);
    check("Named", "entity.name.type.tarn", 0);
    check("take", "entity.name.function", 0);
    check("port", "variable.other.property", 0);
    check("8080", "constant.numeric.integer", 0);
    check("pair", "variable.other.property", 0);
    check("match", "keyword.control.flow.match", 0); // `val label = match code:`
    check("case", "keyword.control.flow.case", 0);
    check("match", "keyword.control.flow.match", 1); // `total += match n:`
    check("0", "variable.other.property", 0); // `t.0`
    check("1", "variable.other.property", 2); // `t.1.2`
    check("2", "variable.other.property", 0);
    check("match", "variable.other.declaration", 2); // just a name
}

// tasks: `spawn`, the task types, and one-line lambdas that assign
{
    const toks = tokenize(`fn main():\n    val jobs: Channel[Int] = Channel.buffered(8)\n    val hits: Mutex[Map[String, Int]] = Mutex({})\n    val t: Task[Int] = spawn(fn() -> work(jobs))\n    hits.lock(fn(m) -> m["home"] = 1)\n    val n = Atomic(0)\n    val spawn = 1`);
    const scopesOf = (text, nth = 0) => toks.filter((t) => t.text.trim() === text)[nth]?.scopes.join(" ") ?? "(missing)";
    const check = (text, scope, nth = 0) => {
        const got = scopesOf(text, nth);
        if (!got.includes(scope)) {
            console.error(`FAIL ${JSON.stringify(text)} #${nth}: expected ${scope}, got ${got}`);
            failures++;
        } else {
            console.log(`ok   ${JSON.stringify(text)} #${nth} -> ${scope}`);
        }
    };
    check("Channel", "support.type.primitive", 0); // the annotation
    check("Mutex", "support.type.primitive", 0);
    check("Task", "support.type.primitive", 0);
    check("Atomic", "support.type.primitive", 0);
    check("spawn", "support.function.builtin", 0); // `spawn(...)`
    check("fn", "storage.type.function", 2); // the lambda given to `spawn`
    check("=", "keyword.operator.assignment", 3); // `fn(m) -> m["home"] = 1`
    check("spawn", "variable.other.declaration", 1); // just a name
}

// compile-time code: `comptime`, attributes, reflection functions
{
    const toks = tokenize(`attribute get(path: String = "/")\nattribute skip\n\n@get("/users/{id}")\n@routes.post("/x")\ncomptime fn key(f: Field) -> String:\n    return f.name\n\nfn route[H: Function](h: H, @skip verbose: Bool):\n    comptime val r = attribute(H, get)\n    comptime for p in params(H):\n        comptime if p.has(skip):\n            compile_error("no", at = r)\n    comptime match T:\n        case U?:\n            pass\n    val comptime = type_name(H)`);
    const scopesOf = (text, nth = 0) => toks.filter((t) => t.text.trim() === text)[nth]?.scopes.join(" ") ?? "(missing)";
    const check = (text, scope, nth = 0) => {
        const got = scopesOf(text, nth);
        if (!got.includes(scope)) {
            console.error(`FAIL ${JSON.stringify(text)} #${nth}: expected ${scope}, got ${got}`);
            failures++;
        } else {
            console.log(`ok   ${JSON.stringify(text)} #${nth} -> ${scope}`);
        }
    };
    check("attribute", "storage.type.attribute", 0); // the declaration
    check("get", "entity.name.function.decorator", 0);
    check("path", "variable.parameter", 0);
    check("@", "punctuation.definition.decorator", 0);
    check("get", "entity.name.function.decorator", 1); // `@get(...)`
    check("routes.post", "entity.name.function.decorator", 0);
    check("comptime", "keyword.other.comptime", 0); // `comptime fn`
    check("Field", "support.type.primitive", 0);
    check("Function", "entity.name.type", 0); // a bound, like an interface
    check("skip", "entity.name.function.decorator", 1); // `@skip verbose: Bool`
    check("verbose", "variable.parameter", 0);
    check("comptime", "keyword.other.comptime", 1); // `comptime val`
    check("attribute", "storage.type.attribute", 1); // `attribute skip`
    check("attribute", "support.function.builtin", 2); // `attribute(H, get)`
    check("params", "support.function.builtin", 0);
    check("comptime", "keyword.other.comptime", 3); // `comptime if`
    check("compile_error", "support.function.builtin", 0);
    check("comptime", "keyword.other.comptime", 4); // `comptime match`
    check("match", "keyword.control.flow.match", 0);
    check("?", "keyword.operator.optional", 0); // `case U?:`
    check("comptime", "variable.other.declaration", 5); // just a name
}

const themes = ["light", "dark"].map((v) => JSON.parse(fs.readFileSync(path.join(root, `themes/tarn-${v}-color-theme.json`), "utf8")));
for (const theme of themes) {
    const colored = new Set(theme.tokenColors.flatMap((r) => [].concat(r.scope)));
    for (const scope of ["comment", "keyword", "storage.type", "string", "constant.numeric", "entity.name.type", "entity.name.function", "invalid.illegal"]) {
        const ok = colored.has(scope);
        if (!ok) {
            console.log(`✗ ${theme.name} colors ${scope}`);
            failures++;
        }
    }
}
const [light, dark] = themes;
for (const [ok, what] of [
    [light.colors["editor.background"] === "#ffffff", "Tarn Light has a white editor"],
    [dark.type === "dark" && dark.colors["editor.background"] === "#0f0f0e", "Tarn Dark has a near-black editor"],
    [Object.keys(light.colors).every((k) => k in dark.colors), "Tarn Dark sets every color Tarn Light sets"],
]) {
    console.log(`${ok ? "✓" : "✗"} ${what}`);
    if (!ok) failures++;
}

console.log(failures === 0 ? "\nall grammar checks passed" : `\n${failures} grammar check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
