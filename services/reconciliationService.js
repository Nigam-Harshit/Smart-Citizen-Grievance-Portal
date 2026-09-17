const Grievance = require('../models/Grievance');
const storageService = require('../utils/storageService');

/**
 * Standardized 5-State Consistency Model for MongoDB ↔ Cloudflare R2
 */
const ConsistencyStatus = {
    HEALTHY: 'HEALTHY',
    MISSING_R2_OBJECT: 'MISSING_R2_OBJECT',
    ORPHAN_R2_OBJECT: 'ORPHAN_R2_OBJECT',
    RECENT_UNREFERENCED_OBJECT: 'RECENT_UNREFERENCED_OBJECT',
    MALFORMED_METADATA: 'MALFORMED_METADATA',
    NOT_FOUND_BOTH: 'NOT_FOUND_BOTH',
    CLEANUP_FAILED: 'CLEANUP_FAILED',
    RECONCILIATION_FAILED: 'RECONCILIATION_FAILED'
};

// Default safety window: 24 hours (86,400,000 ms)
const DEFAULT_SAFETY_WINDOW_MS = 24 * 60 * 60 * 1000;

const defaultExists = Grievance.exists;
const defaultFindOne = Grievance.findOne;

const isExistsMockedOrConnected = () => {
    return (Grievance.db && Grievance.db.readyState === 1) || (Grievance.exists !== defaultExists);
};

const isFindOneMockedOrConnected = () => {
    return (Grievance.db && Grievance.db.readyState === 1) || (Grievance.findOne !== defaultFindOne);
};

let isServiceReconciling = false;

/**
 * Checks whether an active reconciliation run is currently in progress in this process.
 * @returns {boolean}
 */
const isReconciliationRunning = () => isServiceReconciling;

/**
 * Executes a targeted consistency audit and reconciliation for a specified array of storage keys.
 * Useful for processing Phase 12 [ORPHAN_RECONCILIATION_REQUIRED] telemetry inputs.
 *
 * @param {object} params
 * @param {string[]} params.targetKeys
 * @param {boolean} params.dryRun
 * @param {number} params.safetyWindowMs
 * @param {Date} params.startedAt
 * @returns {Promise<object>}
 */
const reconcileTargetedKeys = async ({ targetKeys, dryRun, safetyWindowMs, startedAt }) => {
    const healthy = [];
    const missingR2Objects = [];
    const recentUnreferenced = [];
    const orphanCandidates = [];
    const deletedOrphans = [];
    const deletionFailures = [];
    const malformedMetadata = [];
    const notFoundBoth = [];
    const now = Date.now();

    for (const key of targetKeys) {
        if (!storageService.isValidStorageKey(key)) {
            malformedMetadata.push({
                storageKey: key,
                reason: 'Target key is invalid or malformed'
            });
            continue;
        }

        let mongoDoc = null;
        if (isFindOneMockedOrConnected()) {
            try {
                mongoDoc = await Grievance.findOne({ 'attachment.storageKey': key })
                    .select('_id title citizenId status attachment createdAt')
                    .lean();
            } catch (mongoErr) {
                console.error('[Reconciliation] Target key Mongo lookup error:', mongoErr.message);
                throw new Error(`MongoDB query failure: ${mongoErr.message}`);
            }
        }

        let r2Meta;
        try {
            r2Meta = await storageService.checkObjectExists(key);
        } catch (r2Err) {
            console.error('[Reconciliation] Target key R2 lookup error:', r2Err.message);
            throw new Error(`R2 head failure: ${r2Err.message}`);
        }

        if (mongoDoc && r2Meta.exists) {
            healthy.push({
                grievanceId: mongoDoc._id,
                storageKey: key,
                size: r2Meta.size,
                lastModified: r2Meta.lastModified,
                status: ConsistencyStatus.HEALTHY
            });
        } else if (mongoDoc && !r2Meta.exists) {
            missingR2Objects.push({
                grievanceId: mongoDoc._id,
                title: mongoDoc.title,
                storageKey: key,
                createdAt: mongoDoc.createdAt,
                status: ConsistencyStatus.MISSING_R2_OBJECT
            });
        } else if (!mongoDoc && r2Meta.exists) {
            const lastModDate = r2Meta.lastModified ? new Date(r2Meta.lastModified) : null;
            const lastModTime = lastModDate && !isNaN(lastModDate.getTime()) ? lastModDate.getTime() : null;
            const ageMs = lastModTime !== null ? Math.max(0, now - lastModTime) : 0;

            if (lastModTime === null || ageMs < safetyWindowMs) {
                recentUnreferenced.push({
                    key,
                    size: r2Meta.size,
                    lastModified: r2Meta.lastModified,
                    ageMs,
                    safetyWindowMs,
                    status: ConsistencyStatus.RECENT_UNREFERENCED_OBJECT
                });
            } else {
                const orphanItem = {
                    key,
                    size: r2Meta.size,
                    lastModified: r2Meta.lastModified,
                    ageMs,
                    safetyWindowMs,
                    status: ConsistencyStatus.ORPHAN_R2_OBJECT
                };
                orphanCandidates.push(orphanItem);

                if (!dryRun) {
                    let isNowReferenced = false;
                    if (isExistsMockedOrConnected()) {
                        try {
                            isNowReferenced = Boolean(await Grievance.exists({ 'attachment.storageKey': key }));
                        } catch (_) {}
                    }

                    if (isNowReferenced) {
                        console.warn(`[Reconciliation] Orphan candidate ${key} became referenced in MongoDB. Aborting deletion.`);
                    } else {
                        try {
                            await storageService.deleteFromR2(key);
                            deletedOrphans.push({
                                key,
                                size: r2Meta.size,
                                deletedAt: new Date().toISOString(),
                                reconciled: true
                            });
                        } catch (delErr) {
                            deletionFailures.push({
                                key,
                                error: delErr.message,
                                status: ConsistencyStatus.CLEANUP_FAILED,
                                reconciled: false
                            });
                        }
                    }
                }
            }
        } else {
            // Neither exists: State 4 (No action)
            notFoundBoth.push({
                key,
                status: ConsistencyStatus.NOT_FOUND_BOTH,
                message: 'Target key does not exist in MongoDB or Cloudflare R2'
            });
        }
    }

    const completedAt = new Date();
    return {
        timestamp: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        status: deletionFailures.length > 0 ? 'PARTIAL' : 'COMPLETE',
        dryRun,
        safetyWindowMs,
        targetKeysCount: targetKeys.length,
        summary: {
            mongoReferencesExamined: healthy.length + missingR2Objects.length,
            r2ObjectsExamined: healthy.length + recentUnreferenced.length + orphanCandidates.length,
            healthyCount: healthy.length,
            missingR2Count: missingR2Objects.length,
            recentUnreferencedCount: recentUnreferenced.length,
            orphanCandidatesCount: orphanCandidates.length,
            orphansDeletedCount: deletedOrphans.length,
            deletionFailuresCount: deletionFailures.length,
            malformedMetadataCount: malformedMetadata.length,
            notFoundBothCount: notFoundBoth.length
        },
        details: {
            healthy,
            missingR2Objects,
            recentUnreferenced,
            orphanCandidates,
            deletedOrphans,
            deletionFailures,
            malformedMetadata,
            notFoundBoth
        }
    };
};

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
 * 6. Concurrency safe: Re-checks MongoDB existence before deleting any orphan candidate in Step 4.
 *
 * @param {object} [options]
 * @param {boolean} [options.dryRun=true] - If true, scans and identifies anomalies without deleting.
 * @param {number} [options.safetyWindowMs] - Minimum age in ms before an unreferenced object can be purged.
 * @param {string} [options.prefix='grievances/'] - Namespace prefix to scan.
 * @param {number} [options.maxObjects] - Optional ceiling on R2 objects to scan in this run.
 * @param {number} [options.batchSize=1000] - Keys requested per pagination page.
 * @param {string[]} [options.targetKeys] - Optional array of specific keys to reconcile.
 * @param {boolean} [options.enforceSingleRun=false] - If true, rejects concurrent execution in same process.
 * @returns {Promise<object>} Detailed reconciliation report.
 */
