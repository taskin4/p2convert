// Tool-specific Internationalization (i18n) System
class ToolI18n {
    constructor(toolName) {
        this.toolName = toolName;
        this.currentLanguage = this.detectLanguage();
        this.translations = {};
    }

    detectLanguage() {
        // Get language from URL
        const pathSegments = window.location.pathname.split('/').filter(segment => segment);
        if (pathSegments.length > 0) {
            const supportedLanguages = ['tr', 'en', 'de', 'ru', 'fr', 'es', 'it', 'ja', 'pt', 'zh'];
            if (supportedLanguages.includes(pathSegments[0])) {
                return pathSegments[0];
            }
        }
        
        // Fallback to browser language
        const browserLang = navigator.language.split('-')[0];
        const supportedLanguages = ['tr', 'en'];
        return supportedLanguages.includes(browserLang) ? browserLang : 'tr';
    }

    async loadTranslations() {
        try {
            const response = await fetch(`/api/translations/${this.currentLanguage}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to default language
            try {
                const response = await fetch('/api/translations/tr');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.translations = await response.json();
            } catch (fallbackError) {
                console.error('Error loading fallback translations:', fallbackError);
            }
        }
    }

    async init() {
        await this.loadTranslations();
        this.applyTranslations();
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }
        
        return value;
    }

    applyTranslations() {
        // Update page title
        document.title = this.t('tool.title') + ' - Pushtoconverter';
        
        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', this.t('tool.subtitle'));
        }

        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'email')) {
                element.placeholder = translation;
            } else if (element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update elements with data-i18n-html attribute (for HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const translation = this.t(key);
            element.innerHTML = translation;
        });
    }

    async changeLanguage(language) {
        this.currentLanguage = language;
        await this.loadTranslations();
        this.applyTranslations();
        
        // Update URL without page reload
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(segment => segment);
        const supportedLanguages = ['tr', 'en', 'de', 'ru', 'fr', 'es', 'it', 'ja', 'pt', 'zh'];
        
        // Remove existing language code if present
        if (pathSegments.length > 0 && supportedLanguages.includes(pathSegments[0])) {
            pathSegments.shift();
        }
        
        // Add new language code
        const newPath = '/' + language + (pathSegments.length > 0 ? '/' + pathSegments.join('/') : '');
        window.history.pushState({}, '', newPath);
    }
}

// Export for use in other scripts
window.ToolI18n = ToolI18n;