// QPay Merchant API v2 — хамгийн бага шаардлагатай хэсэг.
// Баримт бичиг: QPay-ээс merchant эрх авахад өгдөг API docs-тай заавал тулгаж шалгаарай.

const BASE = (process.env.QPAY_BASE_URL || "https://merchant-sandbox.qpay.mn").replace(/\/$/, "");

let cached = { token: null, expiresAt: 0 };

async function getToken() {
  const now = Date.now();
  if (cached.token && now < cached.expiresAt - 60_000) return cached.token;

  const basic = Buffer.from(`${process.env.QPAY_USERNAME}:${process.env.QPAY_PASSWORD}`).toString("base64");
  const res = await fetch(`${BASE}/v2/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`QPay auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();

  // expires_in нь зарим хувилбарт unix секунд, заримд нь үргэлжлэх хугацаа байдаг тул хоёуланг нь тооцно.
  let exp = Number(data.expires_in) || 0;
  exp = exp > 1e9 ? exp * 1000 : now + exp * 1000;
  cached = { token: data.access_token, expiresAt: exp || now + 30 * 60_000 };
  return cached.token;
}

async function qpay(path, body) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`QPay ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Нэхэмжлэх үүсгэнэ. Буцаах: { invoice_id, qr_text, qr_image, qPay_shortUrl, urls[] } */
export function createInvoice({ senderInvoiceNo, amount, description, callbackUrl }) {
  return qpay("/v2/invoice", {
    invoice_code: process.env.QPAY_INVOICE_CODE,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: "terminal",
    invoice_description: description,
    amount,
    callback_url: callbackUrl,
  });
}

/** Нэхэмжлэхийн төлбөрийг шалгана. Буцаах: { count, paid_amount, rows[] } */
export function checkInvoicePayment(invoiceId) {
  return qpay("/v2/payment/check", {
    object_type: "INVOICE",
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });
}
