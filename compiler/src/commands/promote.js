/**
 * @module commands/promote
 * scrml promote subcommand — promotion-ergonomics CLI surface.
 *
 * **Status:** STUB. The CLI surface (flag set, exit codes, help text) is locked
 * by this file as the design lock for the promotion-ergonomics design (per
 * docs/changes/promotion-ergonomics/SCOPE.md S65). The transformation logic
 * itself — the AST→AST rewrite that lifts an if-else chain into a `<match>`
 * block, or a `<match>` block into an `<engine>` — is **not yet implemented**.
 *
 * Calling `bun scrml promote --match foo.scrml` today prints a clear
 * "implementation pending" diagnostic and exits with code 2 (per the SCOPE
 * exit-code table: ambiguous / human-disambiguation-needed). The next dispatch
 * (Tier B per the survey-note) drops the transformation behind this stable
 * surface.
 *
 * **Why ship the stub now:**
 *   1. Locks the CLI surface ahead of implementation — future spec/primer/
 *      article references to `bun scrml promote --match` are not vapor.
 *   2. `bun scrml promote --help` works today; the help text is the canonical
 *      design-lock document for the verb's flag set.
 *   3. When users discover the verb (via primer, spec, articles) and try it,
 *      they get a precise "this is coming, here's the SCOPE" message rather
 *      than `Unknown subcommand: promote`. Better adoption-on-ramp.
 *
 * **Pairs with:**
 *   - `I-MATCH-PROMOTABLE` info-level lint (compiler-side, not yet implemented).
 *     Lint surfaces opportunity; CLI executes the lift. Two-piece design.
 *   - `bun scrml migrate` (already shipped, P4) — different verb, different
 *     semantics. `migrate` = deprecated→current; `promote` = tier-1→tier-2.
 *
 * Usage (full design surface — locked):
 *   scrml promote --match <file>[:line]    # if-else → <match>
 *   scrml promote --engine <file>[:line]   # <match> → <engine>  (Tier 1→2)
 *   scrml promote --dry-run --match <file> # preview unified diff
 *   scrml promote --match <dir>            # recurse all .scrml files
 *
 * @see docs/changes/promotion-ergonomics/SCOPE.md
 * @see docs/changes/promotion-ergonomics/SURVEY-NOTE.md (survey-revised
 *      estimate + Tier A/B split rationale)
 * @see SPEC §53 — I-MATCH-PROMOTABLE (when shipped)
 */

const isTTY = process.stderr.isTTY && process.stdout.isTTY;

