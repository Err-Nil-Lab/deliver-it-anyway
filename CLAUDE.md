# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DELIVER IT ANYWAY (formerly ONE MORE DELIVERY): a browser desktop push-your-luck prototype (TypeScript + KAPLAY + Vite). The player drags packages into trucks, weighs load against delivery chance, and runs timed shifts. This is a sibling project of `../proceed-anyway` and must not modify it.

## Commands

```sh
npm install
npm run dev       # Vite dev server
npm run build     # tsc (strict, noUnused*) then vite build
npm run preview
```

There is no test runner or linter; `npm run build` (type-check) is the verification step.

## Architecture

See the file list under Design status. Tune values in `src/config.ts` rather than inline; keep game rules in `shiftState.ts` and rendering/input in `main.ts`.

## Design status

`GDD.md` v2.0: two trucks run deliveries in parallel without blocking input, shifts are timed, and a shift report sells upgrades. Current code:

- `src/shiftState.ts` — pure state (package queue, trucks, `tickShift`, upgrades). No KAPLAY.
- `src/context.ts` — KAPLAY instance `k`, color tokens, shared mutable `session` (state, scene, drag), feedback arrays.
- `src/layout.ts` — card/bed/queue geometry and hit-test helpers derived from `session.state`.
- `src/scenes/` — `menu.ts` (menu, how-to), `play.ts` (drag & drop, trucks, HUD, feedback), `report.ts` (shift report, upgrades, next shift).
- `src/audio.ts` — WebAudio SFX. `src/main.ts` — wires input and the draw loop to the scenes.
- `src/systems/risk.ts` — `calculateDeliveryChance(load, capacity)`.
- `src/config.ts` — all tuning values (`shift`, `upgrades`, `risk`, `juice`).

`WORK_STEPS.md` tracks V2 steps; V2-7 to V2-9 (runtime QA, playtest, tuning) remain.

## Design docs (Indonesian)

Design intent lives in the root markdown files; check them before changing rules:

- `GDD.md` — game design; items marked `TERBUKA`/`USULAN` are test assumptions, not decisions.
- `WORK_STEPS.md` — ordered step list. Work is "one chat, one step": only do the active step, update its checklist status, then stop.
- `docs/archive/PROTOTYPE_PLAN.md`, `docs/archive/RULES_MODEL.md`, `docs/archive/PROGRESSION_EVAL.md` — rationale, expected-value model, and progression analysis.
