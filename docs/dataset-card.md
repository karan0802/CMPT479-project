# Stage 1 dataset card

## What this is

24 TypeScript functions drawn from three open-source libraries (dinero.js, colord, ibantools), each with one AI-generated Vitest test suite, produced from a single frozen prompt and one fixed generator, one isolated attempt per function. Plus 4 reserve functions (not used unless a primary is later disqualified) and everything needed to independently compile, run, and mutation-test every suite.

## How it was built

1. Chose and pinned three libraries by commit SHA (`dataset/upstream.lock.json`).
2. Mined every exported function with the TypeScript compiler API, applied hard filters (deterministic, self-contained, 8–80 lines, ≥2 branches, not a thin wrapper), then drew 8 primary + 2 reserve per library with a fixed seed (479) — not hand-picked.
3. dinero.js's eligible pool, after the mutant-budget check, only had 6 functions that clear 10–120 mutants; colord picked up 2 extra primaries from its surplus pool to keep the dataset at 24 total. Final split: dinero.js 6, colord 10, ibantools 8 (28 with reserves).
4. Froze one prompt template (`dataset/prompts/v1/`) and generated all 24 suites by sending each function, alone, to a brand-new isolated session with no access to this plan, this repository, or any other function's prompt.
5. Validated every suite: does it compile, does it load, does it execute the same way 3 times in a row, what's its statement/branch coverage, does test isolation hold.
6. Quarantined (in a derived copy only — the original AI output is never edited) any test case that failed or was inconsistent across the 3 runs.
7. Ran Stryker on every runnable suite as a smoke test, proving mutation testing works end to end, and froze everything with SHA-256 checksums.

## Known, deliberate deviations from a literal reading of the plan

- **dinero.js's calculator parameter.** Several dinero.js functions take a `calculator` argument whose concrete type isn't defined anywhere in the function's own file (it's generic over number/bigint backends). Showing just the function, as the plan's template does by default, would have made the function untestable by construction — nothing to do with test *quality*. For those functions only, one neutral line was added to the prompt naming where the concrete number-backed calculator lives (`../../calculator/number`), the same fact a developer working in this codebase would already know. Nothing else about the prompt changed, and no hint about test quality was given.
- **ibantools' shared file.** All 8 ibantools functions live in one 1844-line file dominated by a ~200-country lookup table. Embedding the whole file in all 8 prompts would have made them unnecessarily large with no benefit (every prompt would carry the exact same ~190 lines of unrelated country data). The table was truncated to 9 representative countries (NL, CH, DE, GB, FR, BE, AT, NO, LI) in the *prompt* only — the dataset's source snapshot and provenance are untouched. Noted in each affected `request.json`'s `note` field.

## Composition

| Library | Primary | Reserve | Mode |
| --- | --- | --- | --- |
| dinero.js | 6 | 0 | A (runs in place in the pinned clone) |
| colord | 10 | 2 | B (source copied verbatim into `harness/extracted/`) |
| ibantools | 8 | 2 | B (source copied verbatim into `harness/extracted/`) |

## Validation results (from the frozen suites, see `dataset/validation/`)

- All 24 suites load and run without crashing; isolation holds for all 24 (only the function's own generated test ever executes).
- 22 of 24 compile cleanly under `tsc`; 2 (`iban-core-friendlyFormatIBAN`, `col-lab-parseLaba`) have a genuine TypeScript error in the AI-generated test itself — kept as data, not fixed.
- 468 test cases extracted (`dataset/test-cases.json`); 10 were quarantined (failed or disagreed with the unmodified source code across the 3 validation runs) — 458 remain active. No test case was flaky (same pass/fail result in all 3 runs).
- Stryker smoke run (`results/stage1-smoke/`): 22 of 24 suites produced a mutation score. The 2 that didn't are the same 2 with compile errors above — Stryker's TypeScript checker type-checks the suite before mutation testing can start, so a genuine type error there blocks the whole run, even though Vitest itself runs the same file fine (Vitest strips types; it doesn't check them).
- Of those 22, 6 produced fewer than 10 "valid" (non-compile-error) mutants once the checker rejected some individual mutants in context: `din-api-toDecimal` (7), `din-api-toUnits` (8), `col-src-parse` (9), `col-rgb-parseRgba` (8), `col-hslString-parseHslaString` (5), `col-hwb-parseHwba` (8). Combined with the 2 complete failures, 8 of 24 functions fall below the plan's "at least 10 valid mutants" guideline.
  - These 8 were **kept as data rather than swapped for reserves.** The plan's own guidance for a whole-suite failure is to keep it as data and only fall back to reserves once the pool of *loadable, runnable* suites drops below 20 of 24 (it hasn't — all 24 load and run); separately, the reserve pool literally cannot absorb 8 replacements (dinero.js has 0 reserves, colord and ibantools have 2 each). The pattern itself — the TypeScript checker rejecting mutants that a trivial placeholder test wouldn't have — is a real characteristic of how AI-generated tests interact with static type checking, not a flaw in the function selection.

## Not part of this dataset

- `dataset/subjects/`, `dataset/raw/`, `dataset/generated/` are immutable after the freeze tag. Any future change is a new dataset version, with a written reason.
- The internal Stage 1 planning document that drove this process is intentionally not part of this repository.
