import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { prompt, level } = await req.json();

  if (!prompt || !level) {
    return new Response(JSON.stringify({ error: "prompt and level are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `You are an expert Polish language teacher creating high-quality, structured lesson content for Ukrainian adults learning Polish. Ukrainian learners have a Slavic language base, so you can draw parallels with Ukrainian/Russian when helpful in explanations — but all exercises, sentences, vocabulary, and content MUST be entirely in Polish.

The lesson should be appropriate for ${level.toUpperCase()} level Polish learners.

QUALITY STANDARDS:
- Content must follow real Polish language pedagogy (communicative approach)
- Use authentic, natural Polish sentences — not random or artificial examples
- For A1-A2: simple vocabulary, present tense, everyday situations
- For B1-B2: grammar structures, past/future tense, more complex vocabulary
- For C1-C2: idiomatic expressions, nuanced grammar, advanced texts
- Each lesson must have a clear learning goal and logical flow
- Include a short reading passage in Polish as a "text" module when relevant
- Use VARIED module types — never repeat the same type consecutively

AVAILABLE MODULE TYPES (use at least 5-7, mix them well):
- "text": Polish reading passage or explanation. Use markdown: # main title, ## subsections, **bold** for key words.
- "vocabulary": Polish words. Fields: vocabularyTitle, vocabularyItems (array of {id, word, definition}). 6-10 items.
- "quiz": Multiple choice IN POLISH. Fields: question, options (array of {text, isCorrect}). 4 options, 1 correct.
- "truefalse": True/false IN POLISH. Fields: trueFalseTitle, trueFalseStatements (array of {id, statement, isTrue}). 4-6 items.
- "matching": Word matching. Fields: matchingType: "word-definition", pairs (array of {left, right}). 5-6 pairs.
- "fillblank": Fill in the blank. Fields: sentence (Polish sentence with 1. 2. blank markers — REQUIRED, NEVER empty), answers (array). Example: {"sentence":"Ona 1. do szkoły i 2. książki.","answers":["chodzi","czyta"]}

Respond ONLY with a valid JSON object (no text before or after):
{"title":"...","modules":[{"id":"m1","type":"text","content":{"text":"# Title\\n\\nText..."}},...]}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: 6000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Create a Polish language lesson about: ${prompt}\nLevel: ${level.toUpperCase()}`,
            },
          ],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: any) {
        const errorData = `data: ${JSON.stringify({ error: err.message })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
