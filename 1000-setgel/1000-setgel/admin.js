import { db, json, clean, isUuid, parseAmount, AMOUNT } from "../lib/db.js";
import { timingSafeEqual } from "node:crypto";

function authorized(req) {
  const given = Buffer.from(req.headers.get("x-admin-key") || "");
  const real = Buffer.from(process.env.ADMIN_PASSWORD || "");
  return real.length > 0 && given.length === real.length && timingSafeEqual(given, real);
}

const badAmount = () => json({ error: `Дүн хамгийн багадаа ${AMOUNT.toLocaleString("en-US")}₮ байна` }, 400);

export default async (req) => {
  if (!authorized(req)) return json({ error: "Нууц үг буруу" }, 401);

  // Жагсаалт + статистик
  if (req.method === "GET") {
    const { data, error } = await db
      .from("donations")
      .select("id,created_at,paid_at,name,message,amount,method,status")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) return json({ error: error.message }, 500);
    const { data: stats } = await db.rpc("get_stats");
    return json({ rows: data, stats: stats?.[0] || { hearts: 0, supporters: 0, total: 0 } });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let b = {};
  try { b = await req.json(); } catch {}
  const needsId = ["confirm", "reject", "unconfirm", "delete", "amount"].includes(b.action);
  if (needsId && !isUuid(b.id)) return json({ error: "id буруу" }, 400);

  switch (b.action) {
    // Хүлээгдэж буй мэдэгдлийг баталгаажуулах (дүнг банкны гүйлгээгээр засаж болно)
    case "confirm": {
      const patch = { status: "paid", paid_at: new Date().toISOString() };
      if (b.amount != null || b.count != null) {
        const amount = parseAmount(b.amount, b.count);
        if (!amount) return badAmount();
        patch.amount = amount;
      }
      const { data, error } = await db.from("donations").update(patch).eq("id", b.id).eq("status", "pending").select("id");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, changed: data.length });
    }

    // Мөнгө ороогүй мэдэгдэл
    case "reject": {
      const { error } = await db.from("donations").update({ status: "expired" }).eq("id", b.id).eq("status", "pending");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // Буруу баталгаажуулсан → дахин "хүлээгдэж буй" болгоно (LIVE дэлгэцээс арилна)
    case "unconfirm": {
      const { error } = await db.from("donations").update({ status: "pending", paid_at: null }).eq("id", b.id).eq("status", "paid");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // Бүр мөсөн устгах (LIVE дэлгэцээс ч арилна)
    case "delete": {
      const { error } = await db.from("donations").delete().eq("id", b.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // Баталгаажсан хандивын дүнг засах
    case "amount": {
      const amount = parseAmount(b.amount);
      if (!amount) return badAmount();
      const { error } = await db.from("donations").update({ amount }).eq("id", b.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // Мэдэгдэлгүйгээр орсон гүйлгээг шууд нэмэх
    case "add": {
      const name = clean(b.name, 40);
      if (!name) return json({ error: "Нэр эсвэл гүйлгээний утга оруулна уу" }, 400);
      const amount = parseAmount(b.amount, b.count);
      if (!amount) return badAmount();
      const { data, error } = await db
        .from("donations")
        .insert({ name, message: clean(b.note, 60), amount, method: "bank", status: "paid", paid_at: new Date().toISOString() })
        .select("id").single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, id: data.id });
    }
  }
  return json({ error: "Үйлдэл буруу" }, 400);
};

export const config = { path: "/api/admin" };
