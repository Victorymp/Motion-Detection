"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export default function OpenCVGrayComponent() {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [converted, setConverted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png"
  );
  const [dragging, setDragging] = useState(false);
  const [processingAnim, setProcessingAnim] = useState(false);

  useEffect(() => {
    // Inject OpenCV script
    if (!document.getElementById("opencv-script")) {
      const script = document.createElement("script");
      script.id = "opencv-script";
      script.src = "https://docs.opencv.org/4.x/opencv.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const check = setInterval(() => {
      const cv = window.cv;
      if (cv && cv.Mat) {
        if (typeof cv.onRuntimeInitialized === "function") {
          cv.onRuntimeInitialized = () => { setReady(true); setLoading(false); };
        } else {
          setReady(true);
          setLoading(false);
        }
        clearInterval(check);
      }
    }, 100);

    return () => clearInterval(check);
  }, []);

  const runGray = useCallback(() => {
    if (!ready || !imgRef.current || !canvasRef.current) return;
    setProcessingAnim(true);

    setTimeout(() => {
      try {
        const cv = window.cv;
        const src = cv.imread(imgRef.current);
        const dst = new cv.Mat();
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        cv.imshow(canvasRef.current, dst);
        src.delete();
        dst.delete();
        setConverted(true);
      } catch (e) {
        console.error("OpenCV error:", e);
      }
      setProcessingAnim(false);
    }, 600);
  }, [ready]);

  const handleReset = () => {
    setConverted(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    handleReset();
    setImgSrc(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ocv-root {
          min-height: 100vh;
          background: #0a0a0a;
          color: #f0ede8;
          font-family: 'Syne', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
          overflow: hidden;
        }

        .ocv-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 20% 10%, rgba(255,255,255,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 80% 90%, rgba(255,255,255,0.03) 0%, transparent 70%);
          pointer-events: none;
        }

        .ocv-noise {
          position: fixed;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          pointer-events: none;
        }

        .ocv-header {
          text-align: center;
          margin-bottom: 48px;
          position: relative;
        }

        .ocv-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.4);
          margin-bottom: 12px;
        }

        .ocv-title {
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #f0ede8 0%, rgba(240,237,232,0.5) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ocv-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 300;
          color: rgba(240,237,232,0.5);
        }

        .ocv-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${`#f0ede8`};
          opacity: 0.3;
          transition: background 0.4s, opacity 0.4s;
        }

        .ocv-dot.ready { background: #7fff7a; opacity: 1; animation: pulse-dot 2s ease-in-out infinite; }
        .ocv-dot.loading { background: #ffd97a; opacity: 1; animation: blink 1s ease-in-out infinite; }

        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(127,255,122,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(127,255,122,0); }
        }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

        .ocv-workspace {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          border: 1px solid rgba(240,237,232,0.08);
          border-radius: 2px;
          overflow: hidden;
          background: rgba(240,237,232,0.04);
          position: relative;
        }

        @media (max-width: 640px) {
          .ocv-workspace { grid-template-columns: 1fr; }
        }

        .ocv-panel {
          background: #111;
          padding: 0;
          position: relative;
          min-height: 340px;
          display: flex;
          flex-direction: column;
        }

        .ocv-panel-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.3);
          padding: 14px 18px;
          border-bottom: 1px solid rgba(240,237,232,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ocv-panel-num {
          font-size: 9px;
          color: rgba(240,237,232,0.15);
        }

        .ocv-img-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
        }

        .ocv-img-wrap img {
          max-width: 100%;
          max-height: 260px;
          object-fit: contain;
          display: block;
        }

        .ocv-canvas-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
        }

        .ocv-canvas-wrap canvas {
          max-width: 100%;
          max-height: 260px;
          object-fit: contain;
          display: block;
          transition: opacity 0.3s;
        }

        .ocv-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: rgba(240,237,232,0.15);
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 300;
          text-align: center;
        }

        .ocv-placeholder-icon {
          width: 48px;
          height: 48px;
          border: 1px solid rgba(240,237,232,0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          opacity: 0.4;
        }

        .ocv-divider {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          width: 32px;
          height: 32px;
          background: #1a1a1a;
          border: 1px solid rgba(240,237,232,0.12);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: rgba(240,237,232,0.4);
        }

        @media (max-width: 640px) {
          .ocv-divider { display: none; }
        }

        .ocv-controls {
          width: 100%;
          max-width: 900px;
          margin-top: 16px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ocv-btn {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          padding: 12px 28px;
          border-radius: 2px;
          border: 1px solid rgba(240,237,232,0.15);
          background: transparent;
          color: rgba(240,237,232,0.85);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .ocv-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(240,237,232,0.05);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
        }

        .ocv-btn:hover:not(:disabled)::before { transform: scaleX(1); }
        .ocv-btn:hover:not(:disabled) { border-color: rgba(240,237,232,0.35); color: #f0ede8; }
        .ocv-btn:disabled { opacity: 0.2; cursor: not-allowed; }

        .ocv-btn.primary {
          background: #f0ede8;
          color: #0a0a0a;
          border-color: transparent;
          font-weight: 700;
        }

        .ocv-btn.primary::before { background: rgba(0,0,0,0.08); }
        .ocv-btn.primary:hover:not(:disabled) { background: #fff; border-color: transparent; color: #0a0a0a; }
        .ocv-btn.primary:disabled { background: rgba(240,237,232,0.2); color: rgba(0,0,0,0.3); }

        .ocv-upload-area {
          flex: 1;
          min-width: 180px;
          border: 1px dashed rgba(240,237,232,0.12);
          border-radius: 2px;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: rgba(240,237,232,0.35);
        }

        .ocv-upload-area:hover, .ocv-upload-area.drag-over {
          border-color: rgba(240,237,232,0.3);
          background: rgba(240,237,232,0.03);
          color: rgba(240,237,232,0.6);
        }

        .ocv-processing-overlay {
          position: absolute;
          inset: 0;
          background: rgba(10,10,10,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .ocv-processing-overlay.active { opacity: 1; pointer-events: all; }

        .ocv-spinner {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(240,237,232,0.15);
          border-top-color: rgba(240,237,232,0.8);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .ocv-scan-line {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 3;
        }

        .ocv-scan-line::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(240,237,232,0.6), transparent);
          animation: scan 1.4s linear infinite;
          opacity: 0;
        }

        .ocv-scan-line.active::after { opacity: 1; }

        @keyframes scan {
          from { top: -2px; }
          to { top: 100%; }
        }

        .ocv-footer {
          margin-top: 32px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(240,237,232,0.2);
          letter-spacing: 0.1em;
          text-align: center;
        }
      `}</style>

      <div className="ocv-root">
        <div className="ocv-noise" />

        <header className="ocv-header">
          <div className="ocv-eyebrow">Computer Vision · OpenCV.js</div>
          <h1 className="ocv-title">GRAYSCALE</h1>
          <div className="ocv-status">
            <span className={`ocv-dot ${loading ? 'loading' : ready ? 'ready' : ''}`} />
            {loading ? 'initializing opencv...' : ready ? 'opencv ready' : 'opencv error'}
          </div>
        </header>

        <div className="ocv-workspace">
          {/* Input Panel */}
          <div className="ocv-panel">
            <div className="ocv-panel-label">
              <span>Input</span>
              <span className="ocv-panel-num">01</span>
            </div>
            <div className="ocv-img-wrap">
              <img
                ref={imgRef}
                src={imgSrc}
                alt="input"
                crossOrigin="anonymous"
                onLoad={() => { handleReset(); }}
              />
            </div>
          </div>

          {/* Output Panel */}
          <div className="ocv-panel">
            <div className="ocv-panel-label">
              <span>Output · Grayscale</span>
              <span className="ocv-panel-num">02</span>
            </div>
            <div className="ocv-canvas-wrap">
              <div className={`ocv-scan-line ${processingAnim ? 'active' : ''}`} />
              <div className={`ocv-processing-overlay ${processingAnim ? 'active' : ''}`}>
                <div className="ocv-spinner" />
              </div>
              {!converted ? (
                <div className="ocv-placeholder">
                  <div className="ocv-placeholder-icon">◐</div>
                  <span>awaiting conversion</span>
                </div>
              ) : null}
              <canvas
                ref={canvasRef}
                style={{ opacity: converted ? 1 : 0, maxWidth: '100%', maxHeight: '260px' }}
              />
            </div>
          </div>

          <div className="ocv-divider">→</div>
        </div>

        <div className="ocv-controls">
          {/* Upload area */}
          <label
            className={`ocv-upload-area ${dragging ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])}
            />
            <span>↑</span>
            <span>drop or browse image</span>
          </label>

          {converted && (
            <button className="ocv-btn" onClick={handleReset}>
              Reset
            </button>
          )}

          <button
            className="ocv-btn primary"
            onClick={runGray}
            disabled={!ready || processingAnim}
          >
            {processingAnim ? 'Processing...' : 'Convert to Grayscale'}
          </button>
        </div>

        <div className="ocv-footer">
          cv.COLOR_RGBA2GRAY · WebAssembly · In-browser processing
        </div>
      </div>
    </>
  );
}