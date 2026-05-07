import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SuccessModal from './SuccessModal';
import '../styles/theme.css';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phoneNumber: '',
    address: '',
    age: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const emailRegex = /^[a-z]+\.[a-z]+@cit\.edu$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email must be in format: firstname.lastname@cit.edu (all lowercase)');
      return false;
    }

    const idRegex = /^\d{2}-\d{4}-\d{3}$/;
    if (!idRegex.test(formData.studentId)) {
      setError('Student ID must be in format: 12-3456-789');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 16 || age > 100) {
      setError('Age must be between 16 and 100');
      return false;
    }

    if (formData.fullName.trim().split(' ').length < 2) {
      setError('Please enter your full name (first and last name)');
      return false;
    }

    if (formData.address.trim().length < 10) {
      setError('Please enter a complete address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      await axios.post('http://localhost:8080/api/auth/register', {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        studentId: formData.studentId,
        address: formData.address,
        age: parseInt(formData.age),
        supabaseId: null
      });

      setShowSuccessModal(true);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate('/login');
  };

  return (
    <>
      <div className="auth-split-container">
        <div className="branding-side yellow">
          <div className="branding-content">
            <div className="branding-icon">☀️</div>
            <h1 className="branding-title">Join the Pack!</h1>
            <p className="branding-subtitle">
              Create your Wildcats Campus Reserve Account and start your journey with us.
            </p>
          </div>
        </div>

        <div className="form-side">
          <div className="form-container">
            <h2 className="form-title">Student Sign Up</h2>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label>Student ID</label>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  required
                  placeholder="00-0000-000"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john.doe@cit.edu"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+63 (XXX) XXX-XXXX"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="123 Main St, City, Province, ZIP"
                />
              </div>

              <div className="form-group">
                <label>Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  min="16"
                  max="100"
                  placeholder="18"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength="6"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength="6"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary gold" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            <div className="form-footer">
              Already have an account? <Link to="/login">Login</Link>
            </div>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title="Registration Successful!"
        message="Your account has been created successfully! You can now login with your credentials."
        buttonText="Go to Login"
      />
    </>
  );
}

export default Register;