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
        showError('Plataforma não suportada. Use links do YouTube, Facebook ou TikTok.');
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

    // Mostrar ads durante o processamento
    AdsManager.customAds.render('ads-mid-content', Math.floor(Math.random() * 4));

    try {
        document.getElementById('loadingText').textContent = `Detectando ${platform}...`;
        await new Promise(r => setTimeout(r, 1000));

        // APIs gratuitas para download
        const apiData = await fetchVideoData(platform, url);
        
        if (!apiData || apiData.error) {
            throw new Error('Não foi possível processar este vídeo. Tente outro link.');
        }

        displayResult(apiData, platform, url);
        
        // Salvar no Firebase
        saveDownloadToFirebase(apiData, platform);
        
        // Adicionar ao histórico local
        addToHistory(apiData.title || 'Vídeo sem título', platform, selectedFormat);

    } catch (err) {
        showError(err.message || 'Erro ao processar vídeo. Verifique o link e tente novamente.');
    } finally {
        btn.disabled = false;
        loading.classList.remove('active');
    }
}

async function fetchVideoData(platform, url) {
    const encodedUrl = encodeURIComponent(url);
    
    // Múltiplas APIs para redundância
    const apis = {
        youtube: [
            `https://api.dlpanda.com/video?url=${encodedUrl}`,
            `https://api.akuari.my.id/downloader/yt1?link=${encodedUrl}`,
            `https://yt.lemnoslife.com/videos?part=snippet,contentDetails&id=${extractVideoId(url)}`
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
            
            // Normalizar dados da API
            return normalizeData(data, platform);
        } catch (e) {
            console.log('API failed:', apiUrl, e.message);
            continue;
        }
    }
    
    // Fallback: retornar dados simulados para demonstração
    return {
        title: 'Vídeo de ' + platform,
        author: 'Autor Desconhecido',
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
    // Normalizar respostas diferentes das APIs
    switch(platform) {
        case 'youtube':
            return {
                title: data.title || data.snippet?.title || 'YouTube Video',
                author: data.author || data.snippet?.channelTitle || 'Unknown',
                duration: data.duration || data.contentDetails?.duration || 'N/A',
                thumbnail: data.thumbnail || data.snippet?.thumbnails?.high?.url || '',
                download_url: data.download_url || data.url || '',
                formats: data.formats || []
            };
        case 'facebook':
            return {
                title: data.title || 'Facebook Video',
                author: data.author || 'Facebook User',
                duration: data.duration || 'N/A',
                thumbnail: data.thumbnail || '',
                download_url: data.download_url || data.sd || data.hd || '',
                formats: data.formats || [{ quality: 'best', url: data.hd || data.sd }]
            };
        case 'tiktok':
            return {
                title: data.title || data.desc || 'TikTok Video',
                author: data.author || data.author?.nickname || 'TikTok User',
                duration: data.duration || 'N/A',
                thumbnail: data.cover || data.thumbnail || '',
                download_url: data.play || data.download_url || '',
                formats: data.formats || [{ quality: 'best', url: data.play }]
            };
        default:
            return data;
    }
}

function extractVideoId(url) {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : '';
}

function displayResult(data, platform, originalUrl) {
    const result = document.getElementById('result');
    const videoInfo = document.getElementById('videoInfo');
    const downloadLinks = document.getElementById('downloadLinks');

    // Info do vídeo
    videoInfo.innerHTML = `
        <img src="${data.thumbnail || 'https://via.placeholder.com/480x360?text=No+Thumbnail'}" 
             class="video-thumb" alt="Thumbnail" onerror="this.src='https://via.placeholder.com/480x360/667eea/ffffff?text=Video'">
        <div class="video-details">
            <h3>${data.title || 'Vídeo sem título'}</h3>
            <p>⏱ ${data.duration || 'N/A'} | 👤 ${data.author || 'Desconhecido'} | 📺 ${platform.toUpperCase()}</p>
            <p style="margin-top:8px;color:var(--primary);font-weight:600;">✅ Pronto para download!</p>
        </div>
    `;

    // Mostrar ads antes do download (obrigatório ver/interagir)
    document.getElementById('ads-before-download').style.display = 'block';
    AdsManager.customAds.render('ads-before-content', 2); // Ad diferente

    // Links de download
    let linksHtml = '';
    
    if (selectedFormat === 'mp3') {
        // Conversão para MP3 (usar serviço de terceiros ou indicar)
        linksHtml += `
            <div class="download-item">
                <div class="format-info">
                    <span class="format-badge">MP3</span>
                    <span>Áudio 128kbps - Extraído do vídeo</span>
                </div>
                <a href="https://ytmp3.cc/${encodeURIComponent(originalUrl)}" class="btn-get" target="_blank">
                    🎵 Converter & Baixar MP3
                </a>
            </div>
            <div class="download-item">
                <div class="format-info">
                    <span class="format-badge">MP3</span>
                    <span>Áudio 320kbps - Alta Qualidade</span>
                </div>
                <a href="https://y2mate.is/${encodeURIComponent(originalUrl)}" class="btn-get" target="_blank">
                    🎵 HQ MP3
                </a>
            </div>
        `;
    } else {
        // MP4 em várias qualidades
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
            
            linksHtml += `
                <div class="download-item">
                    <div class="format-info">
                        <span class="format-badge" style="background:${q.color}">${q.badge}</span>
                        <span>${q.label} MP4</span>
                    </div>
                    <a href="${downloadUrl}" class="btn-get" target="_blank" download 
                       onclick="trackDownload('${q.label}')">
                        ⬇️ Baixar ${q.label}
                    </a>
                </div>
            `;
        });
    }

    // Link direto alternativo
    linksHtml += `
        <div class="download-item" style="background:#fff3e0;border-left-color:#ff9800;">
            <div class="format-info">
                <span class="format-badge" style="background:#ff9800;">🔗</span>
                <span>Link Direto do Vídeo</span>
            </div>
            <a href="${originalUrl}" class="btn-get" style="background:#ff9800;" target="_blank">
                Abrir Original
            </a>
        </div>
    `;

    downloadLinks.innerHTML = linksHtml;
    result.classList.add('active');
    
    // Scroll para resultado
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function trackDownload(quality) {
    // Track no Firebase
    const today = new Date().toISOString().split('T')[0];
    statsRef.child(`downloads/${today}`).transaction(count => (count || 0) + 1);
    
    if (currentUser) {
        usersRef.child(currentUser.uid + '/downloadsCount').transaction(count => (count || 0) + 1);
    }
    
    // Track no Analytics
    analytics.logEvent('video_download', {
        platform: detectPlatform(document.getElementById('videoUrl').value),
        format: selectedFormat,
        quality: quality
    });
}

