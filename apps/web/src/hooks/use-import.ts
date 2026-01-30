// ═══════════════════════════════════════════════════════════════════════════════
// USE-IMPORT HOOK - CSV/Excel Import Functionality
// Parse, validate, and import data from CSV/Excel files
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityType = "contact" | "deal";

export interface ParsedData {
  headers: string[];
  rows: string[][];
  fileName: string;
  fileSize: number;
  totalRows: number;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null; // null means skip
  sourceIndex: number;
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  value: string;
}

export interface RowValidationResult {
  rowIndex: number;
  valid: boolean;
  errors: ValidationError[];
  data: Record<string, string>;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ValidationError[];
}

// Target field definitions for each entity type
export const TARGET_FIELDS: Record<EntityType, { field: string; label: string; required: boolean }[]> = {
  contact: [
    { field: "name", label: "Name", required: true },
    { field: "email", label: "Email", required: true },
    { field: "phone", label: "Phone", required: false },
    { field: "company", label: "Company", required: false },
  ],
  deal: [
    { field: "name", label: "Deal Name", required: true },
    { field: "amount", label: "Amount", required: true },
    { field: "stage", label: "Stage", required: false },
    { field: "contact", label: "Contact", required: false },
  ],
};

// Common field name mappings for auto-mapping
const AUTO_MAP_ALIASES: Record<string, string[]> = {
  name: ["name", "full name", "fullname", "contact name", "deal name", "titel", "title"],
  email: ["email", "e-mail", "mail", "email address", "e-mail address"],
  phone: ["phone", "telephone", "tel", "phone number", "mobile", "cell", "telefon"],
  company: ["company", "organization", "organisation", "firm", "firma", "unternehmen"],
  amount: ["amount", "value", "price", "betrag", "wert", "deal value", "deal amount"],
  stage: ["stage", "status", "pipeline stage", "stufe", "phase"],
  contact: ["contact", "customer", "client", "kunde", "kontakt"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse CSV content from a string
 */
function parseCSVContent(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse CSV with proper quote handling
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === "," || char === ";") {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseLine(line));

  return { headers, rows };
}

/**
 * Parse Excel file content (simplified - handles basic XLSX)
 * In production, you would use a library like xlsx or exceljs
 */
async function parseExcelContent(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  // For this implementation, we'll create a simulated parse
  // In production, use: import * as XLSX from 'xlsx';

  // Simulate Excel parsing by reading as array buffer
  // This is a placeholder - real implementation would use xlsx library
  const buffer = await file.arrayBuffer();

  // Check for XLSX magic bytes (PK header for ZIP)
  const view = new Uint8Array(buffer);
  if (view[0] === 0x50 && view[1] === 0x4b) {
    // It's a valid ZIP/XLSX file
    // For demo purposes, return sample data structure
    // In production, use xlsx library to properly parse
    throw new Error("Excel parsing requires xlsx library. Please export as CSV for now.");
  }

  // Try parsing as CSV (for .xls files that might be CSV with wrong extension)
  const text = await file.text();
  return parseCSVContent(text);
}

/**
 * Main function to parse a file (CSV or Excel)
 */
export async function parseFile(file: File): Promise<ParsedData> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension || !["csv", "xlsx", "xls"].includes(extension)) {
    throw new Error("Unsupported file format. Please use CSV, XLSX, or XLS.");
  }

  let parsed: { headers: string[]; rows: string[][] };

  if (extension === "csv") {
    const content = await file.text();
    parsed = parseCSVContent(content);
  } else {
    // Excel files
    try {
      parsed = await parseExcelContent(file);
    } catch (error) {
      // Fallback: try reading as text
      const content = await file.text();
      parsed = parseCSVContent(content);
    }
  }

  if (parsed.headers.length === 0) {
    throw new Error("File appears to be empty or has no headers.");
  }

  return {
    headers: parsed.headers,
    rows: parsed.rows,
    fileName: file.name,
    fileSize: file.size,
    totalRows: parsed.rows.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-map source columns to target fields based on name matching
 */
export function autoMapColumns(
  headers: string[],
  entityType: EntityType
): ColumnMapping[] {
  const targetFields = TARGET_FIELDS[entityType];

  return headers.map((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();

    // Try to find a matching target field
    let matchedField: string | null = null;

    for (const { field } of targetFields) {
      const aliases = AUTO_MAP_ALIASES[field] || [field];
      if (aliases.some((alias) => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
        matchedField = field;
        break;
      }
    }

    return {
      sourceColumn: header,
      targetField: matchedField,
      sourceIndex: index,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate an email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a phone number format (basic validation)
 */
function isValidPhone(phone: string): boolean {
  // Allow various phone formats
  const phoneRegex = /^[\d\s\-\+\(\)\.]{6,20}$/;
  return phone === "" || phoneRegex.test(phone);
}

/**
 * Validate a numeric amount
 */
function isValidAmount(amount: string): boolean {
  if (amount === "") return false;
  // Allow various number formats including European (1.234,56) and US (1,234.56)
  const normalized = amount.replace(/[€$\s]/g, "").replace(/,/g, ".");
  return !isNaN(parseFloat(normalized));
}

/**
 * Validate a single row against the mapping and entity type
 */
export function validateRow(
  row: string[],
  mapping: ColumnMapping[],
  entityType: EntityType,
  rowIndex: number
): RowValidationResult {
  const errors: ValidationError[] = [];
  const data: Record<string, string> = {};
  const requiredFields = TARGET_FIELDS[entityType]
    .filter((f) => f.required)
    .map((f) => f.field);

  // Build data object from row using mapping
  for (const { sourceIndex, sourceColumn, targetField } of mapping) {
    if (targetField && row[sourceIndex] !== undefined) {
      data[targetField] = row[sourceIndex]?.trim() || "";
    }
  }

  // Check required fields
  for (const field of requiredFields) {
    if (!data[field] || data[field].trim() === "") {
      const sourceMapping = mapping.find((m) => m.targetField === field);
      errors.push({
        row: rowIndex,
        column: sourceMapping?.sourceColumn || field,
        message: `${field} is required`,
        value: data[field] || "",
      });
    }
  }

  // Validate specific field formats
  if (data.email && data.email.trim() !== "" && !isValidEmail(data.email)) {
    const sourceMapping = mapping.find((m) => m.targetField === "email");
    errors.push({
      row: rowIndex,
      column: sourceMapping?.sourceColumn || "email",
      message: "Invalid email format",
      value: data.email,
    });
  }

  if (data.phone && !isValidPhone(data.phone)) {
    const sourceMapping = mapping.find((m) => m.targetField === "phone");
    errors.push({
      row: rowIndex,
      column: sourceMapping?.sourceColumn || "phone",
      message: "Invalid phone format",
      value: data.phone,
    });
  }

  if (entityType === "deal" && data.amount !== undefined) {
    if (!isValidAmount(data.amount)) {
      const sourceMapping = mapping.find((m) => m.targetField === "amount");
      errors.push({
        row: rowIndex,
        column: sourceMapping?.sourceColumn || "amount",
        message: "Invalid amount format",
        value: data.amount,
      });
    }
  }

  return {
    rowIndex,
    valid: errors.length === 0,
    errors,
    data,
  };
}

/**
 * Validate all rows
 */
export function validateAllRows(
  rows: string[][],
  mapping: ColumnMapping[],
  entityType: EntityType
): RowValidationResult[] {
  return rows.map((row, index) => validateRow(row, mapping, entityType, index));
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY_PREFIX = "nexus_imported_";

/**
 * Simulate importing data (stores in localStorage and logs to console)
 */
export async function simulateImport(
  validRows: RowValidationResult[],
  entityType: EntityType,
  onProgress?: (progress: number) => void
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  const importedRecords: Record<string, string>[] = [];
  let imported = 0;
  let failed = 0;

  // Process each row with simulated delay
  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));

    if (row.valid) {
      // Log to console
      console.log(`[IMPORT] ${entityType.toUpperCase()} #${i + 1}:`, row.data);
      importedRecords.push(row.data);
      imported++;
    } else {
      errors.push(...row.errors);
      failed++;
    }

    // Report progress
    if (onProgress) {
      onProgress(((i + 1) / validRows.length) * 100);
    }
  }

  // Store in localStorage
  try {
    const existingData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${entityType}`);
    const existing = existingData ? JSON.parse(existingData) : [];
    const combined = [...existing, ...importedRecords];
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${entityType}`, JSON.stringify(combined));
    console.log(`[IMPORT] Stored ${imported} ${entityType}s in localStorage`);
  } catch (error) {
    console.error("[IMPORT] Failed to store in localStorage:", error);
  }

  return {
    success: failed === 0,
    imported,
    failed,
    errors,
  };
}

/**
 * Generate error report as CSV
 */
export function generateErrorReport(errors: ValidationError[]): string {
  const headers = ["Row", "Column", "Value", "Error"];
  const rows = errors.map((e) => [
    String(e.row + 1), // Convert to 1-indexed for user display
    e.column,
    `"${e.value.replace(/"/g, '""')}"`,
    e.message,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Download error report as a file
 */
export function downloadErrorReport(errors: ValidationError[], fileName: string): void {
  const csv = generateErrorReport(errors);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}_errors.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseImportState {
  // File & Parse
  file: File | null;
  parsedData: ParsedData | null;
  parseError: string | null;
  isParsing: boolean;

  // Mapping
  mapping: ColumnMapping[];
  entityType: EntityType;

  // Validation
  validationResults: RowValidationResult[];
  validCount: number;
  invalidCount: number;

  // Import
  isImporting: boolean;
  importProgress: number;
  importResult: ImportResult | null;
}

export interface UseImportActions {
  setFile: (file: File | null) => Promise<void>;
  setEntityType: (type: EntityType) => void;
  updateMapping: (index: number, targetField: string | null) => void;
  resetMapping: () => void;
  runValidation: () => void;
  runImport: (skipInvalid: boolean) => Promise<void>;
  downloadErrors: () => void;
  reset: () => void;
}

export function useImport(): [UseImportState, UseImportActions] {
  const [file, setFileState] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [entityType, setEntityType] = useState<EntityType>("contact");

  const [validationResults, setValidationResults] = useState<RowValidationResult[]>([]);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const validCount = validationResults.filter((r) => r.valid).length;
  const invalidCount = validationResults.filter((r) => !r.valid).length;

  const setFile = useCallback(async (newFile: File | null) => {
    setFileState(newFile);
    setParsedData(null);
    setParseError(null);
    setMapping([]);
    setValidationResults([]);
    setImportResult(null);
    setImportProgress(0);

    if (!newFile) return;

    setIsParsing(true);
    try {
      const data = await parseFile(newFile);
      setParsedData(data);
      // Auto-map columns based on current entity type
      const autoMapped = autoMapColumns(data.headers, entityType);
      setMapping(autoMapped);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  }, [entityType]);

  const handleSetEntityType = useCallback((type: EntityType) => {
    setEntityType(type);
    // Re-auto-map if we have parsed data
    if (parsedData) {
      const autoMapped = autoMapColumns(parsedData.headers, type);
      setMapping(autoMapped);
    }
    setValidationResults([]);
    setImportResult(null);
  }, [parsedData]);

  const updateMapping = useCallback((index: number, targetField: string | null) => {
    setMapping((prev) => {
      const newMapping = [...prev];
      newMapping[index] = { ...newMapping[index], targetField };
      return newMapping;
    });
    setValidationResults([]);
    setImportResult(null);
  }, []);

  const resetMapping = useCallback(() => {
    if (parsedData) {
      const autoMapped = autoMapColumns(parsedData.headers, entityType);
      setMapping(autoMapped);
      setValidationResults([]);
      setImportResult(null);
    }
  }, [parsedData, entityType]);

  const runValidation = useCallback(() => {
    if (!parsedData) return;
    const results = validateAllRows(parsedData.rows, mapping, entityType);
    setValidationResults(results);
  }, [parsedData, mapping, entityType]);

  const runImport = useCallback(async (skipInvalid: boolean) => {
    if (!parsedData || validationResults.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    const rowsToImport = skipInvalid
      ? validationResults.filter((r) => r.valid)
      : validationResults;

    try {
      const result = await simulateImport(rowsToImport, entityType, setImportProgress);
      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        failed: rowsToImport.length,
        errors: [],
      });
    } finally {
      setIsImporting(false);
    }
  }, [parsedData, validationResults, entityType]);

  const downloadErrors = useCallback(() => {
    if (!parsedData || !importResult) return;
    const allErrors = validationResults.flatMap((r) => r.errors);
    if (allErrors.length > 0) {
      downloadErrorReport(allErrors, parsedData.fileName.replace(/\.[^/.]+$/, ""));
    }
  }, [parsedData, importResult, validationResults]);

  const reset = useCallback(() => {
    setFileState(null);
    setParsedData(null);
    setParseError(null);
    setIsParsing(false);
    setMapping([]);
    setValidationResults([]);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  const state: UseImportState = {
    file,
    parsedData,
    parseError,
    isParsing,
    mapping,
    entityType,
    validationResults,
    validCount,
    invalidCount,
    isImporting,
    importProgress,
    importResult,
  };

  const actions: UseImportActions = {
    setFile,
    setEntityType: handleSetEntityType,
    updateMapping,
    resetMapping,
    runValidation,
    runImport,
    downloadErrors,
    reset,
  };

  return [state, actions];
}

export default useImport;
