import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import axios from 'axios';
import SuccessModal from './SuccessModal';
import '../styles/ForgotPassword.css';

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Step 1: Send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const emailRegex = /^[a-z]+\.[a-z]+@cit\.edu$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid CIT email (firstname.lastname@cit.edu)');
      }

      const { error: otpError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (otpError) throw otpError;

      setStep(2);
    } catch (err) {
      console.error('OTP send error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and set new password
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'recovery'
      });

      if (verifyError) throw verifyError;

      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      try {
        await axios.post('http://localhost:8080/api/auth/update-password', {
          email: email,
          password: newPassword
        });
      } catch (backendError) {
        console.log('Backend update note:', backendError);
      }

      await supabase.auth.signOut();

      setShowSuccessModal(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate('/login');
  };

  // Step 1: Enter Email
  if (step === 1) {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-side">
          <div className="forgot-password-content">
            <div className="back-link">
              <Link to="/login">← Back to Login</Link>
            </div>
            
            <h1 className="forgot-password-title">Forgot Password?</h1>
            <p className="forgot-password-subtitle">
              No worries! Enter your CIT email and we'll send you a verification code.
            </p>

            {error && <div className="error-message-forgot">{error}</div>}

            <form onSubmit={handleSendOTP} className="forgot-password-form">
              <div className="form-group-forgot">
                <label>CIT Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="john.doe@cit.edu"
                  className="input-forgot"
                />
                <span className="input-hint-forgot">
                  Enter the email associated with your account
                </span>
              </div>

              <button 
                type="submit" 
                className="btn-primary-forgot" 
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>

            <div className="divider">
              <span>OR</span>
            </div>

            <div className="additional-options">
              <p>Remember your password? <Link to="/login">Login here</Link></p>
              <p>Don't have an account? <Link to="/register">Sign up</Link></p>
            </div>
          </div>
        </div>

        <div className="branding-side-forgot">
          <div className="branding-content-forgot">
            <div className="branding-icon-forgot">🔐</div>
            <h1 className="branding-title-forgot">Password Recovery</h1>
            <p className="branding-subtitle-forgot">
              We'll help you get back into your Campus Reserve account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter OTP and New Password
  if (step === 2) {
    return (
      <>
        <div className="forgot-password-container">
          <div className="forgot-password-side">
            <div className="forgot-password-content">
              <div className="back-link">
                <button 
                  onClick={() => setStep(1)} 
                  style={{ background: 'none', border: 'none', color: '#8B1538', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  ← Change Email
                </button>
              </div>
              
              <h1 className="forgot-password-title">Enter Verification Code</h1>
              <p className="forgot-password-subtitle">
                We sent an 8-digit verification code to <strong>{email}</strong>. Check your inbox and enter the code below.
              </p>

              {error && <div className="error-message-forgot">{error}</div>}

              <form onSubmit={handleVerifyOTP} className="forgot-password-form">
                <div className="form-group-forgot">
                  <label>Verification Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    required
                    placeholder="12345678"
                    className="input-forgot"
                    maxLength="8"
                    style={{ fontSize: '20px', letterSpacing: '5px', textAlign: 'center', fontWeight: 'bold' }}
                  />
                  <span className="input-hint-forgot">
                    Enter the 8-digit code from your email
                  </span>
                </div>

                <div className="form-group-forgot">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength="6"
                      placeholder="••••••••"
                      className="input-forgot"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div className="form-group-forgot">
                  <label>Confirm New Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength="6"
                      placeholder="••••••••"
                      className="input-forgot"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary-forgot" 
                  disabled={loading}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <div className="divider">
                <span>Didn't receive the code?</span>
              </div>

              <div className="additional-options">
                <button 
                  onClick={handleSendOTP}
                  style={{ background: 'none', border: 'none', color: '#8B1538', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Resend Code
                </button>
              </div>
            </div>
          </div>

          <div className="branding-side-forgot">
            <div className="branding-content-forgot">
              <div className="branding-icon-forgot">🔑</div>
              <h1 className="branding-title-forgot">Almost There!</h1>
              <p className="branding-subtitle-forgot">
                Enter the verification code and create a new strong password for your account.
              </p>
            </div>
          </div>
        </div>

        <SuccessModal
          isOpen={showSuccessModal}
          onClose={handleModalClose}
          title="Password Reset Successful!"
          message="Your password has been reset successfully. You can now login with your new password."
          buttonText="Go to Login"
        />
      </>
    );
  }
}

export default ForgotPassword;
