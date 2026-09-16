/**
 * Client-Side Image Optimizer for Citizen Evidence Attachments
 * 
 * Provides pure-browser downscaling and compression using the HTML5 Canvas API.
 * Reduces large smartphone photos (e.g. 10-25 MB, 4000x3000px) down to acceptable
 * dimensions and sizes before multipart upload, preserving mobile bandwidth and
 * preventing 413 Payload Too Large errors.
 * 
 * Guarantees safe fallback: If canvas processing fails, image decoding errors, or
 * if the environment lacks canvas support, the original File is preserved and returned.
 */

/**
 * Downscale and compress an image File if it exceeds size or dimension ceilings.
 * 
 * @param {File} file - The image File selected by the user.
 * @param {Object} options - Compression configuration options.
 * @param {number} [options.maxWidth=2048] - Maximum output width in pixels.
 * @param {number} [options.maxHeight=2048] - Maximum output height in pixels.
 * @param {number} [options.quality=0.85] - Compression quality for lossy formats (0.0 to 1.0).
 * @param {number} [options.maxSizeBytes=2097152] - Target ceiling (2 MB). Files below this with valid dimensions skip recompression.
 * @returns {Promise<File>} The optimized File or original File on fallback.
 */
export const optimizeImageFile = async (file, options = {}) => {
    const {
        maxWidth = 2048,
        maxHeight = 2048,
        quality = 0.85,
        maxSizeBytes = 2 * 1024 * 1024 // 2 MB
    } = options;

    // Safety checks: ensure browser environment supports Image and Canvas
    if (!file || typeof window === 'undefined' || typeof document === 'undefined') {
        return file;
    }

    if (!window.HTMLCanvasElement || !window.URL || !window.URL.createObjectURL) {
        return file;
    }

    // Only process supported image MIME types
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
        return file;
    }

    return new Promise((resolve) => {
        let objectUrl = null;

        try {
            objectUrl = URL.createObjectURL(file);
        } catch (e) {
            console.warn('[imageOptimizer] Failed to create object URL, using original file:', e);
            return resolve(file);
        }

        const img = new Image();

        const cleanup = () => {
            if (objectUrl) {
                try {
                    URL.revokeObjectURL(objectUrl);
                } catch (_) {}
            }
        };

        img.onload = () => {
            try {
                const origWidth = img.naturalWidth || img.width;
                const origHeight = img.naturalHeight || img.height;

                // If image is already smaller than target size and within dimensions, skip recompression
                if (file.size <= maxSizeBytes && origWidth <= maxWidth && origHeight <= maxHeight) {
                    cleanup();
                    return resolve(file);
                }

                // Compute aspect-ratio-preserving dimensions
                let targetWidth = origWidth;
                let targetHeight = origHeight;

                if (targetWidth > maxWidth || targetHeight > maxHeight) {
                    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
                    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
                    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
                }

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    cleanup();
                    return resolve(file);
                }

                // Fill with white background in case of transparent PNG converted to JPEG
                const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                if (outputType === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, targetWidth, targetHeight);
                }

                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Export to Blob
                canvas.toBlob(
                    (blob) => {
                        cleanup();
                        if (!blob) {
                            return resolve(file);
                        }

                        // If optimized blob is surprisingly larger than original file, retain original
                        if (blob.size >= file.size && origWidth <= maxWidth && origHeight <= maxHeight) {
                            return resolve(file);
                        }

                        // Construct new File preserving name and lastModified
                        const optimizedFile = new File(
                            [blob],
                            file.name,
                            {
                                type: blob.type || outputType,
                                lastModified: file.lastModified || Date.now()
                            }
                        );

                        resolve(optimizedFile);
                    },
                    outputType,
                    quality
                );
            } catch (err) {
                console.warn('[imageOptimizer] Canvas downscaling failed, falling back to original:', err);
                cleanup();
                resolve(file);
            }
        };

        img.onerror = (err) => {
            console.warn('[imageOptimizer] Image loading error, falling back to original:', err);
            cleanup();
            resolve(file);
        };

        img.src = objectUrl;
    });
};

export default optimizeImageFile;

