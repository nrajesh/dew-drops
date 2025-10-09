import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const downloadPdf = async (element: HTMLElement, filename: string) => {
  // Clone the element to avoid modifying the original DOM
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove the print button from the clone
  const printButton = clone.querySelector('.print\\:hidden');
  if (printButton) {
    printButton.remove();
  }

  // Add the clone to the body temporarily
  document.body.appendChild(clone);

  // Generate the canvas from the cloned element
  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true,
    logging: false,
    allowTaint: true,
    backgroundColor: '#ffffff', // Ensure white background
  } as any);

  // Remove the clone from the DOM
  document.body.removeChild(clone);

  // Create PDF
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: 'a4',
  });

  const imgWidth = pdf.internal.pageSize.getWidth();
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdf.internal.pageSize.getHeight();

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
  }

  pdf.save(filename);
};