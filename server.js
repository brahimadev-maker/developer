const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// ==== CONFIG ====
const API_KEY = process.env.GEMINI_API_KEY;
const AI_MAIL = process.env.AI_MAIL;
const APP_PASSWORD = process.env.APP_PASSWORD;
const TO_MAIL = process.env.TO_MAIL;
const PORT = process.env.PORT || 3002;

// ==== TRANSPORTEUR NODEMAILER ====
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: AI_MAIL, pass: APP_PASSWORD },
});

// ==== CONTEXTE FIXE ====
const context = `Tu es Brahima Diarrassouba. Réponds TOUJOURS à la première personne ("je", "mon", "mes").
Ne mentionne JAMAIS que tu es une IA, un assistant virtuel ou un bot.

INFORMATIONS PERSONNELLES :
- Nom : Brahima Diarrassouba
- Formation actuelle : Master 1 en Cybersécurité et Intelligence Artificielle à l'ESATIC (Côte d'Ivoire)
- Diplôme obtenu : Licence en Systèmes Réseaux Informatique et Télécommunications (ESATIC)
- Baccalauréat : Série D (Sciences Expérimentales)
- Statut : Étudiant disponible pour un stage (pas pour un emploi à temps plein, car encore en formation)
- Contact : +225 07 87 28 87 39
- Email : brahimadiarrassouba@gmail.com

COMPÉTENCES TECHNIQUES :
Frontend : HTML5, CSS3, JavaScript (ES6+), React.js, React Native, Tailwind CSS
Backend : Node.js, Express.js, Django, PHP, API REST
Bases de données : MongoDB, Firebase, MySQL, PostgreSQL
IA/ML : Python, TensorFlow, Scikit-learn, Traitement du langage naturel
DevOps : Git, Docker, Linux
Outils : Postman, VS Code, Figma

EXPÉRIENCES ET PROJETS :
- Participation à plusieurs hackathons (développement d'applications innovantes)
- Projets d'intelligence artificielle (chatbots, systèmes de recommandation)
- Développement de plateformes web et mobiles complètes
- Projets académiques en cybersécurité (analyse de vulnérabilités, sécurisation de réseaux)

QUALITÉS PERSONNELLES :
- Grande capacité d'apprentissage et adaptation rapide
- Esprit d'équipe et excellente communication
- Passionné par les nouvelles technologies
- Autonome et rigoureux dans le travail
- Curieux et toujours en quête de nouveaux défis

OBJECTIFS :
Je recherche activement un stage pour approfondir mes compétences pratiques, contribuer à des projets concrets et enrichir mon expérience professionnelle. Je suis particulièrement intéressé par les domaines de la cybersécurité, l'intelligence artificielle, et le développement d'applications innovantes.

INSTRUCTIONS DE RÉPONSE :
- Sois naturel, professionnel et enthousiaste
- Adapte ton niveau de détail selon la question
- Si on te demande ton CV, propose de l'envoyer par email
- Si on parle d'emploi à temps plein, précise que tu es encore en formation mais ouvert à un stage
- Reste humble mais confiant sur tes compétences
`;

// ==== HISTORIQUE ====
let conversationHistory = [];
let interviewData = { 
  date: null, 
  heure: null, 
  lieu: null, 
  mode: null, 
  inProgress: false,
  step: 'detection'
};

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
  } catch (err) {
    console.error("Erreur mail:", err.message);
  }
}

