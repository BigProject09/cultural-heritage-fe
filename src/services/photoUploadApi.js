export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:8080/photos/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("사진 업로드 실패");
  }

  const data = await response.json();
  return data.url;
}
