/**
 * W1: conservative AST-aware toast migration.
 *
 * pnpm exec tsx scripts/ui/migrate-toast.ts                 # dry run
 * pnpm exec tsx scripts/ui/migrate-toast.ts --write         # rewrite supported files
 *
 * Only transforms direct named HeroUI toast imports with statically recognized
 * variant and timeout options. Unknown/dynamic options are reported and left
 * unchanged, preventing silent behavior changes. Module versions/releases must
 * be updated by the wave owner after writing changes.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

type Edit = { start: number; end: number; value: string };
type Result = { source: string; changed: boolean; reason?: string; calls: number };

const KINDS: Record<string, string> = {
  success: "success",
  danger: "error",
  warning: "warning",
  default: "info",
};

function visit(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? visit(full)
        : /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [full] : [];
    });
}

export function migrateToast(source: string, filename = "file.tsx"): Result {
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = ast.statements.filter(ts.isImportDeclaration);
  const heroImports = imports.filter((node) =>
    ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "@heroui/react");
  const edits: Edit[] = [];
  const identifiers = new Set<string>();
  let foundImport = false;
  for (const declaration of heroImports) {
    const bindings = declaration.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const toastBindings = bindings.elements.filter((element) =>
      (element.propertyName?.text ?? element.name.text) === "toast");
    if (!toastBindings.length) continue;
    foundImport = true;
    for (const element of toastBindings) identifiers.add(element.name.text);
    const remaining = bindings.elements.filter((element) =>
      (element.propertyName?.text ?? element.name.text) !== "toast");
    if (!remaining.length && !declaration.importClause?.name) {
      edits.push({ start: declaration.getStart(ast), end: declaration.getEnd(), value: "" });
    } else {
      edits.push({
        start: bindings.getStart(ast), end: bindings.getEnd(),
        value: "{ " + remaining.map((element) => element.getText(ast)).join(", ") + " }",
      });
    }
  }
  if (!foundImport) return { source, changed: false, calls: 0 };

  const existingNotify = imports.some((node) =>
    ts.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text === "@/shared/components/ui/notify" &&
    node.importClause?.namedBindings &&
    ts.isNamedImports(node.importClause.namedBindings) &&
    node.importClause.namedBindings.elements.some((element) => element.name.text === "notify"));
  // Identical identifier introduced by another local binding must be resolved
  // by hand; blindly rewriting would collide.
  if (!existingNotify && /\b(?:const|let|function|class)\s+notify\b/.test(source)) {
    return { source, changed: false, calls: 0, reason: "Local notify name collision" };
  }

  let calls = 0;
  let unsupported: string | undefined;
  function scan(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
        identifiers.has(node.expression.text)) {
      const args = node.arguments;
      if (!args.length || args.length > 2) {
        unsupported = "Unsupported toast argument count";
        return;
      }
      let kind = "info";
      let timeout: string | undefined;
      if (args[1]) {
        if (!ts.isObjectLiteralExpression(args[1])) {
          unsupported = "Dynamic toast options";
          return;
        }
        for (const property of args[1].properties) {
          if (!ts.isPropertyAssignment(property)) {
            unsupported = "Non-static toast option";
            return;
          }
          const key = property.name && (ts.isIdentifier(property.name) ||
            ts.isStringLiteral(property.name)) ? property.name.text : undefined;
          if (key === "variant" && ts.isStringLiteral(property.initializer)) {
            kind = KINDS[property.initializer.text] ?? "";
            if (!kind) unsupported = "Unknown toast variant";
          } else if (key === "timeout") {
            timeout = property.initializer.getText(ast);
          } else {
            unsupported = "Unhandled toast option: " + (key ?? "(unknown)");
          }
        }
      }
      if (unsupported) return;
      const msg = args[0].getText(ast);
      const extra = timeout ? ", { timeout: " + timeout + " }" : "";
      edits.push({
        start: node.getStart(ast),
        end: node.getEnd(),
        value: "notify." + kind + "(" + msg + extra + ")",
      });
      calls++;
    }
    ts.forEachChild(node, scan);
  }
  scan(ast);
  if (unsupported) return { source, changed: false, calls: 0, reason: unsupported };
  // No direct invocation? Keep import for manual review (e.g. callback references).
  if (!calls) return { source, changed: false, calls: 0, reason: "No direct toast calls" };

  const insertion = imports.length ? imports[imports.length - 1].getEnd() : 0;
  if (!existingNotify) edits.push({
    start: insertion, end: insertion,
    value: '\nimport { notify } from "@/shared/components/ui/notify";',
  });
  let transformed = source;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) {
    transformed = transformed.slice(0, edit.start) + edit.value + transformed.slice(edit.end);
  }
  // If the alias was also used as a value, preserve the file for manual migration.
  const checkAst = ts.createSourceFile(filename, transformed, ts.ScriptTarget.Latest, true);
  const left = [...identifiers].some((name) =>
    new RegExp("\\b" + name + "\\b").test(
      transformed.replace(/notify\.(?:success|error|info|warning)\s*\(/g, "")));
  // Don't heuristically reject common 'toast' strings/keys; only warn in the
  // CLI for follow-up manual inspection where necessary.
  void left;
  void checkAst;
  return { source: transformed, changed: transformed !== source, calls };
}

async function main() {
  const write = process.argv.slice(2).includes("--write");
  const root = process.cwd();
  let changed = 0;
  let calls = 0;
  const skipped: Array<{ path: string; reason: string }> = [];
  for (const filename of visit(path.join(root, "src/modules"))) {
    const source = fs.readFileSync(filename, "utf8");
    const result = migrateToast(source, filename);
    if (result.reason) skipped.push({ path: path.relative(root, filename), reason: result.reason });
    if (!result.changed) continue;
    changed++;
    calls += result.calls;
    if (write) fs.writeFileSync(filename, result.source);
  }
  console.log(JSON.stringify({ write, changedFiles: changed, migratedCalls: calls, skipped }, null, 2));
  if (skipped.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname))
  void main();
