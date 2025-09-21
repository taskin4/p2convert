const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const mp4ToMp3Router = require('./routes/mp4-mp3'); // Router'ı içeri al

const convertedDir = path.join(__dirname, 'converted');
if (!fs.existsSync(convertedDir)) fs.mkdirSync(convertedDir);

// Supported languages
const supportedLanguages = ['tr', 'en', 'de', 'ru', 'fr', 'es', 'it', 'ja', 'pt', 'zh'];
const defaultLanguage = 'en';

// Middleware to detect language from URL and redirect to appropriate language
app.use((req, res, next) => {
    const urlPath = req.path;
    const pathSegments = urlPath.split('/').filter(segment => segment);
    
    // Check if first segment is a language code
    if (pathSegments.length > 0 && supportedLanguages.includes(pathSegments[0])) {
        req.language = pathSegments[0];
        req.originalPath = '/' + pathSegments.slice(1).join('/');
    } else {
        // For root URL (/), detect language and redirect
        if (urlPath === '/' || urlPath === '') {
            const acceptLanguage = req.headers['accept-language'];
            let detectedLanguage = defaultLanguage;
            
            if (acceptLanguage) {
                const languages = acceptLanguage.split(',').map(lang => {
                    const parts = lang.split(';');
                    const langCode = parts[0].trim().toLowerCase();
                    const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
                    return { code: langCode, quality: quality };
                }).sort((a, b) => b.quality - a.quality);
                
                for (const lang of languages) {
                    const langCode = lang.code.split('-')[0];
                    if (supportedLanguages.includes(langCode)) {
                        detectedLanguage = langCode;
                        break;
                    }
                }
            }
            
            // Redirect to detected language
            return res.redirect(301, `/${detectedLanguage}`);
        }
        
        // For other paths without language, use default language
        req.language = defaultLanguage;
        req.originalPath = urlPath;
    }
    
    next();
});

app.use(express.static('public'));

// SEO Routes
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

// Translation API endpoint
app.get('/api/translations/:language', (req, res) => {
    const language = req.params.language;
    const translationPath = path.join(__dirname, 'public', 'locales', language, 'translations.json');
    
    if (fs.existsSync(translationPath)) {
        const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
        res.json(translations);
    } else {
        // Fallback to default language
        const defaultTranslationPath = path.join(__dirname, 'public', 'locales', defaultLanguage, 'translations.json');
        const translations = JSON.parse(fs.readFileSync(defaultTranslationPath, 'utf8'));
        res.json(translations);
    }
});

// Tool-specific translation API endpoint
app.get('/api/translations/tools/:tool/:language', (req, res) => {
    const { tool, language } = req.params;
    const translationPath = path.join(__dirname, 'public', 'locales', 'tools', tool, language, 'translations.json');
    
    if (fs.existsSync(translationPath)) {
        const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
        res.json(translations);
    } else {
        // Fallback to default language
        const defaultTranslationPath = path.join(__dirname, 'public', 'locales', 'tools', tool, defaultLanguage, 'translations.json');
        if (fs.existsSync(defaultTranslationPath)) {
            const translations = JSON.parse(fs.readFileSync(defaultTranslationPath, 'utf8'));
            res.json(translations);
        } else {
            res.status(404).json({ error: 'Translation not found' });
        }
    }
});

// Language-specific routes
supportedLanguages.forEach(lang => {
    // Home page with language
    app.get(`/${lang}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Tools page with language
    app.get(`/${lang}/tools`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'tools', 'index.html'));
    });
    
    // MP4 to MP3 tool with language
    app.get(`/${lang}/mp4-to-mp3`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'tools', 'mp4-to-mp3', 'index.html'));
    });
    
    // Support pages with language
    app.get(`/${lang}/faq`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'support', 'faq.html'));
    });
    
    app.get(`/${lang}/contact`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'support', 'contact.html'));
    });
    
    app.get(`/${lang}/help`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'support', 'help.html'));
    });
    
    // Legal pages with language
    app.get(`/${lang}/privacy`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'legal', 'privacy.html'));
    });
    
    app.get(`/${lang}/terms`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'pages', 'legal', 'terms.html'));
    });
    
    // Special pages with language
    app.get(`/${lang}/soon`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'soon.html'));
    });
    
    app.get(`/${lang}/maintenance`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
    });
});

// Default routes (redirect to Turkish)
app.get('/', (req, res) => {
    res.redirect('/tr');
});

// MP4 to MP3 tool route (default)
app.get('/mp4-to-mp3', (req, res) => {
    res.redirect('/tr/mp4-to-mp3');
});

// MP4 to MP3 API routes (legacy)
app.use('/mp4-to-mp3/api', mp4ToMp3Router);

// Backend API routes (new system)
app.use('/api/conversion', require('./backend/routes/conversion'));

// Tools page route (default)
app.get('/tools', (req, res) => {
    res.redirect('/tr/tools');
});

// FAQ page route (default)
app.get('/faq', (req, res) => {
    res.redirect('/tr/faq');
});

// Privacy Policy page route (default)
app.get('/privacy', (req, res) => {
    res.redirect('/tr/privacy');
});

// Terms of Service page route (default)
app.get('/terms', (req, res) => {
    res.redirect('/tr/terms');
});

// Contact page route (default)
app.get('/contact', (req, res) => {
    res.redirect('/tr/contact');
});

// Help Center page route (default)
app.get('/help', (req, res) => {
    res.redirect('/tr/help');
});

// Special pages routes (default)
app.get('/soon', (req, res) => {
    res.redirect('/tr/soon');
});

app.get('/maintenance', (req, res) => {
    res.redirect('/tr/maintenance');
});

// Language selection page routes
supportedLanguages.forEach(lang => {
    app.get(`/${lang}/language`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'language.html'));
    });
});

app.get('/language', (req, res) => {
    res.redirect('/tr/language');
});

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(convertedDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (!err) fs.unlinkSync(filePath);
        });
    } else {
        res.status(404).send('Dosya bulunamadı veya süresi doldu.');
    }
});

// 404 handler - must be last
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(port, () => {
    console.log(`Uygulama http://localhost:${port} adresinde çalışıyor`);
});