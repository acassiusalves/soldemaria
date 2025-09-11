import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import * as crypto from "node:crypto";

initializeApp();

export const inviteUser = onCall(
  {region: "southamerica-east1"},
  async (req) => {
    const data = req.data || {};
    const email = String(data.email || "");
    const role = String(data.role || "");

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
      } catch (_err) {
        user = await auth.createUser({
          email: email,
          password: crypto.randomUUID(),
          emailVerified: false,
        });
      }

      // Salva ou atualiza o usuário na coleção 'users' do Firestore
      await db.collection("users").doc(user.uid).set({
        email: user.email,
        role: role,
      }, { merge: true });
      
      const defaultUrl = "https://soldemaria.vercel.app/auth/finish";
      const appUrl = process.env.APP_URL || defaultUrl;

      const resetLink = await auth.generatePasswordResetLink(
        email,
        {url: appUrl}
      );
      
      // Lembrete: O Firebase gera o link, mas não envia o email.
      // A lógica para enviar o email com o 'resetLink' precisa ser implementada aqui.
      return {
        ok: true,
        uid: user.uid,
        role: role,
        resetLink: resetLink, // Retornado para debug ou uso futuro
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao convidar";
      throw new HttpsError("internal", msg);
    }
  }
);
