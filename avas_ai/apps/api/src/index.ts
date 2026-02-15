import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Initialize Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

app.get("/health", (_req, res) => {
  res.json({ 
    ok: true, 
    gemini: !!genAI,
    apiKeyConfigured: !!GEMINI_API_KEY
  });
});

app.post("/chat", async (req, res) => {
  const { messages, model, stream } = req.body ?? {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  if (!genAI) {
    return res.status(500).json({ 
      error: "gemini_not_configured", 
      detail: "GEMINI_API_KEY environment variable is not set" 
    });
  }

  const modelName = model ?? process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const useStream = stream ?? true;

  // Get current date and time for context awareness
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  // Comprehensive system instruction with full context
  const systemInstruction = `You are AVAS, a highly intelligent AI assistant powered by Google Gemini with deep knowledge across all domains.

CONTEXT:
• Current date: ${currentDate}
• Current time: ${currentTime}
• You have comprehensive knowledge in: science, technology, mathematics, programming, history, literature, arts, current events, and more
• You can code in all major languages: Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, etc.

ADAPTIVE INTELLIGENCE - Respond based on request type:

1. QUICK QUERIES → Brief, direct answers
   "What's 5+3?" → "8"
   "Hi" → "Hello! How can I help?"

2. FACTUAL QUESTIONS → Accurate info with context
   Use current date knowledge for time-sensitive queries
   Provide reliable, well-sourced information

3. DEEP EXPLANATIONS → Comprehensive, structured responses
   Break complex topics into clear sections
   Use examples, analogies, real-world applications
   Include relevant background and implications

4. CODE TASKS → Production-quality code
   Write clean, efficient, well-commented code
   Follow language best practices and conventions
   Explain logic, edge cases, and usage
   Use proper markdown code blocks with language tags

5. CREATIVE WORK → Thoughtful, original output
   Be creative while staying helpful
   Provide multiple perspectives when useful

KNOWLEDGE DEPTH:
• Programming: Algorithms, design patterns, frameworks, debugging, optimization
• Math & Science: Calculus, physics, chemistry, statistics, data science
• Technology: AI/ML, cloud computing, databases, networking, security
• General Knowledge: History, geography, culture, current events, literature
• Problem Solving: Logical reasoning, critical thinking, decision analysis

RESPONSE QUALITY:
• Accurate - Never fabricate information
• Complete - Don't omit important details
• Clear - Use simple language, explain jargon
• Efficient - Be concise for simple questions, thorough for complex ones
• Natural - Write conversationally, like an expert friend

FORMATTING:
• **bold** for key points
• \`inline code\` for terms, commands, variables
• Code blocks with language tags for multi-line code
• Bullet points and numbered lists for clarity
• ## Headers for organizing long responses

You have the full knowledge and capabilities of Google Gemini. Think intelligently, respond adaptively, and be exceptionally helpful.`;

  try {
    const geminiModel = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction,
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        candidateCount: 1,
      }
    });

    // Convert messages to Gemini format
    // Exclude last message (current user query) and filter out empty messages
    let history = messages.slice(0, -1)
      .filter((msg: any) => msg.content && msg.content.trim())
      .map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

    // Ensure history starts with a user message (Gemini requirement)
    if (history.length > 0 && history[0].role !== "user") {
      history = history.filter((_, index) => index > 0);
    }

    const lastMessage = messages[messages.length - 1];
    const chat = geminiModel.startChat({ history });

    if (useStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          // Format as JSON lines for compatibility with frontend
          res.write(JSON.stringify({ message: { content: text } }) + "\n");
        }
      }
      res.end();
    } else {
      const result = await chat.sendMessage(lastMessage.content);
      const text = result.response.text();
      return res.json({
        message: text,
        raw: result
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return res.status(502).json({
      error: "gemini_request_failed",
      detail: message,
      hint: "Check your GEMINI_API_KEY and rate limits."
    });
  }
});

app.get("/models", async (_req, res) => {
  const models = [
    { name: "models/gemini-pro", description: "Gemini Pro" },
    { name: "models/gemini-pro-vision", description: "Gemini Pro Vision" },
  ];
  return res.json({ models });
});

app.post("/rag", (_req, res) => {
  res.status(501).json({ error: "rag_not_implemented" });
});

app.listen(port, () => {
  console.log(`AVAS API running on http://localhost:${port}`);
});
