/**
 * Export data to CSV format
 */

export function exportToCSV(data: unknown[], filename: string): void {
  if (data.length === 0) {
    return;
  }

  // Convert data to CSV rows
  const headers = Object.keys(data[0] as Record<string, unknown>);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = (row as Record<string, unknown>)[header];
      // Escape commas and quotes, wrap in quotes if contains special characters
      if (value === null || value === undefined) {
        return "";
      }
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(","));
  }

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Flatten nested objects for CSV export
 */
export function flattenForCSV(data: unknown[]): Record<string, unknown>[] {
  return data.map((item) => {
    const flattened: Record<string, unknown> = {};
    const flatten = (obj: unknown, prefix = ""): void => {
      if (obj === null || obj === undefined) {
        flattened[prefix] = "";
        return;
      }
      if (typeof obj === "object" && !Array.isArray(obj) && !(obj instanceof Date)) {
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === "object" && value !== null && !Array.isArray(value) && !(obj instanceof Date)) {
            flatten(value, newKey);
          } else {
            flattened[newKey] = value instanceof Date ? value.toISOString() : value;
          }
        }
      } else {
        flattened[prefix] = obj instanceof Date ? obj.toISOString() : obj;
      }
    };
    flatten(item);
    return flattened;
  });
}
