import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { JsonResume } from '@/types/resume';
import { formatResumeJsonToHtml } from '@/lib/utils'; // Import the HTML formatter

export const generateCvPdfBase64 = async (resumeData: JsonResume): Promise<string> => {
  const htmlContent = formatResumeJsonToHtml(resumeData);

  // Create a temporary div to render the HTML
  const printElement = document.createElement('div');
  printElement.innerHTML = htmlContent;
  printElement.style.position = 'absolute';
  printElement.style.left = '-9999px'; // Hide it off-screen
  printElement.style.width = '800px'; // Set a fixed width for consistent rendering
  document.body.appendChild(printElement);

  try {
    const canvas = await html2canvas(printElement, {
      scale: 2, // Increase scale for better resolution
      useCORS: true,
      logging: false,
      windowWidth: printElement.offsetWidth, // Use offsetWidth for the actual rendered width
      windowHeight: printElement.offsetHeight, // Use offsetHeight for the actual rendered height
    } as any); // Type assertion to bypass the missing 'scale' property in Html2CanvasOptions

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
    });

    const imgWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
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

    return pdf.output('datauristring').split(',')[1]; // Return base64 string
  } finally {
    document.body.removeChild(printElement);
  }
};