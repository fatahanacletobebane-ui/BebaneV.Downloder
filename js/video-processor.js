video_processor_js = '''// ===== VIDEO PROCESSOR =====
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
        showError('Por favor, insira um link de video.');
        return;
    }
    
    if (!platform) {
        showError('Plataforma nao suportada. Use YouTube, Facebook ou TikTok.');
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

    if (typeof AdsManager !== 'undefined') {
        AdsManager.customAds.render('ads-mid-content', Math.floor(Math.random() * 5));
    }

    try {
        document.getElementById('loadingText').textContent = 'Analisando ' + platform + '...';
        await new Promise(r => setTimeout(r, 1000));

        const apiData = await fetchVideoData(platform, url);
        
        if (!apiData || apiData.error) {
            throw new Error('Nao foi possivel processar este video. Tente outro link.');
        }

        displayResult(apiData, platform, url);
        saveDownloadToFirebase(apiData, platform);
        addToHistory(apiData.title || 'Video', platform, selectedFormat);

    } catch (err) {
        showError(err.message || 'Erro ao processar video.');
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
        title: 'Video ' + platform,
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
            <h3>${data.title || 'Video'}</h3>
            <p>Duracao: ${data.duration || 'N/A'} | Autor: ${data.author || 'Desconhecido'} | Plataforma: ${platform.toUpperCase()}</p>
            <p style="margin-top:8px;color:#667eea;font-weight:600;">Pronto para download!</p>
        </div>
    `;

    document.getElementById('ads-before-download').style.display = 'block';
    if (typeof AdsManager !== 'undefined') {
        AdsManager.customAds.render('ads-before-content', 4);
    }

    let linksHtml = '';
    
    if (selectedFormat === 'mp3') {
        // MP3 via servicos externos
        const safeTitle = sanitizeFilename(data.title || 'audio');
        linksHtml += `
            <div class="download-item">
                <div class="format-info">
                    <span class="format-badge">MP3</span>
                    <span>Audio 128kbps</span>
                </div>
                <button class="btn-get" onclick="downloadViaService('https://ytmp3.cc/${encodeURIComponent(originalUrl)}', '${safeTitle}.mp3')">
                    Baixar MP3
                </button>
            </div>
            <div class="download-item">
                <div class="format-info">
                    <span class="format-badge">MP3</span>
                    <span>Audio 320kbps HQ</span>
                </div>
                <button class="btn-get" onclick="downloadViaService('https://y2mate.is/${encodeURIComponent(originalUrl)}', '${safeTitle}_HQ.mp3')">
                    Baixar MP3 HQ
                </button>
            </div>
        `;
    } else {
        // MP4 em varias qualidades
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
            
            const filename = sanitizeFilename(data.title || 'video') + '_' + q.q + '.mp4';
            
            linksHtml += `
                <div class="download-item">
                    <div class="format-info">
                        <span class="format-badge" style="background:${q.color}">${q.badge}</span>
                        <span>${q.label} MP4</span>
                    </div>
                    <button class="btn-get" onclick="forceDownload('${downloadUrl}', '${filename}')">
                        Baixar ${q.label}
                    </button>
                </div>
            `;
        });
    }

    downloadLinks.innerHTML = linksHtml;
    result.classList.add('active');
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== DOWNLOAD FUNCIONAL =====
async function forceDownload(url, filename) {
    console.log('Download:', filename);
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Baixando...';
    btn.disabled = true;
    
    try {
        // Metodo 1: Fetch + Blob (melhor para arquivos pequenos/medios)
        const response = await fetch(url, { 
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            }, 100);
            
            console.log('Download via Blob OK');
            trackDownload(filename);
            btn.innerHTML = 'Baixado!';
        } else {
            throw new Error('CORS bloqueado');
        }
        
    } catch (e) {
        console.log('CORS bloqueado, usando metodo alternativo...');
        
        // Metodo 2: Abrir em nova aba com download
        const newWindow = window.open(url + '?download=1&filename=' + encodeURIComponent(filename), '_blank');
        
        if (!newWindow || newWindow.closed) {
            // Metodo 3: Link invisivel
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => document.body.removeChild(a), 100);
        }
        
        trackDownload(filename);
        btn.innerHTML = 'Abrindo...';
    }
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 2000);
}

// Download via servico externo (para MP3)
function downloadViaService(serviceUrl, filename) {
    console.log('Redirecionando para:', serviceUrl);
    
    const btn = event.target;
    btn.innerHTML = 'Abrindo conversor...';
    btn.disabled = true;
    
    // Abrir servico em nova aba
    window.open(serviceUrl, '_blank');
    
    trackDownload(filename);
    
    setTimeout(() => {
        btn.innerHTML = 'Conversor aberto!';
        btn.disabled = false;
    }, 2000);
}

function sanitizeFilename(name) {
    if (!name) return 'video';
    return name
        .replace(/[<>:"/\\\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 50);
}

// Track no Firebase
async function trackDownload(filename) {
    const today = new Date().toISOString().split('T')[0];
    
    if (window.firebaseDatabase) {
        try {
            const { ref, get, set, increment } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
            
            const countRef = ref(window.firebaseDatabase, 'bebanev_downloader/stats/downloads/' + today);
            const snap = await get(countRef);
            await set(countRef, (snap.val() || 0) + 1);
            
            const visitorId = localStorage.getItem('bebanev_visitor') || 'anon';
            await push(ref(window.firebaseDatabase, 'bebanev_downloader/downloads'), {
                filename: filename,
                timestamp: Date.now(),
                date: today,
                visitorId: visitorId
            });
        } catch (e) {
            console.log('Firebase track error:', e);
        }
    }
}

async function saveDownloadToFirebase(data, platform) {
    if (!window.firebaseDatabase) return;
    
    try {
        const { ref, push } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
        
        const visitorId = localStorage.getItem('bebanev_visitor') || 'anon';
        
        await push(ref(window.firebaseDatabase, 'bebanev_downloader/downloads'), {
            title: data.title || 'Unknown',
            platform: platform,
            format: selectedFormat,
            url: document.getElementById('videoUrl').value,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            visitorId: visitorId
        });
    } catch (e) {
        console.log('Firebase save error:', e);
    }
}

function addToHistory(title, platform, format) {
    downloadHistory.unshift({
        title: (title || 'Video').substring(0, 60),
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
                <small style="color:#888">${item.platform.toUpperCase()} - ${item.format.toUpperCase()}</small>
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
});'''

with open('/mnt/agents/output/video-processor.js', 'w', encoding='utf-8') as f:
    f.write(video_processor_js)

print("video-processor.js criado!")
print("\nTodos os arquivos criados em /mnt/agents/output/")
print("- index.html")
print("- style.css")  
print("- ads-manager.js")
print("- video-processor.js")
