import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AlertTriangle, Lock, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DeleteAccountModal = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getAuthHeaders, logout, user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verify confirmation text
    if (confirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.delete(`${BACKEND_URL}/api/auth/delete-account`, {
        headers: getAuthHeaders(),
        data: { password }
      });
      
      // Account deleted successfully, logout user
      logout();
      onClose();
      
      // Show success message (you might want to add a toast notification here)
      alert('Your account has been successfully deleted.');
      
    } catch (error) {
      console.error('Delete account failed:', error);
      setError(error.response?.data?.detail || 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmText('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="auth-modal max-w-md">
        <DialogHeader>
          <DialogTitle className="delete-account-title">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
            Delete Account
          </DialogTitle>
        </DialogHeader>

        <div className="delete-account-warning">
          <div className="warning-content">
            <h4 className="warning-title">This action cannot be undone!</h4>
            <p className="warning-text">
              Deleting your account will permanently remove:
            </p>
            <ul className="warning-list">
              <li>• Your profile and account information</li>
              <li>• All saved favorite recipes</li>
              <li>• All custom recipes you've created</li>
              <li>• All recipe sharing links</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="delete-account-form">
          <div className="form-group">
            <label className="form-label">Enter your password to confirm:</label>
            <div className="input-with-icon">
              <Lock className="input-icon" />
              <Input
                type="password"
                placeholder="Your current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Type <strong>"DELETE MY ACCOUNT"</strong> to confirm:
            </label>
            <Input
              type="text"
              placeholder="DELETE MY ACCOUNT"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              required
              className="auth-input confirmation-input"
            />
          </div>

          {error && (
            <div className="error-message auth-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || confirmText !== 'DELETE MY ACCOUNT'}
              className="delete-account-btn"
            >
              {loading ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Deleting Account...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountModal;