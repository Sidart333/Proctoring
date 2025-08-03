import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Divider, Input, Typography, Alert, Badge, List, Drawer } from 'antd';
import {
  VideoCameraOutlined,
  AudioOutlined,
  WarningOutlined,
  SecurityScanOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import WaveformVisualizer from '../../components/waveformVisualizer';
import { useProctoringDetection } from '../../hooks/useProctoringDetection';
import { useBrowserProctoring } from '../../hooks/useBrowserProctoring';
import { ProctoringOverlay } from '../../components/ProctoringOverlay';

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
    const testContainerRef = useRef<HTMLDivElement>(null);

    const [questionIndex, setQuestionIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [_isTranscribing, setIsTranscribing] = useState(false);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [warningSnapshots, setWarningSnapshots] = useState<string[]>([]);
    const [showViolationHistory, setShowViolationHistory] = useState(false);
    const [testStarted, setTestStarted] = useState(false);
    const [isActuallyFullscreen, setIsActuallyFullscreen] = useState(false);

    // Face detection proctoring hook
    const {
        isWarning: isFaceWarning,
        warningMessage: faceWarningMessage,
        detectionResult,
        isInitialized,
        isDetecting,
        initialize,
        startDetection,
        stopDetection,
        captureSnapshot
    } = useProctoringDetection();

    // Browser proctoring hook
    const {
        violations,
        violationCount,
        isFullscreen,
        warningLevel: browserWarningLevel,
        isMonitoring,
        isTerminated,
        startMonitoring,
        stopMonitoring,
        enterFullscreen,
        captureScreenshot,
        getViolationMessage
    } = useBrowserProctoring({
        config: {
            maxViolations: 10,
            screenshotOnViolation: true,
            autoTerminateOnMaxViolations: true
        },
        onViolation: (violation) => {
            console.log('Browser violation:', violation);
            // Capture screenshot on violation
            if (videoRef.current && canvasRef.current) {
                const screenshot = captureScreenshot(canvasRef.current, videoRef.current);
                if (screenshot) {
                    setWarningSnapshots(prev => [...prev.slice(-9), screenshot]);
                }
            }
        },
        onTermination: (violations) => {
            console.log('Test terminated due to violations:', violations);
            alert('Test has been terminated due to multiple violations.');
            // Navigate away or handle termination
            window.location.href = '/';
        }
    });

    // Combined warning state
    const isAnyWarning = isFaceWarning || browserWarningLevel !== 'none';
    const combinedWarningMessage = [
        faceWarningMessage,
        getViolationMessage()
    ].filter(Boolean).join(' | ');


    useEffect(() => {
    const handleFullscreenChange = () => {
        setIsActuallyFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    // Check initial state
    setIsActuallyFullscreen(!!document.fullscreenElement);

    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
}, []);

    // Initialize proctoring on mount
    useEffect(() => {
        const initProctoring = async () => {
            try {
                await initialize();
                console.log('Face proctoring initialized');
            } catch (error) {
                console.error('Failed to initialize face proctoring:', error);
            }
        };

        initProctoring();
    }, [initialize]);

    const initializeCamera = async () => {
    console.log('initializeCamera called');
    console.log('videoRef.current:', videoRef.current);
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });
        
        console.log('Stream obtained:', stream);
        console.log('Video tracks:', stream.getVideoTracks());
        
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            console.log('srcObject set');
            
            await videoRef.current.play();
            console.log('Play called successfully');
            setCameraReady(true);
        } else {
            console.error('videoRef.current is null');
        }
    } catch (error) {
        console.error('Camera error details:', error);
    }
};

    // Start test and all monitoring
    const handleStartTest = async () => {
        setTestStarted(true);
        
        // Start browser monitoring
        if (testContainerRef.current) {
            await startMonitoring(testContainerRef.current);
        }
    };

    // Start face detection when camera is ready
    useEffect(() => {
        if (cameraReady && isInitialized && videoRef.current && !isDetecting && testStarted) {
            startDetection(videoRef.current);
        }

        return () => {
            if (isDetecting) {
                stopDetection();
            }
        };
    }, [cameraReady, isInitialized, isDetecting, startDetection, stopDetection, testStarted]);

    // Capture snapshot when any warning is triggered
    useEffect(() => {
        if (isAnyWarning && videoRef.current && canvasRef.current) {
            const snapshot = captureSnapshot(videoRef.current, canvasRef.current);
            if (snapshot) {
                setWarningSnapshots(prev => [...prev.slice(-9), snapshot]);
                console.log('Warning snapshot captured:', new Date().toISOString());
            }
        }
    }, [isAnyWarning, captureSnapshot]);

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
        console.log('Face warnings:', detectionResult?.warnings);
        console.log('Browser violations:', violations.length);
        console.log('Warning snapshots:', warningSnapshots.length);
        
        setTranscription('');
        setIsRecording(false);
        setIsTranscribing(false);
        setAudioStream(null);
        setQuestionIndex((prev) => (prev + 1) % mockQuestions.length);
    };

    // useEffect(() => {
    //     initializeCamera();
        
    //     return () => {
    //         if (isMonitoring) {
    //             stopMonitoring();
    //         }
    //     };
    // }, []);
    useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
        initializeCamera();
    }, 100);

    return () => {
        clearTimeout(timer);
        // Cleanup camera stream on unmount
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
}, []);

    // Determine overall warning level
    const getOverallWarningLevel = () => {
        if (browserWarningLevel === 'high' || (isFaceWarning && detectionResult?.warningLevel === 'warning')) {
            return 'high';
        } else if (browserWarningLevel === 'medium' || (isFaceWarning && detectionResult?.warningLevel === 'caution')) {
            return 'medium';
        } else if (browserWarningLevel === 'low' || isFaceWarning) {
            return 'low';
        }
        return 'none';
    };

    if (isTerminated) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: '#f5f5f5'
            }}>
                <Card>
                    <Title level={3} style={{ color: '#ff4d4f' }}>Test Terminated</Title>
                    <Text>Your test has been terminated due to multiple violations.</Text>
                </Card>
            </div>
        );
    }

    if (!testStarted) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: '#f5f5f5'
            }}>
                <Card style={{ width: '500px', textAlign: 'center' }}>
                    <SecurityScanOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '20px' }} />
                    <Title level={3}>Proctored Test Environment</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
                        This test is monitored for security. You will need to:
                    </Text>
                    <List
                        size="small"
                        dataSource={[
                            'Enter fullscreen mode',
                            'Keep your face visible in the camera',
                            'Stay on this tab throughout the test',
                            'Avoid using keyboard shortcuts',
                            'Complete the test without interruptions'
                        ]}
                        renderItem={item => (
                            <List.Item style={{ textAlign: 'left' }}>
                                <Text>• {item}</Text>
                            </List.Item>
                        )}
                        style={{ marginBottom: '24px' }}
                    />
                    <Button
                        type="primary"
                        size="large"
                        onClick={handleStartTest}
                        icon={<SecurityScanOutlined />}
                    >
                        Start Proctored Test
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div ref={testContainerRef} style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
            {/* Proctoring Overlay (Warnings and Fullscreen) */}
            <ProctoringOverlay
                warningLevel={getOverallWarningLevel()}
                violationCount={violationCount}
                maxViolations={10}
                warningMessage={combinedWarningMessage}
                isFullscreen={isFullscreen}
                onEnterFullscreen={enterFullscreen}
                onTerminate={() => window.location.href = '/'}
                showFullscreenPrompt={testStarted}
            />

            {/* Left Video Panel */}
            <div style={{ width: '20%', padding: '20px', paddingTop: isAnyWarning ? '80px' : '20px' }}>
                <Card
                    title={
                        <span>
                            <VideoCameraOutlined /> Camera Feed
                            <Badge 
                                status={isDetecting && isMonitoring ? "processing" : "default"}
                                style={{ marginLeft: '10px' }}
                                text={isDetecting && isMonitoring ? "Monitoring" : "Initializing"}
                            />
                        </span>
                    }
                    size="small"
                    extra={
                        <Button
                            type="text"
                            icon={<HistoryOutlined />}
                            onClick={() => setShowViolationHistory(true)}
                            danger={violations.length > 0}
                        >
                            {violations.length}
                        </Button>
                    }
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
                            border: isAnyWarning ? '3px solid #ff4d4f' : 'none',
                            transform: 'scaleX(-1)'
                        }}
                        onLoadedMetadata={()=>{
                            console.log('video metadata loaded');
                        }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    {/* Monitoring Status */}
                    <div style={{ marginTop: '10px', fontSize: '12px' }}>
                        <Text type="secondary">
                            Face Detection: {detectionResult?.warningLevel === 'ok' ? '✅' : '⚠️'}<br/>
                            Browser Security: {browserWarningLevel === 'none' ? '✅' : '⚠️'}<br/>
                            Violations: {violationCount}/10
                        </Text>
                    </div>
                </Card>

                {/* Recent Snapshots */}
                {warningSnapshots.length > 0 && (
                    <Card size="small" style={{ marginTop: '10px' }} title="Recent Warnings">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                            {warningSnapshots.slice(-4).map((snapshot, idx) => (
                                <img
                                    key={idx}
                                    src={snapshot}
                                    alt={`Warning ${idx}`}
                                    style={{
                                        width: '100%',
                                        height: '60px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        border: '1px solid #ff4d4f'
                                    }}
                                />
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Center Content */}
            <div style={{ flex: 1, padding: '40px', paddingTop: isAnyWarning ? '100px' : '40px' }}>
                <Card>
                    <Title level={4}>Question {questionIndex + 1}:</Title>
                    <Text>{mockQuestions[questionIndex]}</Text>

                    <Divider />

                    <Button
                        type="primary"
                        icon={<AudioOutlined />}
                        onClick={startRecording}
                        disabled={isRecording || !isActuallyFullscreen}
                    >
                        Start Recording
                    </Button>

                    <Button
                        danger
                        onClick={stopRecording}
                        disabled={!isRecording || !isActuallyFullscreen}
                        style={{ marginLeft: '10px' }}
                    >
                        Stop Recording
                    </Button>

                    <Divider />

                    <WaveformVisualizer isRecording={isRecording} audioStream={audioStream? audioStream: undefined} />

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
                        disabled={!transcription.trim() || isActuallyFullscreen}
                    >
                        Submit Answer
                    </Button>
                </Card>
            </div>

            {/* Violation History Drawer */}
            <Drawer
                title="Violation History"
                placement="right"
                onClose={() => setShowViolationHistory(false)}
                open={showViolationHistory}
                width={400}
            >
                <List
                    dataSource={violations}
                    renderItem={(violation) => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                                title={violation.type.replace(/_/g, ' ')}
                                description={
                                    <>
                                        <Text type="secondary">{violation.details}</Text>

                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {new Date(violation.timestamp).toLocaleTimeString()}
                                        </Text>
                                    </>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Drawer>
        </div>
    );
};

export default TestInterface;