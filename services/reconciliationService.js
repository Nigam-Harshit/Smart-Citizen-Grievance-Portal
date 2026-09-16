const Grievance = require('../models/Grievance');
const storageService = require('../utils/storageService');

/**
 * Standardized Consistency Status Model for MongoDB ↔ Cloudflare R2
 */
const ConsistencyStatus = {
    HEALTHY: 'HEALTHY',
    MISSING_R2_OBJECT: 'MISSING_R2_OBJECT',
    ORPHAN_R2_OBJECT: 'ORPHAN_R2_OBJECT',
    RECENT_UNREFERENCED_OBJECT: 'RECENT_UNREFERENCED_OBJECT',
    MALFORMED_METADATA: 'MALFORMED_METADATA',
    CLEANUP_FAILED: 'CLEANUP_FAILED',
    RECONCILIATION_FAILED: 'RECONCILIATION_FAILED'
};

// Default safety window: 24 hours (86,400,000 ms)
const DEFAULT_SAFETY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Executes a full, cross-system consistency reconciliation between MongoDB Atlas
 * grievance attachment metadata and private Cloudflare R2 object storage.
 *
 * Safety guarantees:
 * 1. Dry-run mode by default (dryRun: true). Destructive deletion requires explicit dryRun: false.
 * 2. Unreferenced R2 objects younger than safetyWindowMs are never deleted (State: RECENT_UNREFERENCED_OBJECT).
 * 3. Only keys strictly within the grievances/ namespace are examined or eligible for deletion.
 * 4. Missing R2 objects are reported as integrity anomalies but NEVER cause automatic MongoDB record deletion.
 * 5. If either MongoDB or Cloudflare R2 inventory fails, reconciliation halts immediately with zero deletions.
 *
 * @param {object} [options]
 * @param {boolean} [options.dryRun=true] - If true, scans and identifies anomalies without deleting.
 * @param {number} [options.safetyWindowMs] - Minimum age in ms before an unreferenced object can be purged.
 * @param {string} [options.prefix='grievances/'] - Namespace prefix to scan.
 * @returns {Promise<object>} Detailed reconciliation report.
 */
