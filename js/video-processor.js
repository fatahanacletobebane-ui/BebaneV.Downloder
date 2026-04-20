// ===== VIDEO PROCESSOR =====
let selectedFormat = 'mp4';
let downloadHistory = JSON.parse(localStorage.getItem('bebanev_history') || '[]');

function selectFormat(format) {
    selectedFormat = format;
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.toggle('active', card.dataset.format === format);
    });
    document.getElementById('qualitySection').style.display = format === 'mp3' ? 'none' : 'block';
}

function detectPlatform(url) {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) return 'facebook';
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
    return null;
}

async function processVideo() {
    const url = document.getElementById('videoUrl').value.trim();
    const platform = detectPlatform(url);
    
    if (!url) {
        showError('Por favor, insira um link de vídeo.');
        return;
    }
    
    if (!platform) {
        showError('Plataforma não suportada. Use YouTube, Facebook ou TikTok.');
        return;
    }

    const btn = document.getElementById('downloadBtn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const error = document.getElementById('error');

    btn.disabled = true;
    loading.classList.add('active');
    result.classList.remove('active');
    error.classList.remove('active');

    // Mostrar ads
    if (typeof AdsManager !== 'undefined') {
        AdsManager.customAds.render('ads-mid-content', Math.floor(Math.random() * 4));
    }

    try {
        document.getElementById('loadingText').textContent = `Analisando ${platform}...`;
        await new Promise(r => setTimeout(r, 800));

        const apiData = await fetchVideoData(platform, url);
        
        if (!apiData || apiData.error) {
            throw new Error('Não foi possível processar este vídeo. Tente outro link.');
        }

        displayResult(apiData, platform, url);
        saveDownloadToFirebase(apiData, platform);
        addToHistory(apiData.title || 'Vídeo', platform, selectedFormat);

    } catch (err) {
        showError(err.message || 'Erro ao processar vídeo.');
    } finally {
        btn.disabled = false;
        loading.classList.remove('active');
    }
}

async function fetchVideoData(platform, url) {
    const encodedUrl = encodeURIComponent(url);
    
    const apis = {
        youtube: [
            `https://api.dlpanda.com/video?url=${encodedUrl}`,
            `https://api.akuari.my.id/downloader/yt1?link=${encodedUrl}`
        ],
        facebook: [
            `https://api.fdownloader.net/api?url=${encodedUrl}`,
            `https://api.dlpanda.com/facebook?url=${encodedUrl}`
        ],
        tiktok: [
            `https://api.dlpanda.com/tiktok?url=${encodedUrl}`,
            `https://api.akuari.my.id/downloader/ttdl?link=${encodedUrl}`,
            `https://www.tikwm.com/api/?url=${encodedUrl}`
        ]
    };

    const platformApis = apis[platform] || [];
    
    for (let apiUrl of platformApis) {
        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            return normalizeData(data, platform);
        } catch (e) {
            console.log('API falhou:', apiUrl);
            continue;
        }
    }
    
    // Fallback
    return {
        title: 'Vídeo ' + platform,
        author: 'Autor',
        duration: 'N/A',
        thumbnail: `https://via.placeholder.com/480x360/667eea/ffffff?text=${platform.toUpperCase()}`,
        download_url: url,
        formats: [
            { quality: '720', url: url },
            { quality: '480', url: url },
            { quality: '360', url: url }
        ]
    };
}

