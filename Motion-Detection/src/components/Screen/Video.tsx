"use-client";

import React, { useEffect, useRef, useState, useCallback } from "react";
// import * as fs from "fs";
// import { format } from "date-fns";

declare global {
  interface Window {
    cv: {
      Mat: new (...args: any[]) => any;


      imread: (image: any) => any;
      imshow: (canvasId: any, mat: any) => void;
      cvtColor: (src: any, dst: any, code: number) => void;

      onRuntimeInitialized?: () => void;
      COLOR_RGBA2GRAY: number;
      CV_8UC4: number;
      CAP_PROP_POS_FRAMES: number;
      CAP_PROP_FPS: number;
      INTER_LINEAR: number;
      CHAIN_APPROX_SIMPLE: number;
      RETR_EXTERNAL: number;

      contourArea(...args: any[]) :any;

      boundingRect(...args: any[]) :any;
      rectangle(...args: any[]) :any;
      Point : new (...args: any[]) => any;

      findContours(...args: any[]) :any;

      get(propId: number): number;

      MatVector: new (...args: any[]) => any;

      VideoCapture: new (video: HTMLVideoElement) => VideoCaptureInstance;

      BackgroundSubtractorMOG2: new (
        history?: number,
        varThreshold?: number,
        detectShadows?: boolean
      ) => BackgroundSubtractorInstance;

      createBackgroundSubtractorMOG2: (
        history?: number,
        varThreshold?: number,
        detectShadows?: boolean
      ) => BackgroundSubtractorInstance;
    };
  }
}
interface VideoCaptureInstance {
  read(frame: any): boolean;

  get(propId: number): number;
  set?(propId: number, value: number): boolean;
  delete?(): void;
}

interface BackgroundSubtractorInstance {
  apply(frame: any, fgmask?: any, learningRate?: number): any;
  delete?(): void;
};

type CV = typeof window.cv;

declare const vid: InstanceType<CV["VideoCapture"]>;
declare const fgbg: ReturnType<CV["createBackgroundSubtractorMOG2"]>;

declare const fW: number;
declare const fH: number;
declare const fA: number;
declare const fps: number;
declare const frame_detected: boolean[];
declare const detection_zones: number[];
declare let motion_segments:[number, number][];

