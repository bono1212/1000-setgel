import { verifyAndMark, json, isUuid } from "../lib/db.js";

// Хандивлагчийн утас 3 секунд тутам асууна (callback хоцорсон/ирээгүй үед нөөц зам).
export default async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!isUuid(id)) return json({ error: "id буруу" }, 400);
  try {
    const r = await verifyAndMark(id);
    return json({ status: r.status });
  } catch (e) {
    console.error(e);
    return json({ status: "unknown" }, 200);
  }
};

export const config = { path: "/api/check-payment" };
