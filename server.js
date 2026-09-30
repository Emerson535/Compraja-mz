const express=require("express"),{Pool}=require("pg"),bcrypt=require("bcryptjs"),jwt=require("jsonwebtoken"),multer=require("multer"),path=require("path"),fs=require("fs");
require("dotenv").config();
const app=express(), port=process.env.PORT||3000;
const pool=new Pool({connectionString:process.env.DATABASE_URL});
app.use(express.json()); app.use(express.urlencoded({extended:true}));
const uploadDir=path.join(__dirname,"public","uploads"); fs.mkdirSync(uploadDir,{recursive:true});
const storage=multer.diskStorage({destination:uploadDir,filename:(r,f,cb)=>cb(null,Date.now()+"-"+Math.random().toString(36).slice(2)+path.extname(f.originalname))});
const upload=multer({storage,limits:{fileSize:5*1024*1024}});
const publicDir=path.join(__dirname,"public");
const publicIndex=path.join(publicDir,"index.html");
const rootIndex=path.join(__dirname,"index.html");
app.use(express.static(publicDir));
app.get("/",(req,res)=>{
  const indexFile=fs.existsSync(publicIndex)?publicIndex:rootIndex;
  if(!fs.existsSync(indexFile)) return res.status(500).send("index.html não encontrado");
  res.sendFile(indexFile);
});
const cats=["Livros","Roupas","Eletrónicos","Casa","Móveis","Automóveis","Telemóveis","Desporto","Outros"];
function token(u){return jwt.sign({id:u.id,role:u.role},process.env.JWT_SECRET||"dev-secret",{expiresIn:"7d"})}
function auth(req,res,next){try{const h=req.headers.authorization||"";req.user=jwt.verify(h.replace("Bearer ",""),process.env.JWT_SECRET||"dev-secret");next()}catch(e){res.status(401).json({error:"Não autenticado"})}}
function admin(req,res,next){if(req.user?.role!=="admin")return res.status(403).json({error:"Acesso reservado ao administrador"});next()}

app.get("/api/categories",(q,r)=>r.json(cats));
app.post("/api/register",async(req,res)=>{try{let{name,email,password,phone,location}=req.body;if(!name||!email||!password)return res.status(400).json({error:"Preencha nome, email e palavra-passe"});let hash=await bcrypt.hash(password,12);let x=await pool.query("INSERT INTO users(name,email,password_hash,phone,location) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role",[name,email.toLowerCase(),hash,phone||"",location||""]);res.json({token:token(x.rows[0]),user:x.rows[0]})}catch(e){res.status(400).json({error:"Email já registado ou dados inválidos"})}});
app.post("/api/login",async(req,res)=>{let x=await pool.query("SELECT * FROM users WHERE email=$1",[String(req.body.email||"").toLowerCase()]);if(!x.rows[0]||!(await bcrypt.compare(req.body.password||"",x.rows[0].password_hash)))return res.status(401).json({error:"Email ou palavra-passe incorretos"});let u=x.rows[0];res.json({token:token(u),user:{id:u.id,name:u.name,email:u.email,role:u.role}})});
app.get("/api/listings",async(req,res)=>{let q=String(req.query.q||""),cat=String(req.query.category||"");let x=await pool.query(`SELECT l.*,u.name seller,u.phone seller_phone FROM listings l JOIN users u ON u.id=l.user_id WHERE l.status='active' AND ($1='' OR l.title ILIKE '%'||$1||'%' OR l.description ILIKE '%'||$1||'%') AND ($2='' OR l.category=$2) ORDER BY l.created_at DESC`,[q,cat]);res.json(x.rows)});
app.get("/api/listings/:id",async(req,res)=>{let x=await pool.query("SELECT l.*,u.name seller,u.phone seller_phone,u.location seller_location FROM listings l JOIN users u ON u.id=l.user_id WHERE l.id=$1",[req.params.id]);if(!x.rows[0])return res.status(404).json({error:"Anúncio não encontrado"});res.json(x.rows[0])});
app.post("/api/listings",auth,upload.single("image"),async(req,res)=>{let{title,description,price,category,location}=req.body;if(!title||!description||!price||!category||!location)return res.status(400).json({error:"Preencha todos os campos"});let img=req.file?"/uploads/"+req.file.filename:null;let x=await pool.query("INSERT INTO listings(user_id,title,description,price,category,location,image_url) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",[req.user.id,title,description,price,category,location,img]);res.json(x.rows[0])});
app.delete("/api/listings/:id",auth,async(req,res)=>{let x=await pool.query("DELETE FROM listings WHERE id=$1 AND (user_id=$2 OR EXISTS(SELECT 1 FROM users WHERE id=$2 AND role='admin')) RETURNING id",[req.params.id,req.user.id]);if(!x.rows[0])return res.status(404).json({error:"Não encontrado"});res.json({ok:true})});
app.post("/api/favorites/:id",auth,async(req,res)=>{await pool.query("INSERT INTO favorites(user_id,listing_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[req.user.id,req.params.id]);res.json({ok:true})});
app.delete("/api/favorites/:id",auth,async(req,res)=>{await pool.query("DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2",[req.user.id,req.params.id]);res.json({ok:true})});
app.get("/api/favorites",auth,async(req,res)=>{let x=await pool.query("SELECT l.* FROM favorites f JOIN listings l ON l.id=f.listing_id WHERE f.user_id=$1 ORDER BY l.created_at DESC",[req.user.id]);res.json(x.rows)});
app.post("/api/messages",auth,async(req,res)=>{let{receiver_id,listing_id,body}=req.body;if(!receiver_id||!body)return res.status(400).json({error:"Mensagem inválida"});let x=await pool.query("INSERT INTO messages(sender_id,receiver_id,listing_id,body) VALUES($1,$2,$3,$4) RETURNING *",[req.user.id,receiver_id,listing_id||null,body]);res.json(x.rows[0])});
app.get("/api/messages/:userId",auth,async(req,res)=>{let x=await pool.query("SELECT m.*,u.name sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY m.created_at",[req.user.id,req.params.userId]);res.json(x.rows)});
app.get("/api/admin/listings",auth,admin,async(req,res)=>{let x=await pool.query("SELECT l.*,u.name seller,u.email FROM listings l JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC");res.json(x.rows)});
app.patch("/api/admin/listings/:id",auth,admin,async(req,res)=>{let status=req.body.status==="removed"?"removed":"active";await pool.query("UPDATE listings SET status=$1 WHERE id=$2",[status,req.params.id]);res.json({ok:true})});
app.get("/api/health",(q,r)=>r.json({ok:true}));
app.listen(port,()=>console.log("CompraJá MZ em http://localhost:"+port));
