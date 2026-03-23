# Audit Model Notes

Purpose: capture the intended direction for audit and operator-traceability work after `v1.0.0`.

Status: planning memo only.

Related docs:

- `v1.1-authorization-notes.md`
- `../../spec/api-contracts.md`
- `../../spec/workflows.md`
- `../backlog/1.x-plan.md`

## Why This Exists

`wg-studio` already has audit logging, but later phases will likely ask more from it:

- stronger authorization coupling
- clearer operator attribution
- boundary-aware logs in future multi-runtime / multi-tenant work
- better review and rollback support

This note exists so audit work does not stay as an accidental side effect of route changes.

## Near-Term Direction In `1.x`

Audit should gradually become the answer to:

- who did what
- to which object
- from which control-plane action
- with what result

Near-term targets:

- stronger coverage on mutating actions
- clearer action naming
- authz decision logging once authorization becomes real
- safer correlation between UI actions and backend audit entries

## Desired Record Shape

Useful audit records should trend toward carrying:

- actor identity
- action name
- resource type
- resource identifier
- outcome
- reason or decision source when relevant
- timestamp

Examples:

- `group.create`
- `user.update`
- `peer.reveal`
- `peer.reissue`
- `config.apply`
- `state.import`
- `authz.deny`

## Relationship To Authorization

Authorization and audit are closely related, but should not be merged conceptually.

Preferred relationship:

- authorization decides whether an action is allowed
- audit records the attempted or completed action and its outcome

When authz becomes stronger later:

- allow / deny / abstain should be loggable
- policy source or plugin name should be traceable where possible
- denial should still be auditable

## Relationship To Future Boundaries

In `2.x`, audit will likely need stronger ownership boundaries.

Future questions to preserve:

- is an audit record global or runtime-scoped?
- is it tenant-scoped?
- can a single operator see all audit data or only a subset?
- how should export or review work across future boundaries?

Do not solve all of this now, but avoid painting the model into a corner.

## Near-Term Non-Goals

- full SIEM integration
- long-term retention strategy
- complex external audit sinks
- tenant-ready audit partitioning before boundary work exists

## Practical Rule

When changing a mutating or secret-bearing path, ask:

1. should this action be auditable?
2. is the action name stable and understandable?
3. will a future authz layer want to correlate with this event?

If the answer is yes, bias toward a cleaner audit shape instead of a one-off log string.
