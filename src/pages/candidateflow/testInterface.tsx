import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Divider, Input, Typography } from 'antd';
import WaveformVisualizer from '../../components/waveformVisualizer';

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
    const recognitionRef = useRef<any>(null);

    const [questionIndex, setQuestionIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [_isTranscribing, setIsTranscribing] = useState(false);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [showWarning, _setShowWarning] = useState(false);

    const initializeCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (error) {
            console.error('Camera initialization failed:', error);
        }
    };

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
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Left Video */}
            <div style={{ width: '20%', padding: '20px' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000' }}
                />
            </div>

            {/* Center Content */}
            <div style={{ flex: 1, padding: '40px' }}>
                <Card>
                    <Title level={4}>Question:</Title>
                    <Text>{mockQuestions[questionIndex]}</Text>

                    <Divider />

                    <Button
                        type="primary"
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

                    <WaveformVisualizer isRecording={isRecording} />

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

            {/* Warning Banner */}
            {showWarning && (
                <div
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        backgroundColor: '#ff4d4f',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        zIndex: 999,
                    }}
                >
                    WARNING
                </div>
            )}
        </div>
    );
};

export default TestInterface;
