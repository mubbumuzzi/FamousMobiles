import { api } from "@/lib/api";

/**
 * Fetches ticket receipt PDF with authenticated Bearer token and triggers print dialog.
 */
export async function printTicketReceipt(ticketId: string): Promise<void> {
  const blob = await api<Blob>(`/tickets/${ticketId}/receipt/pdf`);
  const blobUrl = URL.createObjectURL(blob);

  // Attempt iframe silent-print for desktop
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }, 300);
    };
  } catch {
    // Mobile fallback: open blob in a new window/tab
    const w = window.open(blobUrl, "_blank");
    if (w) {
      w.focus();
      w.print();
    }
  }
}

/**
 * Downloads the receipt PDF locally with authenticated Bearer token.
 */
export async function downloadTicketReceipt(ticketId: string, trackingNumber: string): Promise<void> {
  const blob = await api<Blob>(`/tickets/${ticketId}/receipt/pdf`);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${trackingNumber}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
