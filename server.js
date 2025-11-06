import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

console.log("⚡ server.js loaded successfully"); // Debug checkpoint

dotenv.config();

const app = express();
app.use(express.json());
const port = 3000;

// Load environment variables
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const FILEPATH = process.env.GITHUB_FILEPATH;
const TOKEN = process.env.GITHUB_TOKEN;

// Quick debug check for missing info
if (!OWNER || !REPO || !FILEPATH || !TOKEN) {
  console.error("❌ Missing one or more environment variables in .env file!");
  console.log("OWNER:", OWNER);
  console.log("REPO:", REPO);
  console.log("FILEPATH:", FILEPATH);
  console.log("TOKEN:", TOKEN ? "✅ Loaded" : "❌ Missing");
  process.exit(1);
}

async function getFileInfo() {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILEPATH}`, {
    headers: { Authorization: `token ${TOKEN}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub fetch failed: ${res.status} ${res.statusText}\n${err}`);
  }

  return res.json();
}

app.get("/file", async (req, res) => {
  try {
    const info = await getFileInfo();
    const content = Buffer.from(info.content, "base64").toString("utf8");
    res.json({ content, sha: info.sha });
  } catch (err) {
    console.error("❌ Error in /file GET:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/file", async (req, res) => {
  try {
    const { content, sha } = req.body;
    const b64 = Buffer.from(content, "utf8").toString("base64");
    const body = { message: "Update database.json", content: b64, sha };

    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILEPATH}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await r.json();
    if (!r.ok) throw new Error(result.message || "GitHub update failed");

    res.json(result);
  } catch (err) {
    console.error("❌ Error in /file POST:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`✅ Server running at http://localhost:${port}`));
