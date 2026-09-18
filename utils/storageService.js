const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

let cachedClient = null;

/**
 * Resolves the active storage provider based on environment configuration.
 * Prioritizes AWS S3; falls back to Cloudflare R2.
 * @returns {'s3'|'r2'|null}
 */
const getStorageProvider = () => {
    if (
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        (process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME)
    ) {
        return 's3';
    }
    if (
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
    ) {
        return 'r2';
    }
    return null;
};

/**
 * Resolves the active bucket name from S3 or R2 environment variables.
 * @returns {string|null}
 */
const getBucketName = () => {
    return (
        process.env.S3_BUCKET_NAME ||
        process.env.AWS_BUCKET_NAME ||
        process.env.R2_BUCKET_NAME ||
        null
    );
};

/**
 * Validates that all required storage environment variables are populated for S3 or R2.
 * @returns {boolean}
 */
const isStorageConfigured = () => {
    return Boolean(getStorageProvider());
};

/**
 * Resets the cached S3Client instance (primarily for testing and dynamic config changes).
 */
const resetClient = () => {
    cachedClient = null;
};

/**
 * Initializes and returns the S3Client configured for AWS S3 or Cloudflare R2.
 * Uses lazy initialization and caches the client instance.
 * @returns {S3Client}
 */
const getS3Client = () => {
    const provider = getStorageProvider();
    if (!provider) {
        const err = new Error('Object storage credentials (AWS S3 or Cloudflare R2) are not configured in environment');
        err.code = 'STORAGE_NOT_CONFIGURED';
        throw err;
    }

    if (!cachedClient) {
        if (provider === 's3') {
            const config = {
                region: process.env.AWS_REGION || 'us-east-1',
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            };
            if (process.env.AWS_S3_ENDPOINT) {
                config.endpoint = process.env.AWS_S3_ENDPOINT;
                config.forcePathStyle = true;
            }
            cachedClient = new S3Client(config);
        } else {
            cachedClient = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                }
            });
        }
    }

    return cachedClient;
};

/**
 * Generates an opaque, cryptographically secure storage key.
 * Format: grievances/<uuidv4>.jpg
 * Strictly free of PII, timestamps, user IDs, or ticket details.
 * @returns {string}
 */
const generateStorageKey = () => {
    return `grievances/${uuidv4()}.jpg`;
};

/**
 * Validates that an object key belongs strictly to the grievances namespace,
 * contains no path traversal sequences, URL-encoding tricks, query parameters,
 * or illegal characters, and adheres to the server-controlled key format.
 * @param {string} key
 * @returns {boolean}
 */
const isValidStorageKey = (key) => {
    if (!key || typeof key !== 'string') return false;
    if (key.length < 12 || key.length > 256) return false;
    if (!key.startsWith('grievances/')) return false;
    if (key.includes('..') || key.includes('\\') || key.includes('\0') || key.includes('%') || key.includes('?') || key.includes('#')) {
        return false;
    }
    if (/[\s\x00-\x1f\x7f]/.test(key)) return false;
    return /^grievances\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)+$/.test(key);
};

/**
 * Uploads a normalized evidence photo buffer to the private object storage bucket (AWS S3 or Cloudflare R2).
 * For AWS S3, automatically applies AES256 server-side encryption (SSE-S3).
 * @param {string} key - The validated storage key (must start with grievances/)
 * @param {Buffer} buffer - The image buffer to upload
 * @param {string} [mimeType='image/jpeg'] - The Content-Type header
 * @returns {Promise<{ key: string, bucket: string, provider: string }>}
 */
const uploadToS3 = async (key, buffer, mimeType = 'image/jpeg') => {
    if (!isValidStorageKey(key)) {
        throw new Error('Invalid storage key provided for storage upload');
    }
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('Invalid image buffer provided for storage upload');
    }

    const client = getS3Client();
    const bucket = getBucketName();
    const provider = getStorageProvider();

    try {
        const putParams = {
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType
        };

        // Enforce SSE-S3 AES256 encryption on AWS S3
        if (provider === 's3') {
            putParams.ServerSideEncryption = 'AES256';
        }

        const command = new PutObjectCommand(putParams);
        await client.send(command);
        return { key, bucket, provider };
    } catch (error) {
        console.error('Storage upload failure for key:', key, error.message);
        const err = new Error('Failed to securely store evidence attachment in object storage');
        err.code = provider === 's3' ? 'S3_UPLOAD_ERROR' : 'R2_UPLOAD_ERROR';
        throw err;
    }
};

/**
 * Deletes an object from the private object storage bucket (AWS S3 or Cloudflare R2).
 * Used for compensating cleanup when database persistence fails.
 * @param {string} key - The storage key to delete
 * @returns {Promise<{ deleted: boolean, key: string }>}
 */
const deleteFromS3 = async (key) => {
    if (!isValidStorageKey(key)) {
        throw new Error('Invalid storage key provided for storage deletion');
    }

    const client = getS3Client();
    const bucket = getBucketName();
    const provider = getStorageProvider();

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        });

        await client.send(command);
        return { deleted: true, key };
    } catch (error) {
        console.error('Storage deletion failure for key:', key, error.message);
        const err = new Error('Failed to delete object from storage');
        err.code = provider === 's3' ? 'S3_DELETE_ERROR' : 'R2_DELETE_ERROR';
        throw err;
    }
};

// Aliases for unified and legacy compatibility
const uploadToStorage = uploadToS3;
const uploadToR2 = uploadToS3;
const deleteFromStorage = deleteFromS3;
const deleteFromR2 = deleteFromS3;

