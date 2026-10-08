import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import verificationRoutes from "./routes/verification.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: "5mb" }))

// Mount verification routes under /api
app.use("/api", verificationRoutes)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "PACTRA Payment Observation & Gemini Verifier Backend",
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  })
})

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[PACTRA Backend] Running on http://localhost:${PORT}`)
    console.log(`[PACTRA Backend] Gemini API Key: ${process.env.GEMINI_API_KEY ? "CONFIGURED" : "MISSING (Set GEMINI_API_KEY in .env)"}`)
  })
}

export default app
