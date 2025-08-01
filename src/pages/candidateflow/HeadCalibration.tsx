import React, { useRef, useEffect, useState } from 'react';
import { Button, Card, Typography, Space, Alert, Steps } from 'antd';
import { CameraOutlined, CameraTwoTone } from '@ant-design/icons';

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

  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState('Position your face in the center');
  const [cameraError, setCameraError] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [calibrationImage, setCalibrationImage] = useState<string | null>(null);

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

  const captureCalibrationImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCalibrationImage(imageData);
    setFeedback('Calibration image captured successfully!');
    setStep(3);
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
              </Card>
            </div>

            <div style={{ flex: 1 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                  message="Status"
                  description={feedback}
                  type={cameraAccess ? 'success' : 'info'}
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

                {!cameraAccess ? (
                  <Button
                    type="primary"
                    icon={<CameraOutlined />}
                    onClick={() => setVideoReady(true)}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    Initialize Camera
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<CameraTwoTone />}
                    onClick={captureCalibrationImage}
                    size="large"
                    style={{ width: '100%' }}
                    disabled={step === 3}
                  >
                    Capture Calibration Image
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
