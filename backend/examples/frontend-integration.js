/**
 * Frontend Integration Example
 * Bu dosya frontend'de backend API'lerini nasıl kullanacağınızı gösterir
 */

class VideoConverter {
    constructor(baseUrl = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
        this.currentJobId = null;
    }

    /**
     * Video dosyasını yükle ve dönüştürme işlemini başlat
     * @param {File} file - Yüklenecek video dosyası
     * @param {Function} onProgress - İlerleme callback'i
     * @param {Function} onComplete - Tamamlanma callback'i
     * @param {Function} onError - Hata callback'i
     */
    async uploadAndConvert(file, onProgress, onComplete, onError) {
        try {
            // Dosya doğrulama
            if (!this.validateFile(file)) {
                onError('Geçersiz dosya formatı');
                return;
            }

            // FormData oluştur
            const formData = new FormData();
            formData.append('video', file);

            // Upload isteği gönder
            const response = await fetch(`${this.baseUrl}/api/conversion/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload hatası');
            }

            const result = await response.json();
            this.currentJobId = result.jobId;

            // İlerleme takibi başlat
            this.trackProgress(result.jobId, onProgress, onComplete, onError);

            return result;
        } catch (error) {
            onError(error.message);
        }
    }

    /**
     * Job ilerlemesini takip et
     */
    async trackProgress(jobId, onProgress, onComplete, onError) {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${this.baseUrl}/api/conversion/status/${jobId}`);
                
                if (!response.ok) {
                    throw new Error('Status kontrolü hatası');
                }

                const status = await response.json();

                // İlerleme güncelle
                if (onProgress) {
                    onProgress({
                        progress: status.progress || 0,
                        message: status.message || '',
                        status: status.status
                    });
                }

                // Durum kontrolü
                switch (status.status) {
                    case 'completed':
                        if (onComplete) {
                            onComplete({
                                downloadUrl: status.data.downloadUrl,
                                fileName: status.data.fileName,
                                outputSize: status.data.outputSize
                            });
                        }
                        return;

                    case 'failed':
                        if (onError) {
                            onError(status.data.error || 'Dönüştürme başarısız');
                        }
                        return;

                    case 'processing':
                    case 'queued':
                        // Devam et
                        setTimeout(checkStatus, 2000);
                        break;

                    default:
                        setTimeout(checkStatus, 5000);
                }
            } catch (error) {
                if (onError) {
                    onError(error.message);
                }
            }
        };

        // İlk kontrolü başlat
        checkStatus();
    }

    /**
     * Dosya doğrulama
     */
    validateFile(file) {
        const allowedTypes = [
            'video/mp4',
            'video/avi',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-matroska',
            'video/webm',
            'video/3gpp',
            'video/x-flv'
        ];

        const maxSize = 250 * 1024 * 1024; // 250MB

        if (!allowedTypes.includes(file.type)) {
            return false;
        }

        if (file.size > maxSize) {
            return false;
        }

        return true;
    }

    /**
     * Queue istatistiklerini al
     */
    async getQueueStats() {
        try {
            const response = await fetch(`${this.baseUrl}/api/conversion/stats`);
            return await response.json();
        } catch (error) {
            console.error('Queue stats error:', error);
            return null;
        }
    }

    /**
     * Sistem sağlık durumunu kontrol et
     */
    async getHealthStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/conversion/health`);
            return await response.json();
        } catch (error) {
            console.error('Health check error:', error);
            return null;
        }
    }
}

// Kullanım örneği
document.addEventListener('DOMContentLoaded', function() {
    const converter = new VideoConverter();
    const fileInput = document.getElementById('videoFile');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');
    const downloadLink = document.getElementById('downloadLink');

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // UI'yi sıfırla
        progressBar.style.width = '0%';
        statusText.textContent = 'Dosya yükleniyor...';
        downloadLink.style.display = 'none';

        // Dönüştürme işlemini başlat
        converter.uploadAndConvert(
            file,
            // İlerleme callback'i
            (progress) => {
                progressBar.style.width = `${progress.progress}%`;
                statusText.textContent = progress.message;
            },
            // Tamamlanma callback'i
            (result) => {
                statusText.textContent = 'Dönüştürme tamamlandı!';
                downloadLink.href = result.downloadUrl;
                downloadLink.download = result.fileName;
                downloadLink.style.display = 'block';
            },
            // Hata callback'i
            (error) => {
                statusText.textContent = `Hata: ${error}`;
                progressBar.style.width = '0%';
            }
        );
    });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoConverter;
}
