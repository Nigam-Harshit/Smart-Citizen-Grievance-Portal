const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

let cachedClient = null;

/**
 * Validates that all required R2 environment variables are populated.
 * @returns {boolean}
 */
const isStorageConfigured = () => {
    return Boolean(
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
    );
};

/**
 * Initializes and returns the S3Client configured for Cloudflare R2.
 * Uses lazy initialization and caches the client instance.
 * @returns {S3Client}
 */
const getS3Client = () => {
    if (!isStorageConfigured()) {
        const err = new Error('Cloudflare R2 storage credentials are not configured in environment');
        err.code = 'STORAGE_NOT_CONFIGURED';
        throw err;
    }

    if (!cachedClient) {
        cachedClient = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
            }
        });
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
 * Uploads a normalized JPEG buffer to the private Cloudflare R2 bucket.
 * @param {string} key - The destination storage key (e.g. grievances/<uuid>.jpg)
 * @param {Buffer} buffer - The image binary buffer to store
 * @param {string} [mimeType='image/jpeg'] - The Content-Type header
 * @returns {Promise<{ key: string, bucket: string }>}
 */
const uploadToR2 = async (key, buffer, mimeType = 'image/jpeg') => {
    if (!key || typeof key !== 'string' || !key.startsWith('grievances/')) {
        throw new Error('Invalid storage key provided for R2 upload');
    }
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('Invalid image buffer provided for R2 upload');
    }

    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME;

    try {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType
        });

        await client.send(command);
        return { key, bucket };
    } catch (error) {
        console.error('R2 upload failure for key:', key, error.message);
        const err = new Error('Failed to securely store evidence attachment in object storage');
        err.code = 'R2_UPLOAD_ERROR';
        throw err;
    }
};

/**
 * Deletes an object from the private Cloudflare R2 bucket.
 * Used for compensating cleanup when database persistence fails.
 * @param {string} key - The storage key to delete
 * @returns {Promise<{ deleted: boolean, key: string }>}
 */
const deleteFromR2 = async (key) => {
    if (!key || typeof key !== 'string') {
        throw new Error('Invalid storage key provided for R2 deletion');
    }

    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME;

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        });

        await client.send(command);
        return { deleted: true, key };
    } catch (error) {
        console.error('R2 deletion failure for key:', key, error.message);
        const err = new Error('Failed to delete object from storage');
        err.code = 'R2_DELETE_ERROR';
        throw err;
    }
};

/**
 * Generates a temporary authorized presigned GET URL for an evidence image.
 * Expiration defaults to PHOTO_PRESIGNED_EXPIRES_IN (or 300s / 5 minutes).
 * @param {string} key - The R2 storage key
 * @param {number} [expiresInSeconds] - Optional override for expiration TTL
 * @returns {Promise<{ url: string, expiresIn: number }>}
 */
const generatePresignedGetUrl = async (key, expiresInSeconds) => {
    if (!key || typeof key !== 'string') {
        throw new Error('Invalid storage key provided for presigned URL generation');
    }

    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME;
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

module.exports = {
    isStorageConfigured,
    getS3Client,
    generateStorageKey,
    uploadToR2,
    deleteFromR2,
    generatePresignedGetUrl
};