function normalizeData(data, platform) {
    switch(platform) {
        case 'youtube':
            return {
                title: data.title || data.snippet?.title || 'YouTube Video',
                author: data.author || data.snippet?.channelTitle || 'Unknown',
                duration: data.duration || 'N/A',
                thumbnail: data.thumbnail || data.snippet?.thumbnails?.high?.url || '',
                download_url: data.download_url || data.url || '',
                formats: data.formats || []
            };
        case 'facebook':
            return {
                title: data.title || 'Facebook Video',
                author: data.author || 'Facebook',
                duration: data.duration || 'N/A',
                thumbnail: data.thumbnail || '',
                download_url: data.download_url || data.sd || data.hd || '',
                formats: data.formats || [{ quality: 'best', url: data.hd || data.sd }]
            };
        case 'tiktok':
            return {
                title: data.title || data.desc || 'TikTok Video',
                author: data.author?.nickname || 'TikTok',
                duration: data.duration || 'N/A',
                thumbnail: data.cover || data.thumbnail || '',
                download_url: data.play || data.download_url || '',
                formats: data.formats || [{ quality: 'best', url: data.play }]
            };
        default:
            return data;
    }
}

function displayResult(data, platform, originalUrl) {
    const result = document.getElementById('result');
    const videoInfo = document.getElementById('videoInfo');
    const downloadLinks = document.getElementById('downloadLinks');

    videoInfo.innerHTML = `
        <img src="${data.thumbnail || 'https://via.placeholder.com/480x360/667eea/ffffff?text=Video'}" 
             class="video-thumb" alt="Thumbnail" 
             onerror="this.src='https://via.placeholder.com/480x360/667eea/ffffff?text=Video'">
        <div class="video-details">
            <h3>${data.title || 'Vídeo'}</h3>
            <p>⏱ ${data.duration || 'N/A'} | 👤 ${data.author || 'Desconhecido'} | 📺 ${platform.toUpperCase()}</p>
            <p style="margin-top:8px;color:#667eea;font-weight:600;">✅ Pronto para download!</p>
        </div>
    `;

    // Ads antes do download
    document.getElementById('ads-before-download').style.display = 'block';
    if (typeof AdsManager !== 'undefined') {
        AdsManager.customAds.render('ads-before-content', 2);
    }

    let linksHtml = '';
    
    if (selectedFormat === 'mp3') {
        // MP3 - Usar serviço externo de conversão
        linksHtml += `
            <div class="download-item">
                <div class="format-info">
                    <span class="format-badge">MP3</span>
                    <span>Áudio 128kbps</span>
                </div>
                <button class="btn-get" onclick="forceDownload('https://ytmp3.cc/${encodeURIComponent(originalUrl)}', '${sanitizeFilename(data.title)}.mp3')">
                    🎵 Baixar MP3
                </button>
            </div>
            <div class="download-item">
                <div class="format-info">
                    <span class="format-badge">MP3</span>
                    <span>Áudio 320kbps HQ</span>
                </div>
                <button class="btn-get" onclick="window.open('https://y2mate.is/${encodeURIComponent(originalUrl)}', '_blank')">
                    🎵 Abrir Conversor HQ
                </button>
            </div>
        `;
    } else {
        // MP4 - Várias qualidades
        const qualities = [
            { label: '1080p Full HD', q: '1080', badge: 'FHD', color: '#ff4757' },
            { label: '720p HD', q: '720', badge: 'HD', color: '#2ed573' },
            { label: '480p SD', q: '480', badge: 'SD', color: '#1e90ff' },
            { label: '360p', q: '360', badge: 'LOW', color: '#ffa502' }
        ];

        qualities.forEach(q => {
            const downloadUrl = data.formats?.find(f => f.quality === q.q)?.url || 
                               data.download_url || 
                               originalUrl;
            
            const filename = sanitizeFilename(data.title) + '_' + q.q + '.mp4';
            
            linksHtml += `
                <div class="download-item">
                    <div class="format-info">
                        <span class="format-badge" style="background:${q.color}">${q.badge}</span>
                        <span>${q.label} MP4</span>
                    </div>
                    <button class="btn-get" onclick="forceDownload('${downloadUrl}', '${filename}')">
                        ⬇️ Baixar ${q.label}
                    </button>
                </div>
            `;
        });
    }

    downloadLinks.innerHTML = linksHtml;
    result.classList.add('active');
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== FUNÇÃO PRINCIPAL: FORÇAR DOWNLOAD EM VEZ DE ABRIR =====
async function forceDownload(url, filename) {
    console.log('⬇️ Iniciando download:', filename);
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Baixando...';
    btn.disabled = true;
    
    try {
        // Tentativa 1: Fetch + Blob (funciona com CORS permitido)
        const response = await fetch(url, { 
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) throw new Error('CORS bloqueado');
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(blobUrl);
        
        console.log('✅ Download via Blob OK');
        trackDownload(filename);
        
    } catch (e) {
        console.log('⚠️ CORS bloqueado, tentando método alternativo...');
        
        // Tentativa 2: Abrir em nova aba com parâmetro download
        const newWindow = window.open(url + '?download=1', '_blank');
        
        if (!newWindow || newWindow.closed) {
            // Tentativa 3: Criar link invisível
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => document.body.removeChild(a), 100);
        }
        
        trackDownload(filename);
    }
    
    btn.innerHTML = '✅ Baixado!';
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 2000);
}

