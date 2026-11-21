
const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const message = document.getElementById("message");
const listingContainer = document.getElementById("listingContainer");
const reportMessage = document.getElementById("reportMessage");
const reportContainer = document.getElementById("reportContainer");
const approvedMessage = document.getElementById("approvedMessage");
const approvedContainer = document.getElementById("approvedContainer");
const reasonLabels = {
  "scam": "สงสัยว่าเป็นการหลอกลวง",
  "suspicious": "น่าสงสัย / พฤติกรรมไม่ปกติ",
  "incorrect_information": "ข้อมูลไม่ถูกต้อง",
  "expired": "ประกาศหมดอายุหรือไม่ว่างแล้ว",
  "other": "อื่น ๆ"
};
// ตรวจสอบสิทธิ์ Admin
async function verifyAdmin() {
  const { data: { user }, error } =
    await supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.href = "index.html";
    return false;
  }

  const { data: profile, error: profileError } =
    await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (profileError || profile?.role !== "admin") {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
    return false;
  }

  return true;
}

// โหลดข้อมูลประกาศ
async function loadListings() {
  message.textContent = "กำลังโหลดข้อมูล...";

  const { data, error } = await supabaseClient
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    message.textContent = "โหลดข้อมูลไม่สำเร็จ: " + error.message;
    return;
  }

  const listings = data || [];
  const pending = listings.filter(item => item.status === "pending");

  totalCount.textContent = listings.length;
  pendingCount.textContent = pending.length;

  if (pending.length === 0) {
    message.textContent = "ไม่มีประกาศที่รออนุมัติ";
    listingContainer.innerHTML = "";
    return;
  }

  message.textContent = `พบประกาศรออนุมัติ ${pending.length} รายการ`;

  listingContainer.innerHTML = "";

  pending.forEach(item => {
    const card = document.createElement("div");
    card.className = "listing";

    const title = document.createElement("h4");
    title.textContent = item.title || "ไม่มีหัวข้อ";

    const details = document.createElement("p");
    details.textContent =
      `เส้นทาง: ${item.direction || "-"} | ${item.origin || "-"} → ${item.destination || "-"}`;

    const date = document.createElement("p");
    date.textContent = `วันเดินทาง: ${item.travel_date || "-"}`;

    const description = document.createElement("p");
    description.textContent = `รายละเอียด: ${item.description || "-"}`;

    const contact = document.createElement("p");
    if (item.contact_url) {
      const link = document.createElement("a");
      link.href = item.contact_url;
      link.textContent = "เปิดช่องทางติดต่อ";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      contact.appendChild(link);
    } else {
      contact.textContent = "ไม่มีข้อมูลติดต่อ";
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const approveButton = document.createElement("button");
    approveButton.className = "approve";
    approveButton.textContent = "อนุมัติ";
    approveButton.addEventListener("click", () => updateStatus(item.id, "approved"));

    const rejectButton = document.createElement("button");
    rejectButton.className = "reject";
    rejectButton.textContent = "ปฏิเสธ";
    rejectButton.addEventListener("click", () => updateStatus(item.id, "rejected"));

    actions.append(approveButton, rejectButton);
    card.append(title, details, date, description, contact, actions);
    listingContainer.appendChild(card);
  });
}

// โหลดรายงานที่รอตรวจสอบ
async function loadReports() {
  reportMessage.textContent = "กำลังโหลดข้อมูล...";

  const { data: reports, error } = await supabaseClient
    .from("reports")
    .select("id, listing_id, reason, details, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("load reports error:", error);
    reportMessage.textContent = "โหลดรายงานไม่สำเร็จ: " + error.message;
    return;
  }

  reportContainer.innerHTML = "";

  if (!reports || reports.length === 0) {
    reportMessage.textContent = "ไม่มีรายงานที่รอตรวจสอบ";
    return;
  }

  reportMessage.textContent =
    `พบรายงานรอตรวจสอบ ${reports.length} รายการ`;

  // ดึงชื่อประกาศที่ถูกรายงานในครั้งเดียว
  const listingIds = [...new Set(reports.map(r => r.listing_id))];

  const { data: reportedListings } = await supabaseClient
    .from("listings")
    .select("id, title, status")
    .in("id", listingIds);

  const listingMap = {};
  (reportedListings || []).forEach(l => { listingMap[l.id] = l; });

  reports.forEach(report => {
    const listing = listingMap[report.listing_id];

    const card = document.createElement("div");
    card.className = "listing";

    const title = document.createElement("h4");
    title.textContent =
      "ประกาศ: " + (listing ? listing.title : "(ไม่พบประกาศ)");

    const reason = document.createElement("p");
    reason.textContent =
      "เหตุผล: " + (reasonLabels[report.reason] || report.reason);

    const details = document.createElement("p");
    details.textContent =
      "รายละเอียด: " + (report.details || "-");

    const meta = document.createElement("p");
    meta.className = "report-meta";
    meta.textContent =
      "รายงานเมื่อ: " +
      new Date(report.created_at).toLocaleString("th-TH") +
      (listing ? " | สถานะประกาศ: " + listing.status : "");

    const link = document.createElement("p");
    const anchor = document.createElement("a");
    anchor.href =
      "../listing-detail.html?id=" + encodeURIComponent(report.listing_id);
    anchor.textContent = "เปิดดูประกาศที่ถูกรายงาน";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    link.appendChild(anchor);

        const actions = document.createElement("div");
    actions.className = "actions";

    const reviewedButton = document.createElement("button");
    reviewedButton.className = "approve";
    reviewedButton.textContent = "ตรวจแล้ว";
    reviewedButton.addEventListener("click", () =>
      updateReportStatus(report.id, "reviewed")
    );

    const dismissButton = document.createElement("button");
    dismissButton.className = "dismiss";
    dismissButton.textContent = "ไม่ดำเนินการ";
    dismissButton.addEventListener("click", () =>
      updateReportStatus(report.id, "dismissed")
    );

        actions.append(reviewedButton, dismissButton);

    if (listing && listing.status === "approved") {
      const takeDownButton = document.createElement("button");
      takeDownButton.className = "reject";
      takeDownButton.textContent = "ถอดประกาศ";
      takeDownButton.addEventListener("click", () =>
        takeDownListing(report.listing_id)
      );
      actions.appendChild(takeDownButton);
    }

    card.append(title, reason, details, meta, link, actions);
    reportContainer.appendChild(card);
  });
}

