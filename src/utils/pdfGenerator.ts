import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Generates a PDF from a given HTML string, applying print-specific styles.
 * @param htmlContent The HTML string to convert to PDF.
 * @param filename The name of the PDF file to download.
 */
export const generateCareerFitPdf = async (htmlContent: string, filename: string) => {
  // Create an isolated container that won't affect the main page theme
  const printContainer = document.createElement('div');
  printContainer.innerHTML = htmlContent;
  printContainer.style.position = 'absolute';
  printContainer.style.top = '-9999px';
  printContainer.style.left = '-9999px';
  printContainer.style.width = '210mm'; // A4 width for consistent rendering
  printContainer.style.padding = '1.5cm';
  printContainer.style.backgroundColor = '#ffffff';
  printContainer.style.color = '#1f2937';
  printContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  printContainer.style.fontSize = '14px';
  printContainer.style.lineHeight = '1.6';
  
  // Apply print-specific classes - force light mode without affecting main page
  printContainer.classList.add('print-mode', 'force-light-mode');
  
  // Create a wrapper div to isolate styles
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.top = '-9999px';
  wrapper.style.left = '-9999px';
  wrapper.style.width = '210mm';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.appendChild(printContainer);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(printContainer, {
      scale: 2, // Increase scale for better resolution
      useCORS: true,
      allowTaint: true,
      windowWidth: printContainer.scrollWidth,
      windowHeight: printContainer.scrollHeight,
      backgroundColor: '#ffffff', // Force white background
    } as Parameters<typeof html2canvas>[1]);

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
    document.body.removeChild(wrapper);
  }
};