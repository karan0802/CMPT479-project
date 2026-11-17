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
- [x] Three upstream repositories chosen, trialled and pinned
- [x] Per-library test/coverage/mutation harness configured
- [ ] Tracer-bullet spike passed on all three libraries
- [x] 24 functions selected (manifest.json)
- [x] Test suites generated for all 24 functions
- [ ] Suites validated, quarantined where needed, and frozen

## Setup

- `dataset/upstream.lock.json` pins the exact version of each upstream library we pull functions from.
- `upstream/` (not committed) holds working clones of those libraries, cloned at the pinned commit.
- `harness/` holds our own test/coverage/mutation toolchain: a shared setup for colord and ibantools (whose own tooling is too old to run Stryker directly, so their source is copied verbatim into `harness/extracted/`), plus patch/config files for dinero.js, which runs the toolchain in place.

## License

Our own code is MIT licensed — see [LICENSE](LICENSE). Code borrowed from upstream open-source libraries keeps its own original license; see `third_party/licenses/` and the Attribution section below once upstream libraries are pinned.

## Attribution

Functions in this dataset are drawn from three open-source TypeScript libraries, pinned by tag/commit in [`dataset/upstream.lock.json`](dataset/upstream.lock.json), with their original licenses kept in [`third_party/licenses/`](third_party/licenses/):

- [dinero.js](https://github.com/dinerojs/dinero.js) (`v2.0.2`) — MIT
- [colord](https://github.com/omgovich/colord) (`v2.9`) — MIT
- [ibantools](https://github.com/Simplify/ibantools) (`4.5.4`) — MIT OR MPL-2.0
