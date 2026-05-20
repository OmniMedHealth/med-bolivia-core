require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

// Extracción de Energía Cuántica (Variables de Entorno)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'MED_BOLIVIA_TOKEN';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 🛡️ EL ESCUDO DE VERIFICACIÓN (Para que Meta confíe en nosotros)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ CONEXIÓN METAVERSO ESTABLECIDA');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// 🧠 EL MOTOR CUÁNTICO (Recepcion de mensajes y Triage Psicológico)
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
        
        const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from;
        const msgBody = body.entry[0].changes[0].value.messages[0].text.body;

        console.log(`⚡ Señal detectada del número: ${from}. Mensaje: ${msgBody}`);

        // 🧬 ARQUITECTURA DE PENSAMIENTO (Prompt Nivel Dios)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const promptMaestro = `
          Eres la Inteligencia Artificial "MED-BOLIVIA CORE", el asistente médico de élite de Bolivia.
          Tu personalidad combina la empatía de un gran médico con el pragmatismo táctico. 
          
          Reglas de Evolución:
          1. TRIAGE RÁPIDO: Detecta urgencias. Si es grave, sugiere hospital de inmediato.
          2. PERSUASIÓN SUTIL: Si es consulta regular, responde con autoridad científica y menciona sutilmente que los mejores especialistas están en nuestra red, invitando a agendar cita.
          3. EFICIENCIA: Responde en menos de 50 palabras. Ve al grano, sin rodeos.
          4. SEGURIDAD: Nunca des un diagnóstico definitivo, sugiere posibles causas y orienta.
          
          Mensaje del usuario: "${msgBody}"
          Genera tu respuesta táctica ahora:
        `;

        const result = await model.generateContent(promptMaestro);
        const respuestaIA = result.response.text();

        // 🚀 EL DISPARO DE RESPUESTA A WHATSAPP
        await axios({
          method: 'POST',
          url: `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
          data: {
            messaging_product: 'whatsapp',
            to: from,
            text: { body: respuestaIA }
          }
        });
        console.log('✅ Jaque Mate. Respuesta enviada con éxito.');
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('❌ Falla en la Matriz:', error.message);
    res.sendStatus(500);
  }
});

// Inicialización del Núcleo
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 SISTEMA OMNI-CORE RESPIRANDO EN EL PUERTO ${PORT}`));
module.exports = app;