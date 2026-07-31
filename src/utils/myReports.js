const STORAGE_KEY = "myReports";

function withoutEmbeddedImage(report) {
  if (!report?.artifactInfo?.image) return report;

  const artifactInfo = { ...report.artifactInfo };
  delete artifactInfo.image;
  return {
    ...report,
    artifactInfo,
  };
}

export function getMyReports() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const reports = raw ? JSON.parse(raw) : [];
  const compacted = reports.map(withoutEmbeddedImage);

  if (compacted.some((report, index) => report !== reports[index])) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
  }

  return compacted;
}

export function addMyReport(report) {
  const reports = [withoutEmbeddedImage(report), ...getMyReports()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  return reports;
}

export function compactMyReports() {
  return getMyReports();
}

export function deleteMyReportsByArtifactId(artifactId) {
  const targetId = String(artifactId);
  const reports = getMyReports().filter(
    (report) =>
      String(
        report.artifactId ||
          report.artifactInfo?.artifactId ||
          report.relicInfo?.artifactId ||
          "",
      ) !== targetId,
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  return reports;
}
