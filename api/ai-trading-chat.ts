export const config = { runtime: "edge" };

const CF_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!token || !accountId) {
    return new Response(
      JSON.stringify({ error: "Cloudflare AI credentials are not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = (await request.json()) as any;
  const { messages, context } = body;

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

  const cfResponse = await fetch(
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
          ...(messages ?? []),
        ],
        stream: true,
        max_tokens: 600,
      }),
    }
  );

  if (!cfResponse.ok || !cfResponse.body) {
    return new Response(
      JSON.stringify({ error: `Cloudflare AI error: HTTP ${cfResponse.status}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Transform Cloudflare SSE → OpenAI-compatible SSE for the frontend
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const cfBody = cfResponse.body;

  const readable = new ReadableStream({
    async start(controller) {
      const reader = cfBody.getReader();
      let buf = "";

      try {
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
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

            try {
              const cf = JSON.parse(payload);
              const token = cf.response ?? "";
              if (token) {
                const openAiFmt = JSON.stringify({
                  choices: [{ delta: { content: token } }],
                });
                controller.enqueue(encoder.encode(`data: ${openAiFmt}\n\n`));
              }
            } catch {
              controller.enqueue(encoder.encode(line + "\n\n"));
            }
          }
        }
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
