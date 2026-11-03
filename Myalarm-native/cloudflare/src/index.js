const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Max-Age": "86400"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
const enc = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0));
async function derive(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name:"PBKDF2", salt, iterations:210000, hash:"SHA-256" }, key, 256));
}
async function sign(payload, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  const head = b64(enc.encode(JSON.stringify({alg:"HS256",typ:"JWT"}))), body = b64(enc.encode(JSON.stringify(payload)));
  const data = `${head}.${body}`; return `${data}.${b64(await crypto.subtle.sign("HMAC",key,enc.encode(data)))}`;
}
async function verify(token, secret) {
  const parts = (token || "").split("."); if(parts.length!==3) return null;
  const key = await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  const ok = await crypto.subtle.verify("HMAC",key,unb64(parts[2]),enc.encode(`${parts[0]}.${parts[1]}`));
  if(!ok) return null; const p=JSON.parse(new TextDecoder().decode(unb64(parts[1]))); return p.exp>Date.now()/1000?p:null;
}
async function userFromRequest(req, env) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i,"");
  if(!token || !env.JWT_SECRET) return null;
  return verify(token, env.JWT_SECRET);
}
export default {
  async fetch(req, env) {
    if(req.method === "OPTIONS") return new Response(null,{headers:cors});
    const url = new URL(req.url);
    try {
      if(url.pathname === "/health") return json({ok:true,service:"myalarm-api",version:"1.0.0"});
      if(url.pathname === "/api/register" && req.method === "POST") {
        const {email,password}=await req.json();
        if(!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length<10) return json({error:"Email valid dan password minimal 10 karakter diperlukan."},400);
        const normalized=email.trim().toLowerCase(); const id=crypto.randomUUID(); const salt=crypto.getRandomValues(new Uint8Array(16));
        const hash=await derive(password,salt);
        try { await env.DB.prepare("INSERT INTO users(id,email,password_salt,password_hash) VALUES(?,?,?,?)").bind(id,normalized,b64(salt),hash).run(); }
        catch { return json({error:"Email sudah terdaftar."},409); }
        return json({token:await sign({sub:id,email:normalized,exp:Math.floor(Date.now()/1000)+60*60*24*30},env.JWT_SECRET)});
      }
      if(url.pathname === "/api/login" && req.method === "POST") {
        const {email,password}=await req.json(); const row=await env.DB.prepare("SELECT * FROM users WHERE email=?").bind((email||"").trim().toLowerCase()).first();
        if(!row || await derive(password||"",unb64(row.password_salt))!==row.password_hash) return json({error:"Email atau password salah."},401);
        return json({token:await sign({sub:row.id,email:row.email,exp:Math.floor(Date.now()/1000)+60*60*24*30},env.JWT_SECRET)});
      }
      if(url.pathname.startsWith("/api/")) {
        const user=await userFromRequest(req,env); if(!user?.sub) return json({error:"Sesi tidak valid. Silakan login kembali."},401);
        if(url.pathname === "/api/alarms" && req.method === "GET") {
          const {results=[]}=await env.DB.prepare("SELECT id,date,shift,start_time AS start,end_time AS end,enabled FROM alarms WHERE user_id=? ORDER BY date").bind(user.sub).all();
          return json({alarms:results.map(a=>({...a,enabled:!!a.enabled}))});
        }
        if(url.pathname === "/api/alarms" && req.method === "PUT") {
          const body=await req.json(); if(!Array.isArray(body.alarms) || body.alarms.length>500) return json({error:"Format jadwal tidak valid (maksimal 500)."},400);
          const seen=new Set();
          for(const a of body.alarms) {
            if(!a.id || !/^\d{4}-\d{2}-\d{2}$/.test(a.date) || !["PAGI","SIANG","MALAM","LIBUR"].includes(a.shift)) return json({error:"Ada jadwal dengan data tidak valid."},400);
            if(seen.has(a.date)) return json({error:"Satu tanggal hanya boleh memiliki satu jadwal."},400); seen.add(a.date);
            if(a.shift!=="LIBUR" && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.end)||a.start>=a.end)) return json({error:"Rentang waktu alarm tidak valid."},400);
          }
          await env.DB.prepare("DELETE FROM alarms WHERE user_id=?").bind(user.sub).run();
          const stmts=body.alarms.map(a=>env.DB.prepare("INSERT INTO alarms(id,user_id,date,shift,start_time,end_time,enabled,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").bind(a.id,user.sub,a.date,a.shift,a.start||"",a.end||"",a.enabled===false?0:1));
          if(stmts.length) await env.DB.batch(stmts);
          return json({ok:true,count:stmts.length});
        }
      }
      return json({error:"Endpoint tidak ditemukan."},404);
    } catch(e) { return json({error:"Terjadi kesalahan server.",detail:env.ENVIRONMENT==="development"?String(e):undefined},500); }
  }
};
