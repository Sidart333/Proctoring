// services/ProctoringDetectionService.ts

import { FaceLandmarker, FilesetResolver,type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type {
  CalibrationData,
  DetectionResult,
  ProctoringConfig,
  FaceLandmark,
  MultiplePersonDetection
} from '../types/proctoring.types';
import {
  detectGaze,
  detectHeadMovement,
  detectUpGaze,
  calculateBaselineEyeOpening,
  isGazeOutOfBounds
} from '../utils/detectionUtils';

export class ProctoringDetectionService {
  private static instance: ProctoringDetectionService;
  private faceLandmarker: FaceLandmarker | null = null;
  private calibrationData: CalibrationData;
  private config: ProctoringConfig;
  private cheatingCounter: number = 0;
  private isInitialized: boolean = false;
  private detectionLoop: number | null = null;

  private constructor() {
    this.calibrationData = {
      centerH: 0.5,
      centerV: 0.5,
      baselineEyeOpening: 0,
      baselineHeadYaw: 0,
      isCalibrated: false,
      tolerance: {
        h: 0.15,
        v: 0.15,
        eyeOpening: 0.25,
        headYaw: 15
      }
    };

    this.config = {
      enableGazeDetection: true,
      enableHeadMovement: true,
      enableMultipleFaceDetection: true,
      enableEyeOpeningDetection: true,
      warningThreshold: 30,
      cautionThreshold: 15
    };
  }

  static getInstance(): ProctoringDetectionService {
    if (!ProctoringDetectionService.instance) {
      ProctoringDetectionService.instance = new ProctoringDetectionService();
    }
    return ProctoringDetectionService.instance;
  }

  async initFaceLandmarker(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 3
      });

      this.isInitialized = true;
      console.log('Face Landmarker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Face Landmarker:', error);
      throw error;
    }
  }

  setConfig(config: Partial<ProctoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getCalibrationData(): CalibrationData {
    return { ...this.calibrationData };
  }

  calibrate(landmarks: FaceLandmark[], calibrationImage?: string): CalibrationData {
    const gaze = detectGaze(landmarks);
    const baselineEyeOpening = calculateBaselineEyeOpening(landmarks);
    const headMovement = detectHeadMovement(landmarks, this.calibrationData);

    this.calibrationData = {
      centerH: gaze.avgH,
      centerV: gaze.avgV,
      baselineEyeOpening: baselineEyeOpening,
      baselineHeadYaw: headMovement.angle,
      isCalibrated: true,
      timestamp: Date.now(),
      calibrationImage: calibrationImage,
      tolerance: this.calibrationData.tolerance
    };

    console.log('Calibration complete:', {
      gazeCenter: { h: gaze.avgH.toFixed(3), v: gaze.avgV.toFixed(3) },
      baselineEyeOpening: baselineEyeOpening.toFixed(4),
      baselineHeadYaw: headMovement.angle.toFixed(2) + '°'
    });

    return this.getCalibrationData();
  }

  async detectFromVideo(video: HTMLVideoElement, timestamp: number): Promise<DetectionResult | null> {
    if (!this.faceLandmarker || !video || video.readyState < 2) {
      return null;
    }

    try {
      const results = await this.faceLandmarker.detectForVideo(video, timestamp);
      return this.processDetectionResults(results);
    } catch (error) {
      console.error('Detection error:', error);
      return null;
    }
  }

  private processDetectionResults(results: FaceLandmarkerResult): DetectionResult | null {
    const warnings: string[] = [];
    
    // Check for multiple faces
    const multipleFaces = this.detectMultipleFaces(results);
    if (this.config.enableMultipleFaceDetection && multipleFaces.multipleDetected) {
      warnings.push(`${multipleFaces.count} people detected`);
    }

    if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
      return {
        gaze: { leftH: 0, rightH: 0, leftV: 0, rightV: 0, avgH: 0, avgV: 0 },
        headMovement: { isMoving: false, direction: null, angle: 0 },
        multipleFaces,
        isLookingUp: false,
        warnings: ['No face detected'],
        warningLevel: 'warning'
      };
    }

    const landmarks = results.faceLandmarks[0] as FaceLandmark[];
    
    // Detect gaze
    const gaze = detectGaze(landmarks);
    if (this.config.enableGazeDetection && this.calibrationData.isCalibrated) {
      const gazeCheck = isGazeOutOfBounds(gaze, this.calibrationData);
      if (gazeCheck.isOut) {
        warnings.push(`Looking ${gazeCheck.direction.join(' ')}`);
      }
    }

    // Detect head movement
    const headMovement = detectHeadMovement(landmarks, this.calibrationData);
    if (this.config.enableHeadMovement && headMovement.isMoving) {
      warnings.push(`Head turned ${headMovement.direction}`);
    }

    // Detect up gaze (eye opening)
    const isLookingUp = this.config.enableEyeOpeningDetection 
      ? detectUpGaze(landmarks, this.calibrationData) 
      : false;
    if (isLookingUp) {
      warnings.push('Looking UP (eyelid)');
    }

    // Update cheating counter
    if (warnings.length > 0) {
      this.cheatingCounter = Math.min(this.cheatingCounter + 2, 60);
    } else {
      this.cheatingCounter = Math.max(this.cheatingCounter - 3, 0);
    }

    // Determine warning level
    let warningLevel: 'ok' | 'caution' | 'warning' = 'ok';
    if (this.cheatingCounter > this.config.warningThreshold!) {
      warningLevel = 'warning';
    } else if (this.cheatingCounter > this.config.cautionThreshold!) {
      warningLevel = 'caution';
    }

    return {
      gaze,
      headMovement,
      multipleFaces,
      isLookingUp,
      warnings,
      warningLevel
    };
  }

  private detectMultipleFaces(results: FaceLandmarkerResult): MultiplePersonDetection {
    const faceCount = results.faceLandmarks?.length || 0;
    return {
      multipleDetected: faceCount > 1,
      count: faceCount
    };
  }

  startDetectionLoop(
    video: HTMLVideoElement,
    onDetection: (result: DetectionResult) => void,
    onError?: (error: Error) => void
  ): void {
    if (this.detectionLoop !== null) {
      this.stopDetection();
    }

    let lastVideoTime = -1;

    const detect = async () => {
      try {
        if (video.currentTime === lastVideoTime) {
          this.detectionLoop = requestAnimationFrame(detect);
          return;
        }

        lastVideoTime = video.currentTime;
        const timestamp = performance.now();
        const result = await this.detectFromVideo(video, timestamp);

        if (result) {
          onDetection(result);
        }

        this.detectionLoop = requestAnimationFrame(detect);
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
        console.error('Detection loop error:', error);
      }
    };

    this.detectionLoop = requestAnimationFrame(detect);
  }

  stopDetection(): void {
    if (this.detectionLoop !== null) {
      cancelAnimationFrame(this.detectionLoop);
      this.detectionLoop = null;
    }
    this.cheatingCounter = 0;
  }

  captureSnapshot(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
    if (!video || !canvas) return null;

    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8);
  }

  destroy(): void {
    this.stopDetection();
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.isInitialized = false;
  }
}