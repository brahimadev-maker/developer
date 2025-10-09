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


console.log(API_KEY,AI_MAIL,APP_PASSWORD,TO_MAIL,PORT)

// ==== TRANSPORTEUR NODEMAILER (GMAIL) ====
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: AI_MAIL, pass: APP_PASSWORD },
});

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

// ==== HISTORIQUE ====
let conversationHistory = [];
let interviewData = { heure: null, lieu: null, mode: null, inProgress: false };

// ==== UTILS MAIL ====
async function sendMail(subject, text, html) {
  try {
    await transporter.sendMail({
      from: `"Brahima Diarrassouba" <${AI_MAIL}>`,
      replyTo: AI_MAIL,
      to: TO_MAIL,
      subject,
      text,
      html,
      headers: { "X-Priority": "1", Importance: "High" },
    });
    console.log("✅ Email envoyé");
  } catch (err) {
    console.error("❌ Erreur envoi mail:", err.message);
  }
}

function buildInterviewMail(data) {
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

  return { text, html };
}

// ==== DÉTECTION ENTRETIEN ====
function isInterviewProposal(message) {
  const keywords = ["entretien", "rendez-vous", "rencontre", "interview", "rdv"];
  return keywords.some((kw) => message.toLowerCase().includes(kw));
}

// ==== GESTION ENTRETIEN ====
async function handleInterviewFlow(userMessage) {
  if (isInterviewProposal(userMessage) && !interviewData.inProgress) {
    interviewData.inProgress = true;
    return "D'accord, pouvez-vous m'indiquer l'heure prévue pour l'entretien ?";
  }

  if (interviewData.inProgress && !interviewData.heure) {
    interviewData.heure = userMessage;
    return "Très bien, pouvez-vous préciser le lieu de l'entretien ?";
  }

  if (interviewData.inProgress && !interviewData.lieu) {
    interviewData.lieu = userMessage;
    return "Parfait. L'entretien sera-t-il en ligne ou en physique ?";
  }

  if (interviewData.inProgress && !interviewData.mode) {
    interviewData.mode = userMessage;

    // Toutes les infos réunies → envoyer le mail
    const { text, html } = buildInterviewMail(interviewData);
    await sendMail("📅 Proposition d'entretien", text, html);

    // Reset après envoi
    interviewData = { heure: null, lieu: null, mode: null, inProgress: false };
    return "Merci pour ces précisions. J'ai bien noté les informations.";
  }

  return null;
}

app.get("/",(req,res)=>{
  res.send("Hello word")
})

// ==== ROUTE IA ====
app.post("/generate", async (req, res) => {
  try {
    const userMessage = req.body.text?.trim();
    if (!userMessage) return res.status(400).json({ error: "Message vide" });

    // Vérifier mode entretien
    const interviewReply = await handleInterviewFlow(userMessage);
    if (interviewReply) {
      conversationHistory.push({ role: "assistant", content: interviewReply });
      return res.json(interviewReply);
    }

    // Ajouter message user
    conversationHistory.push({ role: "user", content: userMessage });

    // Construire prompt complet
    let fullPrompt = context + "\n\n";
    for (let msg of conversationHistory) {
      fullPrompt += msg.role === "user"
        ? `Utilisateur : ${msg.content}\n`
        : `Brahima : ${msg.content}\n`;
    }
    fullPrompt += "Brahima, réponds  et en utilisant le 'je' :\n";

    // Appel API Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
      }
    );
    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts) {
      return res.status(500).json({ error: "Réponse API invalide" });
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    conversationHistory.push({ role: "assistant", content: aiResponse });

    res.json(aiResponse);
  } catch (error) {
    console.error("Erreur /generate :", error);
    res.status(500).json({ error: "Erreur interne serveur" });
  }
});

// ==== RESET HISTORIQUE ====
app.post("/reset-history", (req, res) => {
  conversationHistory = [];
  interviewData = { heure: null, lieu: null, mode: null, inProgress: false };
  res.json({ message: "Historique réinitialisé" });
});

// ==== LANCEMENT SERVEUR ====
app.listen(PORT, () =>
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`)
);