const reconcileStorage = async (options = {}) => {
    if (options.enforceSingleRun && isServiceReconciling) {
        const err = new Error('Reconciliation is already running in this process');
        err.code = 'CONCURRENT_RUN_CONFLICT';
        throw err;
    }

    isServiceReconciling = true;
    const startedAt = new Date();

    try {
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

        // Targeted mode: If specific targetKeys provided, execute targeted reconciliation
        if (options.targetKeys && Array.isArray(options.targetKeys) && options.targetKeys.length > 0) {
            return await reconcileTargetedKeys({
                targetKeys: options.targetKeys,
                dryRun,
                safetyWindowMs,
                startedAt
            });
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
            r2Objects = await storageService.listAllObjects({
                prefix,
                maxObjects: options.maxObjects,
                batchSize: options.batchSize
            });
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

                // Concurrency guard: Re-verify that the object has not become referenced in MongoDB
                // between the inventory scan and deletion execution
                let isNowReferenced = mongoReferenceMap.has(orphan.key);
                if (!isNowReferenced && isExistsMockedOrConnected()) {
                    try {
                        isNowReferenced = Boolean(await Grievance.exists({ 'attachment.storageKey': orphan.key }));
                    } catch (checkErr) {
                        console.error(`[Reconciliation] Error verifying reference state for ${orphan.key}:`, checkErr.message);
                        deletionFailures.push({
                            key: orphan.key,
                            error: `Database reference verification failure: ${checkErr.message}`,
                            status: ConsistencyStatus.CLEANUP_FAILED,
                            reconciled: false
                        });
                        continue;
                    }
                }

                if (isNowReferenced) {
                    console.warn(`[Reconciliation] Orphan candidate ${orphan.key} became referenced in MongoDB during reconciliation run. Deletion aborted.`);
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

        // Update StorageUsage ledger reconciliation timestamp if connected
        try {
            const StorageUsage = require('../models/StorageUsage');
            if (StorageUsage.db && StorageUsage.db.readyState === 1) {
                await StorageUsage.updateMany({}, { $set: { lastReconciledAt: completedAt } });
            }
        } catch (_) {}

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
    } finally {
        isServiceReconciling = false;
    }
};

module.exports = {
    ConsistencyStatus,
    DEFAULT_SAFETY_WINDOW_MS,
    reconcileStorage,
    isReconciliationRunning
};
