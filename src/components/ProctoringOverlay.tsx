// components/ProctoringOverlay.tsx

import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, Progress, Space, Typography } from 'antd';
import {
  WarningOutlined,
  FullscreenOutlined,
  SecurityScanOutlined,
  StopOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ProctoringOverlayProps {
  warningLevel: 'none' | 'low' | 'medium' | 'high';
  violationCount: number;
  maxViolations: number;
  warningMessage: string;
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  onTerminate?: () => void;
  showFullscreenPrompt?: boolean;
}

export const ProctoringOverlay: React.FC<ProctoringOverlayProps> = ({
  warningLevel,
  violationCount,
  maxViolations,
  warningMessage,
  isFullscreen,
  onEnterFullscreen,
  onTerminate,
  showFullscreenPrompt = true
}) => {
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-countdown for high warning level
  useEffect(() => {
    if (warningLevel === 'high' && violationCount >= maxViolations - 2) {
      setCountdown(30); // 30 seconds countdown
    } else {
      setCountdown(null);
    }
  }, [warningLevel, violationCount, maxViolations]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
      if (countdown === 1) {
        setShowTerminateModal(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const getWarningColor = () => {
    switch (warningLevel) {
      case 'low': return '#faad14'; // yellow
      case 'medium': return '#fa8c16'; // orange
      case 'high': return '#ff4d4f'; // red
      default: return '#52c41a'; // green
    }
  };

  const getWarningIcon = () => {
    switch (warningLevel) {
      case 'high': return <StopOutlined />;
      case 'medium': 
      case 'low': return <WarningOutlined />;
      default: return <SecurityScanOutlined />;
    }
  };

  const handleTerminate = () => {
    setShowTerminateModal(false);
    onTerminate?.();
  };

  return (
    <>
      {/* Fullscreen Prompt */}
      {showFullscreenPrompt && !isFullscreen && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1001,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            minWidth: '400px'
          }}
        >
          <FullscreenOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '20px' }} />
          <Title level={3} style={{ color: 'white', marginBottom: '16px' }}>
            Fullscreen Mode Required
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.85)', display: 'block', marginBottom: '24px' }}>
            This test must be completed in fullscreen mode to ensure a secure testing environment.
          </Text>
          <Button
            type="primary"
            size="large"
            icon={<FullscreenOutlined />}
            onClick={onEnterFullscreen}
          >
            Enter Fullscreen Mode
          </Button>
        </div>
      )}

      {/* Warning Banner */}
      {warningLevel !== 'none' && isFullscreen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: getWarningColor(),
            color: '#fff',
            padding: '12px 20px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            animation: warningLevel === 'high' ? 'pulse 1s infinite' : 'slideDown 0.3s ease-out'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <Space align="center">
              {getWarningIcon()}
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {warningMessage || 'Violation detected'}
              </span>
            </Space>

            <Space align="center">
              <Text style={{ color: '#fff', fontSize: '14px' }}>
                Violations: {violationCount}/{maxViolations}
              </Text>
              {countdown !== null && (
                <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                  Time remaining: {countdown}s
                </Text>
              )}
            </Space>
          </div>

          {/* Progress bar for violations */}
          <Progress
            percent={(violationCount / maxViolations) * 100}
            showInfo={false}
            strokeColor="#fff"
            trailColor="rgba(255, 255, 255, 0.3)"
            style={{ marginTop: '8px' }}
          />
        </div>
      )}

      {/* Violation Details (for high warning level) */}
      {warningLevel === 'high' && isFullscreen && (
        <Alert
          message="Critical Warning"
          description={
            <div>
              <Text>
                You have committed {violationCount} violations. The test will be terminated if you reach {maxViolations} violations.
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Common violations include: switching tabs, exiting fullscreen, using developer tools, or attempting to copy/paste.
              </Text>
            </div>
          }
          type="error"
          showIcon
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            maxWidth: '400px',
            zIndex: 999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        />
      )}

      {/* Termination Modal */}
      <Modal
        title={
          <Space>
            <StopOutlined style={{ color: '#ff4d4f' }} />
            <span>Test Termination Warning</span>
          </Space>
        }
        open={showTerminateModal}
        onOk={handleTerminate}
        onCancel={() => setShowTerminateModal(false)}
        okText="Terminate Test"
        cancelText="Continue"
        okButtonProps={{ danger: true }}
      >
        <Text>
          You have reached the maximum number of violations ({maxViolations}). 
          The test will be terminated if you proceed.
        </Text>
        <br /><br />
        <Text type="secondary">
          If you believe this is an error, please contact the test administrator.
        </Text>
      </Modal>

      {/* CSS Animations */}
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
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  );
};