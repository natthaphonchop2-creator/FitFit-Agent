import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";

export async function recordLineEvent(event) {
  if (!isSupabaseConfigured()) {
    return { skipped: true, reason: "supabase_not_configured" };
  }

  const supabase = getSupabaseAdmin();
  const lineUserId = event.source?.userId || null;
  const message = event.message || {};
  let customerId = null;

  if (lineUserId) {
    const customer = await ensureCustomerForLineUser(lineUserId);

    if (customer) {
      customerId = customer.id;
    }
  }

  const { error: eventError } = await supabase.from("customer_events").insert({
    customer_id: customerId,
    line_user_id: lineUserId,
    event_type: event.type || "unknown",
    message_type: message.type || null,
    message_text: message.type === "text" ? message.text : null,
    payload: sanitizeLineEvent(event)
  });

  if (eventError) {
    console.error("Supabase event insert failed", eventError.message);
    return { skipped: false, error: eventError.message };
  }

  return { skipped: false, customerId };
}

export async function ensureCustomerForLineUser(lineUserId) {
  if (!lineUserId || !isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const { data: customer, error } = await supabase
    .from("customers")
    .upsert(
      {
        line_user_id: lineUserId,
        last_seen_at: new Date().toISOString()
      },
      { onConflict: "line_user_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("Supabase customer upsert failed", error.message);
    return null;
  }

  return customer;
}

export async function getCustomerProfile(customerId) {
  if (!customerId || !isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Supabase profile lookup failed", error.message);
    return null;
  }

  return profile;
}

export async function upsertCustomerProfile(customerId, values) {
  if (!customerId || !isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("customer_profiles")
    .upsert(
      {
        customer_id: customerId,
        ...values
      },
      { onConflict: "customer_id" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("Supabase profile upsert failed", error.message);
    return null;
  }

  return profile;
}

function sanitizeLineEvent(event) {
  const { replyToken: _replyToken, ...safeEvent } = event;
  return safeEvent;
}
