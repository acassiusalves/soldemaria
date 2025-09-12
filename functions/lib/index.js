"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteUser = void 0;
// functions/src/index.ts
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const crypto = __importStar(require("node:crypto"));
(0, app_1.initializeApp)();
const auth = (0, auth_1.getAuth)();
const db = (0, firestore_1.getFirestore)();
exports.inviteUser = (0, https_1.onCall)({ region: "southamerica-east1", timeoutSeconds: 60, maxInstances: 20 }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Faça login.");
    const callerUid = req.auth.uid;
    // Aceita claim ou role no Firestore
    const callerSnap = await db.doc(`users/${callerUid}`).get();
    const callerRole = req.auth.token?.role ?? callerSnap.data()?.role;
    if (callerRole !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Apenas admin pode convidar.");
    }
    const { email, role } = req.data;
    if (!email || !role) {
        throw new https_1.HttpsError("invalid-argument", "email e role são obrigatórios.");
    }
    const user = await auth.createUser({
        email,
        emailVerified: false,
        password: crypto.randomUUID(),
        displayName: email.split("@")[0],
    });
    await auth.setCustomUserClaims(user.uid, { role });
    await db
        .doc(`users/${user.uid}`)
        .set({ email, role, createdAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    const appUrl = process.env.APP_URL || "https://soldemaria.vercel.app/auth/finish";
    const resetLink = await auth.generatePasswordResetLink(email, { url: appUrl });
    return { result: `Usuário ${email} convidado como ${role}.`, resetLink };
});
