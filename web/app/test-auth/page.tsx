/**
 * Simple Auth Test Page
 * Debug authentication issues
 */

'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function TestAuthPage() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testSignup = async () => {
    setLoading(true);
    setResult('Testing signup...');
    
    try {
      console.log('🧪 Testing authClient.signUp.email...');
      
      const response = await authClient.signUp.email({
        email: 'test' + Date.now() + '@example.com',
        password: 'testpassword123',
        name: 'Test User',
      });

      console.log('📊 Signup response:', response);
      setResult(JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.error('❌ Signup error:', error);
      setResult('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAPI = async () => {
    setLoading(true);
    setResult('Testing direct API...');
    
    try {
      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'direct' + Date.now() + '@example.com',
          password: 'testpassword123',
          name: 'Direct Test User'
        })
      });

      const data = await response.text();
      console.log('📊 Direct API response:', response.status, data);
      setResult(`Status: ${response.status}\nResponse: ${data}`);
      
    } catch (error) {
      console.error('❌ Direct API error:', error);
      setResult('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Auth Test Page</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={testSignup}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test authClient.signUp.email'}
          </button>
          
          <button
            onClick={testDirectAPI}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Direct API Call'}
          </button>
        </div>

        <div className="bg-white p-4 rounded border">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded">
            {result || 'Click a button to test...'}
          </pre>
        </div>

        <div className="mt-8 text-sm text-gray-600">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Open browser developer tools (F12)</li>
            <li>Click "Test authClient.signUp.email" to test the React client</li>
            <li>Click "Test Direct API Call" to test the API directly</li>
            <li>Check console for detailed logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
