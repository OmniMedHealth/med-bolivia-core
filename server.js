// ==========================================================================
// MED-BOLIVIA CORE // PASO 7: INTELIGENCIA DE ENJAMBRE Y CONTABILIDAD DE TASAS
// ==========================================================================

const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require('@google/genai');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

// Variables de entorno inyectadas en la nube de Vercel
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const VERIFY_TOKEN = 'MED_BOLIVIA_TOKEN'; 

// Inicialización del cerebro de IA
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Conexión electrónica a la base de datos (MongoDB Atlas)
let db;
MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db('med_bolivia_core');
        console.log("=== NÚCLEO DE MEMORIA ATLAS: ONLINE ===");
    })
    .catch(error => console.error("FALLO CRÍTICO EN ENLACE DE BASE DE DATOS:", error));

// El puente de validación inicial con Meta
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// MOTOR DE INTELIGENCIA DE ENJAMBRE Y CONTABILIDAD OMNIPRESENTE
async function ejecutarMatrizSupremaEnjambre(pacienteId, zonaGeografica, sintomasDetectados, costoReceta) {
    const tiempoLimite = new Date(Date.now() - 24 * 60 * 60 * 1000); // Ventana de 24 horas

    try {
        // A. Contar cuántos casos similares hay en la misma zona en las últimas 24 horas
        const volumenBrote = await db.collection('historiales_clinicos').countDocuments({
            "logs.fecha": { $gte: tiempoLimite },
            "logs.input": { $regex: sintomasDetectados, $options: 'i' },
            zona: zonaGeografica
        });

        // Si hay más de 100 casos, se dispara una alerta de brote biológico
        if (volumenBrote >= 100) {
            await db.collection('alertas_gubernamentales').insertOne({
                broteId: "BROTE-" + crypto.randomBytes(3).toString('hex').toUpperCase(),
                patogenoEstimado: sintomasDetectados,
                zonaAfectada: zonaGeografica,
                casosActivos: volumenBrote,
                fechaAlerta: new Date()
            });
            console.log(`⚠️ BROTE DETECTADO EN ${zonaGeografica}: ${volumenBrote} CASOS.`);
        }

        // B. REGISTRO CONTABLE AUTOMÁTICO (Tu billetera digital)
        const transaccionId = "TXN-" + Math.floor(10000000 + Math.random() * 90000000);
        await db.collection('banco_central_med_latam').insertOne({
            transaccionId,
            pacienteId,
            fecha: new Date(),
            gananciasBOB: {
                comisionFarmacia: costoReceta * 0.12, // Tu 12% por la venta del remedio
                canonLaboratorio: 3.50,               // Cobro al laboratorio por recomendar su marca
                margenDelivery: 2.00                  // Tu ganancia limpia por el viaje de la moto
            }
        });
        console.log(`[BUNKER FINANCIERO]: Transacción ${transaccionId} guardada con éxito.`);

    } catch (error) {
        console.error("ERROR EN EL ENJAMBRE CONTABLE:", error);
    }
}

// MOTOR LOGÍSTICO (Cercanía de farmacias y rutas)
async function procesarLogisticaDios(clientNumber, pacienteUbicacion, diagnosticoIA, medicamentosRequeridos) {
    try {
        const farmaciaOptima = await db.collection('farmacias').findOne({
            ubicacion: {
                $near: {
                    $geometry: { type: "Point", coordinates: [pacienteUbicacion.longitud, pacienteUbicacion.latitud] },
                    $maxDistance: 10000
                }
            },
            stock: { $all: medicamentosRequeridos }
        });

        if (!farmaciaOptima) return;

        const googleMapsUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${farmaciaOptima.ubicacion.coordinates[1]},${farmaciaOptima.ubicacion.coordinates[0]}&destinations=${pacienteUbicacion.latitud},${pacienteUbicacion.longitud}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const mapsResponse = await axios.get(googleMapsUrl);
        const datosRuta = mapsResponse.data.rows[0].elements[0];
        
        const tiempoEstimado = datosRuta.duration?.text || "15 mins";
        const distanciaTotal = datosRuta.distance?.text || "3.5 km";
        const ordenId = "MED-" + Math.floor(100000 + Math.random() * 900000);

        await db.collection('ordenes_delivery').insertOne({
            ordenId, telefonoPaciente: clientNumber, farmaciaOrigen: farmaciaOptima.nombre,
            medicamentos: medicamentosRequeridos, estado: "Despachado", tiempoEntrega: tiempoEstimado, created_at: new Date()
        });

        const textoParaPaciente = `*🏛️ MED-BOLIVIA ORÁCULO INTELIGENTE*\n\n🔬 *Diagnóstico preliminar:* ${diagnosticoIA}\n💊 *Medicamentos:* ${medicamentosRequeridos.join(', ')}\n📍 *Logística:* Asignado a sucursal *${farmaciaOptima.nombre}*.\n🛵 Moto en ruta. Distancia: *${distanciaTotal}*. Llegada estimada: *${tiempoEstimado}*.\n\nCódigo de orden: *${ordenId}*.`;
        
        await axios.post(`https://graph.facebook.com/v17.0/${process.env.ID_NUMERO_TELEFONO}/messages`, {
            messaging_product: "whatsapp", to: clientNumber, type: "text", text: { body: textoParaPaciente }
        }, { headers: { 'Authorization': `Bearer ${process.env.TOKEN_WHATSAPP}`, 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("FALLO EN EL NÚCLEO LOGÍSTICO:", error);
    }
}

// Receptor de mensajes en vivo
app.post('/webhook', async (req, res) => {
    res.status(200).send('EVENT_RECEIVED');
    const body = req.body;

    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const messageData = body.entry[0].changes[0].value.messages[0];
        const clientNumber = messageData.from;
        const incomingText = messageData.text?.body;

        if (!incomingText) return;

        try {
            const userHistory = await db.collection('historiales_clinicos').findOne({ phone: clientNumber });
            const contextoPrevio = userHistory ? userHistory.logs.slice(-5) : [];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `El usuario dice: "${incomingText}". Historial previo: ${JSON.stringify(contextoPrevio)}. Responde de manera profesional y médica.`,
            });

            const textOutput = response.text;

            // Guardar con la zona asignada (simulamos Obrajes para la prueba)
            await db.collection('historiales_clinicos').updateOne(
                { phone: clientNumber },
                { 
                    $set: { zona: "Obrajes" },
                    $push: { logs: { fecha: new Date(), input: incomingText, output: textOutput } } 
                },
                { upsert: true }
            );

            const ubicacionSimulada = { latitud: -16.5244, longitud: -68.1189 };
            
            // Ejecutar la logística de entrega física
            await procesarLogisticaDios(clientNumber, ubicacionSimulada, textOutput, ["Paracetamol"]);
            
            // Ejecutar el enjambre de análisis de brotes y cobro de comisiones
            await ejecutarMatrizSupremaEnjambre(clientNumber, "Obrajes", incomingText, 80);

        } catch (error) {
            console.error("ERROR INTERNO:", error);
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`=== MONOPOLIO TOTAL CONFIGURADO EN PUERTO ${PORT} ===`));