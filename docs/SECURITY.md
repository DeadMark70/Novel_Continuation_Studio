# SECURITY

## Current Security Baseline

This project is a research prototype and not a full production security posture.

## Implemented Controls

1. Internal route gate for generation APIs:
   - header: `X-API-Secret`
   - env: `INTERNAL_API_SECRET`
2. Optional local bypass:
   - `ALLOW_UNSAFE_LOCAL=true` only outside production
3. Provider keys resolved server-side when available.
4. OpenRouter network guard support in server route.

## Known Gaps

1. Internal secret is not user/session auth.
2. If exposed client-side, secret can be observed in browser network tools.
3. No RBAC, tenancy boundary, or audit trail.

## Required Upgrade Path For Public Deployment

1. Replace internal secret approach with session/cookie auth.
2. Add CSRF and origin policy review.
3. Add per-user authorization checks for session resources.
4. Add security logging and anomaly alerts.

## Secrets Handling Notes

- Prefer server env vars for provider keys.
- Avoid hardcoded secrets in repository.
- Rotate leaked or shared keys immediately.