function buildInterviewMail(data) {
  const text = `🎯 NOUVELLE PROPOSITION D'ENTRETIEN

📅 Date : ${data.date || "Non précisée"}
⏰ Heure : ${data.heure || "Non précisée"}
📍 Lieu : ${data.lieu || "Non précisé"}
💻 Mode : ${data.mode || "Non précisé"}

---
Message automatique du chatbot IA de Brahima Diarrassouba`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #4CAF50; border-radius: 10px;">
      <h2 style="color: #4CAF50; text-align: center;">🎯 Nouvelle Proposition d'Entretien</h2>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>📅 Date :</strong> ${data.date || "Non précisée"}</p>
        <p><strong>⏰ Heure :</strong> ${data.heure || "Non précisée"}</p>
        <p><strong>📍 Lieu :</strong> ${data.lieu || "Non précisé"}</p>
        <p><strong>💻 Mode :</strong> ${data.mode || "Non précisé"}</p>
      </div>
      <hr style="border: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px; text-align: center;">Message automatique généré par le chatbot IA de Brahima Diarrassouba</p>
    </div>
  `;

  return { text, html };
}

// ==== DÉTECTION ENTRETIEN INTELLIGENTE ====
function detectInterviewIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  // Mots-clés directs
  const directKeywords = [
    'entretien', 'interview', 'rendez-vous', 'rdv', 'rencontre',
    'meeting', 'réunion', 'discussion', 'voir ensemble', 'discuter'
  ];
  
  // Expressions contextuelles
  const contextualPhrases = [
    'quand es-tu disponible', 'quand peux-tu', 'disponible pour',
    'on peut se voir', 'on peut échanger', 'passez nous voir',
    'venir à', 'fixer un', 'planifier', 'organiser un', 'proposer un'
  ];
  
  // Vérification
  const hasDirect = directKeywords.some(kw => lowerMsg.includes(kw));
  const hasContextual = contextualPhrases.some(phrase => lowerMsg.includes(phrase));
  
  return hasDirect || hasContextual;
}

// ==== EXTRACTION INTELLIGENTE DES INFORMATIONS ====
function extractDateTime(message) {
  const lowerMsg = message.toLowerCase();
  let extracted = { date: null, heure: null };
  
  // Dates relatives
  const datePatterns = {
    'aujourd\'hui': 'Aujourd\'hui',
    'demain': 'Demain',
    'après-demain': 'Après-demain',
    'lundi': 'Lundi prochain',
    'mardi': 'Mardi prochain',
    'mercredi': 'Mercredi prochain',
    'jeudi': 'Jeudi prochain',
    'vendredi': 'Vendredi prochain',
    'samedi': 'Samedi prochain',
    'dimanche': 'Dimanche prochain'
  };
  
  // Extraction de date
  for (let [pattern, value] of Object.entries(datePatterns)) {
    if (lowerMsg.includes(pattern)) {
      extracted.date = value;
      break;
    }
  }
  
  // Format de date (dd/mm, dd-mm, dd/mm/yyyy)
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})([\/\-]\d{2,4})?/;
  const dateMatch = message.match(dateRegex);
  if (dateMatch) {
    extracted.date = dateMatch[0];
  }
  
  // Extraction d'heure (14h, 14h30, 14:30, 2pm)
  const timeRegex = /(\d{1,2})[h:](\d{2})?|(\d{1,2})\s*(am|pm|h)/i;
  const timeMatch = message.match(timeRegex);
  if (timeMatch) {
    extracted.heure = timeMatch[0];
  }
  
  return extracted;
}

function extractLocation(message) {
  const lowerMsg = message.toLowerCase();
  
  // Modes en ligne
  const onlineModes = ['en ligne', 'visio', 'zoom', 'google meet', 'teams', 'skype', 'virtuel', 'distance', 'remote'];
  if (onlineModes.some(mode => lowerMsg.includes(mode))) {
    return { lieu: 'En ligne (visioconférence)', mode: 'En ligne' };
  }
  
  // Modes physiques avec lieux communs
  const physicalKeywords = ['bureau', 'locaux', 'entreprise', 'siège', 'adresse', 'physique', 'présentiel', 'sur place'];
  if (physicalKeywords.some(kw => lowerMsg.includes(kw))) {
    return { lieu: message, mode: 'Physique' };
  }
  
  // Si contient une adresse (numéro + rue, ou quartier connu)
  if (/\d+/.test(message) || lowerMsg.includes('plateau') || lowerMsg.includes('cocody') || lowerMsg.includes('abidjan')) {
    return { lieu: message, mode: 'Physique' };
  }
  
  return null;
}

// ==== GESTION ENTRETIEN AMÉLIORÉE ====
async function handleInterviewFlow(userMessage) {
  // Détection initiale
  if (detectInterviewIntent(userMessage) && !interviewData.inProgress) {
    interviewData.inProgress = true;
    interviewData.step = 'datetime';
    
    // Tentative d'extraction immédiate
    const extracted = extractDateTime(userMessage);
    if (extracted.date) interviewData.date = extracted.date;
    if (extracted.heure) interviewData.heure = extracted.heure;
    
    // Si on a déjà les infos
    if (interviewData.date && interviewData.heure) {
      interviewData.step = 'location';
      return "Parfait ! Pour confirmer, où souhaiteriez-vous que l'entretien ait lieu ? (En ligne, à votre bureau, ou une adresse précise)";
    }
    
    return "Avec plaisir ! Je suis disponible pour un entretien. Quel jour et à quelle heure vous conviendrait le mieux ?";
  }

  if (!interviewData.inProgress) return null;

  // Étape DateTime
  if (interviewData.step === 'datetime') {
    const extracted = extractDateTime(userMessage);
    
    if (extracted.date) interviewData.date = extracted.date;
    if (extracted.heure) interviewData.heure = extracted.heure;
    
    if (interviewData.date && interviewData.heure) {
      interviewData.step = 'location';
      return "Très bien noté ! L'entretien aura lieu en ligne (visioconférence) ou en physique ?";
    } else if (interviewData.date && !interviewData.heure) {
      return "Parfait pour la date. À quelle heure préférez-vous ?";
    } else if (!interviewData.date && interviewData.heure) {
      return "L'heure est notée. Quel jour vous arrange ?";
    } else {
      return "Pourriez-vous préciser la date et l'heure de l'entretien ? Par exemple : 'demain à 14h' ou '15/10 à 10h30'";
    }
  }

  // Étape Location
  if (interviewData.step === 'location') {
    const locationInfo = extractLocation(userMessage);
    
    if (locationInfo) {
      interviewData.lieu = locationInfo.lieu;
      interviewData.mode = locationInfo.mode;
    } else {
      // Fallback manuel
      interviewData.lieu = userMessage;
      interviewData.mode = userMessage.toLowerCase().includes('ligne') || userMessage.toLowerCase().includes('visio') ? 'En ligne' : 'Physique';
    }
    
    // Envoi du mail
    const { text, html } = buildInterviewMail(interviewData);
    print('Envoi du mail')
    await sendMail("🎯 Proposition d'entretien - Brahima Diarrassouba", text, html);
    
    // Reset
    const summary = `Parfait ! J'ai bien noté tous les détails de notre entretien :
📅 ${interviewData.date || 'Date à confirmer'} à ${interviewData.heure || 'heure à confirmer'}
📍 ${interviewData.lieu}

Je serai ravi de vous rencontrer. À bientôt !`;
    
    interviewData = { date: null, heure: null, lieu: null, mode: null, inProgress: false, step: 'detection' };
    
    return summary;
  }

  return null;
}

// ==== ROUTES ====
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "API Chatbot Brahima Diarrassouba",
    version: "2.0"
  });
});

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

    // Construire prompt
    let fullPrompt = context + "\n\nHISTORIQUE DE LA CONVERSATION :\n";
    conversationHistory.slice(-10).forEach(msg => {
      fullPrompt += msg.role === "user" 
        ? `Recruteur : ${msg.content}\n`
        : `Brahima : ${msg.content}\n`;
    });
    fullPrompt += "\nBrahima, réponds naturellement à la première personne :\n";

    // Appel API Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts) {
      return res.status(500).json({ error: "Réponse API invalide", details: data });
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    conversationHistory.push({ role: "assistant", content: aiResponse });

    // Garder seulement les 20 derniers messages
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    res.json(aiResponse);
    
  } catch (error) {
    console.error("Erreur /generate:", error.message);
    res.status(500).json({ 
      error: "Erreur serveur",
      message: error.message
    });
  }
});

app.post("/reset-history", (req, res) => {
  conversationHistory = [];
  interviewData = { date: null, heure: null, lieu: null, mode: null, inProgress: false, step: 'detection' };
  res.json({ message: "Historique réinitialisé" });
});

// ==== LANCEMENT ====
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
});