const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const StorageUsage = require('../models/StorageUsage');

const defaultFindOneAndUpdate = StorageUsage.findOneAndUpdate;
const isDbConnectedOrMocked = () => {
  return Boolean(
    (mongoose.connection && mongoose.connection.readyState === 1) ||
    (StorageUsage.findOneAndUpdate !== defaultFindOneAndUpdate)
  );
};

// Default Safety Quota Configuration
const DEFAULT_LIMITS = {
  monthlyUploadLimit: 1000,           // Max 1,000 photos/month
  monthlyStorageLimitMB: 2048,        // Max 2,048 MB (2 GB) / month (well below AWS 5 GB free tier)
  dailyUploadLimit: 200,              // Max 200 photos/day
  maxUploadsPerUser: 20,              // Max 20 photos/citizen/month
  maxUploadsPerIp: 30,                // Max 30 photos/IP/month
  consecutiveFailuresThreshold: 5,    // Auto-trip circuit breaker after 5 consecutive storage failures
  defaultEstimatedBytes: 2 * 1024 * 1024 // 2 MB reservation per in-flight upload
};

const getCurrentPeriod = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const getGovernorLimits = () => {
  return {
    monthlyUploadLimit: Number(process.env.PHOTO_MONTHLY_UPLOAD_LIMIT) || DEFAULT_LIMITS.monthlyUploadLimit,
    monthlyStorageLimitMB: Number(process.env.PHOTO_MONTHLY_STORAGE_LIMIT_MB) || DEFAULT_LIMITS.monthlyStorageLimitMB,
    dailyUploadLimit: Number(process.env.PHOTO_DAILY_UPLOAD_LIMIT) || DEFAULT_LIMITS.dailyUploadLimit,
    maxUploadsPerUser: Number(process.env.PHOTO_MAX_UPLOADS_PER_USER) || DEFAULT_LIMITS.maxUploadsPerUser,
    maxUploadsPerIp: Number(process.env.PHOTO_MAX_UPLOADS_PER_IP) || DEFAULT_LIMITS.maxUploadsPerIp,
    consecutiveFailuresThreshold: Number(process.env.PHOTO_CONSECUTIVE_FAILURES_THRESHOLD) || DEFAULT_LIMITS.consecutiveFailuresThreshold,
    defaultEstimatedBytes: DEFAULT_LIMITS.defaultEstimatedBytes
  };
};

/**
 * Ensures a StorageUsage ledger document exists for the given period.
 * Uses atomic upsert.
 */
const getOrCreateLedger = async (period = getCurrentPeriod()) => {
  return await StorageUsage.findOneAndUpdate(
    { period },
    {
      $setOnInsert: {
        period,
        totalUploads: 0,
        totalStoredBytes: 0,
        reservedBytes: 0,
        photoAccessRequests: 0,
        uploadFailures: 0,
        consecutiveFailures: 0,
        status: 'ACTIVE',
        dailyUsage: [],
        userUsage: [],
        ipUsage: []
      }
    },
    { upsert: true, new: true }
  );
};

/**
 * Atomically reserves storage quota before Sharp processing and S3 upload.
 * Prevents concurrency race conditions from exceeding monthly or daily storage limits.
 *
 * @param {object} params
 * @param {string} [params.citizenId]
 * @param {string} [params.ip]
 * @param {number} [params.estimatedBytes]
 * @param {string} [params.period]
 * @returns {Promise<{ allowed: boolean, reservationId?: string, period?: string, estimatedBytes?: number, code?: string, message?: string }>}
 */
