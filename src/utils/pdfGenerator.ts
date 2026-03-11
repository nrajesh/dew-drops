/**
 * Detects if the current device is a mobile browser by checking the user-agent
 * string. Uses UA matching rather than viewport width so that narrow desktop
 * windows don't accidentally trigger the mobile path.
 */
const isMobileDevice = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(
    ua,
  );
};

/**
 * On desktop: injects HTML into a hidden iframe and triggers window.print(),
 * which lets the user save a clean PDF via the browser's native print dialog.
 *
 * On mobile: opens the structured HTML in a **new tab** and triggers
 * window.print() from that tab. This is necessary because mobile browsers
 * always print the *current* top-level document — using a hidden iframe causes
 * the main app page to be printed instead of the report. By opening a new tab,
 * the report IS the current document, so the native print/share sheet renders
 * it correctly as a structured PDF.
 */
export const generateCareerFitPdf = (
  htmlContent: string,
  _filename: string,
): Promise<void> => {
  // ─── Mobile path: open in new tab → print from there ───
  if (isMobileDevice()) {
    return new Promise((resolve) => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        // Fallback if popup is blocked: use Blob URL in same tab
        const blob = new Blob([htmlContent], {
          type: "text/html;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        URL.revokeObjectURL(url);
        resolve();
        return;
      }

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to render, then trigger print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 1500);

      resolve();
    });
  }

  // ─── Desktop path: hidden iframe + window.print() ───
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      reject(new Error("Could not access iframe document"));
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Wait for fonts and images to load before printing
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Clean up after a brief delay to allow the print dialog to open
        setTimeout(() => {
          document.body.removeChild(iframe);
          resolve();
        }, 1000);
      } catch (err) {
        document.body.removeChild(iframe);
        reject(err);
      }
    };

    // Fallback: if onload doesn't fire (some situations), trigger after a delay
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (_) {
          /* ignore */
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          resolve();
        }, 1000);
      }
    }, 2500);
  });
};
