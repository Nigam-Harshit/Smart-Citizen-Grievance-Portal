# Smart Citizen Grievance Management & Analytics Portal: Architecture Guide

This document provides an architectural overview of the technical structure, schema design, role-based security layer, SLA calculation engine, and background automation of the **Smart Citizen Grievance Management & Analytics Portal**.

---

## 1. Libraries & Dependencies

### **Backend (Node.js/Express)**
| Library | Purpose & Rationale |
| :--- | :--- |
| **express** | Core framework for building RESTful APIs and request routing. |
| **mongoose** | Object Data Modeling (ODM) library for MongoDB schema management. |
| **mongodb-memory-server** | In-memory MongoDB database fallback for zero-setup local execution when MongoDB is not running locally. |
| **jsonwebtoken (JWT)** | Role-based authentication token handling. |
| **bcryptjs** | Password hashing for secure credential storage. |
| **dotenv** | Environment configuration management (`MONGO_URI`, `JWT_SECRET`, `PORT`). |
| **nodemailer** | Automated email notifications for status updates and SLA breaches. |
| **node-cron** | Background job scheduler (8 AM SLA breach scanner, Friday 5 PM weekly resolution summary). |
| **cors** | Enables Cross-Origin Resource Sharing for React client integration. |

### **Frontend (React)**
| Library | Purpose & Rationale |
| :--- | :--- |
| **axios** | HTTP client wrapper (`utils/api.js`) with automatic JWT bearer header injection. |
| **chart.js / react-chartjs-2** | Animated charts for Admin Analytics (Category Breakdown, Filing vs Resolution Trends, Risk Matrix). |
| **jspdf / jspdf-autotable** | Client-side PDF generation for master grievance reports and directory exports. |
| **xlsx (SheetJS)** | Client-side Excel spreadsheet export functionality. |
| **react-router-dom** | Client-side routing with role-based route protection (`ProtectedRoute.js`). |

---

## 2. Role Access & Control Matrix

The portal implements 4 distinct roles:

| Feature / Endpoint | Citizen | Officer | Manager | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Public Registration (`/register`)** | ✅ | ❌ | ❌ | ❌ |
| **Staff User Account Creation** | ❌ | ❌ | ❌ | ✅ |
| **Lodge Grievance (`POST /api/grievances`)** | ✅ | ❌ | ✅ | ✅ |
| **View Own Grievances (`GET /api/grievances`)** | ✅ | ✅ (Assigned) | ✅ (All) | ✅ (All) |
| **Interactive Field Kanban Board** | ❌ | ✅ | ❌ | ❌ |
| **Assign Officer to Grievance** | ❌ | ❌ | ✅ | ✅ |
| **Run AI Escalation Model** | ❌ | ❌ | ✅ | ✅ |
| **View System Audit Logs** | ❌ | ❌ | ❌ | ✅ |

---

## 3. Data Schema Architecture (`/models`)

1. **`User.js`**: Core authentication model storing email, hashed password, role (`'admin'`, `'manager'`, `'officer'`, `'citizen'`), and `linkedCitizenId`.
2. **`Citizen.js`**: Civic profile model storing name, email, contact phone, residential address, assigned officer ID, and AI escalation risk score (`'Low'`, `'Medium'`, `'High'`).
3. **`Grievance.js`**: Complaint model storing title, description, category (`Sanitation`, `Roads & Traffic`, `Water Supply`, `Electricity`, `Public Safety`, `Other`), location landmark, priority (`Critical`, `High`, `Medium`, `Low`), status (`Open`, `In Progress`, `Resolved`), SLA deadline timestamp, and resolution timestamp.
4. **`GrievanceUpdate.js`**: Chronological timeline model logging official updates (`Citizen Response`, `Officer Field Note`, `Status Update`, `Escalation Alert`, `Resolution`).
5. **`Insight.js`**: AI escalation recommendation model outputting risk triggers and zonal dispatch recommendations.
6. **`AuditLog.js`**: System-wide administrative action tracking model.

---

## 4. SLA Target Calculation & Escalation Engine

- **SLA Deadline Logic**:
  - `Critical` Priority: **24 Hours** (Emergency Dispatch)
  - `High` Priority: **3 Days** (72 Hours)
  - `Medium` Priority: **7 Days**
  - `Low` Priority: **14 Days**
- **Automated SLA Scanning**: Daily 8 AM cron job checks for open/in-progress grievances past their `deadline` timestamp and flags SLA breach alerts.
- **AI Escalation Risk Model**: Evaluates unresolved critical grievances, SLA breach age, and inactivity to classify citizen escalation risk and output actionable inspection recommendations.
