import { createClient } from "@supabase/supabase-js";
import { checkInvoicePayment } from "./qpay.js";

export const AMOUNT = Number(process.env.DONATION_AMOUNT || 1000);

// service_role түлхүүр: RLS-ийг тойрно, тиймээс зөвхөн сервер талд ашиглана.
export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export const isUuid = (s) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

/**
 * QPay-ээс төлбөрийг ШУУД шалгаж, төлөгдсөн бол хандивыг "paid" болгоно.
 * Callback-д итгэхгүй — үргэлж QPay-ээс өөрөөс нь баталгаажуулна.
 * Давхар тоололтоос 3 давхар хамгаална:
 *   1) status <> 'paid' нөхцөлтэй update (атомар)
 *   2) qpay_payment_id UNIQUE
 *   3) supporters.donation_id UNIQUE (trigger)
 */
export async function verifyAndMark(donationId) {
  const { data: d, error } = await db
    .from("donations")
    .select("id,status,qpay_invoice_id,amount")
    .eq("id", donationId)
    .maybeSingle();
  if (error) throw error;
  if (!d) return { status: "not_found" };
  if (d.status === "paid") return { status: "paid" };
  if (!d.qpay_invoice_id) return { status: d.status };

  const check = await checkInvoicePayment(d.qpay_invoice_id);
  const paidRow = (check.rows || []).find((r) => r.payment_status === "PAID");
  const paidAmount = Number(check.paid_amount || paidRow?.payment_amount || 0);

  if (!paidRow || paidAmount < d.amount) return { status: d.status };

  const { data: updated, error: upErr } = await db
    .from("donations")
    .update({ status: "paid", paid_at: new Date().toISOString(), qpay_payment_id: String(paidRow.payment_id) })
    .eq("id", d.id)
    .neq("status", "paid")
    .select("id");

  // 23505 = unique violation → энэ төлбөр аль хэдийн бүртгэгдсэн
  if (upErr && upErr.code !== "23505") throw upErr;
  return { status: "paid", newlyPaid: Boolean(updated && updated.length) };
}
