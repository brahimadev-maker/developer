const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// ==== CONFIG ====
const API_KEY = process.env.GEMINI_API_KEY;
const AI_MAIL = process.env.AI_MAIL;
const APP_PASSWORD = process.env.APP_PASSWORD;
const TO_MAIL = process.env.TO_MAIL;
const PORT = process.env.PORT || 3002;

console.log("========================================");
console.log("🔧 CONFIGURATION DU SERVEUR");
console.log("========================================");
console.log("✅ API_KEY présente:", !!API_KEY);
console.log("✅ AI_MAIL:", AI_MAIL || "NON DÉFINI");
console.log("✅ APP_PASSWORD présent:", !!APP_PASSWORD);
console.log("✅ TO_MAIL:", TO_MAIL || "NON DÉFINI");
console.log("✅ PORT:", PORT);
console.log("========================================\n");

// ==== TRANSPORTEUR NODEMAILER (GMAIL) ====
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: AI_MAIL, pass: APP_PASSWORD },
});

console.log("📧 Transporteur Nodemailer créé");

// ==== CONTEXTE FIXE ====
const context = `
IMPORTANT : À partir de maintenant, tu es Brahima Diarrassouba.
Réponds toujours à la première personne ("je").
Ne dis jamais que tu es une IA. Utilise uniquement ce contexte :

Je m'appelle Brahima Diarrassouba, développeur Web/Mobile et étudiant en cycle ingénieur à l'ESATIC.
Je recherche un stage pour développer mes compétences.
Numéro : +2250787288739
Compétences : HTML, CSS, JS, React.js, React Native, Node.js, Django, PHP, API REST, SQL, Firebase, MongoDB, Python, Machine Learning.
Atouts : volonté d'apprendre, esprit d'équipe.
Formations : Licence 3 ESATIC, Bac D.
Expériences : hackathons, projets IA, plateformes web/mobile.
`;

console.log("📝 Contexte IA chargé:", context.substring(0, 100) + "...\n");

// ==== HISTORIQUE ====
let conversationHistory = [];
let interviewData = { heure: null, lieu: null, mode: null, inProgress: false };

console.log("💾 Historique de conversation initialisé");
console.log("📅 Données d'entretien initialisées\n");

// ==== UTILS MAIL ====
async function sendMail(subject, text, html) {
  console.log("\n========================================");
  console.log("📧 TENTATIVE D'ENVOI D'EMAIL");
  console.log("========================================");
  console.log("De:", AI_MAIL);
  console.log("À:", TO_MAIL);
  console.log("Sujet:", subject);
  console.log("Texte:", text);
  console.log("----------------------------------------");
  
  try {
    const info = await transporter.sendMail({
      from: `"Brahima Diarrassouba" <${AI_MAIL}>`,
      replyTo: AI_MAIL,
      to: TO_MAIL,
      subject,
      text,
      html,
      headers: { "X-Priority": "1", Importance: "High" },
    });
    
    console.log("✅ Email envoyé avec succès!");
    console.log("ID du message:", info.messageId);
    console.log("Réponse:", info.response);
    console.log("========================================\n");
  } catch (err) {
    console.error("❌ ERREUR LORS DE L'ENVOI D'EMAIL");
    console.error("Message d'erreur:", err.message);
    console.error("Stack trace:", err.stack);
    console.log("========================================\n");
  }
}

function buildInterviewMail(data) {
  console.log("\n📝 Construction du mail d'entretien");
  console.log("Données:", JSON.stringify(data, null, 2));
  
  const text = `Proposition d'entretien :
Heure : ${data.heure}
Lieu : ${data.lieu}
Mode : ${data.mode}`;

  const html = `
    <h2>📅 Nouvelle proposition d'entretien</h2>
    <p><strong>Heure :</strong> ${data.heure}</p>
    <p><strong>Lieu :</strong> ${data.lieu}</p>
    <p><strong>Mode :</strong> ${data.mode}</p>
    <hr>
    <p>Ce message a été généré automatiquement par l'assistant IA.</p>
  `;

  console.log("✅ Mail construit avec succès\n");
  return { text, html };
}

