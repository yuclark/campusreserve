import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AdminDashboard.css';


function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [todayReservations, setTodayReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // NEW: Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Attendance states
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});

  // Classroom form
  const [classroomForm, setClassroomForm] = useState({
    buildingName: '',
    roomNumber: '',
    capacity: '',
    description: '',
    status: 'available'
  });

  const [editingClassroom, setEditingClassroom] = useState(null);
  const [stats, setStats] = useState({
    totalReservations: 0,
    pendingReservations: 0,
    totalClassrooms: 0,
    totalStudents: 0
  });

  // Student profile modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchAllData();
  }, [navigate]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchReservations(),
      fetchClassrooms(),
      fetchUsers(),
      fetchTodayReservations()
    ]);
  };

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/reservations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReservations(response.data);

      const pending = response.data.filter(r => r.status === 'pending').length;
      setStats(prev => ({
        ...prev,
        totalReservations: response.data.length,
        pendingReservations: pending
      }));
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const fetchTodayReservations = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get('http://localhost:8080/api/reservations/week', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTodayReservations(response.data);
  } catch (error) {
    console.error('Error fetching week reservations:', error);
  }
};

  const fetchClassrooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/classrooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassrooms(response.data);
      setStats(prev => ({
        ...prev,
        totalClassrooms: response.data.length
      }));
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const students = response.data.filter(u => u.role === 'STUDENT');
      setUsers(response.data);
      setStats(prev => ({
        ...prev,
        totalStudents: students.length
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // NEW: Show success modal
  const showSuccessModalWithMessage = (msg) => {
    setSuccessMessage(msg);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
    }, 3000);
  };

  // Attendance helpers
  const isTimeToTally = (reservation) => {
    const now = new Date();
    const startTime = new Date(`${reservation.reservationDate}T${reservation.startTime}`);
    const tallyWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000);
    const tallyWindowEnd = new Date(startTime.getTime() + 30 * 60 * 1000);
    return now >= tallyWindowStart && now <= tallyWindowEnd;
  };

  const handleSelectReservation = async (reservation) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8080/api/reservations/${reservation.reservationId}/attendees`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAttendees(response.data);
      setSelectedReservation(reservation);

      const initialAttendance = {};
      response.data.forEach(attendee => {
        initialAttendance[attendee.userId] = false;
      });
      setAttendanceData(initialAttendance);
    } catch (err) {
      console.error('Error fetching attendees:', err);
      showMessage('Failed to load attendees', 'error');
    }
  };

  const handleAttendanceChange = (userId, present) => {
    setAttendanceData(prev => ({
      ...prev,
      [userId]: present
    }));
  };

  const handleSubmitAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:8080/api/reservations/attendance/${selectedReservation.reservationId}`,
        attendanceData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      showSuccessModalWithMessage('✅ Attendance recorded successfully!');
      setSelectedReservation(null);
      setAttendees([]);
      setAttendanceData({});
      fetchTodayReservations();
    } catch (err) {
      console.error('Error submitting attendance:', err);
      showMessage('Failed to submit attendance', 'error');
    }
  };

  // Student profile (attendance stats)
  const handleOpenStudentProfile = async (userId, reservation) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `http://localhost:8080/api/attendance/user/${userId}/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userFromList = users.find(u => u.id === userId);

      setSelectedStudent({
        id: userId,
        fullName: reservation.studentName,
        studentId: reservation.studentId,
        email: userFromList ? userFromList.email : undefined
      });
      setStudentStats(res.data);
      setShowStudentModal(true);
    } catch (err) {
      console.error('Error loading attendance stats', err);
      showMessage('Failed to load attendance stats', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleReservationAction = async (reservationId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:8080/api/reservations/${reservationId}/status`,
        { status: action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccessModalWithMessage(`✅ Reservation ${action} successfully!`);
      fetchReservations();
    } catch (error) {
      showMessage('Failed to update reservation.', 'error');
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/reservations/${reservationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessModalWithMessage('✅ Reservation deleted successfully!');
      fetchReservations();
    } catch (error) {
      showMessage('Failed to delete reservation.', 'error');
    }
  };

  const handleClassroomInputChange = (e) => {
    setClassroomForm({
      ...classroomForm,
      [e.target.name]: e.target.value
    });
  };

  const handleClassroomSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (editingClassroom) {
        await axios.put(
          `http://localhost:8080/api/classrooms/${editingClassroom.classroomId}`,
          classroomForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSuccessModalWithMessage('✅ Classroom updated successfully!');
      } else {
        await axios.post('http://localhost:8080/api/classrooms', classroomForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessModalWithMessage('✅ Classroom created successfully!');
      }

      resetClassroomForm();
      fetchClassrooms();
    } catch (error) {
      showMessage('Failed to save classroom.', 'error');
    } finally {
      setLoading(false);
    }
  };

 // Make sure this function exists (around line 200-210)
