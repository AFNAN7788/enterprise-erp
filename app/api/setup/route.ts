import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "email, password, fullName are required" }, { status: 400 });
    }

    if (!adminAuth || !adminDb) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const missing = [];
      if (!projectId) missing.push("FIREBASE_PROJECT_ID");
      if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
      if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
      return NextResponse.json({
        error: "Admin SDK not configured",
        missing,
      }, { status: 500 });
    }

    const admins = await adminDb.collection("profiles").where("role", "==", "admin").limit(1).get();
    if (!admins.empty) {
      return NextResponse.json({ error: "Admin user already exists" }, { status: 409 });
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
    });

    await adminDb.collection("profiles").doc(userRecord.uid).set({
      id: userRecord.uid,
      email,
      full_name: fullName,
      role: "admin",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: "Admin user created successfully",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Setup failed";
    console.error("Setup error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
