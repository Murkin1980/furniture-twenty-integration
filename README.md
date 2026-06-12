# Furniture Twenty Integration

Optional integration module between Twenty CRM and
[`furniture-orders-mvp`](https://github.com/Murkin1980/furniture-orders-mvp).

## Status

Scaffold only. No service is deployed and no external CRM request is enabled.

The main platform remains the source of truth for:

- lead intake;
- furniture orders and statuses;
- calculators and landing sites;
- portfolio;
- manual AI analysis;
- the native manager CRM at `/crm`.

Twenty is a separate optional service for contacts, opportunities, tasks, and
communication history.

## Boundary

```text
Website / calculator / landing
-> furniture-orders-mvp
-> orders + native CRM
-> explicit manual sync contract
-> furniture-twenty-integration
-> Twenty CRM
```

An unavailable Twenty instance must never break order intake or the native CRM.

## Current platform implementation

The existing disabled-by-default adapter path currently remains in
`furniture-orders-mvp` while the module boundary is prepared:

- pure mapper;
- request builder;
- guarded sender;
- manual sync core;
- protected manual endpoint;
- sync persistence and admin control.

Do not remove that code until this repository has its own tested runtime and a
reviewed migration plan.

## Next milestone

1. Select a Twenty deployment and verify its generated REST schema.
2. Record the exact resource paths and payload contracts here.
3. Decide whether this module runs as a Cloudflare Worker or a small VPS
   service.
4. Move adapter logic with tests without changing the platform contract.
5. Run a disabled-by-default end-to-end test.

See [INTEGRATION_CONTRACT.md](INTEGRATION_CONTRACT.md) and
[MIGRATION_PLAN.md](MIGRATION_PLAN.md).
