
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onUserCreated} from "firebase-functions/v2/auth";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as crypto from "node:crypto";

initializeApp();

/* ========== inviteUser (callable) ========== */
export const inviteUser = onCall(
  {region: "southamerica-east1"},
  async (req) => {
    const d = req.data || {};
    const email = String(d.email || "").trim().toLowerCase();
    const role = String(d.role || "").trim();
    if (!email || !role) {
      throw new HttpsError("invalid-argument",
        "email e role são obrigatórios");
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

      await db.collection("users").doc(user.uid).set({
        email,
        role,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});

      const appUrl = process.env.APP_URL ||
        "https://soldemaria.vercel.app/auth/finish";

      const resetLink = await auth.generatePasswordResetLink(
        email, {url: appUrl}
      );

      return {ok: true, uid: user.uid, role, resetLink};
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao convidar";
      throw new HttpsError("internal", msg);
    }
  }
);

/* ========== deleteUser (callable) ========== */
export const deleteUser = onCall(
  {region: "southamerica-east1"},
  async (req) => {
    const uid = req.data.uid;
    if (!uid) {
      throw new HttpsError("invalid-argument", "O UID do usuário é obrigatório.");
    }
    
    // TODO: Adicionar verificação se o chamador tem permissão (ex: admin)
    
    try {
      const auth = getAuth();
      const db = getFirestore();

      // Excluir do Authentication
      await auth.deleteUser(uid);

      // Excluir do Firestore
      await db.collection("users").doc(uid).delete();

      return { ok: true, message: "Usuário excluído com sucesso." };
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      const msg = error instanceof Error ? error.message : "Falha ao excluir usuário.";
      throw new HttpsError("internal", msg);
    }
  }
);

/* ========== Espelho: Auth -> Firestore (v1 trigger) ========== */
export const authUserMirror = onUserCreated(
  {region: "southamerica-east1"},
  async (event: any) => {
    const u = event.data;
    const email = (u.email || "").toLowerCase();
    const db = getFirestore();
    const ref = db.collection("users").doc(u.uid);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        tx.set(ref, {
          email,
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
      } else {
        tx.set(ref, {
          email,
          role: "vendedor",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
  });
