const CF_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!token || !accountId) {
    return res.status(500).json({ error: "Cloudflare AI credentials are not configured." });
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
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_MODEL}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 800,
          stream: false,
        }),
      }
    );

    const data = (await response.json()) as any;

    if (!response.ok || !data.success) {
      const errMsg = data.errors?.[0]?.message ?? data.error ?? "Cloudflare AI error";
      return res.status(response.status).json({ error: errMsg });
    }

    const text: string = data.result?.response ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "AI returned a non-JSON response. Please try again." });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Server error" });
  }
}
