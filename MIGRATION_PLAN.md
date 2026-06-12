# Migration plan

## Current state

The tested adapter implementation remains in `furniture-orders-mvp`. This
repository only defines the future module boundary.

## Safe extraction sequence

1. Verify exact Twenty REST paths against the selected workspace/version.
2. Add a standalone module runtime with health endpoint and authentication.
3. Port pure mapper and request-builder tests.
4. Port guarded sender and sequential sync core.
5. Add contract tests between the platform and this module.
6. Deploy with sync disabled.
7. Run a controlled test order.
8. Switch the platform endpoint to the module.
9. Remove duplicate adapter code only after rollback verification.

## Rollback

Keep Twenty sync disabled and continue using the native CRM. Order intake and
manager workflow remain available without this module.
