import { api } from "@/lib/api";

declare global {
  interface Window {
    AndroidPdfBridge?: {
      isNative: () => boolean;
      printPdf: (base64Data: string, fileName: string) => void;
      saveAndOpenPdf: (base64Data: string, fileName: string) => void;
    };
  }
}

/**
 * Converts a Blob to a Base64 string for Android native bridge communication.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches ticket receipt PDF with authenticated Bearer token and triggers print dialog or safe download/view.
 */
export async function printTicketReceipt(ticketId: string, trackingNumber?: string): Promise<void> {
  const blob = await api<Blob>(`/tickets/${ticketId}/receipt/pdf`);
  const fileName = trackingNumber ? `${trackingNumber}.pdf` : `receipt-${ticketId.slice(0, 8)}.pdf`;

  // 1. Native Android APK via AndroidPdfBridge (instant Android PrintManager dialog)
  if (typeof window !== "undefined" && window.AndroidPdfBridge?.printPdf) {
    try {
      const base64 = await blobToBase64(blob);
      window.AndroidPdfBridge.printPdf(base64, fileName);
      return;
    } catch (bridgeErr) {
      console.warn("AndroidPdfBridge print failed, falling back:", bridgeErr);
    }
  }

  const blobUrl = URL.createObjectURL(blob);

  // 2. Mobile web browser fallback
  const isMobile =
    typeof window !== "undefined" &&
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      typeof window.print !== "function");

  if (isMobile) {
    // On mobile web, opening in a new tab provides the browser's native PDF viewer with print/save options
    const opened = window.open(blobUrl, "_blank");
    if (!opened) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 10000);
    }
    return;
  }

  // 3. Desktop browser print via invisible iframe
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
    a.download = fileName;
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
  const fileName = `${trackingNumber}.pdf`;

  // 1. Native Android APK via AndroidPdfBridge (saves to Downloads + opens system Chooser)
  if (typeof window !== "undefined" && window.AndroidPdfBridge?.saveAndOpenPdf) {
    try {
      const base64 = await blobToBase64(blob);
      window.AndroidPdfBridge.saveAndOpenPdf(base64, fileName);
      return;
    } catch (bridgeErr) {
      console.warn("AndroidPdfBridge save failed, falling back:", bridgeErr);
    }
  }

  // 2. Web browser download
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(blobUrl);
  }, 10000);
}

/**
 * Fetches accessory sale warranty bill PDF with authenticated Bearer token and triggers print dialog or download/view.
 */
export async function printAccessoryWarrantyBill(saleId: string, billNumber?: string): Promise<void> {
  const blob = await api<Blob>(`/accessory-sales/${saleId}/receipt/pdf`);
  const fileName = billNumber ? `${billNumber}.pdf` : `warranty-bill-${saleId.slice(0, 8)}.pdf`;

  // 1. Native Android APK via AndroidPdfBridge (opens Android PrintManager dialog)
  if (typeof window !== "undefined" && window.AndroidPdfBridge?.printPdf) {
    try {
      const base64 = await blobToBase64(blob);
      window.AndroidPdfBridge.printPdf(base64, fileName);
      return;
    } catch (bridgeErr) {
      console.warn("AndroidPdfBridge print failed, falling back:", bridgeErr);
    }
  }

  const blobUrl = URL.createObjectURL(blob);

  // 2. Mobile web browser fallback
  const isMobile =
    typeof window !== "undefined" &&
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      typeof window.print !== "function");

  if (isMobile) {
    const opened = window.open(blobUrl, "_blank");
    if (!opened) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 10000);
    }
    return;
  }

  // 3. Desktop browser print via invisible iframe
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
    a.download = fileName;
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
 * Downloads the accessory warranty bill PDF locally with authenticated Bearer token.
 */
export async function downloadAccessoryWarrantyBill(saleId: string, billNumber: string): Promise<void> {
  const blob = await api<Blob>(`/accessory-sales/${saleId}/receipt/pdf`);
  const fileName = `${billNumber}.pdf`;

  // 1. Native Android APK via AndroidPdfBridge (saves to Downloads + opens system Chooser)
  if (typeof window !== "undefined" && window.AndroidPdfBridge?.saveAndOpenPdf) {
    try {
      const base64 = await blobToBase64(blob);
      window.AndroidPdfBridge.saveAndOpenPdf(base64, fileName);
      return;
    } catch (bridgeErr) {
      console.warn("AndroidPdfBridge save failed, falling back:", bridgeErr);
    }
  }

  // 2. Web browser download
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(blobUrl);
  }, 10000);
}
