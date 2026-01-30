// =============================================================================
// EXPORT UTILITIES - CSV, Excel, and PDF export functionality
// =============================================================================

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string;
  width?: number; // For Excel/PDF
}

export interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  includeTimestamp?: boolean;
}

// =============================================================================
// CSV EXPORT
// =============================================================================

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const headers = columns.map((col) => escapeCSVValue(col.header)).join(",");

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const rawValue = typeof col.key === "string" && col.key.includes(".")
          ? getNestedValue(row, col.key as string)
          : row[col.key as keyof T];
        const value = col.formatter ? col.formatter(rawValue, row) : rawValue;
        return escapeCSVValue(value);
      })
      .join(",")
  );

  const csv = [headers, ...rows].join("\n");
  const filename = options.includeTimestamp
    ? `${options.filename}_${formatTimestamp()}.csv`
    : `${options.filename}.csv`;

  downloadFile(csv, filename, "text/csv;charset=utf-8;");
}

// =============================================================================
// EXCEL EXPORT (XLSX format using native XML)
// =============================================================================

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  // Create XML spreadsheet (Office Open XML simplified)
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="Header">
    <Font ss:Bold="1" ss:Color="#FFFFFF"/>
    <Interior ss:Color="#0891B2" ss:Pattern="Solid"/>
    <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Title">
    <Font ss:Bold="1" ss:Size="14"/>
  </Style>
  <Style ss:ID="Date">
    <NumberFormat ss:Format="yyyy-mm-dd"/>
  </Style>
  <Style ss:ID="Currency">
    <NumberFormat ss:Format="€#,##0.00"/>
  </Style>
</Styles>
<Worksheet ss:Name="${options.title || "Data"}">
<Table>`;

  const xmlFooter = `</Table>
</Worksheet>
</Workbook>`;

  // Add title row if specified
  let xmlRows = "";
  if (options.title) {
    xmlRows += `<Row><Cell ss:StyleID="Title"><Data ss:Type="String">${escapeXML(options.title)}</Data></Cell></Row>`;
    if (options.subtitle) {
      xmlRows += `<Row><Cell><Data ss:Type="String">${escapeXML(options.subtitle)}</Data></Cell></Row>`;
    }
    xmlRows += "<Row></Row>"; // Empty row
  }

  // Header row
  xmlRows += "<Row>";
  columns.forEach((col) => {
    xmlRows += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(col.header)}</Data></Cell>`;
  });
  xmlRows += "</Row>";

  // Data rows
  data.forEach((row) => {
    xmlRows += "<Row>";
    columns.forEach((col) => {
      const rawValue = typeof col.key === "string" && col.key.includes(".")
        ? getNestedValue(row, col.key as string)
        : row[col.key as keyof T];
      const value = col.formatter ? col.formatter(rawValue, row) : rawValue;
      const type = typeof value === "number" ? "Number" : "String";
      xmlRows += `<Cell><Data ss:Type="${type}">${escapeXML(String(value ?? ""))}</Data></Cell>`;
    });
    xmlRows += "</Row>";
  });

  const xml = xmlHeader + xmlRows + xmlFooter;
  const filename = options.includeTimestamp
    ? `${options.filename}_${formatTimestamp()}.xls`
    : `${options.filename}.xls`;

  downloadFile(xml, filename, "application/vnd.ms-excel");
}

// =============================================================================
// PDF EXPORT (HTML-based for browser printing via Blob URL)
// =============================================================================

export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${escapeHTML(options.title || options.filename)}</title>
  <style>
    @page { margin: 1cm; size: landscape; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10pt;
      color: #1f2937;
      padding: 20px;
    }
    h1 {
      font-size: 18pt;
      color: #0891b2;
      margin-bottom: 4px;
      border-bottom: 2px solid #0891b2;
      padding-bottom: 8px;
    }
    h2 {
      font-size: 11pt;
      color: #6b7280;
      font-weight: normal;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .meta {
      font-size: 9pt;
      color: #9ca3af;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th {
      background: #0891b2;
      color: white;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 9pt;
    }
    tr:nth-child(even) { background: #f9fafb; }
    tr:hover { background: #f0f9ff; }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${options.title ? `<h1>${escapeHTML(options.title)}</h1>` : ""}
  ${options.subtitle ? `<h2>${escapeHTML(options.subtitle)}</h2>` : ""}
  <div class="meta">
    Generated: ${new Date().toLocaleString()} | Total Records: ${data.length}
  </div>
  <table>
    <thead>
      <tr>
        ${columns.map((col) => `<th>${escapeHTML(col.header)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${data
        .map(
          (row) =>
            `<tr>${columns
              .map((col) => {
                const rawValue = typeof col.key === "string" && col.key.includes(".")
                  ? getNestedValue(row, col.key as string)
                  : row[col.key as keyof T];
                const value = col.formatter ? col.formatter(rawValue, row) : rawValue;
                return `<td>${escapeHTML(String(value ?? ""))}</td>`;
              })
              .join("")}</tr>`
        )
        .join("")}
    </tbody>
  </table>
  <div class="footer">
    NEXUS Command Center - Export generated at ${new Date().toISOString()}
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 1000);
    };
  </script>
</body>
</html>`;

  // Create blob URL and open in new window for printing
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    alert("Please allow popups to export PDF");
    URL.revokeObjectURL(url);
    return;
  }

  // Clean up URL after window loads
  printWindow.onload = () => {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
}

// =============================================================================
// UNIFIED EXPORT FUNCTION
// =============================================================================

export function exportData<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  format: ExportFormat,
  options: ExportOptions
): void {
  switch (format) {
    case "csv":
      exportToCSV(data, columns, options);
      break;
    case "xlsx":
      exportToExcel(data, columns, options);
      break;
    case "pdf":
      exportToPDF(data, columns, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

// =============================================================================
// COMMON FORMATTERS
// =============================================================================

export const formatters = {
  currency: (value: unknown) => {
    const num = typeof value === "number" ? value : parseFloat(String(value)) || 0;
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(num / 100);
  },
  date: (value: unknown) => {
    if (!value) return "";
    const date = new Date(String(value));
    return date.toLocaleDateString("de-DE");
  },
  datetime: (value: unknown) => {
    if (!value) return "";
    const date = new Date(String(value));
    return date.toLocaleString("de-DE");
  },
  percentage: (value: unknown) => {
    const num = typeof value === "number" ? value : parseFloat(String(value)) || 0;
    return `${num.toFixed(1)}%`;
  },
  number: (value: unknown) => {
    const num = typeof value === "number" ? value : parseFloat(String(value)) || 0;
    return new Intl.NumberFormat("de-DE").format(num);
  },
  boolean: (value: unknown) => (value ? "Yes" : "No"),
  grade: (score: unknown) => {
    const num = typeof score === "number" ? score : parseFloat(String(score)) || 0;
    if (num >= 80) return "A";
    if (num >= 60) return "B";
    if (num >= 40) return "C";
    return "D";
  },
};
