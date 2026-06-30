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
    const { data: customer, error: customerError } = await supabase
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

    if (customerError) {
      console.error("Supabase customer upsert failed", customerError.message);
    } else {
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

function sanitizeLineEvent(event) {
  const { replyToken: _replyToken, ...safeEvent } = event;
  return safeEvent;
}
