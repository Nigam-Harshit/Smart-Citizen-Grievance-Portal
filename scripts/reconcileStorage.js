#!/usr/bin/env node

/**
 * Storage Consistency & Orphan Reconciliation CLI Script
 *
 * Usage:
 *   node scripts/reconcileStorage.js              # Safe Dry-Run (Default: zero deletions)
 *   node scripts/reconcileStorage.js --dry-run    # Explicit Dry-Run
 *   node scripts/reconcileStorage.js --delete     # DESTRUCTIVE: Delete eligible orphans
 *   node scripts/reconcileStorage.js --verbose    # Output detailed itemized lists
 *   node scripts/reconcileStorage.js --safety-window-hours=12
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { reconcileStorage } = require('../services/reconciliationService');

dotenv.config();

const parseArgs = () => {
    const args = process.argv.slice(2);
    let dryRun = true;
    let verbose = false;
    let safetyWindowHours = null;

    for (const arg of args) {
        if (arg === '--delete') {
            dryRun = false;
        } else if (arg === '--dry-run') {
            dryRun = true;
        } else if (arg === '--verbose' || arg === '-v') {
            verbose = true;
        } else if (arg.startsWith('--safety-window-hours=')) {
            safetyWindowHours = parseFloat(arg.split('=')[1]);
        }
    }

    return { dryRun, verbose, safetyWindowHours };
};

const run = async () => {
    const { dryRun, verbose, safetyWindowHours } = parseArgs();

    console.log('\n================================================================');
    console.log('🏛️  SMART CITIZEN GRIEVANCE PORTAL — STORAGE RECONCILIATION CLI');
    console.log('================================================================');
    console.log(`Execution Mode : ${dryRun ? '🛡️  DRY-RUN (Safe Simulation — ZERO deletions)' : '⚠️  DESTRUCTIVE (Eligible orphans will be PURGED)'}`);
    if (safetyWindowHours !== null) {
        console.log(`Safety Window  : ${safetyWindowHours} hour(s)`);
    }

    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('❌ Error: MONGO_URI is missing from environment variables.');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB Atlas database');
    } catch (dbErr) {
        console.error('❌ Failed to connect to MongoDB Atlas:', dbErr.message);
        process.exit(1);
    }

    const options = { dryRun };
    if (safetyWindowHours !== null && !isNaN(safetyWindowHours)) {
        options.safetyWindowMs = safetyWindowHours * 60 * 60 * 1000;
    }

    console.log('Scanning MongoDB attachment references and Cloudflare R2 inventory...\n');

    try {
        const report = await reconcileStorage(options);

        console.log('----------------------------------------------------------------');
        console.log('📊 RECONCILIATION SUMMARY REPORT');
        console.log('----------------------------------------------------------------');
        console.log(`Status                    : ${report.status}`);
        console.log(`Duration                  : ${report.durationMs || 0} ms`);
        console.log(`Safety Window             : ${(report.safetyWindowMs / (1000 * 60 * 60)).toFixed(1)} hours`);
        console.log(`MongoDB References Scanned: ${report.summary.mongoReferencesExamined}`);
        console.log(`Cloudflare R2 Objects     : ${report.summary.r2ObjectsExamined}`);
        console.log(`Healthy Verified Pairs    : ${report.summary.healthyCount}`);
        console.log(`Missing R2 Objects        : ${report.summary.missingR2Count} ${report.summary.missingR2Count > 0 ? '⚠️ (Integrity Anomaly)' : ''}`);
        console.log(`Recent Unreferenced (Safe): ${report.summary.recentUnreferencedCount}`);
        console.log(`Orphan Candidates         : ${report.summary.orphanCandidatesCount}`);
        console.log(`Orphans Purged from R2    : ${report.summary.orphansDeletedCount}`);
        console.log(`Deletion Failures         : ${report.summary.deletionFailuresCount}`);
        console.log(`Malformed Metadata        : ${report.summary.malformedMetadataCount}`);
        console.log('----------------------------------------------------------------\n');

        if (verbose) {
            if (report.details.missingR2Objects.length > 0) {
                console.log('⚠️  MISSING R2 OBJECTS (DB references non-existent image):');
                report.details.missingR2Objects.forEach(item => {
                    console.log(`  - Grievance ID: ${item.grievanceId} | StorageKey: ${item.storageKey} | Title: "${item.title}"`);
                });
                console.log('');
            }

            if (report.details.recentUnreferenced.length > 0) {
                console.log('⏳ RECENT UNREFERENCED OBJECTS (Inside safety window — Protected from deletion):');
                report.details.recentUnreferenced.forEach(item => {
                    console.log(`  - Key: ${item.key} | Age: ${(item.ageMs / (1000 * 60)).toFixed(1)} mins | Size: ${item.size} bytes`);
                });
                console.log('');
            }

            if (report.details.orphanCandidates.length > 0) {
                console.log(`🗑️  ORPHAN CANDIDATES (${dryRun ? 'WOULD BE PURGED in destructive mode' : 'PURGE CANDIDATES'}):`);
                report.details.orphanCandidates.forEach(item => {
                    console.log(`  - Key: ${item.key} | Age: ${(item.ageMs / (1000 * 60 * 60)).toFixed(1)} hours | Size: ${item.size} bytes`);
                });
                console.log('');
            }

            if (report.details.deletedOrphans.length > 0) {
                console.log('✓ PURGED ORPHANS:');
                report.details.deletedOrphans.forEach(item => {
                    console.log(`  - Key: ${item.key} | Purged At: ${item.deletedAt}`);
                });
                console.log('');
            }
        }

        await mongoose.disconnect();
        console.log('✓ Disconnected from database cleanly.\n');

        if (report.status === 'FAILED') {
            process.exit(1);
        }
    } catch (err) {
        console.error('❌ Reconciliation failed with unhandled error:', err.message);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    }
};

if (require.main === module) {
    run();
}

module.exports = { run };
