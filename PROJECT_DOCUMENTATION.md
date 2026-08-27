# Smart Citizen Grievance Management & Analytics Portal Documentation

## 1. Project Overview
This project is a **Smart Citizen Grievance Management & Analytics Portal** built using the **MERN Stack** (MongoDB, Express.js, React, Node.js). It is designed to manage public complaints, field officer dispatches, SLA compliance tracking, and AI-driven civic escalation risk analytics.

---

## 2. Key Modules & Technical Implementation

### **4-Role Authentication & Access Control**
- **Public Register (`/register`)**: Strictly restricted to creating `citizen` accounts and automatically instantiates a linked `Citizen` document.
- **Admin Staff Creation (`/api/auth/create-staff`)**: Allows Admins to register new Officers or Managers.
- **JWT Authorization**: Enforces role access using middleware guards (`protect`, `officerOrAdmin`, `citizenOnly`, `authorize`).

### **Grievance Resolution Lifecycle**
The core civic workflow models every stage from submission to verification:
1. **Filing**: Citizens choose a municipal category (`Sanitation`, `Roads & Traffic`, `Water Supply`, `Electricity`, `Public Safety`, `Other`), describe location landmarks, and select priority.
2. **SLA Calculation**: Server automatically computes resolution target deadlines based on priority (`Critical` = 24h, `High` = 3d, `Medium` = 7d, `Low` = 14d).
3. **Officer Dispatch**: Admins/Managers assign field officers; officers manage assigned complaints via an interactive 3-column Kanban board (`Open` → `In Progress` → `Resolved`).
4. **Timeline Updates**: Both officers and citizens log chronological updates (`Officer Field Note`, `Citizen Response`, `Status Update`, `Resolution`).

### **AI Escalation Risk Engine**
- Evaluates citizen complaint history, unresolved critical tickets, and SLA breach ages.
- Classifies risk levels (`Low`, `Medium`, `High`) and generates zonal dispatch recommendations.

---

## 3. Seed & Running Instructions

1. **Seed Database**:
   ```bash
   node seed.js
   ```
2. **Run Server & Client**:
   ```bash
   npm run dev
   ```

---
**Smart Citizen Grievance Management & Analytics Portal**
