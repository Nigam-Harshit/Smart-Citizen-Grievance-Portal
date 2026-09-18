const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const initCronJobs = require('./utils/cronJobs');

dotenv.config();

connectDB();
initCronJobs();

const app = express();

// Trust reverse proxy (Render Cloudflare/Envoy ingress) to enable accurate client IP extraction for rate limiting
app.set('trust proxy', 1);

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
app.use('/api/admin-maintenance', require('./routes/maintenanceRoutes'));

// Backward-compatible route aliases
// Backward-compatible route aliases & direct administrative endpoints
app.use('/api/customers', require('./routes/citizenRoutes'));
app.use('/api/reports', require('./routes/grievanceRoutes'));
app.use('/api/interactions', require('./routes/grievanceUpdateRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));
app.use('/api/admin/audit-logs', require('./routes/auditRoutes'));

const { protect: serverProtect, adminOrManager: serverAdminOrManager } = require('./middleware/authMiddleware');
const { generateInsights: serverGenInsights, getInsights: serverGetInsights } = require('./controllers/grievanceController');

app.post('/admin/risk-analysis', serverProtect, serverAdminOrManager, serverGenInsights);
app.get('/admin/risk-analysis', serverProtect, serverAdminOrManager, serverGetInsights);
app.post('/api/admin/risk-analysis', serverProtect, serverAdminOrManager, serverGenInsights);
app.get('/api/admin/risk-analysis', serverProtect, serverAdminOrManager, serverGetInsights);

// Lightweight health check endpoint for external monitoring & keep-alive
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        version: '1.0.2'
    });
});

app.get('/', (req, res) => {
    res.send('Smart Citizen Grievance Management API is running and connected to MongoDB...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
