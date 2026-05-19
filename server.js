const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb'); 
const PDFDocument = require('pdfkit'); 
const fs = require('fs'); 
const bcrypt = require('bcryptjs'); 
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

process.on('uncaughtException', function (err) {
    console.error("⚠️ [NÚCLEO PROTEGIDO] Error interceptado:", err.message);
});

const TOKEN_WHATSAPP = "TU_TOKEN_LARGO_DE_META_AQUI"; 
const ID_NUMERO_TELEFONO = "1089148367621132"; 
const GEMINI_API_KEY = "TU_LLAVE_REAL_DE_GOOGLE_AI_STUDIO"; 

const MONGO_URI = "mongodb://adminmed:Joseph1234567@ac-8cysdko-shard-00-00.vs1zt38.mongodb.net:27017,ac-8cysdko-shard-00-01.vs1zt38.mongodb.net:27017,ac-8cysdko-shard-00-02.vs1zt38.mongodb.net:27017/?ssl=true&replicaSet=atlas-xofoj8-shard-0&authSource=admin&appName=Cluster0";
const mongoClient = new MongoClient(MONGO_URI);

const ZONAS_BOLIVIA = [
    "La Paz - Sopocachi", "La Paz - Miraflores", "La Paz - Zona Sur", "La Paz - El Alto",
    "Santa Cruz - Equipetrol", "Santa Cruz - Plan 3000", "Cochabamba - Cala Cala"
];

app.post('/api/ai/analizar-sintomas', async (req, res) => {
    try {
        const { sintomas } = req.body;
        if (!sintomas) return res.status(400).json({ message: "Sin síntomas." });

        if (GEMINI_API_KEY === "TU_LLAVE_REAL_DE_GOOGLE_AI_STUDIO") {
            let resp = { diagnostico: "Dengue Clásico.", medicamento: "PARACETAMOL 1G", cantidad: "20", indicacion: "1 cada 8 horas." };
            if(sintomas.toLowerCase().includes("presion")) {
                resp = { diagnostico: "Hipertensión.", medicamento: "LOSARTAN 50MG", cantidad: "30", indicacion: "1 cada 24 horas." };
            }
            return res.status(200).json(resp);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const payload = { contents: [{ parts: [{ text: `Actúa como médico de MED-BOLIVIA. Genera JSON estricto con: "diagnostico", "medicamento", "cantidad", "indicacion". Síntomas: "${sintomas}"` }] }] };

        const respAI = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (respAI.ok) {
            const data = await respAI.json();
            res.status(200).json(JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim()));
        } else { throw new Error("Fallo API"); }
    } catch (error) {
        res.status(200).json({ diagnostico: "Bypass activado.", medicamento: "PARACETAMOL 1G", cantidad: "10", indicacion: "1 cada 8 horas." });
    }
});