const c = {
  red:    (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: (s) => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  green:  (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  cyan:   (s) => isTTY ? `\x1b[36m${s}\x1b[0m` : s,
  dim:    (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s,
  bold:   (s) => isTTY ? `\x1b[1m${s}\x1b[0m` : s,
};

function printHelp() {
  console.log(`scrml promote --match|--engine <file|directory> [options]

Mechanically promote scrml code up the tier ladder (primer §1).

Modes:
  --match               Lift an if-else chain over an enum-typed state cell
                        into a \`<match>\` block (Tier 1 promotion).
  --engine              Lift a \`<match>\` block with rule= attributes accruing
                        on its arms into an active \`<engine>\` (Tier 1→2 promotion).
                        Pairs with the W-MATCH-TRANSITIONS-ACCRUING lint.

Arguments:
  <file>                A single .scrml file (optional :line suffix to target
                        a specific promotable site).
  <directory>           A directory — every .scrml file under it is scanned.

Options:
  --dry-run             Print unified diff to stdout; do not write to disk.
  --check               Exit non-zero if any file would be promoted (CI-friendly).
  --include=<glob>      File pattern (default '*.scrml').
  --exclude=<glob>      Exclude pattern (substring match).
  --no-default-excludes Disable built-in samples/ + tests/ exclusions.
  --help, -h            Show this message.

Exit codes:
  0   Promoted N sites cleanly, OR no promotable sites found (informational).
  1   File not parseable, OR I/O failure during write.
  2   Ambiguous site needing human disambiguation (compound conditions,
      mixed discriminator, computed expressions in branch conditions).

Pairs with:
  - I-MATCH-PROMOTABLE info-level lint — surfaces opportunity at compile time.
  - bun scrml migrate — different verb (deprecated→current); promote is tier-up.

Status:
  CLI surface is LOCKED. AST→AST transformation logic is implementation-pending.
  Running this command today prints this notice and exits 2.

  See docs/changes/promotion-ergonomics/SCOPE.md and
  docs/changes/promotion-ergonomics/SURVEY-NOTE.md for the design lock,
  Tier A/B split rationale, and implementation path.

Examples (when impl lands):
  scrml promote --match src/app.scrml             # promote one file in place
  scrml promote --match src/app.scrml:42          # only the chain at line 42
  scrml promote --match src/ --dry-run            # preview all sites
  scrml promote --engine src/app.scrml            # match → engine
`);
}

/**
 * Parse argv flags. Same shape and conventions as `migrate`'s arg parser.
 *
 * @param {string[]} args
 * @returns {{ paths: string[], mode: 'match'|'engine'|null,
 *             dryRun: boolean, check: boolean, include: string,
 *             excludes: string[], help: boolean }}
 */
function parseArgs(args) {
  const paths = [];
  let mode = null;
  let dryRun = false;
  let check = false;
  let include = "*.scrml";
  const excludes = [];
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--match") {
      if (mode !== null && mode !== "match") {
        console.error(c.red("error:") + ` Cannot combine --match and --engine; choose one mode per invocation.`);
        process.exit(1);
      }
      mode = "match";
    } else if (arg === "--engine") {
      if (mode !== null && mode !== "engine") {
        console.error(c.red("error:") + ` Cannot combine --match and --engine; choose one mode per invocation.`);
        process.exit(1);
      }
      mode = "engine";
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--check") {
      check = true;
    } else if (arg.startsWith("--include=")) {
      include = arg.slice("--include=".length);
    } else if (arg === "--include") {
      include = args[++i];
    } else if (arg.startsWith("--exclude=")) {
      excludes.push(arg.slice("--exclude=".length));
    } else if (arg === "--exclude") {
      excludes.push(args[++i]);
    } else if (arg === "--no-default-excludes") {
      // Recognised but no-op for the stub.
    } else if (arg.startsWith("-")) {
      console.error(c.red("error:") + ` Unknown option: ${arg}`);
      console.error(c.dim("Run `scrml promote --help` for usage."));
      process.exit(1);
    } else {
      paths.push(arg);
    }
  }

  return { paths, mode, dryRun, check, include, excludes, help };
}

/**
 * Entry point for the promote subcommand.
 *
 * STUB BEHAVIOUR: validates flag combinations and arguments, then prints a
 * loud "implementation pending" notice and exits with code 2.
 *
 * The validation work isn't wasted — when Tier B drops the transformation
 * impl behind this surface, the validated args feed straight into the
 * transformer.
 *
 * @param {string[]} args — raw argv slice after "promote"
 */
export function runPromote(args) {
  const { paths, mode, dryRun, check, help } = parseArgs(args);

  if (help) {
    printHelp();
    return;
  }

  if (mode === null) {
    console.error(c.red("error:") + " scrml promote requires either --match or --engine.");
    console.error(c.dim("Run `scrml promote --help` for usage."));
    process.exit(1);
  }

  if (paths.length === 0) {
    console.error(c.red("error:") + ` scrml promote --${mode} requires at least one file or directory.`);
    console.error(c.dim("Run `scrml promote --help` for usage."));
    process.exit(1);
  }

  // Validation is over. Print the implementation-pending notice and exit 2.
  const heading = c.yellow(c.bold("scrml promote: implementation pending"));
  console.error("");
  console.error(`  ${heading}`);
  console.error("");
  console.error(`  The CLI surface for ${c.cyan("`scrml promote --" + mode + "`")} is locked, but the`);
  console.error(`  AST→AST rewrite transformation has not yet shipped.`);
  console.error("");
  console.error(`  Mode requested:   ${c.cyan("--" + mode)}`);
  console.error(`  Targets:          ${paths.map(p => c.cyan(p)).join(", ")}`);
  if (dryRun) console.error(`  Flags:            ${c.cyan("--dry-run")}`);
  if (check)  console.error(`  Flags:            ${c.cyan("--check")}`);
  console.error("");
  console.error(`  Design lock:      ${c.dim("docs/changes/promotion-ergonomics/SCOPE.md")}`);
  console.error(`  Survey + cost:    ${c.dim("docs/changes/promotion-ergonomics/SURVEY-NOTE.md")}`);
  console.error(`  Tracking:         ${c.dim("S65 dispatch — Tier B (lint + transformer)")}`);
  console.error("");
  console.error(`  In the meantime:`);
  console.error(`    - To rewrite manually, the SCOPE doc gives canonical per-branch`);
  console.error(`      rewrite rules for if-else → <match>.`);
  console.error(`    - For migration of deprecated syntax (e.g. <machine> → <engine>),`);
  console.error(`      see ${c.cyan("`bun scrml migrate --help`")} (shipped P4).`);
  console.error("");

  // Exit 2: per the SCOPE exit-code table, "ambiguous site needing human
  // disambiguation". Repurposed here for "stub — human action required".
  // The next dispatch will repurpose 2 to its intended meaning, and a 0 exit
  // path (clean rewrite) will replace this stub.
  process.exit(2);
}