// ==== DÉTECTION ENTRETIEN ====
function isInterviewProposal(message) {
  console.log("\n🔍 Détection de proposition d'entretien");
  console.log("Message à analyser:", message);
  
  const keywords = ["entretien", "rendez-vous", "rencontre", "interview", "rdv"];
  const detected = keywords.some((kw) => message.toLowerCase().includes(kw));
  
  console.log("Mots-clés recherchés:", keywords);
  console.log("Entretien détecté:", detected);
  console.log("----------------------------------------\n");
  
  return detected;
}

// ==== GESTION ENTRETIEN ====
async function handleInterviewFlow(userMessage) {
  console.log("\n========================================");
  console.log("🎯 GESTION DU FLUX D'ENTRETIEN");
  console.log("========================================");
  console.log("Message utilisateur:", userMessage);
  console.log("État actuel de interviewData:", JSON.stringify(interviewData, null, 2));
  
  if (isInterviewProposal(userMessage) && !interviewData.inProgress) {
    console.log("➡️ Démarrage du processus d'entretien");
    interviewData.inProgress = true;
    console.log("État mis à jour:", JSON.stringify(interviewData, null, 2));
    console.log("========================================\n");
    return "D'accord, pouvez-vous m'indiquer l'heure prévue pour l'entretien ?";
  }

  if (interviewData.inProgress && !interviewData.heure) {
    console.log("➡️ Enregistrement de l'heure");
    interviewData.heure = userMessage;
    console.log("État mis à jour:", JSON.stringify(interviewData, null, 2));
    console.log("========================================\n");
    return "Très bien, pouvez-vous préciser le lieu de l'entretien ?";
  }

  if (interviewData.inProgress && !interviewData.lieu) {
    console.log("➡️ Enregistrement du lieu");
    interviewData.lieu = userMessage;
    console.log("État mis à jour:", JSON.stringify(interviewData, null, 2));
    console.log("========================================\n");
    return "Parfait. L'entretien sera-t-il en ligne ou en physique ?";
  }

  if (interviewData.inProgress && !interviewData.mode) {
    console.log("➡️ Enregistrement du mode");
    interviewData.mode = userMessage;
    console.log("État complet:", JSON.stringify(interviewData, null, 2));

    // Toutes les infos réunies → envoyer le mail
    console.log("✉️ Toutes les informations collectées, envoi du mail...");
    const { text, html } = buildInterviewMail(interviewData);
    await sendMail("📅 Proposition d'entretien", text, html);

    // Reset après envoi
    console.log("🔄 Réinitialisation des données d'entretien");
    interviewData = { heure: null, lieu: null, mode: null, inProgress: false };
    console.log("État après reset:", JSON.stringify(interviewData, null, 2));
    console.log("========================================\n");
    return "Merci pour ces précisions. J'ai bien noté les informations.";
  }

  console.log("⏭️ Pas de gestion d'entretien en cours, passage à l'IA");
  console.log("========================================\n");
  return null;
}

app.get("/", (req, res) => {
  console.log("\n🌐 GET / - Route racine appelée");
  console.log("IP client:", req.ip);
  console.log("User-Agent:", req.get("User-Agent"));
  res.send("Hello word");
});

