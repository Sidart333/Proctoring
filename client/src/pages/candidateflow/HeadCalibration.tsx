import React, { useRef, useEffect, useState } from 'react';
import { Button, Card, Typography, Space, Alert, Steps } from 'antd';
import { CameraOutlined, CameraTwoTone } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useProctoringDetection } from '../../hooks/useProctoringDetection';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const { Title, Text } = Typography;
const { Step } = Steps;

const steps = [
  'Camera Setup',
  'Camera Access',
  'Face Positioning',
  'Calibration Complete',
];

const HeadCalibrationPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const navigate = useNavigate();
  const { token } = useParams();

  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState('Position your face in the center');
  const [cameraError, setCameraError] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [calibrationImage, setCalibrationImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { initialize, calibrate, isInitialized } = useProctoringDetection();

  // Initialize MediaPipe Face Landmarker for calibration
  useEffect(() => {
    const initializeFaceLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'IMAGE',
          numFaces: 1
        });

        // Initialize the proctoring service
        await initialize();
      } catch (error) {
        console.error('Failed to initialize Face Landmarker:', error);
        setCameraError('Failed to initialize face detection');
      }
    };

    initializeFaceLandmarker();

    return () => {
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, [initialize]);

  const initializeCamera = async () => {
    console.log('📸 Initializing camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('📸 Metadata loaded');
          videoRef.current?.play().catch(console.error);
        };
      } else {
        console.warn('⛔ videoRef.current not ready yet');
      }

      setCameraAccess(true);
      setStep(2);
      setFeedback('Look straight into the camera');
    } catch (error) {
      console.error('❌ Camera error:', error);
      setCameraError('Camera access denied or not available');
      setStep(0);
    }
  };

  const captureCalibrationImage = async () => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarkerRef.current) {
      setFeedback('Unable to capture image. Please try again.');
      return;
    }

    setIsProcessing(true);
    setFeedback('Processing calibration...');

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Detect face landmarks
      const result = await faceLandmarkerRef.current.detect(videoRef.current);
      
      if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        setFeedback('No face detected. Please ensure your face is clearly visible.');
        setIsProcessing(false);
        return;
      }

      // Calibrate the proctoring system with detected landmarks
      const landmarks = result.faceLandmarks[0];
      const calibrationData = calibrate(landmarks, imageData);
      
      setCalibrationImage(imageData);
      setFeedback('Calibration successful! Redirecting to test...');
      setStep(3);

      // Store calibration data in sessionStorage for the test interface
      sessionStorage.setItem('calibrationData', JSON.stringify(calibrationData));
      sessionStorage.setItem('calibrationImage', imageData);

      // Navigate to test interface after a short delay
      setTimeout(() => {
        navigate(`/test/${token}/interview`);
      }, 2000);

    } catch (error) {
      console.error('Calibration error:', error);
      setFeedback('Calibration failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (videoReady) {
      console.log('✅ videoRef mounted. Now initializing camera...');
      initializeCamera();
    }
  }, [videoReady]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card
        style={{
          maxWidth: '900px',
          width: '100%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          borderRadius: '12px',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ color: '#1890ff' }}>
              Head Calibration
            </Title>
            <Text type="secondary">
              Please position your face for the proctoring system
            </Text>
          </div>

          <Steps current={step} size="small">
            {steps.map((title) => (
              <Step key={title} title={title} />
            ))}
          </Steps>

          <div
            style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}
          >
            <div style={{ flex: 2 }}>
              <Card
                title="Camera Preview"
                styles={{
                  body: {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '450px',
                    position: 'relative'
                  },
                }}
              >
                <video
                  ref={(ref) => {
                    videoRef.current = ref;
                    if (ref && !videoReady) setVideoReady(true);
                  }}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    backgroundColor: '#000',
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {calibrationImage && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '120px',
                      height: '90px',
                      border: '2px solid #52c41a',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={calibrationImage}
                      alt="Calibration"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </Card>
            </div>

            <div style={{ flex: 1 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                  message="Status"
                  description={feedback}
                  type={step === 3 ? 'success' : cameraAccess ? 'info' : 'warning'}
                  showIcon
                />

                {cameraError && (
                  <Alert
                    message="Camera Error"
                    description={cameraError}
                    type="error"
                    showIcon
                  />
                )}

                <Alert
                  message="Calibration Instructions"
                  description={
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      <li>Ensure good lighting on your face</li>
                      <li>Look directly at the camera</li>
                      <li>Keep your head straight and centered</li>
                      <li>Remove glasses if they cause glare</li>
                    </ul>
                  }
                  type="info"
                />

                {!cameraAccess ? (
                  <Button
                    type="primary"
                    icon={<CameraOutlined />}
                    onClick={() => setVideoReady(true)}
                    size="large"
                    style={{ width: '100%' }}
                    disabled={!isInitialized}
                    loading={!isInitialized}
                  >
                    {isInitialized ? 'Initialize Camera' : 'Loading...'}
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<CameraTwoTone />}
                    onClick={captureCalibrationImage}
                    size="large"
                    style={{ width: '100%' }}
                    disabled={step === 3 || isProcessing}
                    loading={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Capture Calibration Image'}
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default HeadCalibrationPage;