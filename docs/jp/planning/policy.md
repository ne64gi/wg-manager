# wg-studio policy model (AI reference)

## Goal
Define deterministic authorization rules for all actions.

---

## Roles

- admin
- group_admin

---

## Scope

- own: resource.group_id == actor.group_id
- other: otherwise

Note:
- admin ignores scope restrictions

---

## Decisions

- ALLOW
- DENY

---

## Policy evaluation

decision = POLICY[action][role][scope]

If resource is not applicable:
- evaluate without scope

---

## Policy table

peer.create:
  admin: ALLOW
  group_admin:
    own: ALLOW
    other: DENY

peer.delete:
  admin: ALLOW
  group_admin:
    own: ALLOW
    other: DENY

peer.reveal:
  admin: ALLOW
  group_admin:
    own: ALLOW
    other: DENY

peer.regenerate:
  admin: ALLOW
  group_admin:
    own: ALLOW
    other: DENY

config.apply:
  admin: ALLOW
  group_admin:
    own: DENY
    other: DENY

role.change:
  admin: ALLOW
  group_admin:
    own: DENY
    other: DENY

graph.view:
  admin: ALLOW
  group_admin:
    own: ALLOW
    other: DENY

drilldown.view:
  admin: ALLOW
  group_admin:
    own: ALLOW
    other: DENY

auth.login:
  admin: ALLOW
  group_admin: ALLOW

auth.logout:
  admin: ALLOW
  group_admin: ALLOW

---

## Scope evaluation

if role == admin:
    skip scope evaluation

if resource.group_id == actor.group_id:
    scope = own
else:
    scope = other

---

## Deny behavior

If decision == DENY:
- MUST log audit event
- MUST include reason
- MUST stop execution

---

## Reason mapping (minimal)

- admin_only
- group_scope_denied
- auth_required