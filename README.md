# 🏫 Campus Reserve

A web-based classroom reservation system for CIT-U students.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Spring Boot (Java)
- **AI Service:** Python Flask
- **Database:** MySQL

## Getting Started

### Prerequisites
- Node.js
- Java 17+
- Python 3.x
- MySQL

### 1. Database Setup
```sql
CREATE DATABASE citbooking_db;
```

### 2. Backend (Spring Boot)
```bash
cd backend
# Update application.properties with your DB credentials
mvn spring-boot:run
```
Runs on `http://localhost:8080`

### 3. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`

### 4. AI Service (Python Flask)
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate
pip install flask flask-cors
python app.py
```
Runs on `http://localhost:5000`

## Default Admin Account
Create via registration form, then update role in MySQL:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your.email@cit.edu';
```

## Features
- 🔐 Student registration and login
- 📅 Classroom seat reservation (Mon–Sat, 7AM–9PM)
- ✅ Admin approval/rejection of reservations
- 🤖 AI room suggestion based on occupancy and preference
- 👁️ Attendance tracking
