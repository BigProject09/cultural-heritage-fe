const STORAGE_KEY = "myReports";

export function getMyReports() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addMyReport(report) {
  const reports = [report, ...getMyReports()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  return reports;
}