/**
 * Generates a temporary authorized presigned GET URL for an evidence image.
 * Expiration defaults to PHOTO_PRESIGNED_EXPIRES_IN (or 300s / 5 minutes).
 * @param {string} key - The storage key
 * @param {number} [expiresInSeconds] - Optional override for expiration TTL
 * @returns {Promise<{ url: string, expiresIn: number }>}
 */
const generatePresignedGetUrl = async (key, expiresInSeconds) => {
    if (!isValidStorageKey(key)) {
        throw new Error('Invalid storage key provided for presigned URL generation');
    }

    const client = getS3Client();
    const bucket = getBucketName();
    const ttl = Number(expiresInSeconds) || Number(process.env.PHOTO_PRESIGNED_EXPIRES_IN) || 300;

    try {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key
        });

        const url = await getSignedUrl(client, command, { expiresIn: ttl });
        return { url, expiresIn: ttl };
    } catch (error) {
        console.error('Presigned URL generation failed for key:', key, error.message);
        const err = new Error('Failed to generate secure temporary access URL');
        err.code = 'PRESIGN_URL_ERROR';
        throw err;
    }
};

/**
 * Lists a single page of objects under the specified prefix.
 * Supports pagination through continuationToken.
 * @param {object} [options]
 * @param {string} [options.prefix='grievances/']
 * @param {string} [options.continuationToken]
 * @param {number} [options.maxKeys=1000]
 * @returns {Promise<{ objects: Array<{ key: string, size: number, lastModified: Date, etag: string }>, isTruncated: boolean, nextContinuationToken: string|null, keyCount: number }>}
 */
const listObjects = async ({ prefix = 'grievances/', continuationToken, maxKeys = 1000 } = {}) => {
    if (!prefix || !prefix.startsWith('grievances/')) {
        throw new Error('Listing restricted to grievances/ prefix');
    }

    const client = getS3Client();
    const bucket = getBucketName();

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken || undefined,
            MaxKeys: Number(maxKeys) || 1000
        });

        const response = await client.send(command);
        const contents = response.Contents || [];

        const objects = contents
            .filter(item => isValidStorageKey(item.Key))
            .map(item => ({
                key: item.Key,
                size: item.Size,
                lastModified: item.LastModified,
                etag: item.ETag ? item.ETag.replace(/^"|"$/g, '') : undefined
            }));

        return {
            objects,
            isTruncated: Boolean(response.IsTruncated),
            nextContinuationToken: response.NextContinuationToken || null,
            keyCount: response.KeyCount || objects.length
        };
    } catch (error) {
        console.error('Storage listObjects failure:', error.message);
        const err = new Error('Failed to list objects from storage service');
        err.code = 'STORAGE_LIST_ERROR';
        throw err;
    }
};

/**
 * Iteratively collects objects under the grievances namespace across pages.
 * Handles ContinuationToken pagination until all records are retrieved,
 * or until optional maxObjects ceiling is reached.
 * @param {object} [options]
 * @param {string} [options.prefix='grievances/']
 * @param {number} [options.maxObjects] - Optional ceiling on total objects to retrieve
 * @param {number} [options.batchSize=1000] - Keys requested per page
 * @returns {Promise<Array<{ key: string, size: number, lastModified: Date, etag: string }>>}
 */
const listAllObjects = async ({ prefix = 'grievances/', maxObjects, batchSize = 1000 } = {}) => {
    const allObjects = [];
    let continuationToken = undefined;
    let isTruncated = true;

    while (isTruncated) {
        let pageLimit = batchSize;
        if (Number.isFinite(maxObjects)) {
            const remaining = maxObjects - allObjects.length;
            if (remaining <= 0) break;
            pageLimit = Math.min(batchSize, remaining);
        }

        const page = await module.exports.listObjects({ prefix, continuationToken, maxKeys: pageLimit });
        allObjects.push(...page.objects);
        isTruncated = page.isTruncated;
        continuationToken = page.nextContinuationToken;
        if (!continuationToken) break;
        if (Number.isFinite(maxObjects) && allObjects.length >= maxObjects) break;
    }

    return allObjects;
};

/**
 * Checks whether an object exists in object storage without downloading the body.
 * @param {string} key
 * @returns {Promise<{ exists: boolean, size?: number, lastModified?: Date }>}
 */
const checkObjectExists = async (key) => {
    if (!isValidStorageKey(key)) {
        throw new Error('Invalid storage key provided for object check');
    }

    const client = getS3Client();
    const bucket = getBucketName();

    try {
        const command = new HeadObjectCommand({
            Bucket: bucket,
            Key: key
        });
        const response = await client.send(command);
        return {
            exists: true,
            size: response.ContentLength,
            lastModified: response.LastModified
        };
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404 || error.message?.includes('404')) {
            return { exists: false };
        }
        console.error('Storage checkObjectExists failure for key:', key, error.message);
        const err = new Error('Failed to verify object presence in storage');
        err.code = 'STORAGE_HEAD_ERROR';
        throw err;
    }
};

module.exports = {
    isStorageConfigured,
    getStorageProvider,
    getBucketName,
    resetClient,
    getS3Client,
    generateStorageKey,
    isValidStorageKey,
    uploadToS3,
    uploadToStorage,
    uploadToR2,
    deleteFromS3,
    deleteFromStorage,
    deleteFromR2,
    generatePresignedGetUrl,
    listObjects,
    listAllObjects,
    checkObjectExists
};
