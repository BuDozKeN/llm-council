import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState('signIn'); // 'signIn', 'signUp', 'forgotPassword', 'resetPassword'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword: sendPasswordReset, updatePassword, needsPasswordReset } = useAuth();

  // Handle password recovery mode
  useEffect(() => {
    if (needsPasswordReset) {
      setMode('resetPassword');
      setMessage('Please enter your new password.');
    }
  }, [needsPasswordReset]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signUp') {
        await signUp(email, password);
        setMessage('Check your email to confirm your account!');
      } else if (mode === 'signIn') {
        await signIn(email, password);
      } else if (mode === 'forgotPassword') {
        await sendPasswordReset(email);
        setMessage('Check your email for a password reset link!');
      } else if (mode === 'resetPassword') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await updatePassword(password);
        setMessage('Password updated successfully! You are now signed in.');
        setMode('signIn');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signUp': return 'Create an account';
      case 'forgotPassword': return 'Reset your password';
      case 'resetPassword': return 'Set new password';
      default: return 'Sign in to continue';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Loading...';
    switch (mode) {
      case 'signUp': return 'Sign Up';
      case 'forgotPassword': return 'Send Reset Link';
      case 'resetPassword': return 'Update Password';
      default: return 'Sign In';
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">AI Council</h1>
        <p className="login-subtitle">{getTitle()}</p>

        <form onSubmit={handleSubmit} className="login-form">
          {mode !== 'resetPassword' && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          )}

          {(mode === 'signIn' || mode === 'signUp' || mode === 'resetPassword') && (
            <div className="form-group">
              <label htmlFor="password">
                {mode === 'resetPassword' ? 'New Password' : 'Password'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'resetPassword' ? 'Enter new password' : 'Your password'}
                required
                minLength={6}
              />
            </div>
          )}

          {mode === 'resetPassword' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {getButtonText()}
          </button>
        </form>

        <div className="login-footer">
          {mode === 'signIn' && (
            <>
              <button
                type="button"
                className="toggle-button"
                onClick={() => {
                  setMode('forgotPassword');
                  setError('');
                  setMessage('');
                }}
              >
                Forgot password?
              </button>
              <button
                type="button"
                className="toggle-button"
                onClick={() => {
                  setMode('signUp');
                  setError('');
                  setMessage('');
                }}
              >
                Don't have an account? Sign up
              </button>
            </>
          )}

          {mode === 'signUp' && (
            <button
              type="button"
              className="toggle-button"
              onClick={() => {
                setMode('signIn');
                setError('');
                setMessage('');
              }}
            >
              Already have an account? Sign in
            </button>
          )}

          {(mode === 'forgotPassword' || mode === 'resetPassword') && (
            <button
              type="button"
              className="toggle-button"
              onClick={() => {
                setMode('signIn');
                setError('');
                setMessage('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
