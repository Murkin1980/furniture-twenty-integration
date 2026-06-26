const MAPPER_VERSION = 1;

export function buildTwentyPersonPayload(order) {
  const input = asObject(order);
  const rawName = textValue(firstValue(input, ["name", "clientName", "client_name"]));
  const nameParts = rawName.trim().split(/\s+/);
  const phone = textValue(firstValue(input, ["phone"]));
  const cleanedPhone = phone.replace(/[^\d]/g, "");
  const callingCode = cleanedPhone.startsWith("7") ? "+7" : "";
  const localNumber = cleanedPhone.startsWith("7") ? cleanedPhone.slice(1) : cleanedPhone;

  return compactObject({
    name: compactObject({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || nameParts[0] || ""
    }),
    phones: compactObject({
      primaryPhoneNumber: localNumber,
      primaryPhoneCallingCode: callingCode,
      primaryPhoneCountryCode: callingCode === "+7" ? "KZ" : ""
    }),
    emails: compactObject({
      primaryEmail: textValue(firstValue(input, ["email"]))
    })
  });
}

export function buildTwentyOpportunityPayload(order) {
  const input = asObject(order);
  const furnitureType = textValue(firstValue(input, ["ai_furniture_type", "aiFurnitureType", "furniture_type", "furnitureType"])) || "other";
  const orderId = normalizeOrderId(firstValue(input, ["id", "orderId", "order_id"]));
  const explicitTitle = textValue(firstValue(input, ["title", "opportunityName", "opportunity_name"]));
  const budget = Number(firstValue(input, ["budget"]));
  const amountMicros = Number.isFinite(budget) ? Math.round(budget * 1000000) : null;

  const opp = compactObject({
    name: explicitTitle || buildOpportunityName(orderId, furnitureType),
    amount: amountMicros ? { amountMicros, currencyCode: "KZT" } : undefined
  });

  if (firstValue(input, ["point_of_contact_id", "pointOfContactId"])) {
    opp.pointOfContactId = firstValue(input, ["point_of_contact_id", "pointOfContactId"]);
  }

  return opp;
}

export function buildTwentyNotePayload(order) {
  const input = asObject(order);
  const orderId = normalizeOrderId(firstValue(input, ["id", "orderId", "order_id"]));
  const lines = [
    noteLine("Order", orderId ? `#${orderId}` : ""),
    noteLine("Request", textValue(firstValue(input, ["description"]))),
    noteLine("AI summary", textValue(firstValue(input, ["ai_summary", "aiSummary"]))),
    noteLine("Next question", textValue(firstValue(input, ["ai_next_question", "aiNextQuestion"])))
  ].filter(Boolean);

  return {
    title: lines.filter(Boolean).join(" | ") || (orderId ? `Furniture order #${orderId}` : "Furniture order")
  };
}

export function buildTwentySyncPayload(order) {
  const input = asObject(order);
  return {
    person: buildTwentyPersonPayload(input),
    opportunity: buildTwentyOpportunityPayload(input),
    note: buildTwentyNotePayload(input),
    meta: {
      orderId: normalizeOrderId(firstValue(input, ["id", "orderId", "order_id"])),
      source: textValue(firstValue(input, ["source"])) || "",
      hasAiResult: hasAiResult(input),
      mapperVersion: MAPPER_VERSION
    }
  };
}

function buildOpportunityName(orderId, furnitureType) {
  return orderId ? `Order #${orderId} - ${furnitureType}` : `Furniture order - ${furnitureType}`;
}

function hasAiResult(input) {
  return ["ai_status", "aiStatus", "ai_score", "aiScore", "ai_summary", "aiSummary", "ai_furniture_type", "aiFurnitureType"].some((key) => input[key] !== undefined && input[key] !== null && input[key] !== "");
}

function noteLine(label, value) { return value ? `${label}: ${value}` : ""; }
function normalizeOrderId(value) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function textValue(value) { return value === undefined || value === null ? "" : String(value).trim(); }

function firstValue(input, keys) {
  for (const key of keys) { if (input[key]) return input[key]; }
  return undefined;
}

function compactObject(input) {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

function asObject(value) { return isPlainObject(value) ? value : {}; }
function isPlainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
