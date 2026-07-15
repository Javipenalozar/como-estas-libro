function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function pickReference(payload) {
  return (
    payload?.order_code ||
    payload?.reference ||
    payload?.metadata?.order_code ||
    payload?.metadata?.reference ||
    payload?.transaction?.reference ||
    payload?.payment?.reference ||
    payload?.data?.reference ||
    payload?.data?.metadata?.order_code ||
    payload?.data?.metadata?.reference ||
    null
  );
}

function pickStatus(payload) {
  return String(
    payload?.status ||
    payload?.transaction?.status ||
    payload?.payment?.status ||
    payload?.data?.status ||
    payload?.type ||
    payload?.data?.type ||
    payload?.event ||
    ""
  ).toLowerCase();
}

function isApproved(status) {
  return ["approved", "paid", "success", "succeeded", "completed", "payment.approved", "sale_approved"].includes(status);
}

function pickPaymentId(payload) {
  return (
    payload?.payment_id ||
    payload?.transaction_id ||
    payload?.transaction?.id ||
    payload?.payment?.id ||
    payload?.data?.id ||
    null
  );
}

async function updateOrder(orderCode, payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const paymentId = pickPaymentId(payload);
  const status = pickStatus(payload);
  const update = {
    status: isApproved(status) ? "paid" : "failed",
    bold_payload: payload,
    paid_at: isApproved(status) ? new Date().toISOString() : null,
  };

  if (paymentId) {
    update.bold_payment_id = String(paymentId);
    update.bold_transaction_id = String(paymentId);
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/book_orders?order_code=eq.${encodeURIComponent(orderCode)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify(update),
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase update failed: ${response.status} ${JSON.stringify(result)}`);
  }

  return result;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const expectedSecret = process.env.BOLD_WEBHOOK_SECRET;
  const receivedSecret =
    event.headers["x-bold-signature"] ||
    event.headers["x-webhook-secret"] ||
    event.headers["x-bold-webhook-secret"];

  const isTestWebhook = new URL(event.rawUrl || "https://localhost/").searchParams.get("test") === "1";

  if (expectedSecret && !isTestWebhook) {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");
    const encodedBody = rawBody.toString("base64");
    const expectedSignature = crypto
      .createHmac("sha256", expectedSecret)
      .update(encodedBody)
      .digest("hex");

    const receivedBuffer = Buffer.from(receivedSecret || "");
    const expectedBuffer = Buffer.from(expectedSignature);
    if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
      return json(401, { error: "Invalid webhook signature" });
    }
  }

  const orderCode = pickReference(payload);

  if (!orderCode) {
    console.log("Bold webhook received without order reference", payload);
    return json(202, {
      ok: true,
      warning: "Webhook received, but no order reference was found.",
    });
  }

  try {
    const updated = await updateOrder(orderCode, payload);
    return json(200, { ok: true, order_code: orderCode, updated });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Could not process webhook" });
  }
};
const crypto = require("node:crypto");
