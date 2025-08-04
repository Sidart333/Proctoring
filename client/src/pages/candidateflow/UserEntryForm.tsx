import React, { useState } from 'react';
import {
    Typography,
    Card,
    Space,
    Divider,
    Form,
    Input,
    Button,
    Checkbox,
} from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface FormData {
    name: string;
    email: string;
    phone: string;
    agree: boolean;
}

const UserEntryForm: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: FormData) => {
        setLoading(true);

        // Simulate form submission
        setTimeout(() => {
            console.log('Form submitted:', values);
            setLoading(false);
            // Here you would typically redirect to the next page
            alert('Registration successful! Redirecting to test...');
        }, 1000);
    };

    const testGuidelines = [
        "Please ensure you have a stable internet connection",
        "Use a quiet environment free from distractions",
        "Have a valid ID ready for verification if required",
        "The test duration is typically 60-90 minutes",
        "You cannot pause the test once started",
        "Ensure your device is fully charged or plugged in",
        "Close all unnecessary applications and browser tabs",
        "Do not use any external resources during the test"
    ];

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'white',
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <Card
                style={{
                    maxWidth: '1000px',
                    width: '100%',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    borderRadius: '12px'
                }}
            >
                <div style={{ display: 'flex', gap: '40px' }}>
                    {/* Form Section */}
                    <div style={{ flex: 1 }}>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <div style={{ textAlign: 'center' }}>
                                <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
                                    Test Registration
                                </Title>
                                <Text type="secondary">
                                    Please fill in your details to begin the assessment
                                </Text>
                            </div>

                            <Divider />

                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={onFinish}
                                size="large"
                                requiredMark={false}
                            >
                                <Form.Item
                                    label="Full Name"
                                    name="name"
                                    rules={[
                                        { required: true, message: 'Please enter your full name' },
                                        { min: 2, message: 'Name must be at least 2 characters' }
                                    ]}
                                >
                                    <Input
                                        prefix={<UserOutlined />}
                                        placeholder="Enter your full name"
                                        style={{ borderRadius: '8px' }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Email Address"
                                    name="email"
                                    rules={[
                                        { required: true, message: 'Please enter your email address' },
                                        { type: 'email', message: 'Please enter a valid email address' }
                                    ]}
                                >
                                    <Input
                                        prefix={<MailOutlined />}
                                        placeholder="Enter your email address"
                                        style={{ borderRadius: '8px' }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Phone Number"
                                    name="phone"
                                    rules={[
                                        { required: true, message: 'Please enter your phone number' },
                                        { pattern: /^[+]?[\d\s\-()]+$/, message: 'Please enter a valid phone number' }
                                    ]}
                                >
                                    <Input
                                        prefix={<PhoneOutlined />}
                                        placeholder="Enter your phone number"
                                        style={{ borderRadius: '8px' }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="agree"
                                    valuePropName="checked"
                                    rules={[
                                        {
                                            validator: (_, value) =>
                                                value ? Promise.resolve() : Promise.reject(new Error('You must agree to continue'))
                                        }
                                    ]}
                                >
                                    <Checkbox>
                                        I agree to the terms and conditions and confirm that the information provided is accurate
                                    </Checkbox>
                                </Form.Item>

                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        size="large"
                                        style={{
                                            width: '100%',
                                            height: '48px',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        {loading ? 'Processing...' : 'Continue to Test'}
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Space>
                    </div>

                    {/* Guidelines Section */}
                    <div style={{ flex: 1, borderLeft: '1px solid #f0f0f0', paddingLeft: '40px' }}>
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                                📋 Test Guidelines
                            </Title>

                            <Paragraph style={{ marginBottom: '16px', color: '#666' }}>
                                Please read these important guidelines before proceeding:
                            </Paragraph>

                            {testGuidelines.map((guideline, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: '#1890ff',
                                        marginTop: '8px',
                                        flexShrink: 0
                                    }} />
                                    <Text style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                        {guideline}
                                    </Text>
                                </div>
                            ))}

                            <div style={{
                                background: '#f6ffed',
                                border: '1px solid #b7eb8f',
                                borderRadius: '8px',
                                padding: '12px',
                                marginTop: '16px'
                            }}>
                                <Text style={{ color: '#389e0d', fontWeight: '500' }}>
                                    💡 Good luck with your test! Take your time and read each question carefully.
                                </Text>
                            </div>
                        </Space>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default UserEntryForm;