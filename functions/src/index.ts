
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

    // Verificar se está tentando criar um admin
    if (role === "admin") {
      // Verificar se o chamador é admin
      if (!req.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
      }

      const db = getFirestore();
      const callerDoc = await db.collection("users").doc(req.auth.uid).get();
      const callerRole = callerDoc.data()?.role;

      if (callerRole !== "admin") {
        throw new HttpsError("permission-denied",
          "Apenas administradores podem criar novos usuários Admin");
      }
    }

    try {
      const auth = getAuth();
      const db = getFirestore();

      const defaultPassword = "123456";
      let user;
      let isNewUser = false;

      try {
        user = await auth.getUserByEmail(email);
      } catch {
        user = await auth.createUser({
          email,
          password: defaultPassword,
          emailVerified: false,
        });
        isNewUser = true;
      }

      await db.collection("users").doc(user.uid).set({
        email,
        role,
        requirePasswordChange: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});

      return {
        ok: true,
        uid: user.uid,
        role,
        isNewUser,
        defaultPassword: isNewUser ? defaultPassword : undefined,
        message: isNewUser ?
          `Usuário criado. Senha padrão: ${defaultPassword}` :
          "Usuário já existe, role atualizada",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao convidar";
      throw new HttpsError("internal", msg);
    }
  }
);

/* ========== updateUserRole (callable) ========== */
export const updateUserRole = onCall(
  {region: "southamerica-east1"},
  async (req) => {
    const {userId, newRole} = req.data;

    if (!userId || !newRole) {
      throw new HttpsError("invalid-argument", "userId e newRole são obrigatórios");
    }

    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const db = getFirestore();

    // Buscar informações do chamador
    const callerDoc = await db.collection("users").doc(req.auth.uid).get();
    const callerRole = callerDoc.data()?.role;

    // Buscar informações do usuário alvo
    const targetDoc = await db.collection("users").doc(userId).get();
    if (!targetDoc.exists) {
      throw new HttpsError("not-found", "Usuário não encontrado");
    }
    const targetRole = targetDoc.data()?.role;

    // Apenas admins podem promover para admin ou alterar role de admin
    if (newRole === "admin" || targetRole === "admin") {
      if (callerRole !== "admin") {
        throw new HttpsError("permission-denied",
          "Apenas administradores podem alterar funções de/para Admin");
      }
    }

    // Atualizar a role
    await db.collection("users").doc(userId).update({
      role: newRole,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {ok: true, message: "Role atualizada com sucesso"};
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

    // Verificar se o chamador é admin
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const db = getFirestore();
    const callerDoc = await db.collection("users").doc(req.auth.uid).get();
    const callerRole = callerDoc.data()?.role;

    if (callerRole !== "admin") {
      throw new HttpsError("permission-denied",
        "Apenas administradores podem excluir usuários");
    }

    // Verificar se o usuário alvo é admin
    const targetDoc = await db.collection("users").doc(uid).get();
    if (targetDoc.exists && targetDoc.data()?.role === "admin") {
      throw new HttpsError("permission-denied",
        "Não é permitido excluir usuários administradores");
    }

    try {
      const auth = getAuth();

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

/* ========== syncAuthUsers (callable) ========== */
export const syncAuthUsers = onCall(
  {region: "southamerica-east1"},
  async (req) => {
    // Verificar se o chamador é admin
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const db = getFirestore();
    const callerDoc = await db.collection("users").doc(req.auth.uid).get();
    const callerRole = callerDoc.data()?.role;

    if (callerRole !== "admin") {
      throw new HttpsError("permission-denied",
        "Apenas administradores podem sincronizar usuários");
    }

    try {
      const auth = getAuth();
      let syncedCount = 0;

      // Listar todos os usuários do Auth
      const listUsersResult = await auth.listUsers();

      for (const userRecord of listUsersResult.users) {
        const userRef = db.collection("users").doc(userRecord.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          // Criar documento no Firestore se não existir
          await userRef.set({
            email: userRecord.email?.toLowerCase() || "",
            role: "vendedor",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          syncedCount++;
        }
      }

      return {
        ok: true,
        message: `${syncedCount} usuário(s) sincronizado(s) do Auth para o Firestore.`,
      };
    } catch (error: any) {
      console.error("Erro ao sincronizar usuários:", error);
      const msg = error instanceof Error ? error.message : "Falha ao sincronizar";
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
