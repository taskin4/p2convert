const fileType = require('file-type');
const path = require('path');
const fs = require('fs');

// Allowed video formats
const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/avi',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    'video/webm',
    'video/3gpp',
    'video/x-flv'
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
    '.mp4', '.avi', '.mov', '.mkv', '.webm', '.3gp', '.flv'
];

// Maximum file size (250MB)
const MAX_FILE_SIZE = 250 * 1024 * 1024;

/**
 * Validates uploaded file
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
async function validateFile(file) {
    const errors = [];
    
    if (!file) {
        errors.push('Dosya yüklenmedi');
        return { isValid: false, errors };
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`Dosya boyutu çok büyük. Maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB desteklenir.`);
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`Desteklenmeyen dosya formatı: ${ext}. Desteklenen formatlar: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Check MIME type using file-type
    try {
        const fileTypeResult = await fileType.fromFile(file.path);
        
        if (!fileTypeResult) {
            errors.push('Dosya türü belirlenemedi. Geçerli bir video dosyası yükleyin.');
        } else if (!ALLOWED_VIDEO_TYPES.includes(fileTypeResult.mime)) {
            errors.push(`Desteklenmeyen dosya türü: ${fileTypeResult.mime}. Desteklenen türler: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
        }
    } catch (error) {
        console.error('File type detection error:', error);
        errors.push('Dosya türü kontrolü başarısız oldu.');
    }
    
    // Check if file is actually a video by trying to read first few bytes
    try {
        const buffer = fs.readFileSync(file.path, { start: 0, end: 1023 });
        const detectedType = await fileType.fromBuffer(buffer);
        
        if (!detectedType || !ALLOWED_VIDEO_TYPES.includes(detectedType.mime)) {
            errors.push('Dosya içeriği video formatında değil.');
        }
    } catch (error) {
        console.error('File content validation error:', error);
        errors.push('Dosya içeriği kontrol edilemedi.');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        fileInfo: {
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            extension: ext
        }
    };
}

/**
 * Middleware function for file validation
 */
function fileValidationMiddleware() {
    return async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: 'Dosya yüklenmedi'
                });
            }
            
            const validation = await validateFile(req.file);
            
            if (!validation.isValid) {
                // Clean up uploaded file if validation fails
                try {
                    fs.unlinkSync(req.file.path);
                } catch (cleanupError) {
                    console.error('File cleanup error:', cleanupError);
                }
                
                return res.status(400).json({
                    error: 'Dosya doğrulama hatası',
                    details: validation.errors
                });
            }
            
            // Add validation info to request
            req.fileValidation = validation;
            next();
        } catch (error) {
            console.error('File validation middleware error:', error);
            res.status(500).json({
                error: 'Dosya doğrulama sırasında hata oluştu'
            });
        }
    };
}

module.exports = {
    validateFile,
    fileValidationMiddleware,
    ALLOWED_VIDEO_TYPES,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE
};
