import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Generates a PDF from a given HTML string, applying print-specific styles.
 * @param htmlContent The HTML string to convert to PDF.
 * @param filename The name of the PDF file to download.
 */
export const generateCareerFitPdf = async (htmlContent: string, filename: string) => {
  const printContainer = document.createElement('div');
  printContainer.innerHTML = htmlContent;
  printContainer.style.position = 'absolute';
  printContainer.style.top = '-9999px'; // Hide it off-screen
  printContainer.style.width = '210mm'; // A4 width for consistent rendering
  printContainer.style.padding = '1.5cm'; // Match @page margin
  document.body.appendChild(printContainer);

  // Force light mode for the print container for html2canvas rendering
  // This will apply the light theme CSS variables defined in :root
  printContainer.classList.add('light'); // Add 'light' class to force light theme variables

  try {
    const canvas = await html2canvas(printContainer, {
      scale: 2, // Increase scale for better resolution
      useCORS: true,
      allowTaint: true,
      windowWidth: printContainer.scrollWidth,
      windowHeight: printContainer.scrollHeight,
    } as any);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  } finally {
    document.body.removeChild(printContainer);
    // No need to restore dark mode on document.documentElement as it was never changed.
  }
};