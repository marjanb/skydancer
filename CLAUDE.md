# skydancer

## Committing

Something other than the agent writes to `skydancer.js` during a session —
most likely the JetBrains IDE (`.idea/` is present) flushing a stale buffer or
a plugin saving over it. It has happened three times: a stray `make` wedged
into a line, a reverted `RELIEF` value, and a re-indented one. Twice it landed
in a commit that the agent then described to the user by what it had *written*
rather than what git had actually *captured*.

So never let a gap open between verifying an edit and staging it:

- Immediately before `git add`, re-check the exact values just changed
  (`grep -n` the line, `node --check skydancer.js`) and stop if they do not
  match what was verified in the browser.
- Put `git diff --cached` in the same shell command as the `git commit`, so the
  captured diff is always on screen before reporting the commit as done.
- Verify, stage, and commit in a single command where possible, rather than in
  separate tool calls.

Report what the diff shows, not what the edit intended.