const reconcileStorage = async (options = {}) => {
    const startedAt = new Date();
    const dryRun = options.dryRun !== false; // Default: true
    const prefix = options.prefix || 'grievances/';

    // Namespace security validation
    if (!prefix.startsWith('grievances/')) {
        throw new Error('Reconciliation namespace restricted to grievances/ prefix');
    }

    const safetyWindowMs = Number.isFinite(options.safetyWindowMs)
        ? Math.max(0, options.safetyWindowMs)
        : (Number(process.env.PHOTO_RECONCILIATION_SAFETY_WINDOW_MS) || DEFAULT_SAFETY_WINDOW_MS);

    // Verify storage configuration
    if (!storageService.isStorageConfigured()) {
        return {
            timestamp: startedAt.toISOString(),
            status: 'FAILED',
            error: 'Cloudflare R2 storage credentials are not configured in environment',
            dryRun,
            safetyWindowMs,
            summary: {
                mongoReferencesExamined: 0,
                r2ObjectsExamined: 0,
                healthyCount: 0,
                missingR2Count: 0,
                recentUnreferencedCount: 0,
                orphanCandidatesCount: 0,
                orphansDeletedCount: 0,
                deletionFailuresCount: 0,
                malformedMetadataCount: 0
            },
            details: {
                healthy: [],
                missingR2Objects: [],
                recentUnreferenced: [],
                orphanCandidates: [],
                deletedOrphans: [],
                deletionFailures: [],
                malformedMetadata: []
            }
        };
    }

    // -------------------------------------------------------------
    // STEP 1: Inventory MongoDB Grievance Attachment References
    // -------------------------------------------------------------
    let mongoGrievances;
    try {
        mongoGrievances = await Grievance.find({
            'attachment.storageKey': { $exists: true, $ne: null }
        })
        .select('_id title citizenId status attachment createdAt updatedAt')
        .lean();
    } catch (mongoErr) {
        console.error('[Reconciliation] MongoDB inventory query failed:', mongoErr.message);
        return {
            timestamp: startedAt.toISOString(),
            status: 'FAILED',
            error: `MongoDB inventory query failure: ${mongoErr.message}`,
            dryRun,
            safetyWindowMs,
            summary: {
                mongoReferencesExamined: 0,
                r2ObjectsExamined: 0,
                healthyCount: 0,
                missingR2Count: 0,
                recentUnreferencedCount: 0,
                orphanCandidatesCount: 0,
                orphansDeletedCount: 0,
                deletionFailuresCount: 0,
                malformedMetadataCount: 0
            },
            details: {
                healthy: [],
                missingR2Objects: [],
                recentUnreferenced: [],
                orphanCandidates: [],
                deletedOrphans: [],
                deletionFailures: [],
                malformedMetadata: []
            }
        };
    }

    const mongoReferenceMap = new Map();
    const malformedMetadata = [];

    for (const g of mongoGrievances) {
        const key = g.attachment?.storageKey;
        if (!storageService.isValidStorageKey(key)) {
            malformedMetadata.push({
                grievanceId: g._id,
                title: g.title,
                storageKey: key,
                reason: 'Storage key missing or malformed'
            });
            continue;
        }

        if (mongoReferenceMap.has(key)) {
            malformedMetadata.push({
                grievanceId: g._id,
                title: g.title,
                storageKey: key,
                reason: 'Duplicate storageKey shared across multiple grievances',
                conflictsWith: mongoReferenceMap.get(key).grievanceId
            });
        } else {
            mongoReferenceMap.set(key, {
                grievanceId: g._id,
                title: g.title,
                citizenId: g.citizenId,
                status: g.status,
                storageKey: key,
                createdAt: g.createdAt,
                attachment: g.attachment
            });
        }
    }

    // -------------------------------------------------------------
    // STEP 2: Inventory Cloudflare R2 Objects (with full pagination)
    // -------------------------------------------------------------
    let r2Objects;
    try {
        r2Objects = await storageService.listAllObjects({ prefix });
    } catch (r2Err) {
        console.error('[Reconciliation] Cloudflare R2 inventory scan failed:', r2Err.message);
        return {
            timestamp: startedAt.toISOString(),
            status: 'FAILED',
            error: `Cloudflare R2 inventory listing failure: ${r2Err.message}`,
            dryRun,
            safetyWindowMs,
            summary: {
                mongoReferencesExamined: mongoReferenceMap.size,
                r2ObjectsExamined: 0,
                healthyCount: 0,
                missingR2Count: 0,
                recentUnreferencedCount: 0,
                orphanCandidatesCount: 0,
                orphansDeletedCount: 0,
                deletionFailuresCount: 0,
                malformedMetadataCount: malformedMetadata.length
            },
            details: {
                healthy: [],
                missingR2Objects: [],
                recentUnreferenced: [],
                orphanCandidates: [],
                deletedOrphans: [],
                deletionFailures: [],
                malformedMetadata
            }
        };
    }

    const r2ObjectMap = new Map();
    for (const obj of r2Objects) {
        r2ObjectMap.set(obj.key, obj);
    }

    // -------------------------------------------------------------
    // STEP 3: Cross-System Comparison & State Classification
    // -------------------------------------------------------------
    const healthy = [];
    const missingR2Objects = [];
    const recentUnreferenced = [];
    const orphanCandidates = [];

    // Check MongoDB -> R2
    for (const [key, ref] of mongoReferenceMap.entries()) {
        if (r2ObjectMap.has(key)) {
            const r2Meta = r2ObjectMap.get(key);
            healthy.push({
                grievanceId: ref.grievanceId,
                storageKey: key,
                size: r2Meta.size,
                lastModified: r2Meta.lastModified,
                status: ConsistencyStatus.HEALTHY
            });
        } else {
            missingR2Objects.push({
                grievanceId: ref.grievanceId,
                title: ref.title,
                storageKey: key,
                createdAt: ref.createdAt,
                status: ConsistencyStatus.MISSING_R2_OBJECT
            });
        }
    }

    // Check R2 -> MongoDB
    const now = Date.now();
    for (const [key, obj] of r2ObjectMap.entries()) {
        if (!mongoReferenceMap.has(key)) {
            const lastModDate = obj.lastModified ? new Date(obj.lastModified) : null;
            const lastModTime = lastModDate && !isNaN(lastModDate.getTime()) ? lastModDate.getTime() : null;

            // Fail-safe: If lastModified is missing or unparseable, treat as recent to protect from deletion
            if (lastModTime === null) {
                recentUnreferenced.push({
                    key,
                    size: obj.size,
                    lastModified: obj.lastModified,
                    ageMs: 0,
                    safetyWindowMs,
                    reason: 'Unparseable or missing lastModified timestamp - protected from deletion',
                    status: ConsistencyStatus.RECENT_UNREFERENCED_OBJECT
                });
                continue;
            }

            const ageMs = now - lastModTime;

            if (ageMs < safetyWindowMs) {
                recentUnreferenced.push({
                    key,
                    size: obj.size,
                    lastModified: obj.lastModified,
                    ageMs,
                    safetyWindowMs,
                    status: ConsistencyStatus.RECENT_UNREFERENCED_OBJECT
                });
            } else {
                orphanCandidates.push({
                    key,
                    size: obj.size,
                    lastModified: obj.lastModified,
                    ageMs,
                    safetyWindowMs,
                    status: ConsistencyStatus.ORPHAN_R2_OBJECT
                });
            }
        }
    }

    // -------------------------------------------------------------
    // STEP 4: Deletion Execution (Destructive Mode Only)
    // -------------------------------------------------------------
    const deletedOrphans = [];
    const deletionFailures = [];

    if (!dryRun) {
        for (const orphan of orphanCandidates) {
            // Namespace safety check
            if (!storageService.isValidStorageKey(orphan.key)) {
                console.warn('[Reconciliation] Skipping deletion of invalid/unsafe key:', orphan.key);
                continue;
            }

            try {
                await storageService.deleteFromR2(orphan.key);
                deletedOrphans.push({
                    key: orphan.key,
                    size: orphan.size,
                    deletedAt: new Date().toISOString(),
                    reconciled: true
                });
            } catch (delErr) {
                console.error(`[Reconciliation] Failed to delete orphan ${orphan.key}:`, delErr.message);
                deletionFailures.push({
                    key: orphan.key,
                    error: delErr.message,
                    status: ConsistencyStatus.CLEANUP_FAILED,
                    reconciled: false
                });
            }
        }
    }

    const completedAt = new Date();

    return {
        timestamp: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        status: deletionFailures.length > 0 ? 'PARTIAL' : 'COMPLETE',
        dryRun,
        safetyWindowMs,
        summary: {
            mongoReferencesExamined: mongoGrievances.length,
            r2ObjectsExamined: r2Objects.length,
            healthyCount: healthy.length,
            missingR2Count: missingR2Objects.length,
            recentUnreferencedCount: recentUnreferenced.length,
            orphanCandidatesCount: orphanCandidates.length,
            orphansDeletedCount: deletedOrphans.length,
            deletionFailuresCount: deletionFailures.length,
            malformedMetadataCount: malformedMetadata.length
        },
        details: {
            healthy,
            missingR2Objects,
            recentUnreferenced,
            orphanCandidates,
            deletedOrphans,
            deletionFailures,
            malformedMetadata
        }
    };
};

module.exports = {
    ConsistencyStatus,
    DEFAULT_SAFETY_WINDOW_MS,
    reconcileStorage
};

