# Integration contract

## Platform ownership

`furniture-orders-mvp` owns order intake, the canonical order record, and the
native CRM workflow. Twenty data is a downstream representation.

## First supported operation

Manual one-way order sync:

```text
POST /api/orders/:id/crm/twenty
```

The public platform contract may remain this endpoint even after adapter logic
moves into this module. The platform should call the module only after explicit
manager action.

## Input

The module receives a normalized order sync payload containing:

- person/contact fields;
- opportunity fields;
- manager-readable note;
- order ID and source;
- optional AI qualification fields.

No arbitrary code or user-defined request URL is accepted.

## Output

```json
{
  "status": "success",
  "personId": "string",
  "opportunityId": "string",
  "noteId": "string",
  "error": ""
}
```

Failed syncs return a controlled error and must not mutate ordinary order
fields.

## Safety

- Manual sync first.
- Disabled by default.
- One request per resource; no tight retry loops after HTTP 429.
- Credentials only in environment variables.
- No inbound webhooks until one-way sync is stable.
- No Twenty MCP in production until API sync is stable.
