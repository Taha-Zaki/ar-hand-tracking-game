
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | null = null;

export const initHandTracking = async () => {
  if (handLandmarker) return handLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.6, // افزایش دقت تشخیص
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  return handLandmarker;
};

// آستانه سخت‌گیرانه‌تر برای شلیک عمدی (کمتر از قبلی)
export const PINCH_THRESHOLD = 0.045; 

export const calculateDistance2D = (p1: any, p2: any) => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2)
  );
};
