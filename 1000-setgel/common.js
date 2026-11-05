// Хуудсуудад нийтлэг туслах функцууд
window.U = {
  fmt: (n) => Number(n || 0).toLocaleString("en-US"),
  time: (iso) => new Date(iso).toTimeString().slice(0, 5),
  // "Э.Оюун" -> "Оюу-Э**" : дэлгэц дээр бүтэн нэр гаргахгүй
  mask(full) {
    if (!full || full === "Нэрээ нууцалсан") return "Нэрээ нууцалсан";
    const m = String(full).match(/^\s*([^.\s])\.\s*(.+)$/);
    if (m) return m[2].slice(0, 3) + "-" + m[1] + "**";
    return String(full).trim().slice(0, 3) + "**";
  },
  esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  copy(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = "Хуулагдлаа"; setTimeout(() => (btn.textContent = o), 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
  },
};
