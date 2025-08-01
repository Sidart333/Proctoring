import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Divider, Input, Typography, Alert, Badge } from 'antd';
import { VideoCameraOutlined, AudioOutlined, WarningOutlined } from '@ant-design/icons';
import WaveformVisualizer from '../../components/waveformVisualizer';
import { useProctoringDetection } from '../../hooks/useProctoringDetection';

const { Title, Text } = Typography;
const { TextArea } = Input;

type SpeechRecognitionEvent = Event & {
    results: SpeechRecognitionResultList;
    resultIndex: number;
};

const mockQuestions = [
    'Explain the difference between var, let, and const in JavaScript.',
    'What are React hooks and how do they work?',
    'What is the difference between == and === in JavaScript?',
];

const TestInterface: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const recognitionRef = useRef<any>(null);

    const [questionIndex, setQuestionIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [_isTranscribing, setIsTranscribing] = useState(false);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [warningSnapshots, setWarningSnapshots] = useState<string[]>([]);

    // Proctoring detection hook
    const {
        isWarning,
        warningMessage,
        detectionResult,
        isInitialized,
        isDetecting,
        initialize,
        startDetection,
        stopDetection,
        captureSnapshot
    } = useProctoringDetection();

    // Initialize proctoring on mount
    useEffect(() => {
        const initProctoring = async () => {
            try {
                await initialize();
                console.log('Proctoring initialized');
            } catch (error) {
                console.error('Failed to initialize proctoring:', error);
            }
        };

        initProctoring();
    }, [initialize]);

    const initializeCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setCameraReady(true);
                };
            }
        } catch (error) {
            console.error('Camera initialization failed:', error);
        }
    };

    // Start proctoring detection when camera is ready
    useEffect(() => {
        if (cameraReady && isInitialized && videoRef.current && !isDetecting) {
            startDetection(videoRef.current);
        }

        return () => {
            if (isDetecting) {
                stopDetection();
            }
        };
    }, [cameraReady, isInitialized, isDetecting, startDetection, stopDetection]);

    // Capture snapshot when warning is triggered
    useEffect(() => {
        if (isWarning && videoRef.current && canvasRef.current) {
            const snapshot = captureSnapshot(videoRef.current, canvasRef.current);
            if (snapshot) {
                setWarningSnapshots(prev => [...prev.slice(-4), snapshot]); // Keep last 5 snapshots
                console.log('Warning snapshot captured:', new Date().toISOString());
            }
        }
    }, [isWarning, captureSnapshot]);

    const initializeSpeechRecognition = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Web Speech API is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (result.isFinal) {
                    setTranscription((prev) => prev + result[0].transcript + ' ');
                } else {
                    interimTranscript += result[0].transcript;
                }
            }
        };

        recognition.onend = () => {
            if (isRecording) {
                recognition.start();
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);
            setIsRecording(true);
            setIsTranscribing(true);
            initializeSpeechRecognition();
        } catch (error) {
            console.error('Microphone access denied or unavailable.');
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        if (audioStream) {
            audioStream.getTracks().forEach((track) => track.stop());
        }

        setIsRecording(false);
        setIsTranscribing(false);
    };

    const submitAnswer = () => {
        console.log('Transcription submitted:', transcription);
        console.log('Warning snapshots:', warningSnapshots.length);
        setTranscription('');
        setIsRecording(false);
        setIsTranscribing(false);
        setAudioStream(null);
        setQuestionIndex((prev) => (prev + 1) % mockQuestions.length);
    };

    useEffect(() => {
        initializeCamera();
    }, []);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
            {/* Warning Banner */}
            {isWarning && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: '#ff4d4f',
                        color: '#fff',
                        padding: '12px 20px',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        animation: 'slideDown 0.3s ease-out'
                    }}
                >
                    <WarningOutlined style={{ fontSize: '20px' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                        ⚠️ WARNING: {warningMessage || 'Suspicious activity detected'}
                    </span>
                </div>
            )}

            {/* Left Video Panel */}
            <div style={{ width: '20%', padding: '20px', paddingTop: isWarning ? '60px' : '20px' }}>
                <Card
                    title={
                        <span>
                            <VideoCameraOutlined /> Camera Feed
                            {isDetecting && (
                                <Badge 
                                    status="processing" 
                                    style={{ marginLeft: '10px' }}
                                    text="Monitoring"
                                />
                            )}
                        </span>
                    }
                    size="small"
                >
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{ 
                            width: '100%', 
                            borderRadius: '8px', 
                            backgroundColor: '#000',
                            border: isWarning ? '3px solid #ff4d4f' : 'none'
                        }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    {/* Detection Status */}
                    <div style={{ marginTop: '10px', fontSize: '12px' }}>
                        <Text type="secondary">
                            Status: {detectionResult?.warningLevel === 'ok' ? '✅ Normal' : 
                                    detectionResult?.warningLevel === 'caution' ? '⚠️ Caution' : 
                                    '🚨 Warning'}
                        </Text>
                    </div>
                </Card>

                {/* Debug Info (optional - remove in production) */}
                {detectionResult && (
                    <Card size="small" style={{ marginTop: '10px', fontSize: '11px' }}>
                        <Text type="secondary">
                            Faces: {detectionResult.multipleFaces.count}<br/>
                            Warnings: {detectionResult.warnings.length}
                        </Text>
                    </Card>
                )}
            </div>

            {/* Center Content */}
            <div style={{ flex: 1, padding: '40px', paddingTop: isWarning ? '80px' : '40px' }}>
                <Card>
                    <Title level={4}>Question {questionIndex + 1}:</Title>
                    <Text>{mockQuestions[questionIndex]}</Text>

                    <Divider />

                    <Button
                        type="primary"
                        icon={<AudioOutlined />}
                        onClick={startRecording}
                        disabled={isRecording}
                    >
                        Start Recording
                    </Button>

                    <Button
                        danger
                        onClick={stopRecording}
                        disabled={!isRecording}
                        style={{ marginLeft: '10px' }}
                    >
                        Stop Recording
                    </Button>

                    <Divider />

                    <WaveformVisualizer isRecording={isRecording} audioStream={audioStream ?? undefined} />

                    <Divider />

                    <Text strong>Live Transcription:</Text>
                    <TextArea
                        value={transcription}
                        readOnly
                        autoSize={{ minRows: 3, maxRows: 6 }}
                        placeholder="Your speech will appear here..."
                    />

                    <Divider />

                    <Button
                        type="primary"
                        onClick={submitAnswer}
                        disabled={!transcription.trim()}
                    >
                        Submit Answer
                    </Button>
                </Card>
            </div>

            {/* CSS for warning animation */}
            <style>{`
                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default TestInterface;