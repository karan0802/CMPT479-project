# Threats to validity

## Construct validity

A mutation score is a proxy for fault-detection ability, not the thing itself. Some mutants are equivalent to the original code and can never be killed by any test; the "valid mutants" counts in this dataset exclude only compile-error mutants, not equivalent ones, so mutation scores computed from this data will be a slight underestimate of a suite's true effectiveness. Stage 4's manual review is the independent check against this proxy.

## Internal validity

- One model, one prompt, one sample per function (n = 24, plus 4 unused reserves). Prompt wording and sampling luck can both drive results; neither was adjusted after seeing any outcome.
- Quarantining tests that fail on the unmodified source code means mutation results describe only the tests that passed validation — a suite's *reported* mutation score reflects its surviving tests, with the quarantined fraction reported separately (10 of 468 test cases, see the dataset card).
- 8 of 24 functions produced fewer than 10 "valid" mutants once Stryker's TypeScript checker rejected some mutants as uncompilable in the context of the specific generated test (2 of those 8 produced none at all, because the checker type-checks the whole suite before any mutation can run, and a single real type error blocks it entirely). This is a property of how each specific generated test happens to use types, not of the underlying function, and it was not used as a reason to discard or replace any function.

## External validity

Pure, deterministic functions from three libraries in three domains (money arithmetic, colour conversion, bank-code validation), TypeScript only, Vitest only, one LLM. Results may not generalize to other models, to stateful or I/O-heavy code, or to UI code. dinero.js in particular is architected around a generic, backend-polymorphic `calculator` abstraction that most of its individual functions depend on; only 6 of its functions turned out to be both self-contained enough to select and rich enough to mutation-test, noticeably fewer than the other two libraries. That architectural style, not the selection process, is why dinero.js is under-represented (6 of 24) relative to colord (10) and ibantools (8).

## Contamination

All three libraries are public, so the generator may have seen their existing test suites during training. No similarity check against the upstream libraries' own tests was run in Stage 1; if this matters for later analysis, add it before drawing conclusions from suites whose structure closely resembles the upstream project's own tests.

## Selection

Function choice within each library is seeded and rule-based (seed 479), not hand-picked. The choice of libraries themselves is not random — colord and ibantools were chosen for having pure, checkable-against-an-external-spec logic; dinero.js was chosen for the same reason but turned out to be the hardest fit for this methodology, for the architectural reason above. One deliberate filter relaxation was made before generation (dinero.js's "at most 3 internal imports" self-containedness filter was widened to 4, documented in `scripts/select.ts`, to avoid a pool that was otherwise too thin to draw 8 functions from at all).