// Sanitizar nome do arquivo
function sanitizeFilename(name) {
    if (!name) return 'video';
    return name
        .replace(/[<>:"/\\\\|?*]/g, '_')
        .replace(/\\s+/g, '_')
        .substring(0, 50);
}

// Track download no Firebase
async function trackDownload(filename) {
    const today = new Date().toISOString().split('T')[0];
    
    if (window.firebaseDatabase) {
        const { ref, get, set } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
        
        const countRef = ref(window.firebaseDatabase, 'bebanev_downloader/stats/downloads/' + today);
        const snap = await get(countRef);
        await set(countRef, (snap.val() || 0) + 1);
        
        if (window.currentUser) {
            const userRef = ref(window.firebaseDatabase, 'bebanev_downloader/users/' + window.currentUser.uid + '/downloadsCount');
            const userSnap = await get(userRef);
            await set(userRef, (userSnap.val() || 0) + 1);
        }
    }
    
    if (window.firebaseAnalytics) {
        const { logEvent } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js");
        logEvent(window.firebaseAnalytics, 'video_download', {
            platform: detectPlatform(document.getElementById('videoUrl').value),
            format: selectedFormat
        });
    }
}

async function saveDownloadToFirebase(data, platform) {
    if (!window.firebaseDatabase) return;
    
    const { ref, push } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
    
    const downloadData = {
        title: data.title || 'Unknown',
        platform: platform,
        format: selectedFormat,
        url: document.getElementById('videoUrl').value,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        userId: window.currentUser ? window.currentUser.uid : 'anonymous'
    };
    
    await push(ref(window.firebaseDatabase, 'bebanev_downloader/downloads'), downloadData);
}

function addToHistory(title, platform, format) {
    downloadHistory.unshift({
        title: (title || 'Vídeo').substring(0, 60),
        platform,
        format,
        date: new Date().toLocaleString('pt-BR')
    });
    
    if (downloadHistory.length > 10) downloadHistory.pop();
    localStorage.setItem('bebanev_history', JSON.stringify(downloadHistory));
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const section = document.getElementById('historySection');
    const list = document.getElementById('historyList');
    
    if (downloadHistory.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    list.innerHTML = downloadHistory.map(item => `
        <div class="history-item">
            <div>
                <strong>${item.title}</strong><br>
                <small style="color:#888">${item.platform.toUpperCase()} • ${item.format.toUpperCase()}</small>
            </div>
            <span style="color:#aaa;font-size:0.85em">${item.date}</span>
        </div>
    `).join('');
}

function showError(msg) {
    const error = document.getElementById('error');
    if (msg) {
        error.textContent = msg;
        error.classList.add('active');
    } else {
        error.classList.remove('active');
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    updateHistoryDisplay();
    
    // Auto-paste
    document.addEventListener('paste', (e) => {
        if (document.activeElement.id !== 'videoUrl') {
            const text = e.clipboardData.getData('text');
            if (detectPlatform(text)) {
                document.getElementById('videoUrl').value = text;
                setTimeout(() => processVideo(), 800);
            }
        }
    });
});
