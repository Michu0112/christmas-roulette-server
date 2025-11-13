import admin from "firebase-admin";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
  let serviceAccount = null;
  if (process.env.FIREBASE_CONFIG) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (err) {
      console.error("Invalid FIREBASE_CONFIG JSON", err);
    }
  }

  // 2. If not found, try local file (development)
  if (!serviceAccount) {
    try {
      serviceAccount = JSON.parse(
        readFileSync("./serviceAccountKey.json", "utf8")
      );
    } catch (err) {
      console.warn("Could not load serviceAccountKey.json locally.");
    }
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
