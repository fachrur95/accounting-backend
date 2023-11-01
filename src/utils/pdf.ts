import PdfPrinter from 'pdfmake';
import { Roboto } from './fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

export const createPdf = async (docDefinition: TDocumentDefinitions): Promise<Buffer> => {
  const printer = new PdfPrinter({ Roboto });
  const pdfDoc = printer.createPdfKitDocument(docDefinition, { bufferPages: true });

  return new Promise((resolve, reject) => {
    try {
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));

      const pages = pdfDoc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        pdfDoc.switchToPage(i);

        //Footer: Add page number
        const oldBottomMargin = pdfDoc.page.margins.bottom;
        pdfDoc.page.margins.bottom = 0 //Dumb: Have to remove bottom margin in order to write into it
        pdfDoc
          .text(
            `Hal. ${i + 1}/${pages.count}`,
            0,
            pdfDoc.page.height - (oldBottomMargin / 2), // Centered vertically in bottom margin
            { align: 'right' }
          );
        pdfDoc.page.margins.bottom = oldBottomMargin; // ReProtect bottom margin
      }

      pdfDoc.on('pageAdded', () => {
        pdfDoc.y = pdfDoc.page.margins.top
      });
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export const errorPdfHtmlTemplate = (error: string): string => `
<h2>There was an error displaying the PDF document.</h2>
Error message: ${error}`;