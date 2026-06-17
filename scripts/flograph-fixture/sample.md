# flograph fixture — exercises every MVP feature deterministically

<!-- @node id=board-each kind=gap status=open sev=HIGH -->
The board `<each>` conversion blocker. This [[blocks: trucking-board]] and the
list-of-cards pattern. Root [[decided-by: dd-each-arch verified]] — emitted-JS probe.
It also [[cites: dd-each-arch]]. Related: [[some-untyped-thing]].
Points nowhere on purpose: [[blocks: does-not-exist]].

<!-- @node id=trucking-board kind=example status=open -->
The flagship board example. [[supersedes: old-board]].

<!-- @node id=dd-each-arch kind=dd status=current -->
The architecture deep-dive (load-bearing — status=current).
This claim [[cites: external-source]] is asserted, NOT verified → provenance sweep should flag it.

```scrml
// a code fence — [[this: should-be-ignored]] must NOT be parsed as an edge
<each in=@x>...</each>
```

<!-- @node id=board-each kind=gap status=open sev=MED -->
DUPLICATE id on purpose (should fire a dup-id ERROR in --check).
