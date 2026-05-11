; scrml Tree-sitter highlight queries
;
; NOTE: scrml does not yet have a Tree-sitter parser. These queries are
; placeholder/aspirational and document the intended highlight mappings
; for when a Tree-sitter grammar is built.
;
; Currently, syntax highlighting in Neovim for scrml relies on the
; TextMate grammar (via the vscode-tmgrammar plugin or similar).
;
; To use TextMate highlighting in Neovim, consider one of:
;   - nvim-textmate (uses TextMate grammars directly)
;   - Setting up vim syntax rules (see below for a basic approach)
;
; Keyword list aligned with scrml v0.2.0 surface (B5 — 2026-05-11).
; Mirror of the keyword set in editors/vscode/syntaxes/scrml.tmLanguage.json.

; --- Aspirational Tree-sitter queries ---

; Tags
; (tag_name) @tag
; (closing_tag_name) @tag

; Attributes
; (attribute_name) @tag.attribute
; (attribute_value) @string

; Reactive variables
; (reactive_variable) @variable.builtin

; Keywords (control flow + declaration)
; ["let" "const" "lin" "var" "if" "else" "else-if" "for" "while" "of" "in"
;  "do" "return" "break" "continue" "throw" "try" "catch" "finally"
;  "switch" "case" "default" "new" "delete" "typeof" "instanceof" "void"
;  "async" "await" "yield" "import" "export" "from" "as" "is"
;  "class" "extends" "super" "this" "navigate" "using" "with"
;  "function" "fn" "pure" "server" "match" "lift" "type" "enum" "struct"] @keyword

; Keywords (scrml-specific v0.2.0 surface — structural elements, attributes, modifiers)
; ["engine" "machine" "errors" "onTransition" "onTimeout" "onIdle"
;  "channel" "schema" "program" "not" "req" "fail" "pinned" "reset"
;  "derived" "history" "given" "partial" "when" "transaction"
;  "test-bind"] @keyword

; Multi-word predicates (§55.1)
; ["is some" "is not"] @keyword.absence

; Built-in functions (recognized by name)
; ["cancelTimer" "parseVariant" "serialize" "reflect" "broadcast"
;  "disconnect" "cleanup" "flush" "animationFrame" "registerMessages"
;  "advance" "tryAdvance" "isOk" "isError"] @function.builtin

; Strings
; (string_literal) @string

; Numbers
; (number_literal) @number

; Comments
; (comment) @comment

; Block delimiters
; "${" @punctuation.special   ; logic
; "?{" @punctuation.special   ; SQL
; "^{" @punctuation.special   ; meta (compile-time)
; "#{" @punctuation.special   ; CSS-inline
; "!{" @punctuation.special   ; error-effect handler
; "~{" @punctuation.special   ; test block (§19.12)

; Function names
; (function_declaration name: (identifier) @function)

; Type names
; (type_declaration name: (identifier) @type)

; Operators
; ["=>" "::" "->" "..." "==" "!=" "<=" ">="] @operator

; Invalid forms (visually flagged — never legal scrml)
; ["===" "!=="] @error                 ; scrml has no triple-equals (E-EQ-004)
; ["null" "undefined"] @error          ; absence sentinel is `not` (E-SYNTAX-042)

; protect= attribute
; (protect_attribute) @tag.attribute.builtin

; Universal-core predicate bareword attributes (§55.1)
; (predicate_attribute name:
;   ["req" "length" "pattern" "min" "max" "gt" "lt" "gte" "lte"
;    "eq" "neq" "oneOf" "notIn"]) @tag.attribute.builtin

; Reactivity attributes (§6.13 / S79)
; (attribute name: ["debounced" "throttled"]) @tag.attribute.builtin

; Engine attributes (§51.0)
; (attribute name:
;   ["rule" "effect" "initial" "for" "to" "from" "after" "derived"
;    "default" "var" "name" "history" "internal:rule" "once"]) @tag.attribute.builtin

; Class binding (reactive single-class toggle)
; (class_binding_attribute) @tag.attribute.builtin
