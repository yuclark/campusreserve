import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/StudentDashboard.css';

function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('reserve');
  const [classrooms, setClassrooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableSeats, setAvailableSeats] = useState(null);
  const [checkingSeats, setCheckingSeats] = useState(false);

  // AI Modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAiForm] = useState({
    numPeople: '1',
    preferredTime: 'morning'
  });

  // Reservation form
  const [reservationForm, setReservationForm] = useState({
    classroomId: '',
    reservationDate: '',
    startTime: '',
    endTime: '',
    purpose: '',
    seatsReserved: 1
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      console.log('Loaded user data:', parsedUser);

      setUser(parsedUser);
      fetchClassrooms();

      if (parsedUser.id) {
        fetchUserReservations(parsedUser.id);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAIModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAIModal]);

  // Auto-check seats when form is complete
useEffect(() => {
  const { classroomId, reservationDate, startTime, endTime } = reservationForm;
  
  if (classroomId && reservationDate && startTime && endTime && 
      isWithinSchoolHours(startTime, endTime)) {
    
    // Small delay to ensure state is updated
    const timer = setTimeout(() => {
      checkAvailableSeats();
    }, 100);
    
    return () => clearTimeout(timer);
  }
}, [reservationForm.classroomId, reservationForm.reservationDate, 
    reservationForm.startTime, reservationForm.endTime]);


  const fetchClassrooms = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/classrooms/available');
      setClassrooms(response.data);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  const fetchUserReservations = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:8080/api/reservations/user/${userId}`);
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
    }
  };

  // Helper: allow only 07:00–21:00 and end > start
  const isWithinSchoolHours = (startTime, endTime) => {
    if (!startTime || !endTime) return false;
    if (startTime < '07:00' || endTime > '21:00') return false;
    if (endTime <= startTime) return false;
    return true;
  };

  const checkAvailableSeats = async () => {
    const { classroomId, reservationDate, startTime, endTime } = reservationForm;

    if (!classroomId || !reservationDate || !startTime || !endTime) {
      setAvailableSeats(null);
      return;
    }

    if (!isWithinSchoolHours(startTime, endTime)) {
      setAvailableSeats(null);
      return;
    }

    setCheckingSeats(true);
    try {
      const response = await axios.get(
        `http://localhost:8080/api/reservations/available-seats/${classroomId}`,
        {
          params: {
            date: reservationDate,
            startTime: startTime,
            endTime: endTime
          }
        }
      );

      console.log('Available seats:', response.data);
      setAvailableSeats(response.data);
    } catch (error) {
      console.error('Error checking seats:', error);
      setAvailableSeats(null);
    } finally {
      setCheckingSeats(false);
    }
  };

  // AI Modal handlers
  const handleOpenAIModal = () => {
    setShowAIModal(true);
  };

  const handleCloseAIModal = () => {
    setShowAIModal(false);
    setAiForm({ numPeople: '1', preferredTime: 'morning' });
  };

  const handleAIFormChange = (e) => {
    setAiForm({
      ...aiForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAISuggest = async (e) => {
  e.preventDefault();

  const numPeopleInt = parseInt(aiForm.numPeople);

  if (numPeopleInt < 1 || numPeopleInt > 2) {
    setMessage('Please enter 1 or 2 people (max allowed per booking).');
    setMessageType('error');
    return;
  }

  setLoading(true);
  setShowAIModal(false);
  setMessage('🤖 AI is analyzing available rooms and dates...');
  setMessageType('success');

  try {
    const response = await axios.post('http://localhost:8080/api/reservations/suggest-room', {
      numPeople: numPeopleInt,
      preferredTime: aiForm.preferredTime.toLowerCase()
    });

    console.log('AI Response:', response.data);

    if (response.data.success) {
      const suggestion = response.data.suggestion;

      setReservationForm({
        ...reservationForm,
        classroomId: suggestion.classroom.classroomId.toString(),
        reservationDate: suggestion.date,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        seatsReserved: numPeopleInt
      });

      setMessage(`✨ AI Suggestion: ${suggestion.reason}`);
      setMessageType('success');
      
      // The useEffect will auto-trigger seat check
    } else {
      setMessage(response.data.message || 'No suitable rooms found');
      setMessageType('error');
    }
  } catch (error) {
    console.error('AI suggestion error:', error);
    setMessage('AI suggestion failed. Please select room manually.');
    setMessageType('error');
  } finally {
    setLoading(false);
  }
};


  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleInputChange = (e) => {
    const newForm = {
      ...reservationForm,
      [e.target.name]: e.target.value
    };
    setReservationForm(newForm);
    setAvailableSeats(null);
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    const date = new Date(value);
    const day = date.getDay();

    if (day === 0) {
      setMessage('Reservations are only allowed from Monday to Saturday.');
      setMessageType('error');
      setReservationForm(prev => ({ ...prev, reservationDate: '' }));
      return;
    }

    setReservationForm(prev => ({ ...prev, reservationDate: value }));
    setAvailableSeats(null);
  };

  const handleReservationSubmit = async (e) => {
    e.preventDefault();

    const { reservationDate, startTime, endTime } = reservationForm;

    if (startTime < '07:00' || endTime > '21:00') {
      setMessage('You can only reserve between 07:00 and 21:00.');
      setMessageType('error');
      return;
    }

    if (endTime <= startTime) {
      setMessage('End time must be after start time.');
      setMessageType('error');
      return;
    }

    if (parseInt(reservationForm.seatsReserved, 10) > 2) {
      setMessage('You can only reserve a maximum of 2 seats per booking.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const reservationData = {
        userId: user.id,
        classroomId: parseInt(reservationForm.classroomId, 10),
        scheduleId: null,
        reservationDate: reservationDate,
        startTime: startTime,
        endTime: endTime,
        purpose: reservationForm.purpose,
        seatsReserved: parseInt(reservationForm.seatsReserved, 10)
      };

      const response = await axios.post('http://localhost:8080/api/reservations', reservationData);

      setMessage('Reservation submitted successfully! Waiting for admin approval.');
      setMessageType('success');

      setReservationForm({
        classroomId: '',
        reservationDate: '',
        startTime: '',
        endTime: '',
        purpose: '',
        seatsReserved: 1
      });
      setAvailableSeats(null);

      fetchUserReservations(user.id);

      setTimeout(() => {
        setActiveTab('manage');
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error creating reservation:', error);
      setMessage(error.response?.data || 'Failed to create reservation. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      await axios.put(`http://localhost:8080/api/reservations/${reservationId}/status`, {
        status: 'cancelled'
      });

      setMessage('Reservation cancelled successfully.');
      setMessageType('success');
      fetchUserReservations(user.id);

      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      setMessage('Failed to cancel reservation.');
      setMessageType('error');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      cancelled: 'status-cancelled'
    };

    return <span className={`status-badge ${statusClasses[status]}`}>{status.toUpperCase()}</span>;
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">🐾 Campus Reserve</h2>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user.fullName?.charAt(0) || 'S'}</div>
          <div className="user-info">
            <h3>{user.fullName}</h3>
            <p>{user.email}</p>
            <span className="user-role">Student</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'reserve' ? 'active' : ''}`}
            onClick={() => setActiveTab('reserve')}
          >
            <span className="nav-icon">📅</span>
            Reserve Classroom
          </button>
          <button
            className={`nav-item ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            <span className="nav-icon">📋</span>
            My Reservations
          </button>
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="nav-icon">👤</span>
            Profile
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>
            {activeTab === 'reserve' && 'Reserve a Classroom'}
            {activeTab === 'manage' && 'My Reservations'}
            {activeTab === 'profile' && 'My Profile'}
          </h1>
          <p className="header-subtitle">
            {activeTab === 'reserve' &&
              'Book your classroom for classes, meetings, or events (Maximum 2 seats per booking)'}
            {activeTab === 'manage' && 'View and manage your classroom reservations'}
            {activeTab === 'profile' && 'View your account information'}
          </p>
        </header>

        {message && (
          <div className={`message ${messageType}`}>
            {messageType === 'success' ? '✓' : '⚠'} {message}
          </div>
        )}

        {/* Reserve Tab */}
        {activeTab === 'reserve' && (
          <div className="content-card">
            <form onSubmit={handleReservationSubmit} className="reservation-form">
              
              {/* AI Suggestion Button */}
              <div style={{ marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={handleOpenAIModal}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  ✨ Get AI Room Suggestion
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Select Classroom *</label>
                  <select
                    name="classroomId"
                    value={reservationForm.classroomId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Choose a classroom</option>
                    {classrooms.map(room => (
                      <option key={room.classroomId} value={room.classroomId}>
                        {room.buildingName} - Room {room.roomNumber} (Capacity: {room.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Reservation Date *</label>
                  <input
                    type="date"
                    name="reservationDate"
                    value={reservationForm.reservationDate}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={reservationForm.startTime}
                    onChange={handleInputChange}
                    min="07:00"
                    max="21:00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={reservationForm.endTime}
                    onChange={handleInputChange}
                    min="07:00"
                    max="21:00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Number of Seats * (Max: 2)</label>
                  <input
                    type="number"
                    name="seatsReserved"
                    value={reservationForm.seatsReserved}
                    onChange={handleInputChange}
                    min="1"
                    max="2"
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: '8px',
                  marginBottom: '16px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                ⏰ You can only reserve classrooms during school hours:
                <strong> Monday to Saturday, 07:00 AM – 09:00 PM</strong>.
              </div>

              <button
                type="button"
                className="btn-check-seats"
                onClick={checkAvailableSeats}
                disabled={
                  !reservationForm.classroomId ||
                  !reservationForm.reservationDate ||
                  !reservationForm.startTime ||
                  !reservationForm.endTime ||
                  !isWithinSchoolHours(reservationForm.startTime, reservationForm.endTime) ||
                  checkingSeats
                }
              >
                {checkingSeats ? 'Checking...' : '🔍 Check Seat Availability'}
              </button>

              {availableSeats && (
                <div
                  className={`seat-availability ${
                    availableSeats.availableSeats === 0 ? 'full' : 'available'
                  }`}
                >
                  <div className="seat-info">
                    <span className="seat-icon">💺</span>
                    <div className="seat-details">
                      <h4>
                        {availableSeats.availableSeats} / {availableSeats.totalCapacity} Seats Available
                      </h4>
                      <p>
                        {availableSeats.reservedSeats} seats already reserved for this time slot
                      </p>
                      {availableSeats.availableSeats === 0 && (
                        <p className="no-seats-warning">
                          ⚠️ No seats available. Please choose a different time or classroom.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="seat-bar">
                    <div
                      className="seat-bar-fill"
                      style={{
                        width: `${
                          (availableSeats.reservedSeats / availableSeats.totalCapacity) * 100
                        }%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Purpose of Reservation *</label>
                <textarea
                  name="purpose"
                  value={reservationForm.purpose}
                  onChange={handleInputChange}
                  placeholder="E.g., Group study, Club meeting, Presentation practice..."
                  rows="3"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-submit"
                disabled={loading || (availableSeats && availableSeats.availableSeats === 0)}
              >
                {loading ? 'Submitting...' : 'Submit Reservation'}
              </button>
            </form>
          </div>
        )}

        {/* Manage Reservations Tab */}
        {activeTab === 'manage' && (
          <div className="content-card">
            {reservations.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <h3>No Reservations Yet</h3>
                <p>Start by making your first classroom reservation!</p>
                <button className="btn-primary" onClick={() => setActiveTab('reserve')}>
                  Reserve Now
                </button>
              </div>
            ) : (
              <div className="reservations-list">
                {reservations.map(reservation => (
                  <div key={reservation.reservationId} className="reservation-card">
                    <div className="reservation-header">
                      <h3>
                        {reservation.buildingName} - Room {reservation.roomNumber}
                      </h3>
                      {getStatusBadge(reservation.status)}
                    </div>
                    <div className="reservation-details">
                      <div className="detail-item">
                        <span className="detail-icon">📅</span>
                        <span>
                          {new Date(reservation.reservationDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">⏰</span>
                        <span>
                          {reservation.startTime} - {reservation.endTime}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">👥</span>
                        <span>
                          {reservation.seatsReserved}{' '}
                          {reservation.seatsReserved > 1 ? 'seats' : 'seat'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">📝</span>
                        <span>{reservation.purpose}</span>
                      </div>
                    </div>
                    {reservation.status === 'pending' && (
                      <button
                        className="btn-cancel"
                        onClick={() => handleCancelReservation(reservation.reservationId)}
                      >
                        Cancel Reservation
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="content-card">
            <div className="profile-section">
              <h3>Personal Information</h3>
              <div className="profile-grid">
                <div className="profile-item">
                  <label>Full Name</label>
                  <p>{user.fullName}</p>
                </div>
                <div className="profile-item">
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
                <div className="profile-item">
                  <label>Role</label>
                  <p>{user.role}</p>
                </div>
                <div className="profile-item">
                  <label>User ID</label>
                  <p>{user.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI Modal */}
      {showAIModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflowY: 'auto'
          }}
          onClick={handleCloseAIModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '450px',
              width: '90%',
              margin: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>
              ✨ AI Room Suggestion
            </h2>
            <p style={{ marginBottom: '24px', color: '#6B7280', fontSize: '14px' }}>
              Let AI find the perfect room and date for you based on your preferences.
            </p>

            <form onSubmit={handleAISuggest}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Number of People
                </label>
                <select
                  name="numPeople"
                  value={aiForm.numPeople}
                  onChange={handleAIFormChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '15px',
                    backgroundColor: 'white',
                    color: '#1F2937'
                  }}
                  required
                >
                  <option value="1" style={{ color: '#1F2937' }}>1 person</option>
                  <option value="2" style={{ color: '#1F2937' }}>2 people</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Preferred Time
                </label>
                <select
                  name="preferredTime"
                  value={aiForm.preferredTime}
                  onChange={handleAIFormChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '15px',
                    backgroundColor: 'white',
                    color: '#1F2937'
                  }}
                  required
                >
                  <option value="morning" style={{ color: '#1F2937' }}>Morning (08:00 - 10:00)</option>
                  <option value="afternoon" style={{ color: '#1F2937' }}>Afternoon (13:00 - 15:00)</option>
                  <option value="evening" style={{ color: '#1F2937' }}>Evening (18:00 - 20:00)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleCloseAIModal}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: 'pointer'
                  }}
                >
                  Get Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