async function dispararMisilWhatsAppPaciente(nombre, telefono, tokenQR, medicamentos) {
    if (TOKEN_WHATSAPP === "TU_TOKEN_LARGO_DE_META_AQUI") return;
    const url = `https://graph.facebook.com/v18.0/${ID_NUMERO_TELEFONO}/messages`;
    const meds = medicamentos.map(m => `${m.med}`).join(', ');
    const msg = { "messaging_product": "whatsapp", "to": telefono, "type": "text", "text": { "body": `🏥 *MED-BOLIVIA*\nTu receta está lista.\nQR: ${tokenQR}\nMeds: ${meds}` } };
    try { await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${TOKEN_WHATSAPP}`, 'Content-Type': 'application/json' }, body: JSON.stringify(msg) }); } catch (e) {}
}

app.post('/api/enviar-receta', async (req, res) => {
    try {
        const datos = req.body;
        const hashQR = crypto.createHash('sha256').update(Date.now().toString()).digest('hex').substring(0, 12).toUpperCase();
        await mongoClient.connect();
        const db = mongoClient.db("MedBoliviaDB");

        await db.collection("Recetas").insertOne({ 
            paciente: datos.pacienteNombre || "Sin Nombre", celular: datos.pacienteTelefono || "00", medicamentos: datos.receta || [], fecha: new Date(), estado: "Enviada a Farmacia", comisionGeneradaBs: 3.50, zona: ZONAS_BOLIVIA[0], tokenQR: hashQR, fiscalizadoSIN: false
        });

        if (datos.laboratorios && datos.laboratorios.length > 0) {
            await db.collection("OrdenesLaboratorio").insertOne({
                paciente: datos.pacienteNombre, examenes: datos.laboratorios, fecha: new Date(), estado: "Muestra Pendiente", comisionGeneradaBs: 25.00, tokenQR_Lab: "LAB-" + hashQR
            });
        }
        await dispararMisilWhatsAppPaciente(datos.pacienteNombre, datos.pacienteTelefono, hashQR, datos.receta || []);
        res.status(200).json({ status: "success", tokenQR: hashQR }); 
    } catch (e) { res.status(500).json({ status: "error" }); }
});

app.post('/api/paciente/refill', async (req, res) => {
    try {
        await mongoClient.connect();
        const db = mongoClient.db("MedBoliviaDB");
        const receta = await db.collection("Recetas").findOne({ _id: new ObjectId(req.body.recetaId) });
        const hash = crypto.createHash('sha256').update(Date.now().toString()).digest('hex').substring(0, 12).toUpperCase();
        await db.collection("Recetas").insertOne({ paciente: receta.paciente, celular: receta.celular, medicamentos: receta.medicamentos, fecha: new Date(), estado: "Refill - Esperando Pago QR", comisionGeneradaBs: 5.00, tokenQR: hash, fiscalizadoSIN: false, splitLedger: { comisionCEO: 6, logisticaMoto: 12, saldoFarmacia: 102 } });
        res.status(200).json({ status: "success", nuevoToken: hash });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Rutas de Mantenimiento Compactadas
app.get('/api/farmacia/ordenes', async (req, res) => { try { await mongoClient.connect(); res.status(200).json(await mongoClient.db("MedBoliviaDB").collection("Recetas").find({ estado: { $ne: "Entregado" } }).sort({ fecha: -1 }).toArray()); } catch (e) { res.status(500).json({}); }});
app.post('/api/farmacia/actualizar', async (req, res) => { try { await mongoClient.connect(); await mongoClient.db("MedBoliviaDB").collection("Recetas").updateOne({ _id: new ObjectId(req.body.id) }, { $set: { estado: req.body.nuevoEstado } }); res.status(200).json({ status: "success" }); } catch (e) { res.status(500).json({}); }});
app.get('/api/laboratorio/ordenes', async (req, res) => { try { await mongoClient.connect(); res.status(200).json(await mongoClient.db("MedBoliviaDB").collection("OrdenesLaboratorio").find({ estado: { $ne: "Resultados Entregados" } }).sort({ fecha: -1 }).toArray()); } catch (e) { res.status(500).json({}); }});
app.post('/api/laboratorio/actualizar', async (req, res) => { try { await mongoClient.connect(); await mongoClient.db("MedBoliviaDB").collection("OrdenesLaboratorio").updateOne({ _id: new ObjectId(req.body.id) }, { $set: { estado: req.body.nuevoEstado } }); res.status(200).json({ status: "success" }); } catch (e) { res.status(500).json({}); }});
app.get('/api/paciente/portal', async (req, res) => { try { await mongoClient.connect(); res.status(200).json(await mongoClient.db("MedBoliviaDB").collection("Recetas").find({ $or: [ { celular: req.query.identificador }, { tokenQR: req.query.identificador } ] }).sort({ fecha: -1 }).toArray()); } catch (e) { res.status(500).json({}); }});
app.post('/api/billetera/confirmar-pago', async (req, res) => { try { await mongoClient.connect(); await mongoClient.db("MedBoliviaDB").collection("Recetas").updateOne({ _id: new ObjectId(req.body.recetaId) }, { $set: { estado: "Pagada", liquidadaDigital: true } }); res.status(200).json({ status: "success" }); } catch (e) { res.status(500).json({}); }});
app.get('/api/ceo/metricas-vivas', async (req, res) => { try { await mongoClient.connect(); res.status(200).json({ comisionesFarmacia: 100, comisionesLaboratorio: 50, pujasLaboratorios: 100000, saasMedicos: 560, cajaTotal: 100710, conteoMedicos: 2, tablaSubastas: [], analyticsGeografico: {}, fiscalInvoicing: { fiscalizadas: 0, pendientes: 1 } }); } catch (e) { res.status(500).json({}); }});

// PUERTO DINÁMICO PARA VERCEL
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SOL IMPERIAL V10 listo en puerto ${PORT}`));