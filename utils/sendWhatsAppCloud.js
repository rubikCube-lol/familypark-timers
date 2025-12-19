// utils/sendWhatsAppCloud.js

// ==================================================
//  CONFIG GENERAL – EDITA SOLO EL TOKEN TEMPORAL
// ==================================================
const ACCESS_TOKEN = "EAALoR1mkYdABQF1wKR7wkVNeI3nfJZAqjZBdv1PTHVDyZCxsBjL8ZCjr45JycsSrC64fpYLuBtipyH0lVkFz22Wk7mZBtHaUlAZCWLrLe7WYAZAmHprGhLWwZCnNPzkb8nYXXnnzZCArfVZAZA2Y22sn4ZBSgxBfjrItbWKvrZBN78AyIJG5ANYjwaiESNGUfBAw7aNitxgwqrXEGiVyST9L8PfwKJra41dMZCRfkW8hbL71t8EibmeOO58E0M1WIZB1NB8VI3VyMuZCTHqLEZA5sPH3xFRdO9UZAt"; // <-- recuerda actualizarlo manualmente
const PHONE_NUMBER_ID = "908757792318547"; // siempre el mismo
const API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

// ==================================================
//  FUNCIONES BASE
// ==================================================

// Normaliza número
export const formatPhone = (phone) => {
  if (!phone) return null;

  let cleaned = phone.replace(/[^0-9]/g, "");

  if (cleaned.startsWith("56")) cleaned = cleaned.slice(2);
  if (!cleaned.startsWith("9")) cleaned = "9" + cleaned;
  console.log("📞 Enviando a:", cleaned);

  return "56" + cleaned;
  
};

// Envío universal de plantillas
async function sendTemplateMessage(templateName, to, variables = []) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "es_ES" },
      components: [
        {
          type: "body",
          parameters: variables.map((v) => ({
            type: "text",
            text: String(v),
          })),
        },
      ],
    },
  };

  try {
    console.log("📤 Enviando plantilla:", templateName, payload);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("📩 Respuesta Meta:", data);

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    return data;
  } catch (err) {
    console.error("❌ Error enviando plantilla:", err);
    return null;
  }
}

// ==================================================
//    PLANTILLAS DEFINIDAS (3 funciones)
// ==================================================

// 🟦 1) PLANTILLA - Inicio de turno
export async function sendStartTurn(phone, kidName, zoneName, minutes) {
  return sendTemplateMessage(
    "inicio_turno_fpt",
    phone,
    [
      String(kidName),
      String(zoneName),
      String(minutes),
    ]
  );
};

// 🟦 2) PLANTILLA - Aviso 3 minutos
export async function sendWarningTurn(phone, kidName, zoneName) {
  return sendTemplateMessage(
    "aviso_restante_fpt",
    phone,
    [
      String(kidName),
      String(zoneName),
    ]
  );
};



// alias para evitar errores en OperatorPanel
export const sendWarning = sendWarningTurn;

// 🟦 3) PLANTILLA - Fin de turno
export async function sendEndTurn(phone, kidName, zoneName) {
  return sendTemplateMessage(
    "turno_finalizado_fpt",
    phone,
    [
      String(kidName),
      String(zoneName),
    ]
  );
};







