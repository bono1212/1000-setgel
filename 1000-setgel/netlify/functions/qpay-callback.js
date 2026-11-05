import { verifyAndMark, isUuid } from "../lib/db.js";

// QPay төлбөр орох үед энэ хаягийг дуудна.
// Callback-ийн агуулгад итгэхгүй: зөвхөн "энэ хандивыг шалга" гэсэн дохио гэж үзээд QPay-ээс дахин шалгана.
export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const key = url.searchParams.get("key");

  if (key !== process.env.CALLBACK_SECRET || !isUuid(id)) {
    return new Response("FORBIDDEN", { status: 403 });
  }

  try {
    await verifyAndMark(id);
  } catch (e) {
    console.error("callback verify failed", e);
    // QPay дахин дуудах боломжтой байхаар 500 буцаана
    return new Response("ERROR", { status: 500 });
  }
  return new Response("SUCCESS", { status: 200 });
};

export const config = { path: "/api/qpay-callback" };
