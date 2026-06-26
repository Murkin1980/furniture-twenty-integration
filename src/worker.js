import { syncOrderToTwenty } from "./twenty-sync.js";
import { sendTwentyRequest } from "./twenty-sender.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed", message: "Use POST." }, 405, { Allow: "POST, OPTIONS" });

    const url = new URL(request.url);
    const auth = checkAuth(request, env);
    if (auth) return auth;

    if (!url.pathname.startsWith("/api/orders/") || !url.pathname.endsWith("/crm/twenty")) {
      return jsonResponse({ success: false, error: "not_found", message: "Use POST /api/orders/:id/crm/twenty." }, 404);
    }

    const orderId = url.pathname.split("/")[3];
    if (!orderId || !/^\d+$/.test(orderId)) {
      return jsonResponse({ success: false, error: "invalid_order_id", message: "Order ID must be a positive integer." }, 400);
    }

    try {
      const order = await env.DB.prepare(
        `SELECT orders.id, orders.source, orders.city, orders.furniture_type AS furnitureType,
                orders.budget, orders.description, orders.raw_payload AS rawPayload, orders.status,
                orders.ai_status AS aiStatus, orders.ai_summary AS aiSummary,
                orders.ai_next_question AS aiNextQuestion, orders.ai_missing_info_json AS aiMissingInfoJson,
                clients.name, clients.phone
         FROM orders JOIN clients ON clients.id = orders.client_id WHERE orders.id = ?`
      ).bind(Number(orderId)).first();

      if (!order) return jsonResponse({ success: false, error: "order_not_found", message: "Order was not found." }, 404);

      const result = await syncOrderToTwenty(order, env, { sendRequest: (req) => sendTwentyRequest(req, { fetchFn: fetch }) });

      if (!result.ok) {
        await env.DB.prepare(
          `UPDATE orders SET crm_sync_status = ?, crm_error = ?, crm_last_attempt_at = ? WHERE id = ?`
        ).bind("failed", result.error, new Date().toISOString(), Number(orderId)).run();
        return jsonResponse({ success: true, orderId: Number(orderId), sync: { status: "failed", createdIds: result.createdIds, error: result.error, attemptedAt: new Date().toISOString() } });
      }

      const now = new Date().toISOString();
      await env.DB.prepare(
        `UPDATE orders SET crm_sync_status = ?, crm_person_id = ?, crm_opportunity_id = ?, crm_note_id = ?, crm_error = NULL, crm_last_attempt_at = ?, crm_synced_at = ? WHERE id = ?`
      ).bind("success", result.createdIds.person || "", result.createdIds.opportunity || "", result.createdIds.note || "", now, now, Number(orderId)).run();

      return jsonResponse({ success: true, orderId: Number(orderId), sync: { status: "success", createdIds: result.createdIds, requestCount: 3, attemptedAt: now, syncedAt: now } });
    } catch (error) {
      return jsonResponse({ success: false, error: "server_error", message: "Twenty sync failed." }, 500);
    }
  }
};

function checkAuth(request, env) {
  if (!env.ADMIN_TOKEN) return jsonResponse({ success: false, error: "admin_not_configured", message: "ADMIN_TOKEN is not configured." }, 503);
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer === env.ADMIN_TOKEN || request.headers.get("X-Admin-Token") === env.ADMIN_TOKEN) return null;
  return jsonResponse({ success: false, error: "unauthorized", message: "Admin token is invalid or missing." }, 401);
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, ...headers, "Content-Type": "application/json" } });
}
