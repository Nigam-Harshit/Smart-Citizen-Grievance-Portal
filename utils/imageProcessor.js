const sharp = require('sharp');
const crypto = require('crypto');

// Enforced V2 Image Processing Constants
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_INPUT_PIXELS = 20 * 1000 * 1000; // 20 Megapixels ceiling
const MAX_OUTPUT_WIDTH = 2048;
const MAX_OUTPUT_HEIGHT = 2048;
const OUTPUT_JPEG_QUALITY = 82;
const ALLOWED_INPUT_FORMATS = ['jpeg', 'png', 'webp'];

/**
 * Validates, normalizes, and sanitizes an in-memory image buffer.
 *
 * Pipeline sequence:
 * 1. Validates buffer existence and enforces 8 MB size ceiling.
 * 2. Decodes image metadata with Sharp enforcing 20 MP limitInputPixels.
 * 3. Enforces supported input formats (JPEG, PNG, WebP).
 * 4. Normalizes EXIF orientation (.rotate()).
 * 5. Downscales to max 2048x2048 without enlargement, preserving aspect ratio.
 * 6. Strips all EXIF, GPS, camera, and device metadata.
 * 7. Re-encodes as progressive JPEG at quality ~82.
 * 8. Computes SHA-256 checksum over the final normalized buffer.
 *
 * @param {Buffer} inputBuffer - The incoming image buffer from Multer memoryStorage
 * @returns {Promise<{
 *   buffer: Buffer,
 *   originalFormat: string,
 *   format: string,
 *   mimeType: string,
 *   size: number,
 *   dimensions: { width: number, height: number },
 *   checksum: string
 * }>}
 */
const validateAndProcessImage = async (inputBuffer) => {
    if (!inputBuffer || !Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
        const err = new Error('No image buffer provided for processing');
        err.code = 'INVALID_BUFFER';
        throw err;
    }

    if (inputBuffer.length > MAX_INPUT_BYTES) {
        const err = new Error(`Image size (${(inputBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 8 MB`);
        err.code = 'FILE_TOO_LARGE';
        throw err;
    }

    // Step 1: Decode and inspect input metadata with pixel limit
    let metadata;
    try {
        const probe = sharp(inputBuffer, {
            limitInputPixels: MAX_INPUT_PIXELS,
            failOnError: true
        });
        metadata = await probe.metadata();
    } catch (decodeErr) {
        if (decodeErr.message && decodeErr.message.includes('pixel limit')) {
            const err = new Error('Image dimensions exceed the allowed 20 Megapixel ceiling');
            err.code = 'PIXEL_LIMIT_EXCEEDED';
            throw err;
        }
        const err = new Error('Invalid, corrupt, or unsupported image file');
        err.code = 'MALFORMED_IMAGE';
        throw err;
    }

    // Step 2: Validate format against allowed formats
    if (!metadata.format || !ALLOWED_INPUT_FORMATS.includes(metadata.format.toLowerCase())) {
        const err = new Error(`Unsupported image format: ${metadata.format || 'unknown'}. Allowed formats: JPEG, PNG, WebP`);
        err.code = 'UNSUPPORTED_FORMAT';
        throw err;
    }

    // Additional sanity check on dimensions
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    if (width === 0 || height === 0) {
        const err = new Error('Image has invalid or zero dimensions');
        err.code = 'INVALID_DIMENSIONS';
        throw err;
    }

    if ((width * height) > MAX_INPUT_PIXELS) {
        const err = new Error('Image total pixels exceed the allowed 20 Megapixel ceiling');
        err.code = 'PIXEL_LIMIT_EXCEEDED';
        throw err;
    }

    // Step 3: Sharp processing pipeline:
    // .rotate() -> corrects orientation based on EXIF before stripping
    // .resize() -> downscales to inside 2048x2048 without enlargement
    // Sharp strips EXIF/GPS metadata by default (unless .withMetadata() is called)
    // .jpeg() -> progressive JPEG output at specified quality
    let outputBuffer;
    let finalInfo;
    try {
        const pipeline = sharp(inputBuffer, {
            limitInputPixels: MAX_INPUT_PIXELS,
            failOnError: true
        })
            .rotate() // Auto-orient based on EXIF orientation tag
            .resize({
                width: MAX_OUTPUT_WIDTH,
                height: MAX_OUTPUT_HEIGHT,
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: OUTPUT_JPEG_QUALITY,
                progressive: true,
                mozjpeg: true
            });

        const result = await pipeline.toBuffer({ resolveWithObject: true });
        outputBuffer = result.data;
        finalInfo = result.info;
    } catch (processErr) {
        console.error('Sharp image processing error:', processErr.message);
        const err = new Error('Failed to process and normalize image');
        err.code = 'PROCESSING_FAILED';
        throw err;
    }

    // Step 4: Compute cryptographically secure SHA-256 checksum over the final stored bytes
    const checksum = crypto.createHash('sha256').update(outputBuffer).digest('hex');

    return {
        buffer: outputBuffer,
        originalFormat: metadata.format.toLowerCase(),
        format: 'jpeg',
        mimeType: 'image/jpeg',
        size: outputBuffer.length,
        dimensions: {
            width: finalInfo.width,
            height: finalInfo.height
        },
        checksum: `sha256:${checksum}`
    };
};

module.exports = {
    validateAndProcessImage,
    MAX_INPUT_BYTES,
    MAX_INPUT_PIXELS,
    MAX_OUTPUT_WIDTH,
    MAX_OUTPUT_HEIGHT,
    OUTPUT_JPEG_QUALITY,
    ALLOWED_INPUT_FORMATS
};
