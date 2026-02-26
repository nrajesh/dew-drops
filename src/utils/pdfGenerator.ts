/**
 * Generates a print-ready PDF by opening a hidden iframe with the HTML content
 * and triggering window.print(). This approach uses the browser's native PDF
 * engine, which properly respects `page-break-*` CSS rules — avoiding the
 * canvas-slice line-splitting problem of the old html2canvas approach.
 */
export const generateCareerFitPdf = (htmlContent: string, _filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      reject(new Error('Could not access iframe document'));
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
        } catch (_) { /* ignore */ }
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          resolve();
        }, 1000);
      }
    }, 2500);
  });
};