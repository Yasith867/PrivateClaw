import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function getOpenAIKey(): string | null {
  return process.env.OPENAI_API_KEY ?? null;
}

app.post("/api/ai-trading-assistant", async (req, res) => {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
  }

  const { pair, bids, asks, myOrders } = req.body;

  const systemPrompt = `You are an expert crypto trading assistant for a privacy-first limit order DEX on the Aleo blockchain. 
Analyze the provided order book and market data, then return 2-4 actionable trading suggestions in strict JSON format.

Return ONLY a JSON object: { "suggestions": [ ... ] }
Each suggestion must have:
- action: "place_order" | "cancel_order" | "hold" | "improve_price"
- side: "buy" | "sell" (if applicable)
- price: number (if applicable)  
- amount: number in microcredits (if applicable)
- reason: string (short explanation, max 120 chars)
- confidence: "high" | "medium" | "low"
- orderId: string (only for cancel_order, optional)`;

  const userPrompt = `Market: ${pair?.title ?? "Unknown"}
Last Price: ${pair?.lastPrice}
24h Change: ${pair?.priceChange24h}%
Best Bid: ${pair?.bestBid} | Best Ask: ${pair?.bestAsk}
Bids (top 5): ${JSON.stringify((bids ?? []).slice(0, 5))}
Asks (top 5): ${JSON.stringify((asks ?? []).slice(0, 5))}
My Open Orders: ${JSON.stringify(myOrders ?? [])}

Provide trading suggestions.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      }),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message ?? "OpenAI error" });
    }

    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Server error" });
  }
});

app.post("/api/ai-trading-chat", async (req, res) => {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
  }

  const { messages, context } = req.body;

  const systemPrompt = `You are an expert crypto trading assistant for PrivateClaw, a privacy-first limit order DEX on the Aleo blockchain using ZK proofs.
You help traders analyze markets, understand order books, and make informed decisions.
Be concise, data-driven, and always remind users that their orders are kept private via ZK proofs.

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
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages ?? []),
        ],
        stream: true,
        max_tokens: 600,
      }),
    });

    if (!response.ok || !response.body) {
      const err = await response.json().catch(() => ({ error: { message: "Stream failed" } })) as any;
      return res.status(response.status).json({ error: err.error?.message ?? "OpenAI error" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = (response.body as any).getReader ? (response.body as any).getReader() : null;

    if (!reader) {
      return res.status(500).json({ error: "Streaming not supported" });
    }

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
        if (line.startsWith("data: ")) {
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
