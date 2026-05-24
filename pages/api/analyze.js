import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, mediaType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "No image provided" });
  }

  const prompt = `Analyze this workshop board image and return ONLY a JSON object. No markdown, no backticks, no explanation.

Return this structure:
{"board":{"title":"string"},"frames":[{"id":"f1","title":"string","x":0,"y":0,"width":800,"height":600}],"sticky_notes":[{"id":"s1","content":"","x":0,"y":0,"color":"yellow","parent_frame":"f1"}],"texts":[{"id":"t1","content":"string","x":0,"y":0,"fontSize":16,"bold":false}]}

RULES:
- Scale all coordinates to fit in 6000x4000 space
- Max 8 frames, max 40 sticky notes, max 20 texts, max 10 shapes
- Sticky colors: yellow, orange, red, pink, violet, blue, cyan, green, light_yellow, light_orange, light_red, light_pink, light_violet, light_blue, light_cyan, light_green, gray
- Keep content short, empty string for blank stickies
- Return ONLY the JSON, nothing else`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const rawText = response.content[0].text.trim();

    // Strip markdown code fences if present
    const jsonText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let boardData;
    try {
      boardData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw response:", rawText);
      return res.status(422).json({
        error: "Could not parse board structure from image",
        raw: rawText,
      });
    }

    return res.status(200).json(boardData);
  } catch (error) {
    console.error("Anthropic API error:", error);
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
