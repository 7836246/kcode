# AI implementation guidance

Architecture governance is a pre-code decision protocol. A coding agent should be able to answer these questions before producing a patch:

| Decision | Required answer                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Behavior | Which spec describes the requested behavior, and what acceptance cases are changing?                          |
| Owner    | Which one module or service owns the mutable state and accepts writes?                                        |
| Contract | What is the smallest typed read/write/event contract, and which callers are allowed to use it?                |
| Layer    | Which layer owns the new code, and which direction may imports travel?                                        |
| Reuse    | Which existing path already performs part of this work, and why is a new path necessary?                      |
| Time     | What is the event order, idempotency key, stale-result rule, and retry boundary?                              |
| Remote   | Does this preserve desktop continuous delivery and mobile replayable recovery separately?                     |
| Context  | Which contracts, specs, and tests are sufficient for the agent to work without reading whole implementations? |

The agent should reject these shapes during design:

- a renderer or UI component writing persistence, runtime state, or a second queue;
- two services accepting the same command or both claiming ownership of a state field;
- a new cache, event bus, adapter, or helper that duplicates an existing path;
- a domain object importing filesystem, process, network, timer, or platform APIs;
- a cross-module deep import added only to avoid defining a contract;
- a remote stream change that mixes desktop `continuous` and mobile `replayable` semantics;
- a broad refactor that changes unrelated modules without an explicit migration boundary.

The patch description should include a small decision record:

```text
owner: <single state owner>
command path: <entrypoint → owner>
derived views: <what is projected and from where>
ordering/idempotency: <sequence and duplicate handling>
delivery: <desktop-continuous | web-remote-replayable | both>
contracts/spec/tests: <bounded reading and validation set>
```

This guidance complements executable rules. The policy checker can prove import and size constraints; the decision record makes ownership, reuse, and time semantics explicit before an agent writes code.
