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

  const prompt = `You are analyzing a workshop or collaboration board image to extract its structure for recreation in Miro.

Analyze this image carefully and return a JSON object representing ALL visible elements.

Return ONLY valid JSON, no explanation, no markdown, no backticks.

The JSON structure must be:
{
  "board": {
    "title": "board title if visible",
    "width": 6000,
    "height": 4000
  },
  "frames": [
    {
      "id": "frame_1",
      "title": "Section title",
      "x": 0,
      "y": 0,
      "width": 800,
      "height": 600,
      "color": "#f0f0f0"
    }
  ],
  "sticky_notes": [
    {
      "id": "sticky_1",
      "content": "text content or empty string",
      "x": 100,
      "y": 100,
      "color": "yellow",
      "parent_frame": "frame_1"
    }
  ],
  "texts": [
    {
      "id": "text_1",
      "content": "text content",
      "x": 100,
      "y": 100,
      "fontSize": 24,
      "bold": true,
      "parent_frame": "frame_1"
    }
  ],
  "shapes": [
    {
      "id": "shape_1",
      "type": "circle",
      "content": "text inside shape",
      "x": 100,
      "y": 100,
      "width": 50,
      "height": 50,
      "fillColor": "#8B5CF6",
      "textColor": "#ffffff"
    }
  ]
}

CRITICAL RULES:
1. Use RELATIVE coordinates based on image dimensions. Top-left is (0,0). Scale everything to fit within width:6000 height:4000.
2. For sticky note colors use ONLY: "yellow", "orange", "red", "pink", "violet", "blue", "cyan", "green", "light_yellow", "light_orange", "light_red", "light_pink", "light_violet", "light_blue", "light_cyan", "light_green", "gray", "dark_blue", "dark_brown", "dark_green", "dark_red", "black"
3. Map colors visually: yellow stickies → "yellow", pink stickies → "pink", green stickies → "light_green", blue stickies → "light_blue", purple stickies → "light_violet"
4. Identify ALL frames/sections as separate frame objects with their titles
5. Place sticky notes approximately where they appear relative to their section
6. Extract ALL visible text for titles, labels, instructions
7. For numbered circles/badges use shapes with type "circle"
8. Return empty string "" for sticky content if the sticky appears blank/empty`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
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
