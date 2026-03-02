export function useWhatsapp() {
  function normalizePhoneForWaMe(phoneRaw) {
    if (!phoneRaw) return null
    const digits = String(phoneRaw).replace(/\D/g, "")
    if (!digits) return null
    if (digits.startsWith("54")) return digits
    return `549${digits}`
  }

  function stripBracketTz(v) {
    if (!v) return v
    const s = String(v)
    const idx = s.indexOf("[")
    return idx >= 0 ? s.slice(0, idx) : s
  }

  function toDateSafe(v) {
    if (!v) return null
    const cleaned = stripBracketTz(v)
    const d = new Date(cleaned)
    return Number.isNaN(d.getTime()) ? null : d
  }

  function formatDateTimeRange(calendarEvent) {
    const rawStart = calendarEvent?.start_at ?? calendarEvent?.start ?? null
    const rawEnd = calendarEvent?.end_at ?? calendarEvent?.end ?? null

    const start = toDateSafe(rawStart)
    const end = toDateSafe(rawEnd)

    if (!start || !end) return { dateStr: "", from: "", to: "" }

    const dateStr = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(start)
    const timeFmt = new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })

    return { dateStr, from: timeFmt.format(start), to: timeFmt.format(end) }
  }

  function buildConfirmationMessage({ clientName, dateStr, from, to, courtName, typeName, title }) {
    const headerName = clientName ? `Hola ${clientName}!` : "Hola!"
    const t = title ? `📝 ${title}\n` : ""

    return (
      `👋 ${headerName}\n` +
      `✅ Turno confirmado\n\n` +
      `📅 ${dateStr}\n` +
      `⏰ ${from} - ${to}\n` +
      (courtName ? `🎾 Cancha: ${courtName}\n` : "") +
      (typeName ? `🏷️ Tipo: ${typeName}\n` : "") +
      t +
      `\nCualquier cosa respondé este mensaje.`
    )
  }

  function buildPaymentMessage({ clientName, dateStr, from, to, courtName, title, paymentUrl, amountLabel }) {
    const headerName = clientName ? `Hola ${clientName}!` : "Hola!"
    const t = title ? `📝 ${title}\n` : ""

    return (
      `👋 ${headerName}\n` +
      `✅ Turno reservado\n\n` +
      `📅 ${dateStr}\n` +
      `⏰ ${from} - ${to}\n` +
      (courtName ? `🎾 Cancha: ${courtName}\n` : "") +
      t +
      `\n💳 Para confirmar, aboná ${amountLabel} acá:\n` +
      `${paymentUrl}\n\n` +
      `Cualquier cosa respondé este mensaje.`
    )
  }

  function buildTabSummaryMessage({ calendarEvent, tab, items = [] }) {
    const client = calendarEvent?.client
    const court = calendarEvent?.court
    const type = calendarEvent?.booking_type

    const clientName = client?.first_name || client?.full_name || null
    const headerName = clientName ? `Hola ${clientName}!` : "Hola!"

    const { dateStr, from, to } = formatDateTimeRange(calendarEvent)

    const title = calendarEvent?.title || null
    const t = title ? `📝 ${title}\n` : ""

    const itemsText = items.length
      ? items
          .map((it) => `• ${it.name_snapshot}: ${it.qty} × $${it.unit_price_snapshot} = $${it.line_total}`)
          .join("\n")
      : "• Sin consumos"

    const total = tab?.total ?? null
    const totalLine = total != null ? `\n\n💰 *Total: $${total}*` : ""

    const courtName = court?.name ?? calendarEvent?.calendarId ?? ""

    return (
      `👋 ${headerName}\n\n` +
      `🧾 *Detalle del turno*\n\n` +
      (dateStr ? `📅 ${dateStr}\n` : "") +
      (from && to ? `⏰ ${from} - ${to}\n` : "") +
      (courtName ? `🎾 Cancha: ${courtName}\n` : "") +
      (type?.name ? `🏷️ Tipo: ${type.name}\n` : "") +
      t +
      `\n📋 *Cuenta:*\n` +
      `${itemsText}` +
      totalLine +
      `\n\nCualquier cosa respondé este mensaje.`
    )
  }

  function openWhatsappWeb(phoneDigits, message) {
    const text = encodeURIComponent(message)
    const url = phoneDigits
      ? `https://wa.me/${phoneDigits}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return {
    normalizePhoneForWaMe,
    formatDateTimeRange,
    toDateSafe,
    buildConfirmationMessage,
    buildPaymentMessage,
    buildTabSummaryMessage,
    openWhatsappWeb,
  }
}
