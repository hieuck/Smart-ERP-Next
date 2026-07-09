export function escapeCsvFormula(value: string): string {
  if (/^[+=@-]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function escapeCsvField(value: string | number): string {
  let text = String(value);

  text = escapeCsvFormula(text);

  if (text.includes('"')) {
    text = text.replace(/"/g, '""');
  }

  if (text.includes(',') || text.includes('\n') || text.includes('\r') || text.includes('"')) {
    return `"${text}"`;
  }

  return text;
}

export function buildCsvRow(fields: Array<string | number>): string {
  return fields.map(escapeCsvField).join(',');
}