// โหลดประกาศที่อนุมัติแล้ว
async function loadApprovedListings() {
  approvedMessage.textContent = "กำลังโหลดข้อมูล...";

  const { data, error } = await supabaseClient
    .from("listings")
    .select("id, title, direction, origin, destination, travel_date")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("load approved error:", error);
    approvedMessage.textContent = "โหลดข้อมูลไม่สำเร็จ: " + error.message;
    return;
  }

  approvedContainer.innerHTML = "";

  if (!data || data.length === 0) {
    approvedMessage.textContent = "ไม่มีประกาศที่อนุมัติแล้ว";
    return;
  }

  approvedMessage.textContent = `ประกาศที่อนุมัติแล้ว ${data.length} รายการ`;

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "listing";

    const title = document.createElement("h4");
    title.textContent = item.title || "ไม่มีหัวข้อ";

    const route = document.createElement("p");
    route.textContent =
      `เส้นทาง: ${item.origin || "-"} → ${item.destination || "-"}`;

    const date = document.createElement("p");
    date.textContent = `วันเดินทาง: ${item.travel_date || "-"}`;

    const link = document.createElement("p");
    const anchor = document.createElement("a");
    anchor.href = "../listing-detail.html?id=" + encodeURIComponent(item.id);
    anchor.textContent = "เปิดดูประกาศ";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    link.appendChild(anchor);

    const actions = document.createElement("div");
    actions.className = "actions";

    const takeDownButton = document.createElement("button");
    takeDownButton.className = "reject";
    takeDownButton.textContent = "ถอดประกาศ";
    takeDownButton.addEventListener("click", () => takeDownListing(item.id));

    actions.appendChild(takeDownButton);
    card.append(title, route, date, link, actions);
    approvedContainer.appendChild(card);
  });
}

// ถอดประกาศที่ถูกรายงานออกจากหน้าสาธารณะ
async function takeDownListing(listingId) {
  if (!confirm("ยืนยันการถอดประกาศนี้ออกจากหน้าสาธารณะหรือไม่?")) {
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  const { error } = await supabaseClient
    .from("listings")
    .update({
      status: "closed",
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", listingId);

  if (error) {
    console.error("take down error:", error);
    alert("ถอดประกาศไม่สำเร็จ: " + error.message);
    return;
  }

    alert("ถอดประกาศเรียบร้อย");
  loadListings();
  loadReports();
  loadApprovedListings();
}

// เปลี่ยนสถานะรายงาน
async function updateReportStatus(id, status) {
  const action = status === "reviewed" ? "ตรวจแล้ว" : "ไม่ดำเนินการ";

  if (!confirm(`ยืนยันการทำเครื่องหมายรายงานนี้เป็น "${action}" หรือไม่?`)) {
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  const { error } = await supabaseClient
    .from("reports")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("update report error:", error);
    alert("ดำเนินการไม่สำเร็จ: " + error.message);
    return;
  }

  loadReports();
}

// เปลี่ยนสถานะประกาศ
async function updateStatus(id, status) {
  const action = status === "approved" ? "อนุมัติ" : "ปฏิเสธ";

  if (!confirm(`ยืนยันการ${action}ประกาศนี้หรือไม่?`)) {
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  const { error } = await supabaseClient
    .from("listings")
    .update({
      status,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    alert("ดำเนินการไม่สำเร็จ: " + error.message);
    return;
  }

  alert(`ดำเนินการ${action}เรียบร้อย`);
  loadListings();
}

// ออกจากระบบ
document.getElementById("logoutButton").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// เริ่มทำงาน
(async function () {
  const isAdmin = await verifyAdmin();

    if (isAdmin) {
        await loadListings();
    await loadReports();
    await loadApprovedListings();
  }
})();
