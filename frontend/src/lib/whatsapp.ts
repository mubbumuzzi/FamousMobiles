import { Ticket, TodayRevenueSummary } from "./types";
import { formatCurrency } from "./utils";
import { SHOP } from "./shop";

function cleanMobile(mobile?: string): string {
  if (!mobile) return "";
  const cleaned = mobile.replace(/\D/g, "");
  // If 10 digits without country code, prefix with 91 (India)
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned;
}

export function buildWhatsAppPickupUrl(ticket: Ticket): string {
  const phone = cleanMobile(ticket.customer?.mobile);
  const name = ticket.customer?.fullName || "Customer";
  const device = `${ticket.brand || ""} ${ticket.model || ""}`.trim() || "Device";
  const tracking = ticket.trackingNumber;
  const balance = Number(ticket.balanceAmount || 0);

  const balanceText = balance > 0
    ? `Pending balance to pay: ${formatCurrency(balance)}.`
    : `Total bill is settled in full (Balance: ₹0).`;

  const message = [
    `Dear ${name},`,
    ``,
    `✨ Great news! Your *${device}* (Tracking ID: *${tracking}*) is tested, verified, and *Ready for Collection* at *${SHOP.name}*.`,
    ``,
    `💳 ${balanceText}`,
    `📍 Shop Address: ${SHOP.addressLines.join(", ")}.`,
    `📞 Phone: ${SHOP.mobile}`,
    ``,
    `Please present your service bill or tracking ID when collecting. Thank you for choosing Famous Mobiles!`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppDelayUrl(ticket: Ticket): string {
  const phone = cleanMobile(ticket.customer?.mobile);
  const name = ticket.customer?.fullName || "Customer";
  const device = `${ticket.brand || ""} ${ticket.model || ""}`.trim() || "Device";
  const tracking = ticket.trackingNumber;

  const message = [
    `Dear ${name},`,
    ``,
    `Regarding your *${device}* (Tracking ID: *${tracking}*) at *${SHOP.name}*:`,
    ``,
    `🔧 Your device is currently undergoing detailed testing and repair by our technician. We are working diligently to deliver top-quality service.`,
    ``,
    `We will notify you immediately once it passes quality check. If you have any urgent queries, please reach out to us at ${SHOP.mobile}.`,
    ``,
    `Thank you for your patience! — *${SHOP.name}*`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppDayEndSummaryUrl(
  summary: TodayRevenueSummary,
  devicesReceivedToday: number,
  devicesDeliveredToday: number,
  adminMobile = "9063786751"
): string {
  const phone = cleanMobile(adminMobile);
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const message = [
    `📊 *FAMOUS MOBILES — DAY-END REPORT*`,
    `📅 Date: ${dateStr}`,
    `───────────────────────────`,
    `💰 *Total Collections:* ${formatCurrency(Number(summary.totalRevenue || 0))}`,
    `💵 *Cash in Drawer:* ${formatCurrency(Number(summary.cashTotal || 0))}`,
    `📱 *UPI / Bank:* ${formatCurrency(Number(summary.upiTotal || 0))}`,
    `💳 *Card Swipes:* ${formatCurrency(Number(summary.cardTotal || 0))}`,
    `🧾 *Transactions:* ${summary.transactionCount}`,
    `───────────────────────────`,
    `📥 *Devices Intake Today:* ${devicesReceivedToday}`,
    `✅ *Devices Delivered Today:* ${devicesDeliveredToday}`,
    `───────────────────────────`,
    `System closed & verified.`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
