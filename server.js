const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const initCronJobs = require('./utils/cronJobs');

dotenv.config();

connectDB();
initCronJobs();

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ["https://smart-citizen-grievance-portal.vercel.app", "http://localhost:3000", "http://localhost:5000"];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, server-to-server) or listed origins
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy violation: Origin ${origin} is not allowed`));
        }
    },
    credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/citizens', require('./routes/citizenRoutes'));
app.use('/api/grievances', require('./routes/grievanceRoutes'));
app.use('/api/grievance-updates', require('./routes/grievanceUpdateRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));

// Backward-compatible route aliases
app.use('/api/customers', require('./routes/citizenRoutes'));
app.use('/api/reports', require('./routes/grievanceRoutes'));
app.use('/api/interactions', require('./routes/grievanceUpdateRoutes'));

app.get('/', (req, res) => {
    res.send('Smart Citizen Grievance Management API is running and connected to MongoDB...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
