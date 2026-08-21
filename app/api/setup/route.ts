import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "email, password, fullName are required" }, { status: 400 });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      const missing = [];
      if (!projectId) missing.push("FIREBASE_PROJECT_ID");
      if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
      if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
      return NextResponse.json({
        error: "Missing environment variables",
        missing,
      }, { status: 500 });
    }

    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const { getFirestore } = await import("firebase-admin/firestore");

    let app;
    if (getApps().length === 0) {
      const formattedKey = privateKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "").trim();
      app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey: formattedKey }),
      });
    } else {
      app = getApps()[0];
    }

    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    const admins = await adminDb.collection("profiles").where("role", "==", "admin").limit(1).get();
    if (!admins.empty) {
      return NextResponse.json({ error: "Admin user already exists" }, { status: 409 });
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName: fullName });

    await adminDb.collection("profiles").doc(userRecord.uid).set({
      id: userRecord.uid,
      email,
      full_name: fullName,
      role: "admin",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (err: unknown) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Setup failed" }, { status: 500 });
  }
}
