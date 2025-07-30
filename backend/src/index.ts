import dotenv from "dotenv";
import express, { Request, Response } from "express";
import path from "path";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables from .env file
dotenv.config();

// --- Local Imports (Ensure these files exist and use .js extension) ---
import { BASE_PROMPT, getSystemPrompt } from "./prompts.js";
import { basePrompt as nodeBasePrompt } from "./defaults/node.js";
import { basePrompt as reactBasePrompt } from "./defaults/react.js";

// --- Environment Variable Check ---
if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ GEMINI_API_KEY is missing in your .env file.");
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- Core Middleware ---
app.use(cors());
app.use(express.json({ limit: "11mb" }));
app.use(express.urlencoded({ extended: true, limit: "11mb" }));

// --- WebContainer/SharedArrayBuffer Headers ---
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// --- Gemini API Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


// --- API Functions (streamGeminiResponse, getGeminiResponse) ---
// (Your existing API functions go here, no changes needed)

async function streamGeminiResponse(prompt: string, res: Response) {
  try {
    const stream = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    for await (const chunk of stream.stream) {
      // A type guard to ensure chunk.text exists and is a function
      if (chunk && typeof (chunk as any).text === 'function') {
        res.write((chunk as any).text());
      }
    }
  } catch (err) {
    console.error("❌ Streaming error:", err);
    // Ensure response ends even on error, but don't try to send JSON if headers are already sent.
    if (!res.headersSent) {
      res.status(500).json({ message: "An error occurred during streaming." });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}

async function getGeminiResponse(promptMessages: any[]) {
  try {
    const result = await model.generateContent({
      contents: promptMessages,
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 8000,
      },
    });
    return result.response.text();
  } catch (err) {
    console.error("❌ Gemini generation error:", err);
    throw new Error("Failed to get response from Gemini.");
  }
}


// --- API Routes (/template, /chat, /stream) ---
// (Your existing API routes go here, no changes needed)
app.post("/template", async (req: Request, res: Response) => {
  const userPrompt = req.body.prompt;
  if (!userPrompt) {
    return res.status(400).json({ message: "Missing prompt in request body" });
  }
  const systemInstruction = "Return either node or react based on what you think this project should be. Only return a single word: either 'node' or 'react'. Do not return anything extra.";
  try {
    const geminiResponse = await getGeminiResponse([
      { role: "user", parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] },
    ]);
    const answer = geminiResponse.trim().toLowerCase();
    if (answer.includes("react")) {
      return res.json({
        prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
        uiPrompts: [reactBasePrompt],
      });
    } else if (answer.includes("node")) {
      return res.json({
        prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
        uiPrompts: [nodeBasePrompt],
      });
    }
    return res.status(403).json({ message: "Unable to determine project type" });
  } catch (error) {
    console.error("❌ /template error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/chat", async (req: Request, res: Response) => {
  const messages = req.body.messages;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: "Invalid or missing messages array" });
  }
  try {
    const chatPrompt = messages.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));
    const geminiResponse = await getGeminiResponse([
      { role: "user", parts: [{ text: getSystemPrompt() }] },
      ...chatPrompt,
    ]);
    return res.json({ response: geminiResponse });
  } catch (error) {
    console.error("❌ /chat error:", error);
    return res.status(500).json({ message: "Gemini chat failed" });
  }
});

app.post("/stream", async (req: Request, res: Response) => {
  const userPrompt = req.body.prompt;
  if (!userPrompt) {
    return res.status(400).json({ message: "Missing prompt in request body" });
  }
  await streamGeminiResponse(userPrompt, res);
});


// --- Frontend Serving ---

// Define the path to your frontend's build output directory.
// This assumes your backend is in the root and the frontend is in a 'frontend' folder.
const staticPath = path.resolve(process.cwd(), "frontend", "dist");

// Serve static files (HTML, CSS, JS) from that directory.
app.use(express.static(staticPath));

// Fallback for Single-Page Applications (SPAs).
app.get("*", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"), (err) => {
    if (err) {
      res.status(500).send("Error serving the main application file.");
    }
  });
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running and ready at http://localhost:${PORT}`);
});
