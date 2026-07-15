const crypto = require("node:crypto");

const BOLD_CHECKOUT_URL = "https://checkout.bold.co/payment/LNK_EQ616SHPPL";
const PREORDER_PRICE_COP = 47000;

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

function clean(value) {
  return String(value || "").trim();
}

function digitsOnly(value) {
  return clean(value).replace(/\D/g, "");
}

function makeOrderCode() {
  const now = new Date();
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `COMOESTAS-${stamp}-${random}`;
}

function makeIntegritySignature(orderCode, amountCop, currency, secretKey) {
  return crypto
    .createHash("sha256")
    .update(`${orderCode}${amountCop}${currency}${secretKey}`)
    .digest("hex");
}

async function insertOrder(order) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("Faltan variables de Supabase en Netlify.");
    error.publicMessage = "Faltan variables de Supabase en Netlify.";
    throw error;
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/book_orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(order),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(`Supabase insert failed: ${response.status} ${JSON.stringify(payload)}`);
    error.status = response.status;
    error.supabasePayload = payload;
    error.publicMessage = `Supabase no aceptó la reserva (${response.status}).`;
    throw error;
  }

  return Array.isArray(payload) ? payload[0] : payload;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const fullName = clean(body.full_name);
  const email = clean(body.email).toLowerCase();
  const phone = digitsOnly(body.phone);
  const city = clean(body.city);
  const address = clean(body.address);
  const deliveryMethod = clean(body.delivery_method) || "shipping";
  const requestedQuantity = Number.parseInt(body.quantity || "1", 10) || 1;

  if (requestedQuantity !== 1) {
    return json(400, { error: "Por ahora solo puedes reservar 1 libro por compra." });
  }

  const quantity = 1;

  if (!['shipping', 'pickup'].includes(deliveryMethod)) {
    return json(400, { error: "Selecciona una modalidad de entrega válida." });
  }

  if (deliveryMethod === "shipping" && address.length < 5) {
    return json(400, { error: "Escribe la dirección de entrega." });
  }

  if (fullName.length < 3) {
    return json(400, { error: "Escribe tu nombre completo." });
  }

  if (phone.length < 10) {
    return json(400, { error: "Escribe un WhatsApp válido." });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Escribe un correo válido." });
  }

  const orderCode = makeOrderCode();
  const amountCop = PREORDER_PRICE_COP * quantity;
  const boldIdentityKey = clean(process.env.BOLD_IDENTITY_KEY);
  const boldSecretKey = clean(process.env.BOLD_SECRET_KEY || process.env.BOLD_WEBHOOK_SECRET);

  if (!boldIdentityKey || !boldSecretKey) {
    return json(500, { error: "Faltan las llaves de integración de Bold en Netlify." });
  }

  const order = {
    order_code: orderCode,
    full_name: fullName,
    email: email || null,
    phone,
    city: city || null,
    address: deliveryMethod === "pickup"
      ? "Recogida en oficina de Modelia, calle 23G #81-66, Bogotá"
      : address,
    quantity,
    amount_cop: amountCop,
    status: "pending",
  };

  try {
    const savedOrder = await insertOrder(order);
    return json(200, {
      ok: true,
      order_code: savedOrder.order_code,
      bold: {
        api_key: boldIdentityKey,
        order_id: savedOrder.order_code,
        amount: amountCop,
        currency: "COP",
        integrity_signature: makeIntegritySignature(
          savedOrder.order_code,
          amountCop,
          "COP",
          boldSecretKey,
        ),
        description: "Libro ¿Cómo estás?",
        redirection_url: "https://comoestas.eventosjv.com/",
      },
      warning: "El domicilio se cobra por separado según ciudad y transportadora.",
    });
  } catch (error) {
    console.error(error);
    return json(500, {
      error: error.publicMessage || "No pudimos crear la reserva. Intenta de nuevo.",
      debug:
        error.supabasePayload?.message ||
        error.supabasePayload?.hint ||
        error.supabasePayload?.code ||
        null,
    });
  }
};
