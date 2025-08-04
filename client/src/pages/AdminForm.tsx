import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Typography,
  message,
  Divider,
} from 'antd';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const AdminForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLink, setTestLink] = useState('');

  useEffect(() => {
    // Set default values
    form.setFieldsValue({
      difficulty: 'easy',
      experience_level: 'junior',
      duration: 60,
      numQuestions: 5,
    });
  }, [form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/admin/create-test', values);
      const token = response?.data?.token;

      if (token) {
        setTestLink(`http://localhost:5173/test/${token}`);
        message.success('Test created successfully!');
      } else {
        message.error('Test created but no token received.');
      }
    } catch (err) {
      message.error('Error creating test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ece9e6, #ffffff)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
      }}
    >
      <Card
        style={{
          width: '600px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          borderRadius: '12px',
        }}
      >
        <Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
          Create New Test
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="middle"
          requiredMark={false}
        >
          <Form.Item
            name="candidate_name"
            label="Candidate Name"
            rules={[{ required: true, message: 'Please enter the name' }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter the email' },
              { type: 'email', message: 'Invalid email address' },
            ]}
          >
            <Input placeholder="john@example.com" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[{ required: true, message: 'Please enter the phone number' }]}
          >
            <Input placeholder="+1234567890" />
          </Form.Item>

          <Form.Item
            name="experience_level"
            label="Experience Level"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="junior">Junior</Option>
              <Option value="mid">Mid</Option>
              <Option value="senior">Senior</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="role_subject"
            label="Role / Subject"
            rules={[{ required: true, message: 'Please specify the role or subject' }]}
          >
            <Input placeholder="Web Development, Python, etc." />
          </Form.Item>

          <Form.Item
            name="difficulty"
            label="Difficulty Level"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="easy">Easy</Option>
              <Option value="medium">Medium</Option>
              <Option value="hard">Hard</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="duration"
            label="Test Duration (in minutes)"
            rules={[{ required: true }]}
          >
            <Input type="number" placeholder="e.g., 60" />
          </Form.Item>

          <Form.Item
            name="numQuestions"
            label="Number of Questions"
            rules={[{ required: true }]}
          >
            <Input type="number" placeholder="e.g., 5" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Creating Test...' : 'Create Test'}
            </Button>
          </Form.Item>

          {testLink && (
            <>
              <Divider />
              <Text strong>Candidate Test Link:</Text>
              <div style={{ wordBreak: 'break-all', marginTop: '8px' }}>
                <a href={testLink} target="_blank" rel="noopener noreferrer">
                  {testLink}
                </a>
              </div>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default AdminForm;