const reserveUploadQuota = async ({ citizenId, ip, estimatedBytes, period = getCurrentPeriod() } = {}) => {
  if (process.env.PHOTO_COST_GOVERNOR_ENABLED === 'false' || !isDbConnectedOrMocked()) {
    return { allowed: true, reservationId: null, period, estimatedBytes: 0 };
  }

  const limits = getGovernorLimits();
  const resBytes = Number(estimatedBytes) > 0 ? Number(estimatedBytes) : limits.defaultEstimatedBytes;
  const maxStorageBytes = limits.monthlyStorageLimitMB * 1024 * 1024;
  const today = getCurrentDate();

  // Ensure ledger exists
  const ledger = await getOrCreateLedger(period);

  // Check manual/administrative kill-switch or safe mode
  if (ledger.status === 'DISABLED') {
    return {
      allowed: false,
      code: 'PHOTO_STORAGE_DISABLED',
      message: 'Photographic evidence uploads are disabled by system administrator.'
    };
  }

  if (ledger.status === 'SAFE_MODE') {
    return {
      allowed: false,
      code: 'PHOTO_STORAGE_SAFE_MODE',
      message: 'Photographic evidence uploads are temporarily unavailable.'
    };
  }

  // Check per-user upload limit for the current period
  if (citizenId && Array.isArray(ledger.userUsage)) {
    const userEntry = ledger.userUsage.find(u => String(u.userId) === String(citizenId));
    if (userEntry && userEntry.uploads >= limits.maxUploadsPerUser) {
      return {
        allowed: false,
        code: 'USER_UPLOAD_LIMIT_EXCEEDED',
        message: 'You have reached your monthly photographic evidence upload limit.'
      };
    }
  }

  // Check per-IP upload limit for the current period
  if (ip && Array.isArray(ledger.ipUsage)) {
    const ipEntry = ledger.ipUsage.find(i => i.ip === ip);
    if (ipEntry && ipEntry.uploads >= limits.maxUploadsPerIp) {
      return {
        allowed: false,
        code: 'IP_UPLOAD_LIMIT_EXCEEDED',
        message: 'Too many photographic evidence uploads from this network.'
      };
    }
  }

  // Check daily upload limit
  if (Array.isArray(ledger.dailyUsage)) {
    const todayEntry = ledger.dailyUsage.find(d => d.date === today);
    if (todayEntry && todayEntry.uploads >= limits.dailyUploadLimit) {
      return {
        allowed: false,
        code: 'DAILY_UPLOAD_LIMIT_EXCEEDED',
        message: 'Daily photographic evidence upload quota reached. Please try again tomorrow.'
      };
    }
  }

  // Atomic reservation: $expr guarantees (totalStoredBytes + reservedBytes + resBytes) <= maxStorageBytes
  const updated = await StorageUsage.findOneAndUpdate(
    {
      period,
      status: 'ACTIVE',
      totalUploads: { $lt: limits.monthlyUploadLimit },
      $expr: {
        $lte: [
          { $add: ['$totalStoredBytes', '$reservedBytes', resBytes] },
          maxStorageBytes
        ]
      }
    },
    {
      $inc: { reservedBytes: resBytes }
    },
    { new: true }
  );

  // If atomic reservation failed, determine root cause and trip circuit breaker if necessary
  if (!updated) {
    const current = await StorageUsage.findOne({ period });
    if (!current || current.status !== 'ACTIVE') {
      return {
        allowed: false,
        code: 'PHOTO_STORAGE_SAFE_MODE',
        message: 'Photographic evidence uploads are temporarily unavailable.'
      };
    }

    // Monthly storage or upload limit hit -> automatically trip into SAFE_MODE
    const reason = current.totalUploads >= limits.monthlyUploadLimit
      ? 'MONTHLY_UPLOAD_COUNT_LIMIT_REACHED'
      : 'MONTHLY_STORAGE_BYTE_LIMIT_REACHED';

    await tripSafeMode(period, reason);

    return {
      allowed: false,
      code: 'PHOTO_STORAGE_SAFE_MODE',
      message: 'Photographic evidence uploads are temporarily unavailable.'
    };
  }

  const reservationId = `${period}:${uuidv4()}:${resBytes}`;
  return {
    allowed: true,
    reservationId,
    period,
    estimatedBytes: resBytes
  };
};

/**
 * Commits the reserved quota upon successful grievance creation and S3 upload.
 * Decrements reservedBytes and increments actual totalStoredBytes and totalUploads.
 */
