
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

// ตรวจสอบว่าผู้ใช้เป็น Admin หรือไม่
async function checkAdmin() {
  const { data: { user }, error } =
    await supabaseClient.auth.getUser();

  if (error || !user) return false;

  const { data: profile, error: profileError } =
    await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (profileError || profile?.role !== "admin") {
    await supabaseClient.auth.signOut();
    return false;
  }

  return true;
}

// เมื่อเปิดหน้า Admin หากล็อกอินอยู่แล้วให้ตรวจสอบสิทธิ์
(async function () {
  const isAdmin = await checkAdmin();

  if (isAdmin) {
  window.location.href = "dashboard.html";
}
})();

// จัดการการล็อกอิน
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  message.textContent = "";
  message.style.color = "#d62828";
  loginButton.disabled = true;
  loginButton.textContent = "กำลังเข้าสู่ระบบ...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const isAdmin = await checkAdmin();

    if (!isAdmin) {
      throw new Error("บัญชีนี้ไม่มีสิทธิ์ Admin");
    }

    window.location.href = "dashboard.html";
    
  } catch (error) {
    message.style.color = "#d62828";
    message.textContent = error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "เข้าสู่ระบบ";
  }
});
