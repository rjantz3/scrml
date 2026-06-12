# cluster-A — unquoted-attr-condition operator reject

Worktree: agent-ae5a14fba65a18aba (pwd verified under .claude/worktrees/agent-)
Ruling (S188): bare operator in unquoted attr-condition → ONE clean E-ATTR-UNQUOTED-OPERATOR
steering to parens/quotes. Paren `if=(expr)` + quote `if="expr"` stay canonical operator forms.

## Empirical findings (verified on this worktree, pre-fix)
- Tokenizer unquoted value-reader stops at first non-valueIdent char.
- `>= > < <= == != + - * /` (spaced or jammed): operator + RHS DROPPED at TOKEN level — NO
  residual stray attribute. Only `ATTR_IDENT:@n` + TAG_CLOSE_GT survive.
- `&& || ?:`: RHS operand (starts with @ or ident) survives as a STRAY ATTR_NAME (DOM leak / E-DG-002).
- `>=` (and spaced `>`): the `>` closes the tag → misleading E-CTX-001 cascade (LOUD-FAIL).
- jammed `@n>3`: silent-drop (`>` tag-close, `3` leaks as content).
- Markup condition attrs per emit-html.ts:146 = `if`/`show`/`else-if`. `while=` is NOT a markup
  attribute (SPEC §17 has no while=; "while condition" in §42.10 means ${while(...)}). Scope to if/show/else-if.

## Plan
P1 tokenizer: condition-attr predicate + operator-run capture → new ATTR_OP_REJECT token.
P1 ast-builder: ATTR_OP_REJECT → fire E-ATTR-UNQUOTED-OPERATOR once, recover value as absent.
P2 fn() misroute: assess; defer if deep routing change.
P3 SPEC: §17.1 + §5.1/§5.2 + §34 row + §42.10 reconcile note.
P4 tests: new unit test full matrix.
P5 gaps: flip g-attr-gte-tagclose + g-attr-unquoted-compound-silent-drop → resolved.
P6 R26 empirical.

## Log
- [start] startup verified, base contains 2678e8a9, install+pretest OK, empirical probes done.

## P1 DONE (commit 7b4f743b)
tokenizer ATTR_OP_REJECT + ast-builder fire + BS >= guard (scanAttributes +
peekTopLevelStateDeclSignal) + BS ternary ?-depth tracking. Full operator matrix
fires E-ATTR-UNQUOTED-OPERATOR once, 0 E-CTX. Preserve cases (atomic/!/member/
fn()/quoted/paren/show=) green. Precedence: binary-op reject wins over inner not;
paren form then E-TYPE-045. e-type-045 test updated for new precedence (32 pass).
Unit 14214/0, integration+conformance 2560/0.
Scope note: while= is NOT a markup attr (§17 has only if=/show=); condition attrs
= if/show/else-if.

## P2 fn() misroute — DEFERRED
if=check() emits addEventListener("if", ...) (call-ref branch emit-html.ts:1761
unconditionally event-binds). Routing it as a CONDITIONAL needs inter-procedural
reactive analysis of the fn body (condExpr refs are empty for a bare call → would
render-once, not reactively update). Deeper than the scanner. Filing
g-attr-if-fn-call-misroute (MED). Per brief: defer.

## P3 SPEC — staged
§34 +E-ATTR-UNQUOTED-OPERATOR row; §5.2 atomic-only-unquoted-condition normative
bullet; §17.1 if= bullet refined; §42.10 reconcile note (operand positions are
quoted/paren, not authorizing bare ops). SPEC-INDEX regenerated (line ranges).

## P5 DONE — known-gaps
g-attr-gte-tagclose → resolved; g-attr-unquoted-compound-silent-drop → resolved
(both rewritten: broader ~14-op class, reject+parens ruling, E-ATTR-UNQUOTED-OPERATOR,
SPEC-§5.5.2-misread correction). Filed g-attr-if-fn-call-misroute (MED, open) for
the deferred Phase-2 fn() misroute.
