export function readLoginUser() {
  try {
    return JSON.parse(localStorage.getItem("loginUser") || "null");
  } catch {
    return null;
  }
}

export function isAdminUser(user) {
  return user?.role === "ADMIN";
}
