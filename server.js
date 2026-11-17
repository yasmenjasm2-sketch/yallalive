import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";

// بيانات مشروع LiveKit من الصورة المرسلة — للاختبار المحلي فقط
const LIVEKIT_URL = "wss://wasl-live-464jp07n.livekit.cloud";
const LIVEKIT_API_KEY = "API7g98sAUMYqy5";
const LIVEKIT_API_SECRET = "FKfetteoyYnsApoYsoq2JOgeW9qNXkIY2NZHug5cVQZB";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "8kb" }));
app.use(cors({
  origin: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

const tokenLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "wasl-live" });
});

app.post("/api/token", tokenLimiter, async (req, res) => {
  try {
    const room = String(req.body?.room || "").trim();
    const name = String(req.body?.name || "ضيف WASL")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 28) || "ضيف WASL";

    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(room)) {
      return res.status(400).json({ error: "اسم الغرفة غير صالح" });
    }

    const identity = "guest_" + randomUUID();
    const accessToken = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      { identity, name, ttl: "10m" }
    );

    accessToken.addGrant({
      roomJoin: true,
      room,
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
      canPublishSources: ["microphone"]
    });

    res.set("Cache-Control", "no-store");
    res.json({
      token: await accessToken.toJwt(),
      identity,
      url: LIVEKIT_URL
    });
  } catch (error) {
    console.error("Token error:", error);
    res.status(500).json({ error: "تعذر إنشاء رمز دخول الغرفة" });
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WASL LIVE server running on port ${PORT}`);
});
