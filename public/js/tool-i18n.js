class ToolI18n {
    constructor(toolName) {
        this.toolName = toolName;
        this.currentLanguage = this.detectLanguage();
        this.translations = {};
    }

    detectLanguage() {
        const pathSegments = window.location.pathname.split('/').filter(segment => segment);
        if (pathSegments.length > 0 && ['tr', 'en', 'de', 'ru', 'fr', 'es', 'it', 'ja', 'pt', 'zh'].includes(pathSegments[0])) {
            return pathSegments[0];
        }
        return 'en';
    }

    async loadTranslations() {
        try {
            // Load tool-specific translations
            const toolResponse = await fetch(`/api/translations/tools/${this.toolName}/${this.currentLanguage}`);
            if (!toolResponse.ok) {
                throw new Error(`HTTP error! status: ${toolResponse.status}`);
            }
            const toolTranslations = await toolResponse.json();
            
            // Load main translations for header/footer
            const mainResponse = await fetch(`/api/translations/${this.currentLanguage}`);
            if (!mainResponse.ok) {
                throw new Error(`HTTP error! status: ${mainResponse.status}`);
            }
            const mainTranslations = await mainResponse.json();
            
            // Merge translations (tool-specific takes priority)
            this.translations = { ...mainTranslations, ...toolTranslations };
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to default language
            try {
                const toolResponse = await fetch(`/api/translations/tools/${this.toolName}/en`);
                const mainResponse = await fetch(`/api/translations/en`);
                
                if (toolResponse.ok && mainResponse.ok) {
                    const toolTranslations = await toolResponse.json();
                    const mainTranslations = await mainResponse.json();
                    this.translations = { ...mainTranslations, ...toolTranslations };
                }
            } catch (fallbackError) {
                console.error('Error loading fallback translations:', fallbackError);
            }
        }
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            
            if (translation) {
                if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'email')) {
                    element.placeholder = translation;
                } else if (element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else if (element.tagName === 'INPUT' && element.type === 'submit') {
                    element.value = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    getTranslation(key) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }
        
        return typeof value === 'string' ? value : null;
    }

    t(key) {
        return this.getTranslation(key) || key;
    }

    async init() {
        await this.loadTranslations();
        this.createLanguageSwitcher();
        this.setupLanguageSwitcher();
        this.setupMobileMenu();
        // Ensure translations are applied after everything is set up
        this.applyTranslations();
    }

    createLanguageSwitcher() {
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

        const supportedLanguages = ['tr', 'en', 'de', 'ru', 'fr', 'es', 'it', 'ja', 'pt', 'zh'];

        // Desktop language switcher - same as main page
        const desktopSwitcher = document.getElementById('languageSwitcher');
        if (desktopSwitcher) {
            desktopSwitcher.innerHTML = `
                <button class="flex items-center space-x-2 text-gray-600 hover:text-rose-600 font-medium transition-all duration-200 hover:scale-105" id="languageBtn">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                    </svg>
                    <span>${languageNames[this.currentLanguage] || this.currentLanguage.toUpperCase()}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                <div class="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-rose-200 hidden z-50" id="languageDropdown">
                    <div class="py-2">
                        ${supportedLanguages.map(lang => `
                            <a href="#" data-lang="${lang}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors ${lang === this.currentLanguage ? 'bg-rose-50 text-rose-600' : ''}">
                                ${languageNames[lang]}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Mobile language switcher - update existing links
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            const langLinks = mobileMenu.querySelectorAll('a[href*="/mp4-to-mp3"]');
            langLinks.forEach(link => {
                const href = link.getAttribute('href');
                const lang = href.split('/')[1]; // Extract language from href like "/tr/mp4-to-mp3"
                if (lang === this.currentLanguage) {
                    link.className = 'block px-3 py-2 text-sm bg-rose-50 text-rose-600 rounded-lg text-center';
                } else {
                    link.className = 'block px-3 py-2 text-sm text-gray-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-center transition-colors';
                }
            });
        }
    }

    setupLanguageSwitcher() {
        // Handle language switcher clicks - same as main page
        const languageBtn = document.getElementById('languageBtn');
        const languageDropdown = document.getElementById('languageDropdown');

        if (languageBtn && languageDropdown) {
            languageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                languageDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
                    languageDropdown.classList.add('hidden');
                }
            });

            // Handle language selection
            document.querySelectorAll('[data-lang]').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const newLang = button.getAttribute('data-lang');
                    this.changeLanguage(newLang);
                    languageDropdown.classList.add('hidden');
                });
            });
        }
    }

    async changeLanguage(newLang) {
        // Simply redirect to new language URL
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(/^\/[a-z]{2}\//, `/${newLang}/`);
        if (newPath !== currentPath) {
            window.location.href = newPath;
        }
    }

    updateLanguageSwitcher() {
        // Recreate language switcher with updated active state
        this.createLanguageSwitcher();
        this.setupLanguageSwitcher();
    }

    setupMobileMenu() {
        // Mobile menu functionality
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', function(e) {
                if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }
    }
}

// Initialize tool i18n for MP4 to MP3
document.addEventListener('DOMContentLoaded', async () => {
    window.toolI18n = new ToolI18n('mp4-to-mp3');
    await window.toolI18n.init();
});