const handleEditClassroom = (classroom) => {
  setEditingClassroom(classroom);
  setClassroomForm({
    buildingName: classroom.buildingName,
    roomNumber: classroom.roomNumber,
    capacity: classroom.capacity,
    description: classroom.description || '',
    status: classroom.status
  });
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleDeleteClassroom = async (classroomId) => {
  if (!window.confirm('Are you sure you want to delete this classroom? This will also delete all related reservations.')) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    await axios.delete(`http://localhost:8080/api/classrooms/${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    showSuccessModalWithMessage('✅ Classroom deleted successfully!');
    fetchClassrooms();
    fetchReservations(); // Refresh reservations too
  } catch (error) {
    console.error('Error deleting classroom:', error);
    if (error.response?.status === 500) {
      showMessage('Cannot delete classroom: It has existing reservations. Cancel those reservations first.', 'error');
    } else {
      showMessage('Failed to delete classroom.', 'error');
    }
  }





    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessModalWithMessage('✅ Classroom deleted successfully!');
      fetchClassrooms();
    } catch (error) {
      showMessage('Failed to delete classroom.', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
  if (!window.confirm('Are you sure you want to delete this user? This will also delete all their reservations and attendance records.')) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    await axios.delete(`http://localhost:8080/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    showSuccessModalWithMessage('✅ User deleted successfully!');
    fetchUsers();
    fetchReservations(); // Refresh reservations
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.response?.status === 403) {
      showMessage('Cannot delete admin users.', 'error');
    } else {
      showMessage('Failed to delete user.', 'error');
    }
  }
};


  const resetClassroomForm = () => {
    setClassroomForm({
      buildingName: '',
      roomNumber: '',
      capacity: '',
      description: '',
      status: 'available'
    });
    setEditingClassroom(null);
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
    }, 3000);
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
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">🐾 Campus Reserve</h2>
          <span className="admin-badge">ADMIN</span>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user.fullName?.charAt(0) || 'A'}</div>
          <div className="user-info">
            <h3>{user.fullName}</h3>
            <p>{user.email}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </button>
          <button
            className={`nav-item ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <span className="nav-icon">📋</span>
            Manage Reservations
            {stats.pendingReservations > 0 && (
              <span className="notification-badge">{stats.pendingReservations}</span>
            )}
          </button>
          <button
            className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <span className="nav-icon">👤</span>
            Attendance
          </button>
          <button
            className={`nav-item ${activeTab === 'classrooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('classrooms')}
          >
            <span className="nav-icon">🏫</span>
            Manage Classrooms
          </button>
          <button
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="nav-icon">👥</span>
            Users
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'reservations' && 'Manage Reservations'}
            {activeTab === 'attendance' && 'Attendance Management'}
            {activeTab === 'classrooms' && 'Manage Classrooms'}
            {activeTab === 'users' && 'User Management'}
          </h1>
        </header>

        {message && (
          <div className={`message ${messageType}`}>
            {messageType === 'success' ? '✓' : '⚠'} {message}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#DBEAFE' }}>📋</div>
                <div className="stat-details">
                  <h3>{stats.totalReservations}</h3>
                  <p>Total Reservations</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#FEF3C7' }}>⏳</div>
                <div className="stat-details">
                  <h3>{stats.pendingReservations}</h3>
                  <p>Pending Approvals</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#D1FAE5' }}>🏫</div>
                <div className="stat-details">
                  <h3>{stats.totalClassrooms}</h3>
                  <p>Total Classrooms</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#E0E7FF' }}>👥</div>
                <div className="stat-details">
                  <h3>{stats.totalStudents}</h3>
                  <p>Registered Students</p>
                </div>
              </div>
            </div>

            <div className="content-card" style={{ marginTop: '30px' }}>
              <h2>Recent Reservations</h2>
              <div className="recent-reservations">
                {reservations.slice(0, 5).map(reservation => (
                  <div key={reservation.reservationId} className="recent-item">
                    <div>
                      <h4>{reservation.studentName}</h4>
                      <p>{reservation.buildingName} - Room {reservation.roomNumber}</p>
                      <small>{new Date(reservation.reservationDate).toLocaleDateString()}</small>
                    </div>
                    {getStatusBadge(reservation.status)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="content-card">
            {reservations.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <h3>No Reservations Yet</h3>
                <p>Reservations will appear here once students start booking.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Classroom</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Purpose</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map(reservation => (
                      <tr key={reservation.reservationId}>
                        <td>
                          <button
                            className="link-button"
                            data-initials={reservation.studentName?.charAt(0) || 'S'}
                            onClick={() => handleOpenStudentProfile(reservation.userId, reservation)}
                          >
                            <span className="name">{reservation.studentName}</span>
                            <span className="id">{reservation.studentId}</span>
                          </button>
                        </td>

                        <td>{reservation.studentId}</td>
                        <td>{reservation.buildingName} - {reservation.roomNumber}</td>
                        <td>{new Date(reservation.reservationDate).toLocaleDateString()}</td>
                        <td>{reservation.startTime} - {reservation.endTime}</td>
                        <td className="purpose-cell">{reservation.purpose}</td>
                        <td>{getStatusBadge(reservation.status)}</td>
                        <td>
                          <div className="action-buttons">
                            {reservation.status === 'pending' && (
                              <>
                                <button
                                  className="btn-action approve"
                                  onClick={() => handleReservationAction(reservation.reservationId, 'approved')}
                                  title="Approve"
                                >
                                  ✓
                                </button>
                                <button
                                  className="btn-action reject"
                                  onClick={() => handleReservationAction(reservation.reservationId, 'rejected')}
                                  title="Reject"
                                >
                                  ✗
                                </button>
                              </>
                            )}
                            <button
                              className="btn-action delete"
                              onClick={() => handleDeleteReservation(reservation.reservationId)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Attendance Tab */}
{activeTab === 'attendance' && (
  <div className="content-card">
    {!selectedReservation ? (
      <>
        <div className="list-header">
          <h2>This Week's Reservations</h2>
          <p>{new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
        </div>

        {todayReservations.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <h3>No reservations this week</h3>
            <p>Approved reservations will appear here when students book classrooms.</p>
          </div>
        ) : (
          <>
            {/* Group by classroom */}
            {Object.entries(
              todayReservations.reduce((acc, reservation) => {
                const key = `${reservation.buildingName} - ${reservation.roomNumber}`;
                if (!acc[key]) {
                  acc[key] = {
                    classroomId: reservation.classroomId,
                    buildingName: reservation.buildingName,
                    roomNumber: reservation.roomNumber,
                    reservations: []
                  };
                }
                acc[key].reservations.push(reservation);
                return acc;
              }, {})
            ).map(([classroomName, classroomData]) => (
              <div key={classroomData.classroomId} className="classroom-attendance-section">
                <div className="classroom-attendance-header">
                  <h3>🏫 {classroomName}</h3>
                  <span className="reservation-count">
                    {classroomData.reservations.length} reservation(s)
                  </span>
                </div>
                
                <div className="reservations-grid">
                  {classroomData.reservations.map(reservation => (
                    <div key={reservation.reservationId} className="reservation-card">
                      <div className="card-header">
                        <h4>{new Date(reservation.reservationDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}</h4>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <div className="card-details">
                        <div className="detail-item">
                          <span className="detail-icon">⏰</span>
                          <span>{reservation.startTime} - {reservation.endTime}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">👥</span>
                          <span>{reservation.seatsReserved} seats reserved</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">📝</span>
                          <span>{reservation.purpose}</span>
                        </div>
                      </div>
                      <div className="card-footer">
                        <button
                          className="btn-primary"
                          onClick={() => handleSelectReservation(reservation)}
                        >
                          Mark Attendance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </>
    ) : (
      <>
        <div className="tally-header">
          <button
            className="back-btn"
            onClick={() => setSelectedReservation(null)}
          >
            ← Back to Reservations
          </button>
          <div>
            <h2>{selectedReservation.buildingName} - {selectedReservation.roomNumber}</h2>
            <p>{new Date(selectedReservation.reservationDate).toLocaleDateString()} • {selectedReservation.startTime} - {selectedReservation.endTime}</p>
          </div>
        </div>

        <div className="attendees-list">
          <h3>Mark Attendance ({attendees.length} students)</h3>
          <div className="attendees-grid">
            {attendees.map(attendee => (
              <div key={attendee.userId} className="attendee-card">
                <div className="attendee-info">
                  <span className="attendee-name">{attendee.fullName}</span>
                  <span className="attendee-id">{attendee.studentId}</span>
                </div>
                <label className="attendance-toggle">
                  <input
                    type="checkbox"
                    checked={attendanceData[attendee.userId] || false}
                    onChange={(e) => handleAttendanceChange(attendee.userId, e.target.checked)}
                  />
                  <span className="toggle-slider">
                    <span className="toggle-icon">
                      {attendanceData[attendee.userId] ? '✅' : '❌'}
                    </span>
                  </span>
                  <span className="toggle-label">
                    {attendanceData[attendee.userId] ? 'Present' : 'Absent'}
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div className="tally-summary">
            <div className="summary-item">
              <span>Present:</span>
              <span>{Object.values(attendanceData).filter(Boolean).length}</span>
            </div>
            <div className="summary-item total">
              <span>Total:</span>
              <span>{attendees.length}</span>
            </div>
            <div className="summary-item">
              <span>Attendance Rate:</span>
              <span>
                {attendees.length > 0
                  ? Math.round(
                      (Object.values(attendanceData).filter(Boolean).length / attendees.length) * 100
                    )
                  : 0}%
              </span>
            </div>
          </div>

          <button
            className="btn-primary submit-btn"
            onClick={handleSubmitAttendance}
          >
            Submit Attendance
          </button>
        </div>
      </>
    )}
  </div>
)}


        {/* Classrooms Tab */}
        {activeTab === 'classrooms' && (
          <div>
            <div className="content-card" style={{ marginBottom: '30px' }}>
              <h2>{editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}</h2>
              <form onSubmit={handleClassroomSubmit} className="classroom-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Building Name *</label>
                    <input
                      type="text"
                      name="buildingName"
                      value={classroomForm.buildingName}
                      onChange={handleClassroomInputChange}
                      placeholder="e.g., NGE Building"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Room Number *</label>
                    <input
                      type="text"
                      name="roomNumber"
                      value={classroomForm.roomNumber}
                      onChange={handleClassroomInputChange}
                      placeholder="e.g., 301"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Capacity *</label>
                    <input
                      type="number"
                      name="capacity"
                      value={classroomForm.capacity}
                      onChange={handleClassroomInputChange}
                      placeholder="e.g., 40"
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Status *</label>
                    <select
                      name="status"
                      value={classroomForm.status}
                      onChange={handleClassroomInputChange}
                      required
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={classroomForm.description}
                    onChange={handleClassroomInputChange}
                    placeholder="Additional details about the classroom..."
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Saving...' : editingClassroom ? 'Update Classroom' : 'Add Classroom'}
                  </button>
                  {editingClassroom && (
                    <button
                      type="button"
                      className="btn-cancel-form"
                      onClick={resetClassroomForm}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="content-card">
              <h2>All Classrooms</h2>
              <div className="classroom-grid">
                {classrooms.map(classroom => (
                  <div key={classroom.classroomId} className="classroom-card">
                    <div className="classroom-header">
                      <h3>{classroom.buildingName}</h3>
                      <span className={`room-status ${classroom.status}`}>
                        {classroom.status}
                      </span>
                    </div>
                    <div className="classroom-body">
                      <div className="classroom-detail">
                        <span className="detail-label">Room:</span>
                        <span className="detail-value">{classroom.roomNumber}</span>
                      </div>
                      <div className="classroom-detail">
                        <span className="detail-label">Capacity:</span>
                        <span className="detail-value">{classroom.capacity} students</span>
                      </div>
                      {classroom.description && (
                        <p className="classroom-description">{classroom.description}</p>
                      )}
                    </div>
                    <div className="classroom-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditClassroom(classroom)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteClassroom(classroom.classroomId)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
{activeTab === 'users' && (
  <div className="content-card">
    <h2>All Users</h2>
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Student ID</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.fullName}</td>
              <td>{u.studentId}</td>
              <td>{u.email}</td>
              <td>
                <span className={`role-badge ${u.role.toLowerCase()}`}>
                  {u.role}
                </span>
              </td>
              <td>
                <span className="status-active">Active</span>
              </td>
              <td>
                {u.role !== 'ADMIN' && (
                  <button
                    className="btn-action delete"
                    onClick={() => handleDeleteUser(u.id)}
                    title="Delete User"
                  >
                    🗑️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}


        {/* Success Modal */}
        {showSuccessModal && (
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
              zIndex: 2000,
              animation: 'fadeIn 0.3s ease'
            }}
            onClick={() => setShowSuccessModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '40px',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                animation: 'slideUp 0.3s ease'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: '40px'
                }}
              >
                ✓
              </div>
              <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>
                Success!
              </h2>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '16px' }}>
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Student Attendance Modal */}
        {showStudentModal && selectedStudent && studentStats && (
          <div className="modal-backdrop" onClick={() => setShowStudentModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>{selectedStudent.fullName}</h2>
              <p>Student ID: {selectedStudent.studentId}</p>
              {selectedStudent.email && <p>Email: {selectedStudent.email}</p>}

              <div className="stats-row">
                <span>Present:</span>
                <strong>{studentStats.presentCount}</strong>
              </div>
              <div className="stats-row">
                <span>Absent:</span>
                <strong>{studentStats.absentCount}</strong>
              </div>
              <div className="stats-row">
                <span>Attendance Rate:</span>
                <strong>
                  {studentStats.presentCount + studentStats.absentCount > 0
                    ? Math.round(
                        (studentStats.presentCount /
                          (studentStats.presentCount + studentStats.absentCount)) * 100
                      )
                    : 0}%
                </strong>
              </div>

              <button className="btn-primary" onClick={() => setShowStudentModal(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
