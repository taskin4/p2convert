// Internationalization (i18n) System
class I18n {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = {};
        // Don't call loadTranslations here, it will be called in init()
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
        // Ensure translations are applied after everything is set up
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
        document.title = this.t('site.title');
        
        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', this.t('site.description'));
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

        // Update search placeholder
        const searchInput = document.getElementById('searchTools');
        if (searchInput) {
            searchInput.placeholder = this.t('hero.search_placeholder');
        }

        // Update language switcher
        this.updateLanguageSwitcher();
    }

    updateLanguageSwitcher() {
        const languageSwitcher = document.getElementById('languageSwitcher');
        if (languageSwitcher) {
            const currentLang = this.currentLanguage;
            const languageNames = {
                'tr': 'Türkçe',
                'en': 'English',
                'de': 'Deutsch',
                'ru': 'Русский',
                'fr': 'Français',
                'es': 'Español',
                'it': 'Italiano',
                'ja': '日本語',
                'pt': 'Português',
                'zh': '中文'
            };

            languageSwitcher.innerHTML = `
                <button class="flex items-center space-x-2 text-gray-600 hover:text-rose-600 font-medium transition-all duration-200 hover:scale-105" id="languageBtn">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                    </svg>
                    <span>${languageNames[currentLang] || currentLang.toUpperCase()}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                <div class="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-rose-200 hidden z-50" id="languageDropdown">
                    <div class="py-2">
                        ${Object.entries(languageNames).map(([code, name]) => `
                            <a href="#" data-lang="${code}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors ${code === currentLang ? 'bg-rose-50 text-rose-600' : ''}">
                                ${name}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;

            // Add click event for language switcher
            const languageBtn = document.getElementById('languageBtn');
            const languageDropdown = document.getElementById('languageDropdown');
            
            if (languageBtn && languageDropdown) {
                languageBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    languageDropdown.classList.toggle('hidden');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    languageDropdown.classList.add('hidden');
                });

                // Language switching
                document.querySelectorAll('[data-lang]').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const lang = this.getAttribute('data-lang');
                        const currentPath = window.location.pathname;
                        
                        // Remove existing language prefix if any
                        let pathWithoutLang = currentPath.replace(/^\/[a-z]{2}(\/|$)/, '/');
                        
                        // If path is just "/" after removing language prefix, keep it as is
                        if (pathWithoutLang === '/') {
                            pathWithoutLang = '';
                        }
                        
                        // Add new language prefix
                        const newPath = `/${lang}${pathWithoutLang}`;
                        
                        window.location.href = newPath;
                    });
                });
            }
        }
    }

    async changeLanguage(language) {
        this.currentLanguage = language;
        await this.loadTranslations();
        this.applyTranslations(); // Apply translations immediately
        
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

// Initialize i18n when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.i18n = new I18n();
    await window.i18n.init();
});

// Export for use in other scripts
window.I18n = I18n;
