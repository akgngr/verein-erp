const TREASURER_REPORT_FILE_RE =
  /^accounting\/reports\/\d{4}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

/**
 * Validates that a `?file=` query parameter points strictly to a generated
 * treasurer report PDF under `accounting/reports/{year}/{uuid}.pdf`.
 */
export function isValidTreasurerReportFile(filePath: string): boolean {
  return TREASURER_REPORT_FILE_RE.test(filePath);
}
