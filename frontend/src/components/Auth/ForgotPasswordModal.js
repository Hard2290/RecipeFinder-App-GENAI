import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Mail, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ForgotPasswordModal = ({ isOpen, onClose, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, {
        email
      });
      
      setSuccess(true);
    } catch (error) {
      console.error('Forgot password failed:', error);
      setError(error.response?.data?.detail || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSuccess(false);
    setError('');
    onClose();
  };

  const handleBackToLogin = () => {
    setEmail('');
    setSuccess(false);
    setError('');
    onBackToLogin();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="auth-modal max-w-md">
        <DialogHeader>
          <DialogTitle className="auth-title">
            {success ? 'Check Your Email' : 'Forgot Password?'}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="forgot-password-success">
            <div className="success-icon">
              <Mail className="w-16 h-16 text-green-500 mx-auto mb-4" />
            </div>
            <div className="success-message">
              <p className="text-center text-gray-600 mb-4">
                If your email is in our system, you will receive a password reset link shortly.
              </p>
              <p className="text-center text-sm text-gray-500 mb-6">
                Please check your inbox and follow the instructions to reset your password.
              </p>
            </div>
            <div className="success-actions">
              <Button
                onClick={handleBackToLogin}
                className="auth-submit-btn w-full"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="forgot-password-info">
              <p className="text-center text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <div className="form-group">
              <div className="input-with-icon">
                <Mail className="input-icon" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {error && (
              <div className="error-message auth-error">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <div className="auth-switch">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="back-to-login-btn"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;