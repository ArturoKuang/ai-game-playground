You are running one autonomous Pocket Puzzle Lab experiment iteration.

Follow `program.md` as the source of truth. Execute exactly one full iteration and then stop.

Requirements:

- Inspect the current branch and commit at the start of the iteration.
- If the repository has no commits yet, use `unborn` in the `commit` column of `results.tsv`.
- Choose either concept search mode or prototype expansion mode.
- Make one concrete change intended to improve fun, not just the evaluator score.
- Respect the mutable and fixed file boundaries defined in `program.md`.
- Run the required validation sequence before scoring.
- Only run `npm run evaluate:ideas > run.log 2>&1` after validation passes.
- Read the summary from `run.log`.
- If the change is buggy, flat, confusing, generic, or not directionally better, revert that iteration's changes before finishing.
- Append exactly one row to `results.tsv` for this iteration with a `keep`, `discard`, or `crash` status.
- Do not ask the user questions.
- Do not make commits unless explicitly instructed.

Your final response must be short and include:

1. The mode you chose.
2. The concrete change you made or discarded.
3. Validation status.
4. Score summary.
5. The exact `results.tsv` row you appended.
