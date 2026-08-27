# Smart Citizen Grievance Management & Analytics Portal

A comprehensive MERN Stack application for managing civic issues, citizen grievances, field officer dispatches, SLA compliance tracking, and AI-driven escalation risk analytics.

## Project Overview

This portal enables municipal bodies, administration, field officers, and citizens to interact seamlessly:
- **Citizens**: Self-register, lodge public grievances with location and priority, track 360-degree resolution timelines, and interact with assigned officers.
- **Field Officers**: Manage assigned jurisdiction tickets via an interactive Kanban board (Open → In Progress → Resolved), update timeline notes, and view assigned citizen portfolios.
- **Admins & Managers**: Monitor real-time civic analytics dashboards, track SLA breaches (> 24h/72h/7d/14d targets), execute AI Escalation Risk models, assign officers, and export data in PDF/Excel.

## Key Features

- **4-Role Access Control**: Granular role-based access for `admin`, `manager`, `officer`, and `citizen` using JWT and custom middleware guards.
- **Smart Grievance SLA Engine**: Auto-computes SLA target deadlines based on issue priority (Critical=24h, High=3d, Medium=7d, Low=14d) with automated daily cron scanning for SLA breaches.
- **AI Escalation Risk Matrix**: Automated rule-based escalation risk model flagging high-risk citizen accounts based on unresolved critical issues, overdue SLA breaches, and inactivity.
- **Grievance Activity & Audit Logging**: Chronological timeline logs for every grievance touchpoint alongside system-wide administrative action tracking.
- **Interactive Analytics Dashboard**: Visual charts powered by Chart.js (Category Distribution, Resolution Trends, Escalation Risk Matrix).
- **Glassmorphism Design System**: Modern dark-mode UI with micro-animations, collapsible sidebars, and live search.

## Tech Stack

- **Frontend**: React.js, React Router, Context API, Chart.js, jsPDF/xlsx (for client exports)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose (with automated MongoMemoryServer fallback for zero-setup execution)
- **Automation**: Node-Cron background jobs, Nodemailer SMTP wrapper
- **Styling**: Custom Vanilla CSS (Glassmorphism design system)

## Setup & Execution Instructions

1. **Install Backend Dependencies**:
   ```bash
   npm install
   ```

2. **Install Frontend Dependencies**:
   ```bash
   cd client
   npm install
   cd ..
   ```

3. **Database Seeding**:
   Populate MongoDB with Indian citizen profiles, officers, sample grievances across categories, timeline updates, and AI insights:
   ```bash
   node seed.js
   ```

4. **Run Application**:
   ```bash
   npm run dev
   ```
   Backend runs on `http://localhost:5000` and Frontend runs on `http://localhost:3000`.

## Demo User Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@grievance.gov.in` | `Password123!` | Full System Command Center & Audit Logs |
| **Manager** | `manager@grievance.gov.in` | `Password123!` | Analytics Dashboard & Grievance Oversights |
| **Officer** | `officer.sharma@grievance.gov.in` | `Password123!` | Assigned Kanban Board & Field Ticket Management |
| **Citizen** | `citizen.rajesh@gmail.com` | `Password123!` | Citizen Portal, Lodge Grievance, Track Timeline |

---
**Developed for Smart Citizen Grievance Portal**
