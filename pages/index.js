import { useState, useRef, useCallback } from "react";
import { renderBoardToMiro } from "../lib/miroRenderer";
import Head from "next/head";

const STEPS = {
  IDLE: "idle",
  ANALYZING: "analyzing",
  RENDERING: "rendering",
  DONE: "done",
  ERROR: "error",
};

export default function Home() {
  const [step, setStep] = useState(STEPS.IDLE);
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [mediaType, setMediaType] = useState("image/png");
  const [log, setLog] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const addLog = (msg) => setLog((l) => [...l, msg]);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      // Extract base64 only
      const base64 = dataUrl.split(",")[1];
      setImageData(base64);
      setStep(STEPS.IDLE);
      setLog([]);
      setError(null);
      setBoardData(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const handleAnalyze = async () => {
    if (!imageData) return;
    setStep(STEPS.ANALYZING);
    setLog(["🔍 Analyzing image with Claude Vision..."]);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imageData, mediaType }),
      });

      const data = await res.json();

     if (!res.ok) {
       const detail = data.raw ? `\nRAW: ${data.raw.substring(0, 300)}` : "";
       throw new Error((data.error || "Analysis failed") + detail);
      }

      setBoardData(data);
      const frameCount = data.frames?.length || 0;
      const stickyCount = data.sticky_notes?.length || 0;
      const textCount = data.texts?.length || 0;
      const shapeCount = data.shapes?.length || 0;

      addLog(`✅ Analysis complete!`);
      addLog(`📦 Found: ${frameCount} sections, ${stickyCount} stickies, ${textCount} texts, ${shapeCount} shapes`);
      setStep(STEPS.RENDERING);
      await handleRender(data);
    } catch (e) {
      setError(e.message);
      setStep(STEPS.ERROR);
      addLog(`❌ Error: ${e.message}`);
    }
  };

  const handleRender = async (data) => {
    try {
      addLog("🎨 Rendering to Miro board...");

      const result = await renderBoardToMiro(data, (msg, current, total) => {
        addLog(msg);
        setProgress({ current: current || 0, total: total || 0 });
      });

      addLog(`🎉 Created ${result.created} elements on your board!`);
      setStep(STEPS.DONE);
    } catch (e) {
      setError(e.message);
      setStep(STEPS.ERROR);
      addLog(`❌ Render error: ${e.message}`);
    }
  };

  const reset = () => {
    setStep(STEPS.IDLE);
    setPreview(null);
    setImageData(null);
    setLog([]);
    setError(null);
    setBoardData(null);
    setProgress({ current: 0, total: 0 });
  };

  const isBusy = step === STEPS.ANALYZING || step === STEPS.RENDERING;
  const progressPct =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <>
      <Head>
        <title>Board Importer</title>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="app">
        <div className="header">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">Board Importer</span>
          </div>
          <p className="subtitle">Drop an image → instant Miro board</p>
        </div>

        <div className="content">
          {!preview ? (
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <div className="drop-icon">📋</div>
              <div className="drop-title">Drop your workshop image</div>
              <div className="drop-sub">PNG, JPG, WEBP supported</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="preview-section">
              <div className="preview-wrapper">
                <img src={preview} alt="Board preview" className="preview-img" />
                {step === STEPS.DONE && (
                  <div className="done-overlay">
                    <span>✅ Imported!</span>
                  </div>
                )}
              </div>

              {step === STEPS.IDLE && (
                <div className="actions">
                  <button className="btn-primary" onClick={handleAnalyze}>
                    🚀 Import to Miro
                  </button>
                  <button className="btn-ghost" onClick={reset}>
                    Choose another
                  </button>
                </div>
              )}

              {isBusy && (
                <div className="progress-section">
                  <div className="progress-bar-wrap">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${step === STEPS.ANALYZING ? 30 : progressPct}%` }}
                    />
                  </div>
                  <div className="progress-label">
                    {step === STEPS.ANALYZING ? "Analyzing..." : `${progressPct}%`}
                  </div>
                </div>
              )}

              {step === STEPS.DONE && (
                <div className="actions">
                  <button className="btn-success" disabled>
                    ✅ Board created!
                  </button>
                  <button className="btn-ghost" onClick={reset}>
                    Import another
                  </button>
                </div>
              )}

              {step === STEPS.ERROR && (
                <div className="actions">
                  <button className="btn-primary" onClick={handleAnalyze}>
                    🔄 Retry
                  </button>
                  <button className="btn-ghost" onClick={reset}>
                    Start over
                  </button>
                </div>
              )}
            </div>
          )}

          {log.length > 0 && (
            <div className="log">
              {log.map((line, i) => (
                <div key={i} className="log-line">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'DM Sans', sans-serif;
          background: #0f0f13;
          color: #e8e6f0;
          height: 100vh;
          overflow: hidden;
        }
      `}</style>

      <style jsx>{`
        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 16px;
          gap: 12px;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .logo-icon {
          font-size: 20px;
          color: #a78bfa;
        }

        .logo-text {
          font-size: 15px;
          font-weight: 700;
          color: #f0eeff;
          letter-spacing: -0.3px;
        }

        .subtitle {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          margin-left: auto;
          font-family: 'DM Mono', monospace;
        }

        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow: hidden;
        }

        .drop-zone {
          flex: 1;
          border: 1.5px dashed rgba(167, 139, 250, 0.3);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(167, 139, 250, 0.03);
        }

        .drop-zone:hover, .drop-zone.drag-over {
          border-color: rgba(167, 139, 250, 0.7);
          background: rgba(167, 139, 250, 0.07);
        }

        .drop-icon { font-size: 36px; }

        .drop-title {
          font-size: 14px;
          font-weight: 600;
          color: #d4c9ff;
        }

        .drop-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          font-family: 'DM Mono', monospace;
        }

        .preview-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .preview-wrapper {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          max-height: 180px;
        }

        .preview-img {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
        }

        .done-overlay {
          position: absolute;
          inset: 0;
          background: rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          color: white;
          backdrop-filter: blur(2px);
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .btn-primary {
          flex: 1;
          padding: 10px;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s;
        }

        .btn-primary:hover { background: #6d28d9; }

        .btn-success {
          flex: 1;
          padding: 10px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
        }

        .btn-ghost {
          padding: 10px 14px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn-ghost:hover {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
        }

        .progress-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .progress-bar-wrap {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #a78bfa);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-family: 'DM Mono', monospace;
          text-align: right;
        }

        .log {
          flex: 1;
          overflow-y: auto;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .log-line {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          font-family: 'DM Mono', monospace;
          padding: 2px 0;
          line-height: 1.6;
        }

        .log-line:last-child {
          color: rgba(255,255,255,0.8);
        }
      `}</style>
    </>
  );
}
