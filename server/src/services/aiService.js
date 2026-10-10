import axios from "axios";

const getAiConfig = () => {
  if (process.env.GROQ_API_KEY) {
    return {
      provider: "Groq",
      url: process.env.GROQ_URL || "https://api.groq.com/openai/v1/chat/completions",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      visionModel: process.env.GROQ_VISION_MODEL || "llama-3.2-11b-vision-preview",
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return {
      provider: "Gemini",
      url: process.env.GEMINI_URL || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      visionModel: process.env.GEMINI_VISION_MODEL || "gemini-1.5-flash",
    };
  }

  return {
    provider: "OpenRouter",
    url: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || "openrouter/free",
    visionModel: process.env.OPENROUTER_VISION_MODEL || "openrouter/free",
  };
};

const DOC_TYPES = ["academic", "code", "legal", "invoice", "image", "other"];
const RISKS = ["LOW", "MEDIUM", "HIGH"];
const SENSITIVE_TYPES = [
  "api_key", "email", "phone", "password", "pii", "credit_card", "other",
];

class AIServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const callOpenRouter = async (messages, { maxTokens = 1200, temperature = 0.2, model } = {}) => {
  const config = getAiConfig();
  if (!config.apiKey) {
    throw new AIServiceError(
      "AI service unavailable: No API key configured. Please set GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY in .env.",
      500
    );
  }

  try {
    const selectedModel = model || config.model;
    const { data } = await axios.post(
      config.url,
      {
        model: selectedModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5600",
          "X-Title": "ShareVault AI",
        },
        timeout: 90000,
      }
    );

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new AIServiceError("AI service returned an empty response.", 500);
    return content;
  } catch (err) {
    if (err instanceof AIServiceError) throw err;
    const status = err.response?.status || 500;
    const errorMsg =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      "AI service unavailable. Please try again later.";
    console.error(`${config.provider} error:`, status, err.response?.data || err.message);
    throw new AIServiceError(errorMsg, status);
  }
};

const parseJsonBlock = (raw) => {
  let text = String(raw).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new AIServiceError("AI returned an unreadable response.", 500);
  return JSON.parse(text.slice(start, end + 1));
};

/** Validate + normalise the model's analysis JSON. */
export const validateAnalysis = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    throw new AIServiceError("AI returned an invalid analysis payload.", 500);
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary) throw new AIServiceError("AI returned an analysis without a summary.", 500);

  const documentType = DOC_TYPES.includes(parsed.documentType) ? parsed.documentType : "other";
  const securityRisk = RISKS.includes(String(parsed.securityRisk).toUpperCase())
    ? String(parsed.securityRisk).toUpperCase()
    : "LOW";

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .filter((k) => typeof k === "string" && k.trim())
        .map((k) => k.trim().slice(0, 60))
        .slice(0, 15)
    : [];

  const sensitiveData = Array.isArray(parsed.sensitiveData)
    ? parsed.sensitiveData
        .filter((s) => s && typeof s === "object")
        .map((s) => ({
          type: SENSITIVE_TYPES.includes(s.type) ? s.type : "other",
          count: Number.isFinite(Number(s.count)) ? Math.max(0, Math.floor(Number(s.count))) : 0,
          locations: Array.isArray(s.locations)
            ? s.locations.filter((n) => Number.isFinite(Number(n))).map(Number).slice(0, 50)
            : [],
        }))
        .slice(0, 20)
    : [];

  return { summary: summary.slice(0, 4000), documentType, keywords, securityRisk, sensitiveData };
};

export const analyzeDocumentText = async ({ text, fileName }) => {
  const systemPrompt = `You are ShareVault AI, a document analysis engine.
Rules:
- Analyze ONLY the supplied document content. Never invent information.
- Identify the document type, important keywords, and obvious sensitive information.
- Assign a security risk of LOW, MEDIUM or HIGH based on sensitive data found.
- Respond with VALID JSON only, no prose, no markdown fences.

JSON shape:
{"summary":"string","documentType":"academic|code|legal|invoice|image|other","keywords":["string"],"securityRisk":"LOW|MEDIUM|HIGH","sensitiveData":[{"type":"api_key|email|phone|password|pii|credit_card|other","count":0,"locations":[]}]}`;

  const userPrompt = `File name: ${fileName}\n\nDocument content:\n"""\n${text}\n"""`;

  const raw = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return validateAnalysis(parseJsonBlock(raw));
};

export const answerQuestion = async ({ text, fileName, question }) => {
  const systemPrompt = `You are ShareVault AI answering questions about a single uploaded document.
Answer ONLY using the document content supplied below. Do not use outside knowledge and do not guess.
If the answer is not present in the document, reply exactly:
I could not find this information in the uploaded document.
Use concise Markdown.`;

  const userPrompt = `File name: ${fileName}\n\nDocument content:\n"""\n${text}\n"""\n\nQuestion: ${question}`;

  return callOpenRouter(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { maxTokens: 800, temperature: 0.1 }
  );
};

export { AIServiceError };

/** Vault Assistant chat — general assistant grounded in the user's file list.
 *  `attachment` (optional):
 *    { kind: "image", dataUrl, fileName }  → sent as a vision block
 *    { kind: "text", text, fileName }      → document text appended to the prompt
 */
export const chatWithVaultAI = async ({ systemPrompt, history = [], message, attachment = null }) => {
  const safeHistory = (Array.isArray(history) ? history : [])
    .filter((m) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role))
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  let userMessage = { role: "user", content: String(message ?? "").slice(0, 4000) };
  let model;

  if (attachment?.kind === "image" && attachment.dataUrl) {
    model = getAiConfig().visionModel;
    userMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: `${String(message || "Analyze this image.").slice(0, 4000)}\n\n(Attached image: ${attachment.fileName || "screenshot"})`,
        },
        { type: "image_url", image_url: { url: attachment.dataUrl } },
      ],
    };
  } else if (attachment?.kind === "text" && attachment.text) {
    userMessage = {
      role: "user",
      content: `${String(message || "Analyze this document.").slice(0, 4000)}\n\nAttached file: ${attachment.fileName || "document"}\nFile content:\n"""\n${attachment.text.slice(0, 40000)}\n"""\n\nAnswer using ONLY the attached content when the question is about the file.`,
    };
  }

  return callOpenRouter(
    [{ role: "system", content: systemPrompt }, ...safeHistory, userMessage],
    { maxTokens: 900, temperature: 0.4, model }
  );
};

export default {
  analyzeDocumentText,
  answerQuestion,
  chatWithVaultAI,
  validateAnalysis,
  AIServiceError,
};
