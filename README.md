# Smart Citizen Grievance Management & Analytics Portal

A comprehensive MERN Stack application for managing civic issues, citizen grievances, field officer dispatches, SLA compliance tracking, and AI-driven escalation risk analytics.

## Target Production Architecture

```
Vercel (React frontend SPA) → HTTPS → Render (Express backend API + JWT auth) → MongoDB Atlas (Persistent Database)
```

## Project Overview

This portal enables municipal bodies, administration, field officers, and citizens to interact seamlessly:
- **Citizens**: Self-register, lodge public grievances with location and priority, track 360-degree resolution timelines, and interact with assigned officers.
- **Field Officers**: Manage assigned jurisdiction tickets via an interactive 3-column Kanban board (Open → In Progress → Resolved), update timeline notes, and view assigned citizen portfolios.
- **Admins & Managers**: Monitor real-time civic analytics dashboards, track SLA breaches (> 24h/72h/7d/14d targets), execute AI Escalation Risk models, assign officers, and export data in PDF/Excel.

## Running Locally

1. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/Nigam-Harshit/Smart-Citizen-Grievance-Portal.git
   cd Smart-Citizen-Grievance-Portal
   npm install
   cd client && npm install && cd ..
   ```

2. **Start Application (Zero-Setup Auto-Seeding)**:
   ```bash
   npm run dev
   ```
   - **Backend API**: Running on `http://localhost:5000`
   - **Frontend App**: Opens automatically on `http://localhost:3000`
   - *Note: If a local MongoDB instance is not detected, the backend automatically initializes `mongodb-memory-server` and populates initial demo dataset on startup! No separate DB installation required.*

3. **Optional Manual Database Reset**:
   ```bash
   node seed.js
   ```

## Production Environment Variables

### Backend Environment Variables (Render / Host)
- `PORT`: Server port (provided dynamically by host).
- `MONGO_URI`: MongoDB Atlas connection string.
- `JWT_SECRET`: Secret key for signing JWT bearer tokens.
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins (e.g. `https://your-app.vercel.app`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL`: Email notification settings.

### Frontend Environment Variables (Vercel)
- `REACT_APP_API`: Backend API URL (e.g. `https://your-backend.onrender.com`).

## Demo User Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@grievance.gov.in` | `Password123!` | Full System Command Center & Audit Logs |
| **Manager** | `manager@grievance.gov.in` | `Password123!` | Analytics Dashboard & Grievance Oversights |
| **Officer** | `officer.sharma@grievance.gov.in` | `Password123!` | Assigned Kanban Board & Field Ticket Management |
| **Citizen** | `citizen.rajesh@gmail.com` | `Password123!` | Citizen Portal, Lodge Grievance, Track Timeline |

## Tech Stack

- **Frontend**: React.js, React Router, Context API, Chart.js, jsPDF/xlsx (for client exports)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Automation**: Node-Cron background jobs, Nodemailer SMTP wrapper
- **Styling**: Custom Vanilla CSS (Frosted Municipal Glass design system)

---
**Smart Citizen Grievance Management & Analytics Portal**
