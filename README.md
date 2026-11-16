# CMPT 479 Project

**Automated Review of AI-Generated TypeScript Tests Using Static Analysis and Mutation Testing**

Team: Sandeep Dhillon, Gurkaran Singh, Taranveer Singh

## Summary

AI assistants now write unit tests, but some of those tests look fine while never actually checking that the code behaves correctly — for example, a test that only checks that a function returned *something* instead of checking *what* it returned. This project builds a tool that reads AI-generated tests, flags suspicious ones using static analysis, and checks whether those warnings were right by measuring how many deliberately injected bugs (mutants) each test suite actually catches.

## Research question

Can static analysis of AI-generated TypeScript unit tests reliably flag weak assertions, and do those warnings agree with what mutation testing independently shows about test effectiveness?

## Project stages

1. **Stage 1 — Dataset.** Select real functions from open-source TypeScript libraries, generate a test suite for each with a fixed AI model and prompt, validate the results, and freeze the dataset.
2. **Stage 2 — Review tool.** Statically analyze each test file with the TypeScript compiler and flag weak assertions.
3. **Stage 3 — Measurement.** Run the tests and inject mutants into the source code; compare the resulting mutation scores against the Stage 2 warnings and against plain code coverage.
4. **Stage 4 — Human check.** Manually label a sample of test cases to measure the precision and recall of the Stage 2 warnings.

## Stage 1 status

- [x] Repository initialized
- [ ] Three upstream repositories chosen, trialled and pinned
- [ ] Per-library test/coverage/mutation harness configured
- [ ] Tracer-bullet spike passed on all three libraries
- [ ] 24 functions selected (manifest.json)
- [ ] Test suites generated for all 24 functions
- [ ] Suites validated, quarantined where needed, and frozen

## Setup

_To be filled in as the toolchain is built out in Stage 1._

## License

Our own code is MIT licensed — see [LICENSE](LICENSE). Code borrowed from upstream open-source libraries keeps its own original license; see `third_party/licenses/` and the Attribution section below once upstream libraries are pinned.

## Attribution

_To be filled in once upstream libraries are chosen and pinned (Phase 1)._
