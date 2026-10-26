import { api } from "@/lib/api";

/**
 * Fetches ticket receipt PDF with authenticated Bearer token and triggers print dialog or safe download on mobile.
 */
export async function printTicketReceipt(ticketId: string): Promise<void> {
  const blob = await api<Blob>(`/tickets/${ticketId}/receipt/pdf`);
  const blobUrl = URL.createObjectURL(blob);

  // If in Android WebView or mobile environment without desktop print dialog, download the receipt safely
  const isMobile = typeof window !== "undefined" && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    typeof window.print !== "function"
  );

  if (isMobile) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `receipt-${ticketId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(blobUrl);
    }, 10000);
    return;
  }

  // Desktop browser print via invisible iframe
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
        if (typeof iframe.contentWindow?.print === "function") {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }, 300);
    };
  } catch {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `receipt-${ticketId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(blobUrl);
    }, 10000);
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
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(a.href);
  }, 10000);
}
