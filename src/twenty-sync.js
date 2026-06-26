import { buildTwentySyncRequests } from "./twenty-request-builder.js";

export async function syncOrderToTwenty(order, env = {}, options = {}) {
  if (!order || typeof order !== "object") return failure("invalid_order", "Order data is required.");
  if (env.TWENTY_SYNC_ENABLED !== "true") return failure("sync_disabled", "Twenty sync is disabled.");
  if (typeof options.sendRequest !== "function") return failure("sender_not_configured", "Twenty sender is not configured.");
  if (!env.TWENTY_API_BASE_URL || !env.TWENTY_API_KEY) return failure("not_configured", "Twenty API base URL and key are required.");

  let sync;
  try { sync = buildTwentySyncRequests(order, env); }
  catch (error) { return failure("request_build_failed", error instanceof Error ? error.message : "Failed to build Twenty requests."); }

  const createdIds = {};
  for (const request of sync.requests) {
    if (request.resource === "opportunity" && createdIds.person) {
      request.body.pointOfContactId = createdIds.person;
    }
    try {
      const response = await options.sendRequest(request);
      createdIds[request.resource] = extractCreatedId(response, request.resource);
    } catch (error) {
      return { ok: false, status: "failed", createdIds, error: error instanceof Error ? error.message : "Twenty sync failed." };
    }
  }

  return { ok: true, status: "success", createdIds, meta: sync.meta };
}

function extractCreatedId(response, resource) {
  const full = response?.data;
  if (!full || typeof full !== "object") return null;
  const inner = full?.data;
  if (inner && typeof inner === "object") {
    const mutationKey = `create${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
    const nested = inner[mutationKey];
    if (nested && typeof nested === "object" && nested.id) return nested.id;
  }
  return full?.data?.id ?? full?.id ?? null;
}

function failure(error, message) { return { ok: false, status: "failed", createdIds: {}, error: message || error }; }
