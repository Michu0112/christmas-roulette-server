// firebase.js
import admin from "firebase-admin"
import { readFileSync } from "fs"

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    readFileSync("./serviceAccountKey.json", "utf8")
  )

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

export const db = admin.firestore()
