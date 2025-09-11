import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as crypto from "node:crypto";

initializeApp();

export const inviteUser = onCall(
  {region: "southamerica-east1"},
  async (req) => {
    const d = req.data || {};
    const email = String(d.email || "").trim().toLowerCase();
    const role = String(d.role || "").trim();

    if (!email || !role) {
      throw new HttpsError(
        "invalid-argument",
        "email e role são obrigatórios"
      );
    }

    try {
      const auth = getAuth();
      const db = getFirestore();

      let user;
      try {
        user = await auth.getUserByEmail(email);
      } catch {
        user = await auth.createUser({
          email,
          password: crypto.randomUUID(),
          emailVerified: false,
        });
      }

      await db.collection("users").doc(user.uid).set(
        {
          email,
          role,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      const appUrl =
        process.env.APP_URL || "https://soldemaria.vercel.app/auth/finish";

      const resetLink = await auth.generatePasswordResetLink(
        email,
        {url: appUrl}
      );

      return {ok: true, uid: user.uid, role, resetLink};
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao convidar";
      throw new HttpsError("internal", msg);
    }
  }
);
