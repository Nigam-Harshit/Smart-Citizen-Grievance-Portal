const multer = require('multer');

// Enforce strictly in-memory buffering. Zero local disk writes on Render or local machine.
const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

// Preliminary MIME-type filter (strict content validation occurs in Sharp imageProcessor)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const isAllowedMime = allowedMimeTypes.includes(file.mimetype?.toLowerCase());
    const isAllowedExt = Boolean(file.originalname && file.originalname.match(/\.(jpe?g|png|webp)$/i));

    if (isAllowedMime || isAllowedExt) {
        cb(null, true);
    } else {
        const err = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
        err.code = 'INVALID_FILE_TYPE';
        cb(err, false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // Strictly one photo per request
    },
    fileFilter
});

/**
 * Middleware wrapper for single photo upload ('photo' field).
 * Catches Multer errors cleanly and returns user-friendly HTTP 400 responses
 * without leaking server stack traces.
 */
const uploadSinglePhoto = (req, res, next) => {
    const singleUpload = upload.single('photo');

    singleUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        message: 'Uploaded photo exceeds the maximum allowed size limit of 8 MB.'
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        message: 'Only one photographic evidence attachment is allowed per grievance.'
                    });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        message: `Unexpected upload field "${err.field}". Please upload the image under field name "photo".`
                    });
                }
                return res.status(400).json({ message: `Upload error: ${err.message}` });
            }

            if (err.code === 'INVALID_FILE_TYPE') {
                return res.status(400).json({ message: err.message });
            }

            return res.status(400).json({ message: err.message || 'Error processing uploaded file' });
        }

        next();
    });
};

module.exports = {
    uploadSinglePhoto,
    upload,
    MAX_FILE_SIZE
};
