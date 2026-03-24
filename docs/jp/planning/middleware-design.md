# wg-studio middleware design

## Goal
Enforce RBAC policy and guarantee audit logging consistency.

---

## Flow

1. Request received
2. Extract actor (login user)
3. Identify action
4. Identify resource (if applicable)
5. Evaluate scope
6. Evaluate policy
7. Write audit log
8. Continue or reject

---

## Execution flow (pseudo)

actor = get_actor(request)
action = resolve_action(request)
resource = resolve_resource(request)

if actor is None:
    log audit (auth.denied)
        reject

        if actor.role != admin:
            if resource exists:
                    if resource.group_id == actor.group_id:
                                scope = "own"
                                        else:
                                                    scope = "other"
                                                        else:
                                                                scope = None

                                                                decision = evaluate_policy(action, actor.role, scope)

                                                                if decision == DENY:
                                                                    audit_log(
                                                                            event=action,
                                                                                    outcome="DENY",
                                                                                            reason=resolve_reason(action, actor, scope),
                                                                                                    correlation_id=cid,
                                                                                                        )
                                                                                                            reject

                                                                                                            audit_log(
                                                                                                                event=action,
                                                                                                                    outcome="ALLOW",
                                                                                                                        correlation_id=cid,
                                                                                                                        )

                                                                                                                        execute_handler()

                                                                                                                        ---

                                                                                                                        ## Requirements

                                                                                                                        - middleware MUST be applied to all endpoints
                                                                                                                        - bypass MUST NOT be possible
                                                                                                                        - policy MUST be single source of truth
                                                                                                                        - audit logging MUST be centralized

                                                                                                                        ---

                                                                                                                        ## Correlation ID

                                                                                                                        - generate at request entry
                                                                                                                        - propagate through entire request lifecycle
                                                                                                                        - include in all audit logs

                                                                                                                        ---

                                                                                                                        ## Action resolution

                                                                                                                        - map HTTP endpoint to action string

                                                                                                                        Example:
                                                                                                                        POST /peers → peer.create
                                                                                                                        DELETE /peers/:id → peer.delete

                                                                                                                        ---

                                                                                                                        ## Resource resolution

                                                                                                                        - extract resource from request context
                                                                                                                        - MUST include group_id if applicable

                                                                                                                        ---

                                                                                                                        ## Failure handling

                                                                                                                        - all DENY must be logged
                                                                                                                        - all auth failures must be logged
                                                                                                                        - no silent failures allowed

                                                                                                                        ---

                                                                                                                        ## Logging guarantees

                                                                                                                        - audit_log must be called before reject
                                                                                                                        - audit_log must be called for all successful actions
                                                                                                                        - audit_log must NOT depend on log level

                                                                                                                        ---

                                                                                                                        ## Non-goals

                                                                                                                        - no rate limiting
                                                                                                                        - no intrusion detection
                                                                                                                        - no external logging integration