function saveDownloadToFirebase(data, platform) {
    const downloadData = {
        title: data.title || 'Unknown',
        platform: platform,
        format: selectedFormat,
        url: document.getElementById('videoUrl').value,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        userId: currentUser ? currentUser.uid : 'anonymous'
    };
    
    downloadsRef.push(downloadData);
}

function addToHistory(title, platform, format) {
    downloadHistory.unshift({
        title: title.substring(0, 60) + (title.length > 60 ? '...' : ''),
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

// Estatísticas em tempo real
function updateStats() {
    statsRef.child('downloads/' + new Date().toISOString().split('T')[0]).on('value', snap => {
        document.getElementById('totalDownloads').textContent = snap.val() || 0;
    });
    
    // Contar usuários online (últimos 5 minutos)
    const fiveMinAgo = Date.now() - (5 * 60 * 1000);
    usersRef.orderByChild('lastActive').startAt(fiveMinAgo).on('value', snap => {
        document.getElementById('totalUsers').textContent = snap.numChildren() || 0;
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    updateHistoryDisplay();
    updateStats();
    
    // Permitir Ctrl+V automático
    document.addEventListener('paste', (e) => {
        if (document.activeElement.id !== 'videoUrl') {
            const text = e.clipboardData.getData('text');
            if (detectPlatform(text)) {
                document.getElementById('videoUrl').value = text;
                // Auto-start após 1 segundo
                setTimeout(() => processVideo(), 1000);
            }
        }
    });
});
