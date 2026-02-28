import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PDFExportOptions {
    filename: string;
    title: string;
    subtitle?: string;
    head: string[][];
    body: (string | number)[][];
}

export function exportTableToPDF({ filename, title, subtitle, head, body }: PDFExportOptions) {
    // Crear documento: orientación landscape si hay muchas columnas (asumimos portrait por defecto, pero se puede parametrizar)
    const doc = new jsPDF('portrait', 'pt', 'a4');

    // Agregar logo o texto de cabecera
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(title, 40, 40);

    if (subtitle) {
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(subtitle, 40, 55);
    }

    // Estampa de tiempo
    const timestamp = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generado el: ${timestamp}`, 40, doc.internal.pageSize.height - 30);

    // Plugin AutoTable para la grilla de datos
    autoTable(doc, {
        head: head,
        body: body,
        startY: subtitle ? 70 : 60,
        theme: 'striped',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 6,
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: [15, 23, 42], // slate-900 (tema Zenit)
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252], // slate-50
        },
        columnStyles: {
            // Ajustes específicos pueden venir aquí, ej:
            // 0: { cellWidth: 50 }, // ID
        },
        margin: { top: 60, right: 40, bottom: 40, left: 40 },
        didDrawPage: (data) => {
            // Paginación
            // Total page number plugin
            if (typeof (doc as any).putTotalPages === 'function') {
                const totalPagesExp = "{total_pages_count_string}";
                const str = "Página " + data.pageNumber + " de " + totalPagesExp;
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); // slate-400
                doc.text(str, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 30);
            } else {
                const pageCount = (doc as any).internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Página ${data.pageNumber} de ${pageCount}`,
                    doc.internal.pageSize.width - 80,
                    doc.internal.pageSize.height - 30
                );
            }
        }
    });

    // Guardar archivo
    doc.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}
