/**
 * Chat completion proxy (Vercel Edge Function).
 *
 * Forwards requests to OpenRouter or Z.ai using a server-side API key.
 * Keeps the key out of the client bundle and supports SSE streaming responses.
 *
 * LLM_PROVIDER=zai uses ZAI_API_KEY and the GLM coding endpoint.
 * Otherwise OPENROUTER_API_KEY is required. The route name is kept for compatibility.
 */

export const config = { runtime: 'edge' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const provider = process.env.LLM_PROVIDER || 'openrouter';
  if (provider !== 'openrouter' && provider !== 'zai') {
    return Response.json({ error: { message: 'Unsupported LLM_PROVIDER' } }, { status: 500 });
  }

  const isZai = provider === 'zai';
  const keyName = isZai ? 'ZAI_API_KEY' : 'OPENROUTER_API_KEY';
  const apiKey = process.env[keyName];
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: `${keyName} not set on server` } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error('Missing messages');
    }
  } catch {
    return Response.json({ error: { message: 'Expected JSON with a nonempty messages array' } }, { status: 400 });
  }

  if (isZai) {
    // Select the model on the server, including for clients with an older cached bundle.
    body.model = process.env.ZAI_MODEL || 'glm-5.3-flash';
    body.reasoning_effort = 'low';

    // Z.ai supports auto tool selection, but not OpenAI's forced-function format.
    const choice = body.tool_choice;
    if (choice && typeof choice === 'object' && 'function' in choice) {
      const fn = choice.function;
      if (fn && typeof fn === 'object' && 'name' in fn && typeof fn.name === 'string') {
        body.messages = [
          ...body.messages,
          { role: 'system', content: `For this request, respond only by calling the ${fn.name} function. Do not answer in prose.` },
        ];
      }
      body.tool_choice = 'auto';
    }
  }

  const origin = req.headers.get('origin') || 'https://dancerobot.dance';

  let upstream: Response;
  try {
    upstream = await fetch(isZai ? ZAI_URL : OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(!isZai ? { 'HTTP-Referer': origin, 'X-Title': '3D AI Chat' } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    return Response.json({ error: { message: 'Model provider is temporarily unreachable' } }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
