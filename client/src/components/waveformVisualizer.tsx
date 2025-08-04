import React, { useRef, useEffect, useState } from 'react';

interface WaveformVisualizerProps {
  isRecording: boolean;
  audioStream?: MediaStream;
  height?: number;
  width?: string;
  barCount?: number;
  barColor?: string;
  backgroundColor?: string;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording = false,
  audioStream,
  height = 80,
  width = '100%',
  barCount = 40,
  barColor = '#1890ff',
  backgroundColor = '#f5f5f5'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(barCount));

  // Initialize audio analysis
  useEffect(() => {
    if (isRecording && audioStream) {
      try {
        // Create audio context and analyser
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        
        // Configure analyser
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        // Connect audio stream to analyser
        const source = audioContextRef.current.createMediaStreamSource(audioStream);
        source.connect(analyserRef.current);
        
        // Start animation
        animate();
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
        // Fallback to mock animation
        animateMock();
      }
    } else {
      // Stop animation when not recording
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Reset audio data
      setAudioData(new Uint8Array(barCount));
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isRecording, audioStream, barCount]);

  // Real audio animation
  const animate = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateFrame = () => {
      if (!isRecording) return;
      
      analyserRef.current!.getByteFrequencyData(dataArray);
      
      // Downsample data to match bar count
      const step = Math.floor(bufferLength / barCount);
      const downsampledData = new Uint8Array(barCount);
      
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        downsampledData[i] = sum / step;
      }
      
      setAudioData(downsampledData);
      animationRef.current = requestAnimationFrame(updateFrame);
    };
    
    updateFrame();
  };

  // Mock animation for fallback
  const animateMock = () => {
    const updateFrame = () => {
      if (!isRecording) return;
      
      const mockData = new Uint8Array(barCount);
      for (let i = 0; i < barCount; i++) {
        mockData[i] = Math.random() * 255 * (0.3 + 0.7 * Math.sin(Date.now() * 0.01 + i * 0.5));
      }
      
      setAudioData(mockData);
      animationRef.current = requestAnimationFrame(updateFrame);
    };
    
    updateFrame();
  };

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!isRecording && audioData.every(val => val === 0)) {
      // Show placeholder text when not recording
      ctx.fillStyle = '#bfbfbf';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Audio waveform will appear here during recording', rect.width / 2, rect.height / 2);
      return;
    }

    // Draw bars
    const barWidth = rect.width / barCount;
    const maxBarHeight = rect.height - 10;

    ctx.fillStyle = barColor;
    
    audioData.forEach((value, index) => {
      const barHeight = (value / 255) * maxBarHeight;
      const x = index * barWidth;
      const y = (rect.height - barHeight) / 2;
      
      // Add some randomness for more natural look
      const adjustedHeight = Math.max(2, barHeight + (Math.random() - 0.5) * 4);
      
      ctx.fillRect(x, y, barWidth - 1, adjustedHeight);
    });
  }, [audioData, isRecording, barCount, barColor, backgroundColor, height]);

  return (
    <div style={{ 
      width, 
      height, 
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      
      {/* Recording indicator */}
      {isRecording && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          backgroundColor: 'rgba(255, 77, 79, 0.9)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'white',
            animation: 'pulse 1s infinite'
          }} />
          REC
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default WaveformVisualizer;