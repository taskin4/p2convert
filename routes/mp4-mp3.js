const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
const convertedDir = path.join(__dirname, '..', 'converted');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

const jobs = {};

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mp4-mp3.html'));
});

router.post('/upload', upload.single('mp4file'), (req, res) => {
    if (!req.file) return res.status(400).send('Dosya yüklenmedi.');

    const jobId = crypto.randomBytes(16).toString('hex');
    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const outputFilename = `${originalName}-${jobId}.mp3`;
    const outputPath = path.join(convertedDir, outputFilename);

    jobs[jobId] = { status: 'processing' };
    res.json({ jobId: jobId });

    const command = `ffmpeg -i "${inputPath}" -vn -c:a libmp3lame -b:a 192k "${outputPath}"`;

    exec(command, (error) => {
        fs.unlinkSync(inputPath);
        if (error) {
            jobs[jobId].status = 'failed';
            return;
        }
        jobs[jobId].status = 'completed';
        jobs[jobId].downloadUrl = `/download/${outputFilename}`;
        jobs[jobId].fileName = `${originalName}.mp3`;
    });
});

router.get('/status/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (job) res.json(job);
    else res.status(404).send('İş bulunamadı.');
});

module.exports = router; // ÖNEMLİ DEĞİŞİKLİK