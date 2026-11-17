import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app=express();
const PORT=Number(process.env.PORT||3000);
const {LIVEKIT_URL,LIVEKIT_API_KEY,LIVEKIT_API_SECRET,ALLOWED_ORIGINS=""}=process.env;
if(!LIVEKIT_URL||!LIVEKIT_API_KEY||!LIVEKIT_API_SECRET){
 console.error("Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET");process.exit(1);
}
const origins=ALLOWED_ORIGINS.split(",").map(x=>x.trim()).filter(Boolean);
app.set("trust proxy",1);app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:"8kb"}));
app.use(cors({origin(origin,cb){if(!origin||origins.includes(origin))return cb(null,true);return cb(new Error("Origin not allowed"));},methods:["GET","POST"],allowedHeaders:["Content-Type"]}));
const limiter=rateLimit({windowMs:10*60*1000,limit:30,standardHeaders:"draft-8",legacyHeaders:false});
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname,"public")));
app.get("/health",(_req,res)=>res.json({ok:true,service:"wasl-live"}));
app.post("/api/token",limiter,async(req,res)=>{
 try{
  const room=String(req.body?.room||"").trim();
  const name=String(req.body?.name||"ضيف WASL").replace(/[<>]/g,"").trim().slice(0,28)||"ضيف WASL";
  if(!/^[a-zA-Z0-9_-]{1,40}$/.test(room))return res.status(400).json({error:"اسم الغرفة غير صالح"});
  const identity="guest_"+randomUUID();
  const at=new AccessToken(LIVEKIT_API_KEY,LIVEKIT_API_SECRET,{identity,name,ttl:"10m"});
  at.addGrant({roomJoin:true,room,canSubscribe:true,canPublish:true,canPublishData:true,canPublishSources:["microphone"]});
  res.set("Cache-Control","no-store");
  res.json({token:await at.toJwt(),identity,url:LIVEKIT_URL});
 }catch(e){console.error("Token error:",e);res.status(500).json({error:"تعذر إنشاء رمز الدخول"});}
});
app.use((err,_req,res,_next)=>{if(err.message==="Origin not allowed")return res.status(403).json({error:"Origin not allowed"});console.error(err);res.status(500).json({error:"Server error"});});
app.listen(PORT,()=>console.log(`WASL LIVE listening on ${PORT}`));
