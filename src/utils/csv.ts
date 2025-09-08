import { showError } from "@/utils/toast";

export const parseCsv = (csvText: string): Record<string, string>[] => {
  try {
    const lines = csvText.trim().split(/\r\n|\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    // This regex handles semicolons inside quoted strings
    const csvRowRegex = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const values = line.split(csvRowRegex).map(val => {
            let value = val.trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            return value.replace(/""/g, '"');
        });

        const entry: { [key: string]: string } = {};
        for (let j = 0; j < headers.length; j++) {
            entry[headers[j]] = values[j] || '';
        }
        data.push(entry);
    }
    return data;
  } catch (error) {
    showError("Failed to parse CSV file. Please check the format.");
    console.error("CSV Parsing Error:", error);
    return [];
  }
};