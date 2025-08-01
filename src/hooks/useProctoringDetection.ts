// hooks/useProctoringDetection.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { ProctoringDetectionService } from '../service/ProctoringDetectionService';
import type { DetectionResult, CalibrationData, ProctoringConfig, FaceLandmark } from '../types/proctoring.types';

interface UseProctoringDetectionReturn {
  isWarning: boolean;
  detectionResult: DetectionResult | null;
  calibrationData: CalibrationData | null;
  isInitialized: boolean;
  isDetecting: boolean;
  warningMessage: string;
  
  initialize: () => Promise<void>;
  calibrate: (landmarks: FaceLandmark[], calibrationImage?: string) => CalibrationData;
  startDetection: (videoElement: HTMLVideoElement) => void;
  stopDetection: () => void;
  captureSnapshot: (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => string | null;
  setConfig: (config: Partial<ProctoringConfig>) => void;
}

export function useProctoringDetection(): UseProctoringDetectionReturn {
  const [isWarning, setIsWarning] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  const serviceRef = useRef<ProctoringDetectionService | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize service on mount
  useEffect(() => {
    serviceRef.current = ProctoringDetectionService.getInstance();
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.stopDetection();
      }
    };
  }, []);

  const initialize = useCallback(async () => {
    if (!serviceRef.current || isInitialized) return;
    
    try {
      await serviceRef.current.initFaceLandmarker();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize proctoring:', error);
      throw error;
    }
  }, [isInitialized]);

  const calibrate = useCallback((landmarks: FaceLandmark[], calibrationImage?: string): CalibrationData => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }
    
    const calibData = serviceRef.current.calibrate(landmarks, calibrationImage);
    setCalibrationData(calibData);
    return calibData;
  }, []);

  const handleDetectionResult = useCallback((result: DetectionResult) => {
    setDetectionResult(result);
    
    // Update warning state based on detection
    const shouldWarn = result.warningLevel === 'warning' || result.warningLevel === 'caution';
    setIsWarning(shouldWarn);
    
    // Set warning message
    if (result.warnings.length > 0) {
      setWarningMessage(result.warnings.join(' | '));
    } else {
      setWarningMessage('');
    }
    
    // Auto-hide warning after a delay if behavior normalizes
    if (shouldWarn) {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      
      if (result.warningLevel === 'caution') {
        warningTimeoutRef.current = setTimeout(() => {
          setIsWarning(false);
          setWarningMessage('');
        }, 3000);
      }
    }
  }, []);

  const startDetection = useCallback((videoElement: HTMLVideoElement) => {
    if (!serviceRef.current || !isInitialized) {
      console.error('Service not initialized');
      return;
    }
    
    serviceRef.current.startDetectionLoop(
      videoElement,
      handleDetectionResult,
      (error) => {
        console.error('Detection error:', error);
        setIsDetecting(false);
      }
    );
    
    setIsDetecting(true);
  }, [isInitialized, handleDetectionResult]);

  const stopDetection = useCallback(() => {
    if (!serviceRef.current) return;
    
    serviceRef.current.stopDetection();
    setIsDetecting(false);
    setIsWarning(false);
    setWarningMessage('');
    
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
  }, []);

  const captureSnapshot = useCallback((videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): string | null => {
    if (!serviceRef.current) return null;
    
    return serviceRef.current.captureSnapshot(videoElement, canvasElement);
  }, []);

  const setConfig = useCallback((config: Partial<ProctoringConfig>) => {
    if (!serviceRef.current) return;
    
    serviceRef.current.setConfig(config);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  return {
    isWarning,
    detectionResult,
    calibrationData,
    isInitialized,
    isDetecting,
    warningMessage,
    
    initialize,
    calibrate,
    startDetection,
    stopDetection,
    captureSnapshot,
    setConfig
  };
}