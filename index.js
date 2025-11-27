import express from "express"
import { db } from "./firebase.js"

const app = express()

app.use(express.json())

app.get("/test-assignments", async (req, res) => {
  const runs = parseInt(req.query.runs) || 10
  const MAX_ATTEMPTS = 50

  try {
    const snapshot = await db.collection("users").get()
    const usersFromDB = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const results = []

    for (let i = 0; i < runs; i++) {
      let attempt = 0
      let success = false
      let assignments = {}

      while (attempt < MAX_ATTEMPTS && !success) {
        const users = usersFromDB.map((u) => ({ ...u }))
        assignments = {}
        success = true

        for (const user of users) {
          const validRecipients = users.filter(
            (possibleRecipient) =>
              possibleRecipient.id !== user.id &&
              !user.notRecipients.includes(possibleRecipient.id) &&
              !(possibleRecipient.recipient === user.id)
          )

          if (validRecipients.length === 0) {
            success = false // deadlock, break inner loop
            break
          }

          const recipient =
            validRecipients[Math.floor(Math.random() * validRecipients.length)]
          user.recipient = recipient.id
          assignments[user.id] = recipient.id
        }

        attempt++
      }

      if (success) results.push(assignments)
      else
        results.push({
          error: "Could not generate valid assignment for this run",
        })
    }

    res.json({ runs: results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})
app.post("/match", async (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" })
  }

  try {
    const userRef = db.collection("users").doc(userId)

    const result = await db.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef)
      
      if (!userDoc.exists) throw new Error("User not found")

      const userData = userDoc.data()

      if (userData.recipient) {
        return userData.recipient
      }

      // Fetch all users
      const snapshot = await tx.get(db.collection("users"))
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Collect users already drawn
      const takenRecipients = allUsers
        .map((u) => u.recipient)
        .filter((r) => !!r)

      // Filter valid recipients
      const validRecipients = allUsers
        .filter((u) => u.id !== userId)
        .filter((u) => !userData.notRecipients.includes(u.id))
        .filter((u) => u.recipient !== userId)
        .filter((u) => !takenRecipients.includes(u.id)) // ❗ NEW RULE

      if (validRecipients.length === 0) {
        throw new Error("No valid recipients available for this user")
      }

      const recipient =
        validRecipients[Math.floor(Math.random() * validRecipients.length)]

      tx.update(userRef, { recipient: recipient.id })

      return recipient
    })

    res.json({ success: true, recipient: result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Success: working!' });
});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`))
