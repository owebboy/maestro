# Spec → Plan → Link Pipeline

Shared procedure for `new-track` and `issue-advance`. Once an approved spec exists at `.maestro/work/<id>/spec.md` and the work-item `<id>` is known, both skills run this identical Design → Plan → Link → Subtasks sequence. This file is the single source of truth; each calling skill keeps only its distinct front half (item creation vs. in-place promotion) and its distinct tail (lifecycle status, and for promotion, weight + provenance) inline.

## 1. Design via brainstorming

Detect `brainstorming` using the [detection procedure](detecting-optional-skills.md), checking both plugin-prefixed and bare forms, and use whichever invocation form was found.

If available, invoke the brainstorming skill using the detected form. Pass the approved spec as context AND instruct it to write its design doc to `.maestro/work/<id>/design.md`. Example invocation context:

> Design a solution for the following specification. Write the design document to `.maestro/work/<id>/design.md`.
>
> {spec content}

If Superpowers writes the design doc elsewhere despite the instruction (e.g., `docs/superpowers/specs/` or `docs/specs/`), move it to `.maestro/work/<id>/design.md` and delete the external file.

If Superpowers is not installed, run an inline design discussion:
1. Propose 2-3 implementation approaches based on the spec
2. Present trade-offs for each
3. Get user approval on approach
4. Write the approved design to `.maestro/work/<id>/design.md`

## 2. Plan via writing-plans

Detect `writing-plans` using the [detection procedure](detecting-optional-skills.md), checking both plugin-prefixed and bare forms, and use whichever invocation form was found.

If available, invoke the writing-plans skill using the detected form. Instruct it to write the plan to `.maestro/work/<id>/plan.md`. Example invocation context:

> Create an implementation plan based on the approved design at `.maestro/work/<id>/design.md`. Write the plan to `.maestro/work/<id>/plan.md`.

If Superpowers writes the plan elsewhere despite the instruction (e.g., `docs/superpowers/plans/` or `docs/plans/`), move it to `.maestro/work/<id>/plan.md` and delete the external file. `/implement` reads this path directly — the plan MUST be there.

If Superpowers is not installed, generate a phased plan inline:
- Group tasks into logical phases
- Each task: description, files to modify, test to write, verification step
- Write plan directly to `.maestro/work/<id>/plan.md`

## 3. Link artifacts and mirror subtasks

After all prose is written:

1. **Link artifacts** (one call per artifact):
   - `link_artifact(id, spec, .maestro/work/<id>/spec.md)`
   - `link_artifact(id, design, .maestro/work/<id>/design.md)`
   - `link_artifact(id, plan, .maestro/work/<id>/plan.md)`

2. **Mirror plan tasks as subtasks:** parse the plan for phase/task entries; call `set_subtasks(id, [{ref, title, state: todo} for each plan task])` where `ref` = the plan's phase.task number (e.g. `1.1`, `1.2`, `2.1`). This is the coarse progress store — detailed TDD steps remain in the plan file.

After this pipeline, return to the calling skill for its lifecycle steps (status, and for promotion, weight + provenance).
