/**
 * Renders a parsed board JSON onto a Miro board using the Miro Web SDK
 */

const MIRO_STICKY_COLORS = [
  "yellow", "orange", "red", "pink", "violet", "blue", "cyan", "green",
  "light_yellow", "light_orange", "light_red", "light_pink", "light_violet",
  "light_blue", "light_cyan", "light_green", "gray", "dark_blue",
  "dark_brown", "dark_green", "dark_red", "black"
];

function sanitizeStickyColor(color) {
  if (!color) return "yellow";
  const normalized = color.toLowerCase().replace(/\s+/g, "_");
  if (MIRO_STICKY_COLORS.includes(normalized)) return normalized;
  // Fuzzy fallback
  if (normalized.includes("pink")) return "pink";
  if (normalized.includes("green")) return "light_green";
  if (normalized.includes("blue")) return "light_blue";
  if (normalized.includes("purple") || normalized.includes("violet")) return "light_violet";
  if (normalized.includes("orange")) return "orange";
  if (normalized.includes("red")) return "red";
  if (normalized.includes("gray") || normalized.includes("grey")) return "gray";
  return "yellow";
}

export async function renderBoardToMiro(boardData, onProgress) {
  const miro = window.miro;
  const frameMap = {};
  let created = 0;
  const total =
    (boardData.frames?.length || 0) +
    (boardData.sticky_notes?.length || 0) +
    (boardData.texts?.length || 0) +
    (boardData.shapes?.length || 0);

  const report = (msg) => onProgress && onProgress(msg, created, total);

  // 1. Create frames
  report("Creating sections...");
  for (const f of boardData.frames || []) {
    try {
      const frame = await miro.board.createFrame({
        title: f.title || "",
        x: f.x || 0,
        y: f.y || 0,
        width: f.width || 800,
        height: f.height || 600,
      });
      frameMap[f.id] = frame;
      created++;
      report(`Created section: ${f.title}`);
    } catch (e) {
      console.warn("Frame error:", e);
    }
  }

  // 2. Create sticky notes
  report("Creating sticky notes...");
  for (const s of boardData.sticky_notes || []) {
    try {
      const stickyData = {
        content: s.content || "",
        x: s.x || 0,
        y: s.y || 0,
        style: {
          fillColor: sanitizeStickyColor(s.color),
        },
      };

      const sticky = await miro.board.createStickyNote(stickyData);

      // Attach to parent frame if exists
      if (s.parent_frame && frameMap[s.parent_frame]) {
        try {
          await frameMap[s.parent_frame].add(sticky);
        } catch (e) {
          // Frame add can fail silently
        }
      }
      created++;
      report(`Created sticky note`);
    } catch (e) {
      console.warn("Sticky error:", e);
    }
  }

  // 3. Create text elements
  report("Creating text labels...");
  for (const t of boardData.texts || []) {
    try {
      const textItem = await miro.board.createText({
        content: t.content || "",
        x: t.x || 0,
        y: t.y || 0,
        style: {
          fontSize: t.fontSize || 16,
          fontWeight: t.bold ? "bold" : "normal",
          color: t.color || "#1a1a1a",
        },
        width: t.width || 200,
      });

      if (t.parent_frame && frameMap[t.parent_frame]) {
        try {
          await frameMap[t.parent_frame].add(textItem);
        } catch (e) {}
      }
      created++;
      report(`Created text: ${t.content?.substring(0, 30)}`);
    } catch (e) {
      console.warn("Text error:", e);
    }
  }

  // 4. Create shapes
  report("Creating shapes...");
  for (const sh of boardData.shapes || []) {
    try {
      const validShapes = [
        "rectangle", "circle", "triangle", "rhombus", "parallelogram",
        "star", "right_arrow", "left_arrow", "pentagon", "hexagon",
        "octagon", "trapezoid", "cloud", "cross", "can", "round_rectangle"
      ];
      const shapeType = validShapes.includes(sh.type) ? sh.type : "rectangle";

      const shape = await miro.board.createShape({
        content: sh.content || "",
        shape: shapeType,
        x: sh.x || 0,
        y: sh.y || 0,
        width: sh.width || 100,
        height: sh.height || 100,
        style: {
          fillColor: sh.fillColor || "#8B5CF6",
          textColor: sh.textColor || "#ffffff",
          borderColor: sh.borderColor || "transparent",
        },
      });

      if (sh.parent_frame && frameMap[sh.parent_frame]) {
        try {
          await frameMap[sh.parent_frame].add(shape);
        } catch (e) {}
      }
      created++;
      report(`Created shape`);
    } catch (e) {
      console.warn("Shape error:", e);
    }
  }

  // 5. Zoom to fit everything
  try {
    const allItems = await miro.board.get();
    if (allItems.length > 0) {
      await miro.board.viewport.zoomTo(allItems);
    }
  } catch (e) {
    console.warn("Zoom error:", e);
  }

  report("✅ Done!", created, total);
  return { created, total };
}
