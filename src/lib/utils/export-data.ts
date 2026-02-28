import * as XLSX from "xlsx";

/**
 * Recibe una matriz bidimensional (head + body) y genera un archivo Excel.
 */
export function exportTableToExcel(data: string[][], filename: string = "export") {
    // Convierte el array bidimensional en un worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Ajustar el ancho de las columnas (opcional para visualización)
    const colWidths = data[0].map((col) => {
        return { wch: Math.max(col.length + 5, 12) };
    });
    worksheet["!cols"] = colWidths;

    // Crea un workbook y anexa el worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

    // Descarga el archivo
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Recibe una matriz bidimensional y genera un archivo CSV estándar UTF-8.
 */
export function exportTableToCSV(data: string[][], filename: string = "export") {
    // Generamos el documento CSV utilizando la misma librería para evitar problemas de escape de comillas
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: "," });

    // Forzamos BOM para que Excel detecte correctamente el UTF-8 al abrir el CSV si el usuario lo hace
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

    // Proceso de descarga vía Blob (ya que writeFile genera archivos locales en Node, pero en navegador necesitamos un link)
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();

    // Limpieza
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
