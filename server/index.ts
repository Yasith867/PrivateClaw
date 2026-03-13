import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const CF_MODEL = "@cf/meta/llama-3.1-8b-instruct";

function getCFCredentials(): { token: string; accountId: string } | null {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) return null;
  return { token, accountId };
}

function cfUrl(accountId: string, model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

app.post("/api/ai-trading-assistant", async (req, res) => {
  const creds = getCFCredentials();
  if (!creds) {
    return res.status(500).json({ error: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are not configured." });
  }

  const { pair, bids, asks, myOrders } = req.body;

  const systemPrompt = `You are an expert crypto trading assistant for a privacy-first limit order DEX on the Aleo blockchain.
Analyze the order book and market data, then return 2-4 actionable trading suggestions as valid JSON only.
You MUST respond with ONLY a JSON object — no explanation, no markdown, no extra text.
Format: {"suggestions":[{"action":"place_order","side":"buy","price":1.23,"amount":500000,"reason":"short reason","confidence":"high"}]}
action values: "place_order" | "cancel_order" | "hold" | "improve_price"
side values: "buy" | "sell"
confidence values: "high" | "medium" | "low"`;

  const userPrompt = `Market: ${pair?.title ?? "Unknown"}
Last Price: ${pair?.lastPrice}
24h Change: ${pair?.priceChange24h}%
Best Bid: ${pair?.bestBid} | Best Ask: ${pair?.bestAsk}
Bids (top 5): ${JSON.stringify((bids ?? []).slice(0, 5))}
Asks (top 5): ${JSON.stringify((asks ?? []).slice(0, 5))}
My Open Orders: ${JSON.stringify(myOrders ?? [])}

Respond with ONLY the JSON object, no other text.`;

  try {
    const response = await fetch(cfUrl(creds.accountId, CF_MODEL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.token}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
        stream: false,
      }),
    });

    const data = await response.json() as any;

    if (!response.ok || !data.success) {
      const errMsg = data.errors?.[0]?.message ?? data.error ?? "Cloudflare AI error";
      return res.status(response.status).json({ error: errMsg });
    }

    const text: string = data.result?.response ?? "";

    // Extract JSON from the response (model may add surrounding text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "AI returned non-JSON response. Try again." });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Server error" });
  }
});

app.post("/api/ai-trading-chat", async (req, res) => {
  const creds = getCFCredentials();
  if (!creds) {
    return res.status(500).json({ error: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are not configured." });
  }

  const { messages, context } = req.body;

  const systemPrompt = `You are an expert crypto trading assistant for PrivateClaw, a privacy-first limit order DEX on the Aleo blockchain using ZK proofs.
You help traders analyze markets, understand order books, and make informed decisions.
Be concise, data-driven, and always remind users their orders are kept private via ZK proofs.

Current market context:
Pair: ${context?.pair?.title ?? "Unknown"}
Last Price: ${context?.pair?.lastPrice}
24h Change: ${context?.pair?.priceChange24h}%
Best Bid: ${context?.pair?.bestBid} | Best Ask: ${context?.pair?.bestAsk}
Spread: ${context?.spread} (${context?.spreadPercent}%)
Bids (top 3): ${JSON.stringify((context?.bids ?? []).slice(0, 3))}
Asks (top 3): ${JSON.stringify((context?.asks ?? []).slice(0, 3))}
User's Open Orders: ${JSON.stringify(context?.myOrders ?? [])}`;

  try {
    const response = await fetch(cfUrl(creds.accountId, CF_MODEL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.token}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages ?? []),
        ],
        stream: true,
        max_tokens: 600,
      }),
    });

    if (!response.ok || !response.body) {
      const err = await response.json().catch(() => ({})) as any;
      const errMsg = err.errors?.[0]?.message ?? err.error ?? `HTTP ${response.status}`;
      return res.status(response.status).json({ error: errMsg });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = (response.body as any).getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).replace(/\r$/, "");
        buf = buf.slice(nl + 1);

        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") {
          res.write("data: [DONE]\n\n");
          continue;
        }

        try {
          // Cloudflare streams: {"response":"token","p":"..."}
          // Convert to OpenAI SSE format the frontend expects
          const cf = JSON.parse(payload);
          const token = cf.response ?? "";
          if (token) {
            const openAiFmt = JSON.stringify({
              choices: [{ delta: { content: token } }],
            });
            res.write(`data: ${openAiFmt}\n\n`);
          }
        } catch {
          // pass through as-is if already in expected format
          res.write(line + "\n\n");
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message ?? "Server error" });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
