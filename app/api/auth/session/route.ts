import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const SESSION_COOKIE = "__session";
// 5 days in seconds
const MAX_AGE = 60 * 60 * 24 * 5;

/**
 * POST /api/auth/session
 * Sets the __session cookie after successful Firebase sign-in.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    // Try to sync custom claims — skip if Admin SDK has no credentials
    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const profileSnap = await adminDb?.collection("profiles").doc(decoded.uid).get();
        const role = profileSnap?.data()?.role || "employee";
        await adminAuth.setCustomUserClaims(decoded.uid, { role });
      } catch {
        // Token verification failed — cookie still gets set
      }
    }

    const response = NextResponse.json({ status: "ok" });

    response.cookies.set(SESSION_COOKIE, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * DELETE /api/auth/session
 * Clears the __session cookie on sign-out.
 */
export async function DELETE() {
  const response = NextResponse.json({ status: "ok" });

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
