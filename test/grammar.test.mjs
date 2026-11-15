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
