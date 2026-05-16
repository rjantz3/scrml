/**
 * S97 — S95 Bug 4 closure
 *
 * `<li ondrop=dropOn(name)>` inside a component template, where `name` is
 * a prop, pre-fix produced:
 *   HTML: `<li ondrop="dropOn" name>`  — call shape lost; `name` became bare attr
 *   JS  : no event wiring at all
 *
 * Two coordinated fixes:
 *
 *   (1) component-expander.ts:normalizeTokenizedRaw — Step 6 collapses
 *       tokenized call-form spacing `ident ( args )` → `ident(args)` so
 *       the downstream markup tokenizer (tokenizer.ts:403 `ch() === "("`
 *       check) correctly produces ATTR_CALL instead of ATTR_IDENT + stray
 *       attribute fragments.
 *
 *   (2) component-expander.ts:substituteProps — extended to substitute
 *       prop refs inside call-ref / variable-ref / expr attribute values
 *       (previously only string-literal values had substitution applied).
 *       Uses propExprMap + substitutePropsInExprNode + emitStringFromTree
 *       to walk argExprNodes and re-serialize.
 *
 * Without (1): the call shape is destroyed at tokenize time; substituteProps
 *   has nothing to substitute.
 * Without (2): the call shape survives but the `name` ident inside the args
 *   is unresolved at codegen time → `dropOn(name)` emitted with `name`
 *   bound to nothing.
 *
 * Both fixes are needed end-to-end.
 *
 * SPEC authority: §5.2.1 (event handler args forwarded as-is);
 *                  §15.10 (props declared via props={...});
 *                  §15.13 (component reactive scope).
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import fs from "fs";
import path from "path";
import os from "os";

function compileSrcToTmp(src, basename = "bug4-test") {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bug4-"));
  const srcPath = path.join(tmpDir, `${basename}.scrml`);
  fs.writeFileSync(srcPath, src);
  try {
    compileScrml({
      inputFiles: [srcPath],
      write: true,
      outputDir: tmpDir,
    });
    const clientPath = path.join(tmpDir, `${basename}.client.js`);
    const htmlPath = path.join(tmpDir, `${basename}.html`);
    return {
      client: fs.existsSync(clientPath) ? fs.readFileSync(clientPath, "utf-8") : null,
      html: fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf-8") : null,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// §1 — Bug 4 closure: prop ref in event-handler args inside component template
// ---------------------------------------------------------------------------

describe("§1 — prop substitution into call-ref attribute args (Bug 4)", () => {
  test("§1.1 component template `<li ondrop=dropOn(name)>` emits per-instance handler", () => {
    const src = `<program>
    <selected> = ""

    ${"$"}{
        function dropOn(zoneName) {
            @selected = zoneName
        }

        const DropZone = <ul class="zone" props={ name: string }>
            <li ondrop=dropOn(name)>Drop on ${"$"}{name}</li>
        </>
    }

    <DropZone name="zone-a"/>
    <DropZone name="zone-b"/>
</program>`;
    const { client, html } = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    expect(html).not.toBeNull();
    // Pre-fix HTML symptom: `<li ondrop="dropOn" name>`
    expect(html).not.toMatch(/ondrop="dropOn"/);
    expect(html).not.toMatch(/<li[^>]*\bname>/);
    // Post-fix: per-instance handler IDs with the prop value substituted
    expect(client).toMatch(/_scrml_dropOn[^(]*\("zone-a"\)/);
    expect(client).toMatch(/_scrml_dropOn[^(]*\("zone-b"\)/);
    expect(() => new Function(client)).not.toThrow();
  });

  test("§1.2 single-arg prop ref substitutes verbatim", () => {
    const src = `<program>
    <log> = ""
    ${"$"}{
        function announce(label) { @log = label }
        const Btn = <button props={ label: string }>
            <span onclick=announce(label)>Hit</span>
        </>
    }
    <Btn label="primary"/>
</program>`;
    const { client } = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    // Substituted to the literal string
    expect(client).toMatch(/_scrml_announce[^(]*\("primary"\)/);
    expect(() => new Function(client)).not.toThrow();
  });

  test("§1.3 multi-arg call with mixed literal + prop ref", () => {
    const src = `<program>
    <log> = []

    ${"$"}{
        function track(action, target) {
            @log = [...@log, action + ":" + target]
        }

        const Action = <button props={ label: string }>
            <span onclick=track("click", label)>Do</span>
        </>
    }

    <Action label="primary"/>
</program>`;
    const { client } = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    expect(client).toMatch(/_scrml_track[^(]*\("click",\s*"primary"\)/);
    expect(() => new Function(client)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §2 — Regression: non-component contexts unchanged
// ---------------------------------------------------------------------------

describe("§2 — non-component event-handler args unchanged", () => {
  test("§2.1 plain markup outside a component still works", () => {
    const src = `<program>
    <selected> = ""
    ${"$"}{
        function dropOn(zoneName) { @selected = zoneName }
        const name = "zone-only"
    }
    <ul>
        <li ondrop=dropOn(name)>Drop</li>
    </>
</program>`;
    const { client } = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    // Outside a component, `name` is a local — should pass through as a
    // bare identifier reference (not substituted, since no propExprMap).
    expect(client).toMatch(/_scrml_dropOn[^(]*\(name\)/);
    expect(() => new Function(client)).not.toThrow();
  });
});