export default function OpenCVGrayComponent() {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  let motion_segments = [];



  useEffect(() => {
    // Inject OpenCV script
    if (!document.getElementById("opencv-script")) {
      const script = document.createElement("script");
      script.id = "opencv-script";
      script.src = "https://docs.opencv.org/4.x/opencv.js";
      script.async = true;
      document.body.appendChild(script);
    }
    // Wait until OpenCV is ready
    const check = setInterval(() => {
      const cv = window.cv;
      if (cv && cv.Mat) {
        // Some builds expose onRuntimeInitialized (Emscripten)
        if (typeof cv.onRuntimeInitialized === "function") {
          // cv.onRuntimeInitialized = () => { setReady(true); setLoading(false); };
          console.log(cv);
          setReady(true); 
          setLoading(false); 
        } else {
          setLoading(false);
        }
        clearInterval(check);
      }
    }, 50);
    return () => clearInterval(check);
  }, []);

  function divmod(a: number, b: number): [number, number] {
    return [Math.floor(a / b), a % b];
  }

  const runGray = useCallback(() => {
    if (!ready || !imgRef.current || !canvasRef.current) return;

    const cv = window.cv;

    // Read image -> Mat
    const src = cv.imread(imgRef.current);
    const dst = new cv.Mat();

    // Convert RGBA -> GRAY
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

    // Show result
    cv.imshow(canvasRef.current, dst);

    // Free memory
    src.delete();
    dst.delete();
  }, [ready]);

  const runDetection = useCallback(() => {
  if (!ready || !videoRef.current || !canvasRef.current) return;

  const video = videoRef.current;
  const cv = window.cv;

  const start = Date.now();

  const buffer_seconds = 0.01;
  let last_frame_detection = -1e9;

  video.height = video.videoHeight;
  video.width = video.videoWidth;

  let fH = video.height;
  let fW = video.width;

  console.log(`Video height ${fH}, Video width ${fW}`);

  const cap = new cv.VideoCapture(video);
  const frame = new cv.Mat(fH, fW, cv.CV_8UC4);
  const fgbg = new cv.BackgroundSubtractorMOG2();

  const fps = 30;
  const buffer_frames = Math.floor(buffer_seconds * fps);

  let idx = 0;

  const detection_zones: number[] = [];
  const motion_segments: [number, number][] = [];

  function process() {
    cap.read(frame);

    if (frame.empty()) {
      requestAnimationFrame(process);
      return;
    }

    const fgmask = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    try {
      fgbg.apply(frame, fgmask);

      cv.findContours(
        fgmask,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      let motion_detected = false;

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);

        if (cv.contourArea(contour) < 1000) {
          contour.delete();
          continue;
        }

        const rect = cv.boundingRect(contour);

        cv.rectangle(
          frame,
          new cv.Point(rect.x, rect.y),
          new cv.Point(rect.x + rect.width, rect.y + rect.height),
          [0, 255, 0, 255],
          2
        );

        motion_detected = true;
        contour.delete();
      }

      if (motion_detected) {
        last_frame_detection = idx;

        const timestamp = idx / fps;
        detection_zones.push(timestamp);

        console.log(
          `Motion detected at frame ${idx} (${timestamp.toFixed(2)}s)`
        );
      }

      cv.imshow(canvasRef.current, frame);

      idx++;
    } finally {
      fgmask.delete();
      contours.delete();
      hierarchy.delete();
    }

    // stop when video ends
    if (video.ended) {
      finalize();
      return;
    }

    requestAnimationFrame(process);
  }

  function finalize() {
    console.log("Processing finished");
    console.log("Detection zones:", detection_zones);

    if (detection_zones.length === 0) return;

    let segment_start = detection_zones[0];
    let prev_time = detection_zones[0];

    const gap_threshold = (1 / fps) * 2;

    for (let i = 1; i < detection_zones.length; i++) {
      const t = detection_zones[i];

      if (t - prev_time > gap_threshold) {
        motion_segments.push([segment_start, prev_time]);

        console.log(
          `Segment detected: ${segment_start.toFixed(2)}s → ${prev_time.toFixed(2)}s`
        );

        segment_start = t;
      }

      prev_time = t;
    }

    motion_segments.push([segment_start, prev_time]);

    console.log("Final motion segments:", motion_segments);

    motion_segments.forEach(([start, end], index) => {
      const i = index + 1;

      const s_m = Math.floor(start / 60);
      const s_s = start % 60;

      const e_m = Math.floor(end / 60);
      const e_s = end % 60;

      const motion_length = end - start;

      console.log(
        `Segment ${i}: ${s_m}:${s_s.toFixed(2)} → ${e_m}:${e_s.toFixed(
          2
        )} (length ${motion_length.toFixed(2)}s)`
      );
    });

    const end = Date.now();
    const length = (end - start) / 1000;

    const mins = Math.floor(length / 60);
    const seconds = length % 60;

    console.log(`Processing time: ${mins}:${seconds.toFixed(2)}`);
  }

  process();
}, [ready]);

  return (
    <>
      <div >
        <div>
          <div >
            OpenCV status: {loading ? 'initializing opencv...' : ready ? 'opencv ready' : 'opencv error'}
          </div>

          <img
            ref={imgRef}
            src="/sample.jpg"
            alt="input"
            crossOrigin="anonymous"
          />
          <video
            ref={videoRef}
            src="/WildLifeExample.mp4"
            autoPlay
            muted
            playsInline
            crossOrigin="anonymous"
          />
        </div>

        <button onClick={runGray} disabled={!ready}>
          Convert to grayscale
        </button>

        <button onClick={runDetection} disabled={!ready}>
          Detect movement
        </button>

        <canvas ref={canvasRef} />
      </div>
    </>
  );
}