// ==== ROUTE IA ====
app.post("/generate", async (req, res) => {
  console.log("\n========================================");
  console.log("🤖 POST /generate - NOUVELLE REQUÊTE IA");
  console.log("========================================");
  console.log("Heure:", new Date().toISOString());
  console.log("IP client:", req.ip);
  console.log("Body reçu:", JSON.stringify(req.body, null, 2));
  
  try {
    const userMessage = req.body.text?.trim();
    console.log("Message utilisateur (après trim):", userMessage);
    
    if (!userMessage) {
      console.warn("⚠️ Message vide reçu");
      console.log("========================================\n");
      return res.status(400).json({ error: "Message vide" });
    }

    // Vérifier mode entretien
    console.log("\n🔄 Vérification  mode entretien...");
    const interviewReply = await handleInterviewFlow(userMessage);
    
    if (interviewReply) {
      console.log("✅ Réponse d'entretien générée:", interviewReply);
      conversationHistory.push({ role: "assistant", content: interviewReply });
      console.log("📚 Historique mis à jour, longueur:", conversationHistory.length);
      console.log("========================================\n");
      return res.json(interviewReply);
    }

    // Ajouter message user
    console.log("\n📝 Ajout du message utilisateur à l'historique");
    conversationHistory.push({ role: "user", content: userMessage });
    console.log("📚 Taille de l'historique:", conversationHistory.length);
    console.log("Historique complet:", JSON.stringify(conversationHistory, null, 2));

    // Construire prompt complet
    console.log("\n🔨 Construction du prompt complet...");
    let fullPrompt = context + "\n\n";
    for (let msg of conversationHistory) {
      fullPrompt += msg.role === "user"
        ? `Utilisateur : ${msg.content}\n`
        : `Brahima : ${msg.content}\n`;
    }
    fullPrompt += "Brahima, réponds  et en utilisant le 'je' :\n";
    
    console.log("Prompt complet (premiers 500 caractères):", fullPrompt.substring(0, 500) + "...");
    console.log("Longueur totale du prompt:", fullPrompt.length, "caractères");

    // Appel API Gemini
    console.log("\n🌐 Appel à l'API Gemini...");
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    console.log("URL (sans clé):", apiUrl.replace(API_KEY, "***"));
    
    const requestBody = { contents: [{ parts: [{ text: fullPrompt }] }] };
    console.log("Body de la requête:", JSON.stringify(requestBody, null, 2).substring(0, 500) + "...");
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    
    console.log("Statut de la réponse:", response.status, response.statusText);
    console.log("Headers de la réponse:", JSON.stringify([...response.headers], null, 2));
    
    const data = await response.json();
    console.log("Réponse complète de l'API:", JSON.stringify(data, null, 2));

    if (!data.candidates?.[0]?.content?.parts) {
      console.error("❌ Structure de réponse invalide");
      console.error("Données reçues:", JSON.stringify(data, null, 2));
      console.log("========================================\n");
      return res.status(500).json({ error: "Réponse API invalide" });
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    console.log("\n✅ Réponse IA extraite:", aiResponse);
    
    console.log("\n📝 Ajout de la réponse à l'historique");
    conversationHistory.push({ role: "assistant", content: aiResponse });
    console.log("📚 Nouvelle taille de l'historique:", conversationHistory.length);

    console.log("\n✅ Envoi de la réponse au client");
    console.log("========================================\n");
    res.json(aiResponse);
    
  } catch (error) {
    console.error("\n❌ ERREUR DANS /generate");
    console.error("Type d'erreur:", error.constructor.name);
    console.error("Message:", error.message);
    console.error("Stack trace:", error.stack);
    console.log("========================================\n");
    res.status(500).json({ error: "Erreur interne serveur" });
  }
});

// ==== RESET HISTORIQUE ====
app.post("/reset-history", (req, res) => {
  console.log("\n========================================");
  console.log("🔄 POST /reset-history - RESET DEMANDÉ");
  console.log("========================================");
  console.log("Historique avant reset:", conversationHistory.length, "messages");
  console.log("Données entretien avant reset:", JSON.stringify(interviewData, null, 2));
  
  conversationHistory = [];
  interviewData = { heure: null, lieu: null, mode: null, inProgress: false };
  
  console.log("✅ Historique réinitialisé");
  console.log("Historique après reset:", conversationHistory.length, "messages");
  console.log("Données entretien après reset:", JSON.stringify(interviewData, null, 2));
  console.log("========================================\n");
  
  res.json({ message: "Historique réinitialisé" });
});

// ==== LANCEMENT SERVEUR ====
app.listen(PORT, () => {
  console.log("\n========================================");
  console.log("🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS");
  console.log("========================================");
  console.log("URL:", `http://localhost:${PORT}`);
  console.log("Environnement:", process.env.NODE_ENV || "development");
  console.log("Heure de démarrage:", new Date().toISOString());
  console.log("========================================\n");
});