const commitReservation = async ({ period = getCurrentPeriod(), estimatedBytes = 0, actualBytes = 0, citizenId, ip } = {}) => {
  if (process.env.PHOTO_COST_GOVERNOR_ENABLED === 'false' || !isDbConnectedOrMocked()) return;

  const today = getCurrentDate();
  const est = Math.max(0, Number(estimatedBytes) || 0);
  const actual = Math.max(0, Number(actualBytes) || 0);

  // 1. Atomically adjust monthly totals and reset consecutive failures
  const updateQuery = {
    $inc: {
      reservedBytes: -est,
      totalStoredBytes: actual,
      totalUploads: 1
    },
    $set: {
      consecutiveFailures: 0
    }
  };

  await StorageUsage.findOneAndUpdate({ period }, updateQuery);

  // 2. Update daily breakdown
  const dailyRecord = await StorageUsage.findOne({ period, 'dailyUsage.date': today });
  if (dailyRecord) {
    await StorageUsage.updateOne(
      { period, 'dailyUsage.date': today },
      { $inc: { 'dailyUsage.$.uploads': 1, 'dailyUsage.$.bytes': actual } }
    );
  } else {
    await StorageUsage.updateOne(
      { period },
      { $push: { dailyUsage: { date: today, uploads: 1, bytes: actual } } }
    );
  }

  // 3. Update per-user breakdown
  if (citizenId) {
    const userRecord = await StorageUsage.findOne({ period, 'userUsage.userId': citizenId });
    if (userRecord) {
      await StorageUsage.updateOne(
        { period, 'userUsage.userId': citizenId },
        { $inc: { 'userUsage.$.uploads': 1 } }
      );
    } else {
      await StorageUsage.updateOne(
        { period },
        { $push: { userUsage: { userId: citizenId, uploads: 1 } } }
      );
    }
  }

  // 4. Update per-IP breakdown
  if (ip) {
    const ipRecord = await StorageUsage.findOne({ period, 'ipUsage.ip': ip });
    if (ipRecord) {
      await StorageUsage.updateOne(
        { period, 'ipUsage.ip': ip },
        { $inc: { 'ipUsage.$.uploads': 1 } }
      );
    } else {
      await StorageUsage.updateOne(
        { period },
        { $push: { ipUsage: { ip, uploads: 1 } } }
      );
    }
  }
};

/**
 * Releases reserved quota if S3 upload or database persistence fails.
 * Increments failure counters; automatically trips circuit breaker if consecutive failures exceed threshold.
 */
const releaseReservation = async ({ period = getCurrentPeriod(), estimatedBytes = 0, isFailure = true } = {}) => {
  if (process.env.PHOTO_COST_GOVERNOR_ENABLED === 'false' || !isDbConnectedOrMocked()) return;

  const est = Math.max(0, Number(estimatedBytes) || 0);
  const limits = getGovernorLimits();

  const update = {
    $inc: {
      reservedBytes: -est
    }
  };

  if (isFailure) {
    update.$inc.uploadFailures = 1;
    update.$inc.consecutiveFailures = 1;
  }

  const updated = await StorageUsage.findOneAndUpdate(
    { period },
    update,
    { new: true }
  );

  // Check if consecutive storage failures exceeded threshold -> trip circuit breaker
  if (isFailure && updated && updated.consecutiveFailures >= limits.consecutiveFailuresThreshold && updated.status === 'ACTIVE') {
    console.error(`[CostGovernor] Tripping circuit breaker: ${updated.consecutiveFailures} consecutive storage failures.`);
    await tripSafeMode(period, 'CONSECUTIVE_STORAGE_FAILURES');
  }
};

/**
 * Records a photo access request (presigned GET URL generation) for telemetry and monthly access tracking.
 */
const recordPhotoAccessRequest = async (period = getCurrentPeriod()) => {
  if (process.env.PHOTO_COST_GOVERNOR_ENABLED === 'false' || !isDbConnectedOrMocked()) return;
  try {
    await StorageUsage.updateOne(
      { period },
      { $inc: { photoAccessRequests: 1 } }
    );
  } catch (err) {
    // Non-blocking telemetry
    console.warn('[CostGovernor] Failed to record photo access request:', err.message);
  }
};

/**
 * Trips the circuit breaker into SAFE_MODE.
 */
