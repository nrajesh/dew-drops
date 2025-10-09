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

  // Apply print-specific classes to the container
  printContainer.classList.add('print-mode');

  // Temporarily add dark class if needed for consistent rendering in dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');
  if (isDarkMode) {
    document.documentElement.classList.remove('dark');
    printContainer.classList.add('force-light-mode'); // Custom class to force light mode styles
  }

  try {
    const canvas = await html2canvas(printContainer, {
      scale: 2, // Increase scale for better resolution
      useCORS: true,
      allowTaint: true,
      windowWidth: printContainer.scrollWidth,
      windowHeight: printContainer.scrollHeight,
    } as any); // Cast to any to resolve TypeScript error

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
    if (isDarkMode) {
      document.documentElement.classList.add('dark'); // Restore dark mode
    }
  }
};