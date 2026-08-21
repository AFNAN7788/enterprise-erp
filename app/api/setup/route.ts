import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * POST /api/setup
 * Creates the first admin user. Call this ONCE to bootstrap the system.
 * Body: { email, password, fullName }
 */
export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "email, password, fullName are required" }, { status: 400 });
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
    }

    // Check if admin already exists
    const admins = await adminDb.collection("profiles").where("role", "==", "admin").limit(1).get();
    if (!admins.empty) {
      return NextResponse.json({ error: "Admin user already exists" }, { status: 409 });
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
    });

    // Create profile with admin role
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
