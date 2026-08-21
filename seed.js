require("dotenv").config({ path: ".env.local" });
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// ── Initialize Admin SDK ──────────────────────────────────────────────────────
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || "nexgen-erp-dcde5",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const auth = getAuth();

// ── Helper Functions ──────────────────────────────────────────────────────────
function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split("T")[0];
}

function randomTime() {
  const h = Math.floor(Math.random() * 4) + 8;
  const m = Math.floor(Math.random() * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

const now = new Date().toISOString();

// ── Sample Users ──────────────────────────────────────────────────────────────
const sampleUsers = [
  { email: "admin@nexgen.com", password: "Admin123!", fullName: "System Admin", role: "admin" },
  { email: "hr@nexgen.com", password: "Hr12345!", fullName: "Fatima Khan", role: "hr" },
  { email: "manager@nexgen.com", password: "Manager123!", fullName: "Ali Raza", role: "manager" },
  { email: "employee@nexgen.com", password: "Employee123!", fullName: "Sara Ahmed", role: "employee" },
  { email: "ahmed@nexgen.com", password: "Ahmed123!", fullName: "Ahmed Hussain", role: "employee" },
  { email: "zain@nexgen.com", password: "Zain123!", fullName: "Zain Malik", role: "employee" },
  { email: "hira@nexgen.com", password: "Hira123!", fullName: "Hira Ali", role: "employee" },
  { email: "usman@nexgen.com", password: "Usman123!", fullName: "Usman Tariq", role: "manager" },
  { email: "nishat@nexgen.com", password: "Nishat123!", fullName: "Nishat Bibi", role: "hr" },
  { email: "bilal@nexgen.com", password: "Bilal123!", fullName: "Bilal Sharif", role: "employee" },
];

const employeeData = [
  { name: "Sara Ahmed", email: "employee@nexgen.com", dept: "Engineering", pos: "Software Engineer", salary: 85000, managerIdx: 2 },
  { name: "Ahmed Hussain", email: "ahmed@nexgen.com", dept: "Engineering", pos: "Senior Engineer", salary: 110000, managerIdx: 2 },
  { name: "Zain Malik", email: "zain@nexgen.com", dept: "Marketing", pos: "Marketing Manager", salary: 95000, managerIdx: 2 },
  { name: "Hira Ali", email: "hira@nexgen.com", dept: "Sales", pos: "Sales Executive", salary: 70000, managerIdx: 7 },
  { name: "Bilal Sharif", email: "bilal@nexgen.com", dept: "Finance", pos: "Accountant", salary: 75000, managerIdx: 7 },
  { name: "Ali Raza", email: "manager@nexgen.com", dept: "Engineering", pos: "Tech Lead", salary: 130000, managerIdx: 0 },
  { name: "Usman Tariq", email: "usman@nexgen.com", dept: "Sales", pos: "Sales Manager", salary: 120000, managerIdx: 0 },
  { name: "Fatima Khan", email: "hr@nexgen.com", dept: "HR", pos: "HR Manager", salary: 100000, managerIdx: 0 },
  { name: "Nishat Bibi", email: "nishat@nexgen.com", dept: "HR", pos: "Recruiter", salary: 65000, managerIdx: 0 },
];

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // ── Cleanup old leaves collection (was renamed to leaveRequests) ─────────
  console.log("🧹 Cleaning up old 'leaves' collection...");
  const oldLeaves = await db.collection("leaves").get();
  if (!oldLeaves.empty) {
    const cleanupBatch = db.batch();
    oldLeaves.docs.forEach((doc) => cleanupBatch.delete(doc.ref));
    await cleanupBatch.commit();
    console.log(`  ✓ Deleted ${oldLeaves.size} old leaves documents`);
  } else {
    console.log("  ✓ No old leaves documents found");
  }

  // ── Cleanup old dashboardStats cache ─────────────────────────────────────
  console.log("🧹 Cleaning up old dashboardStats cache...");
  const oldStats = await db.collection("dashboardStats").get();
  if (!oldStats.empty) {
    const cleanupBatch = db.batch();
    oldStats.docs.forEach((doc) => cleanupBatch.delete(doc.ref));
    await cleanupBatch.commit();
    console.log(`  ✓ Deleted ${oldStats.size} old dashboardStats documents`);
  } else {
    console.log("  ✓ No old dashboardStats documents found");
  }

  // ── Cleanup old duplicate employees ──────────────────────────────────────
  console.log("🧹 Cleaning up duplicate employees...");
  const oldEmps = await db.collection("employees").get();
  if (!oldEmps.empty) {
    const cleanupBatch = db.batch();
    oldEmps.docs.forEach((doc) => cleanupBatch.delete(doc.ref));
    await cleanupBatch.commit();
    console.log(`  ✓ Deleted ${oldEmps.size} old employee documents`);
  } else {
    console.log("  ✓ No old employee documents found");
  }

  // ── 1. Create Auth Users & Profiles ───────────────────────────────────────
  console.log("👤 Creating users & profiles...");
  const userIds = {};

  for (const user of sampleUsers) {
    try {
      let uid;
      try {
        const existing = await auth.getUserByEmail(user.email);
        uid = existing.uid;
        console.log(`  ✓ ${user.email} (already exists)`);
      } catch {
        const created = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.fullName,
        });
        uid = created.uid;
        console.log(`  ✓ ${user.email} (created)`);
      }

      userIds[user.email] = uid;

      await db.collection("profiles").doc(uid).set({
        id: uid,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        avatar_url: null,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      console.error(`  ✗ ${user.email}: ${err.message}`);
    }
  }

  const adminId = userIds["admin@nexgen.com"];
  const hrId = userIds["hr@nexgen.com"];
  const managerId = userIds["manager@nexgen.com"];
  const managerId2 = userIds["usman@nexgen.com"];
  const empIds = [
    userIds["employee@nexgen.com"],
    userIds["ahmed@nexgen.com"],
    userIds["zain@nexgen.com"],
    userIds["hira@nexgen.com"],
    userIds["bilal@nexgen.com"],
  ];

  // Resolve manager IDs for employees
  const empManagerIds = employeeData.map((e) => {
    const mgrEmail = sampleUsers[e.managerIdx].email;
    return userIds[mgrEmail];
  });

  // ── 2. Employees (use fixed IDs to avoid duplicates) ──────────────────────
  console.log("\n🧑‍💼 Creating employees...");
  const employeeIds = [];

  for (let i = 0; i < employeeData.length; i++) {
    const emp = employeeData[i];
    const uid = userIds[emp.email];
    const empDocId = `emp_${(i + 1).toString().padStart(3, "0")}`;
    const docRef = await db.collection("employees").doc(empDocId).set({
      profileId: uid,
      fullName: emp.name,
      email: emp.email,
      phone: `+92-3${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`,
      department: emp.dept,
      position: emp.pos,
      status: "active",
      managerId: empManagerIds[i],
      salary: emp.salary,
      hireDate: randomDate(new Date("2023-01-01"), new Date("2025-06-01")),
      created_at: now,
      updated_at: now,
    });
    employeeIds.push(empDocId);
    console.log(`  ✓ ${emp.name}`);
  }

  // ── 3. Attendance (last 30 days) ─────────────────────────────────────────
  console.log("\n📅 Creating attendance records...");
  let attendanceCount = 0;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < employeeData.length; i++) {
    const emp = employeeData[i];
    const uid = userIds[emp.email];
    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      const isPresent = Math.random() > 0.15;
      const isLate = Math.random() > 0.8;

      const ref = db.collection("attendance").doc();
      batch.set(ref, {
        employeeId: uid,
        employeeName: emp.name,
        managerId: empManagerIds[i],
        date: dateStr,
        checkIn: isPresent ? (isLate ? "09:15" : randomTime()) : null,
        checkOut: isPresent ? `${17 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}` : null,
        status: isPresent ? (isLate ? "late" : "present") : "absent",
        workHours: isPresent ? Math.round((8 + Math.random() * 2) * 10) / 10 : 0,
        created_at: now,
        updated_at: now,
      });
      attendanceCount++;
      batchCount++;

      if (batchCount === 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log(`  ✓ ${attendanceCount} attendance records`);

  // ── 4. Leave Requests ─────────────────────────────────────────────────────
  console.log("\n🏖️  Creating leave requests...");
  const leaveTypes = ["sick", "casual", "annual", "unpaid"];
  const leaveStatuses = ["pending", "approved", "rejected"];
  const leaveReasons = [
    "Medical appointment", "Family event", "Personal work", "Vacation",
    "Health issues", "Family emergency", "Wedding ceremony", "Travel plans",
  ];

  batch = db.batch();
  for (let i = 0; i < 20; i++) {
    const empIdx = Math.floor(Math.random() * empIds.length);
    const emp = employeeData[empIdx];
    const uid = userIds[emp.email];
    const status = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];

    const leaveData = {
      employeeId: uid,
      employeeName: emp.name,
      managerId: empManagerIds[empIdx],
      type: leaveTypes[Math.floor(Math.random() * leaveTypes.length)],
      startDate: randomDate(new Date("2026-07-01"), new Date("2026-08-31")),
      endDate: randomDate(new Date("2026-07-01"), new Date("2026-08-31")),
      reason: leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
      status,
      created_at: now,
      updated_at: now,
    };

    if (status !== "pending") {
      leaveData.reviewedBy = Math.random() > 0.5 ? hrId : managerId;
      leaveData.reviewerName = Math.random() > 0.5 ? "Fatima Khan" : "Ali Raza";
    }

    const ref = db.collection("leaveRequests").doc();
    batch.set(ref, leaveData);
  }
  await batch.commit();
  console.log("  ✓ 20 leave requests");

  // ── 5. Customers ──────────────────────────────────────────────────────────
  console.log("\n🤝 Creating customers...");
  const customerNames = [
    { name: "TechCorp Solutions", company: "TechCorp Inc.", email: "info@techcorp.com", status: "active" },
    { name: "Global Traders", company: "Global Trading Co.", email: "contact@globaltraders.com", status: "active" },
    { name: "Smart Systems", company: "Smart Systems Ltd.", email: "hello@smartsystems.com", status: "prospect" },
    { name: "Digital Wave", company: "Digital Wave Corp.", email: "support@digitalwave.com", status: "active" },
    { name: "Innovate Labs", company: "Innovate Labs Inc.", email: "team@innovatelabs.com", status: "lead" },
    { name: "Prime Industries", company: "Prime Industries", email: "sales@primeind.com", status: "active" },
    { name: "Future Tech", company: "Future Tech Pvt.", email: "info@futuretech.com", status: "inactive" },
    { name: "Swift Solutions", company: "Swift Solutions Ltd.", email: "contact@swiftsol.com", status: "prospect" },
  ];

  const customerIds = [];
  for (const c of customerNames) {
    const empIdx = Math.floor(Math.random() * empIds.length);
    const docRef = await db.collection("customers").add({
      name: c.name,
      company: c.company,
      email: c.email,
      phone: `+92-3${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`,
      status: c.status,
      assignedTo: empIds[empIdx],
      assignedToName: employeeData[empIdx].name,
      notes: `Important client - ${c.company}`,
      created_at: now,
      updated_at: now,
    });
    customerIds.push({ id: docRef.id, ...c });
    console.log(`  ✓ ${c.name}`);
  }

  // ── 6. Interactions ───────────────────────────────────────────────────────
  console.log("\n📞 Creating interactions...");
  const interactionTypes = ["call", "email", "meeting"];
  const interactionSubjects = [
    "Initial consultation", "Follow-up call", "Project proposal", "Contract discussion",
    "Support query", "Quarterly review", "Product demo", "Pricing inquiry",
  ];

  batch = db.batch();
  batchCount = 0;
  for (const c of customerIds) {
    const numInteractions = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numInteractions; i++) {
      const empIdx = Math.floor(Math.random() * empIds.length);
      const ref = db.collection("interactions").doc();
      batch.set(ref, {
        customerId: c.id,
        type: interactionTypes[Math.floor(Math.random() * interactionTypes.length)],
        subject: interactionSubjects[Math.floor(Math.random() * interactionSubjects.length)],
        notes: "Discussed project requirements and timeline.",
        createdBy: empIds[empIdx],
        createdByName: employeeData[empIdx].name,
        created_at: randomDate(new Date("2026-06-01"), new Date("2026-08-19")) + "T" + randomTime() + ":00Z",
      });
      batchCount++;
      if (batchCount === 500) { await batch.commit(); batch = db.batch(); batchCount = 0; }
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log("  ✓ Interactions created");

  // ── 7. Projects ───────────────────────────────────────────────────────────
  console.log("\n📁 Creating projects...");
  const projectData = [
    { name: "ERP System v2.0", desc: "Complete ERP system overhaul", status: "active", clientIdx: 0 },
    { name: "Mobile App Launch", desc: "React Native mobile app development", status: "active", clientIdx: 1 },
    { name: "Website Redesign", desc: "Modern responsive website redesign", status: "planning", clientIdx: 2 },
    { name: "Data Migration", desc: "Legacy system data migration", status: "on_hold", clientIdx: 3 },
    { name: "AI Chatbot Integration", desc: "Customer support chatbot", status: "active", clientIdx: 4 },
  ];

  const projectIds = [];
  for (const p of projectData) {
    const docRef = await db.collection("projects").add({
      name: p.name,
      description: p.desc,
      status: p.status,
      clientId: customerIds[p.clientIdx]?.id,
      clientName: customerIds[p.clientIdx]?.name,
      managerId: managerId,
      managerName: "Ali Raza",
      teamMembers: empIds.slice(0, 3),
      created_at: now,
      updated_at: now,
    });
    projectIds.push({ id: docRef.id, ...p });
    console.log(`  ✓ ${p.name}`);
  }

  // ── 8. Tasks ──────────────────────────────────────────────────────────────
  console.log("\n✅ Creating tasks...");
  const taskTitles = [
    "Design UI mockups", "Set up database schema", "Write API endpoints",
    "Create unit tests", "Code review", "Deploy to staging",
    "Fix login bug", "Update documentation", "Performance optimization",
    "Security audit", "Client feedback review", "Sprint planning",
  ];
  const taskStatuses = ["todo", "in_progress", "review", "done"];
  const taskPriorities = ["low", "medium", "high", "urgent"];

  batch = db.batch();
  batchCount = 0;
  for (const p of projectIds) {
    const numTasks = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < numTasks; i++) {
      const empIdx = Math.floor(Math.random() * empIds.length);
      const ref = db.collection("tasks").doc();
      batch.set(ref, {
        projectId: p.id,
        title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
        description: "Detailed task description for implementation.",
        status: taskStatuses[Math.floor(Math.random() * taskStatuses.length)],
        assigneeId: empIds[empIdx],
        assigneeName: employeeData[empIdx].name,
        dueDate: randomDate(new Date("2026-08-01"), new Date("2026-09-30")),
        priority: taskPriorities[Math.floor(Math.random() * taskPriorities.length)],
        created_at: now,
        updated_at: now,
      });
      batchCount++;
      if (batchCount === 500) { await batch.commit(); batch = db.batch(); batchCount = 0; }
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log("  ✓ Tasks created for all projects");

  // ── 9. Products ───────────────────────────────────────────────────────────
  console.log("\n📦 Creating products...");
  const productData = [
    { name: "Laptop Pro 15", sku: "LAP-001", cat: "Electronics", qty: 45, reorder: 10, unit: "pcs" },
    { name: "Wireless Mouse", sku: "MOU-001", cat: "Accessories", qty: 200, reorder: 50, unit: "pcs" },
    { name: "USB-C Cable", sku: "CAB-001", cat: "Accessories", qty: 500, reorder: 100, unit: "pcs" },
    { name: "Monitor 27-inch", sku: "MON-001", cat: "Electronics", qty: 30, reorder: 5, unit: "pcs" },
    { name: "Office Chair", sku: "CHR-001", cat: "Furniture", qty: 25, reorder: 5, unit: "pcs" },
    { name: "Standing Desk", sku: "DSK-001", cat: "Furniture", qty: 15, reorder: 3, unit: "pcs" },
    { name: "Keyboard Mechanical", sku: "KEY-001", cat: "Accessories", qty: 80, reorder: 20, unit: "pcs" },
    { name: "Webcam HD", sku: "CAM-001", cat: "Electronics", qty: 60, reorder: 15, unit: "pcs" },
    { name: "Headset Pro", sku: "HDS-001", cat: "Accessories", qty: 40, reorder: 10, unit: "pcs" },
    { name: "Whiteboard 60x40", sku: "WBD-001", cat: "Furniture", qty: 12, reorder: 2, unit: "pcs" },
  ];

  const productIds = [];
  for (const p of productData) {
    const docRef = await db.collection("products").add({
      name: p.name,
      sku: p.sku,
      description: `High quality ${p.name.toLowerCase()}`,
      category: p.cat,
      quantity: p.qty,
      unit: p.unit,
      reorderLevel: p.reorder,
      created_at: now,
      updated_at: now,
    });
    productIds.push({ id: docRef.id, ...p });
    console.log(`  ✓ ${p.name}`);
  }

  // ── 10. Stock Movements ───────────────────────────────────────────────────
  console.log("\n📊 Creating stock movements...");
  const reasons = ["Purchase", "Sale", "Return", "Adjustment", "Transfer"];
  batch = db.batch();
  batchCount = 0;
  for (const p of productIds) {
    const numMovements = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numMovements; i++) {
      const empIdx = Math.floor(Math.random() * empIds.length);
      const ref = db.collection("stockMovements").doc();
      batch.set(ref, {
        productId: p.id,
        type: Math.random() > 0.5 ? "in" : "out",
        quantity: Math.floor(Math.random() * 20) + 1,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        createdByName: employeeData[empIdx].name,
        created_at: randomDate(new Date("2026-06-01"), new Date("2026-08-19")) + "T" + randomTime() + ":00Z",
      });
      batchCount++;
      if (batchCount === 500) { await batch.commit(); batch = db.batch(); batchCount = 0; }
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log("  ✓ Stock movements created");

  // ── 11. Sales Orders ──────────────────────────────────────────────────────
  console.log("\n💰 Creating sales orders...");
  for (let i = 0; i < 10; i++) {
    const customer = customerIds[Math.floor(Math.random() * customerIds.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let total = 0;

    for (let j = 0; j < numItems; j++) {
      const prod = productIds[Math.floor(Math.random() * productIds.length)];
      const qty = Math.floor(Math.random() * 10) + 1;
      const price = Math.floor(Math.random() * 50000) + 1000;
      const lineTotal = qty * price;
      total += lineTotal;
      items.push({ productId: prod.id, productName: prod.name, quantity: qty, unitPrice: price, lineTotal });
    }

    const empIdx = Math.floor(Math.random() * empIds.length);
    await db.collection("salesOrders").add({
      orderNumber: `SO-${(1001 + i).toString()}`,
      customerId: customer.id,
      customerName: customer.name,
      items,
      total,
      status: ["pending", "completed", "cancelled"][Math.floor(Math.random() * 3)],
      createdBy: empIds[empIdx],
      createdByName: employeeData[empIdx].name,
      created_at: randomDate(new Date("2026-06-01"), new Date("2026-08-19")) + "T" + randomTime() + ":00Z",
      updated_at: now,
    });
  }
  console.log("  ✓ 10 sales orders");

  // ── 12. Purchase Orders ───────────────────────────────────────────────────
  console.log("\n🛒 Creating purchase orders...");
  const suppliers = ["Dell Technologies", "HP Inc.", "Logitech", "Samsung", "IKEA"];

  for (let i = 0; i < 8; i++) {
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let total = 0;

    for (let j = 0; j < numItems; j++) {
      const prod = productIds[Math.floor(Math.random() * productIds.length)];
      const qty = Math.floor(Math.random() * 50) + 5;
      const price = Math.floor(Math.random() * 30000) + 500;
      const lineTotal = qty * price;
      total += lineTotal;
      items.push({ productId: prod.id, productName: prod.name, quantity: qty, unitPrice: price, lineTotal });
    }

    const empIdx = Math.floor(Math.random() * empIds.length);
    await db.collection("purchaseOrders").add({
      orderNumber: `PO-${(2001 + i).toString()}`,
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      items,
      total,
      status: ["pending", "completed", "cancelled"][Math.floor(Math.random() * 3)],
      createdBy: empIds[empIdx],
      createdByName: employeeData[empIdx].name,
      created_at: randomDate(new Date("2026-06-01"), new Date("2026-08-19")) + "T" + randomTime() + ":00Z",
      updated_at: now,
    });
  }
  console.log("  ✓ 8 purchase orders");

  // ── 13. Expenses ──────────────────────────────────────────────────────────
  console.log("\n💸 Creating expenses...");
  const expenseCategories = ["Travel", "Office Supplies", "Utilities", "Software", "Marketing", "Meals"];
  const expenseStatuses = ["pending", "approved", "rejected"];

  batch = db.batch();
  for (let i = 0; i < 25; i++) {
    const empIdx = Math.floor(Math.random() * empIds.length);
    const emp = employeeData[empIdx];
    const uid = userIds[emp.email];

    const ref = db.collection("expenses").doc();
    batch.set(ref, {
      category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
      amount: Math.floor(Math.random() * 50000) + 500,
      submittedBy: uid,
      submittedByName: emp.name,
      approvalStatus: expenseStatuses[Math.floor(Math.random() * expenseStatuses.length)],
      created_at: randomDate(new Date("2026-06-01"), new Date("2026-08-19")) + "T" + randomTime() + ":00Z",
      updated_at: now,
    });
  }
  await batch.commit();
  console.log("  ✓ 25 expenses");

  // ── 14. Payroll ───────────────────────────────────────────────────────────
  console.log("\n💵 Creating payroll records...");
  batch = db.batch();
  batchCount = 0;
  for (const emp of employeeData) {
    const uid = userIds[emp.email];
    for (let month = 1; month <= 7; month++) {
      const bonus = Math.floor(Math.random() * 20000);
      const deductions = Math.floor(Math.random() * 10000);
      const netSalary = emp.salary + bonus - deductions;

      const ref = db.collection("payroll").doc();
      batch.set(ref, {
        employeeId: uid,
        employeeName: emp.name,
        basicSalary: emp.salary,
        bonus,
        deductions,
        netSalary,
        month,
        year: 2026,
        created_at: now,
        updated_at: now,
      });
      batchCount++;
      if (batchCount === 500) { await batch.commit(); batch = db.batch(); batchCount = 0; }
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log("  ✓ Payroll records for all employees (Jan-Jul 2026)");

  // ── 15. Notifications ─────────────────────────────────────────────────────
  console.log("\n🔔 Creating notifications...");
  const notificationData = [
    { title: "Leave Approved", message: "Your leave request has been approved.", type: "leave" },
    { title: "New Task Assigned", message: "You have been assigned a new task.", type: "task" },
    { title: "Payroll Processed", message: "Your salary has been processed.", type: "payroll" },
    { title: "Expense Approved", message: "Your expense report has been approved.", type: "expense" },
    { title: "Welcome!", message: "Welcome to NexGen ERP System.", type: "general" },
  ];

  batch = db.batch();
  batchCount = 0;
  for (const uid of empIds) {
    for (const n of notificationData) {
      const ref = db.collection("notifications").doc();
      batch.set(ref, {
        userId: uid,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: Math.random() > 0.5,
        created_at: randomDate(new Date("2026-07-01"), new Date("2026-08-19")) + "T" + randomTime() + ":00Z",
      });
      batchCount++;
      if (batchCount === 500) { await batch.commit(); batch = db.batch(); batchCount = 0; }
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log("  ✓ Notifications created");

  // ── 16. Activity Logs ─────────────────────────────────────────────────────
  console.log("\n📝 Creating activity logs...");
  const actions = ["created", "updated", "deleted", "viewed", "exported"];
  const modules = ["employee", "project", "task", "customer", "order", "expense"];

  batch = db.batch();
  for (let i = 0; i < 50; i++) {
    const empIdx = Math.floor(Math.random() * empIds.length);
    const ref = db.collection("activityLogs").doc();
    batch.set(ref, {
      userId: empIds[empIdx],
      userName: employeeData[empIdx].name,
      action: actions[Math.floor(Math.random() * actions.length)],
      module: modules[Math.floor(Math.random() * modules.length)],
      details: `Record ${actions[Math.floor(Math.random() * actions.length)]} successfully.`,
      created_at: randomDate(new Date("2026-06-01"), new Date("2026-08-19")) + "T" + randomTime() + ":00Z",
    });
  }
  await batch.commit();
  console.log("  ✓ 50 activity logs");

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📋 Login credentials are in README.md and .env.local.example");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