const tripSafeMode = async (period = getCurrentPeriod(), reason = 'SAFETY_LIMIT_REACHED') => {
  if (!isDbConnectedOrMocked()) return null;
  return await StorageUsage.findOneAndUpdate(
    { period },
    {
      $set: {
        status: 'SAFE_MODE',
        safeModeReason: reason,
        safeModeActivatedAt: new Date()
      }
    },
    { new: true }
  );
};

/**
 * Resets the circuit breaker from SAFE_MODE back to ACTIVE.
 * Requires explicit administrator action; validates that current usage is below limits.
 */
const resetSafeMode = async (period = getCurrentPeriod()) => {
  const limits = getGovernorLimits();
  const maxStorageBytes = limits.monthlyStorageLimitMB * 1024 * 1024;
  const ledger = await StorageUsage.findOne({ period });

  if (!ledger) {
    throw new Error(`No ledger found for period ${period}`);
  }

  // Prevent re-enabling if storage limit is still hard-exceeded
  if (ledger.totalStoredBytes >= maxStorageBytes) {
    throw new Error(`Cannot reset safe mode: Total stored bytes (${(ledger.totalStoredBytes / (1024 * 1024)).toFixed(2)} MB) exceeds monthly limit (${limits.monthlyStorageLimitMB} MB). Please increase PHOTO_MONTHLY_STORAGE_LIMIT_MB.`);
  }

  if (ledger.totalUploads >= limits.monthlyUploadLimit) {
    throw new Error(`Cannot reset safe mode: Total uploads (${ledger.totalUploads}) exceeds monthly limit (${limits.monthlyUploadLimit}). Please increase PHOTO_MONTHLY_UPLOAD_LIMIT.`);
  }

  return await StorageUsage.findOneAndUpdate(
    { period },
    {
      $set: {
        status: 'ACTIVE',
        safeModeReason: null,
        safeModeActivatedAt: null,
        consecutiveFailures: 0
      }
    },
    { new: true }
  );
};

/**
 * Retrieves storage usage telemetry, remaining quotas, and safety state.
 */
const getStorageUsage = async (period = getCurrentPeriod()) => {
  const limits = getGovernorLimits();
  const ledger = await getOrCreateLedger(period);
  const maxStorageBytes = limits.monthlyStorageLimitMB * 1024 * 1024;

  const remainingUploads = Math.max(0, limits.monthlyUploadLimit - ledger.totalUploads);
  const remainingBytes = Math.max(0, maxStorageBytes - (ledger.totalStoredBytes + ledger.reservedBytes));
  const remainingStorageMB = Number((remainingBytes / (1024 * 1024)).toFixed(2));

  return {
    period: ledger.period,
    status: ledger.status,
    safeModeReason: ledger.safeModeReason,
    safeModeActivatedAt: ledger.safeModeActivatedAt,
    totalUploads: ledger.totalUploads,
    totalStoredBytes: ledger.totalStoredBytes,
    totalStoredMB: Number((ledger.totalStoredBytes / (1024 * 1024)).toFixed(2)),
    reservedBytes: ledger.reservedBytes,
    photoAccessRequests: ledger.photoAccessRequests,
    uploadFailures: ledger.uploadFailures,
    consecutiveFailures: ledger.consecutiveFailures,
    quota: {
      monthlyUploadLimit: limits.monthlyUploadLimit,
      monthlyStorageLimitMB: limits.monthlyStorageLimitMB,
      dailyUploadLimit: limits.dailyUploadLimit,
      remainingUploads,
      remainingStorageMB,
      utilizationPercent: Number(((ledger.totalStoredBytes / maxStorageBytes) * 100).toFixed(2))
    },
    lastReconciledAt: ledger.lastReconciledAt,
    updatedAt: ledger.updatedAt
  };
};

module.exports = {
  DEFAULT_LIMITS,
  getCurrentPeriod,
  getCurrentDate,
  getGovernorLimits,
  getOrCreateLedger,
  reserveUploadQuota,
  commitReservation,
  releaseReservation,
  recordPhotoAccessRequest,
  tripSafeMode,
  resetSafeMode,
  getStorageUsage
};
