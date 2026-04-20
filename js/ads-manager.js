// ===== ADS MANAGER - Gerenciador de Publicidade =====
// Você pode adicionar seus anúncios aqui de várias formas:

const AdsManager = {
    // Configuração de posições de ads
    positions: {
        top: 'ads-top-content',
        left: 'ads-left-content',
        mid: 'ads-mid-content',
        right: 'ads-right-content',
        bottom: 'ads-bottom-content',
        beforeDownload: 'ads-before-content'
    },

    // ===== MÉTODO 1: Google AdSense =====
    // Substitua 'ca-pub-XXXXXXXXXXXXXXXX' pelo seu ID do AdSense
    googleAdSense: {
        enabled: false, // Mude para true quando tiver conta
        clientId: 'ca-pub-XXXXXXXXXXXXXXXX',
        
        init() {
            if (!this.enabled) return;
            
            // Adicionar script do AdSense
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.clientId}`;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
            
            // Criar slots de anúncios
            this.createAdSlots();
        },

        createAdSlot(containerId, slotId, format = 'auto') {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = `
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="${this.clientId}"
                     data-ad-slot="${slotId}"
                     data-ad-format="${format}"
                     data-full-width-responsive="true"></ins>
            `;
            
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
            } catch(e) {
                console.log('AdSense not loaded yet');
            }
        }
    },

    // ===== MÉTODO 2: Anúncios Personalizados (Afiliados/Próprios) =====
    customAds: {
        enabled: true,
        
        // Adicione seus anúncios aqui!
        ads: [
            {
                id: 'ad1',
                title: '🚀 Curso de Programação FB Aulas Online',
                description: 'Aprenda a programar do zero! 500 MTN apenas.',
                image: 'https://via.placeholder.com/728x90/667eea/ffffff?text=FB+Aulas+Online',
                link: 'https://wa.me/258860407269?text=Quero%20curso%20FB%20Aulas%20Online',
                bgColor: '#667eea'
            },
            {
                id: 'ad2',
                title: '💰 Mozcoin - Mineração Digital',
                description: 'Ganhe dinheiro com mineração virtual em Moçambique!',
                image: 'https://via.placeholder.com/300x250/764ba2/ffffff?text=Mozcoin',
                link: 'https://mozcoin.web.app',
                bgColor: '#764ba2'
            },
            {
                id: 'ad3',
                title: '📱 Criação de Websites',
                description: 'Moz1vendas - Sites profissionais com preços promocionais',
                image: 'https://via.placeholder.com/728x90/00d9a3/ffffff?text=Moz1vendas',
                link: 'https://wa.me/258860407269?text=Quero%20criar%20um%20site',
                bgColor: '#00d9a3'
            },
            {
                id: 'ad4',
                title: '🎓 Madrassa Online',
                description: 'Educação islâmica online - Aprenda árabe e Alcorão',
                image: 'https://via.placeholder.com/300x250/f093fb/ffffff?text=Madrassa+Online',
                link: '#',
                bgColor: '#f093fb'
            }
        ],

        // Renderiza anúncio em um container
        render(containerId, adIndex = null) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            // Selecionar anúncio aleatório ou específico
            const index = adIndex !== null ? adIndex : Math.floor(Math.random() * this.ads.length);
            const ad = this.ads[index % this.ads.length];
            
            container.innerHTML = `
                <a href="${ad.link}" target="_blank" class="custom-ad" data-ad-id="${ad.id}" 
                   style="display:block;text-decoration:none;background:${ad.bgColor};border-radius:8px;overflow:hidden;">
                    <img src="${ad.image}" alt="${ad.title}" style="width:100%;max-width:100%;display:block;">
                    <div style="padding:10px;color:white;text-align:left;">
                        <strong style="font-size:1.1em;display:block;margin-bottom:5px;">${ad.title}</strong>
                        <span style="font-size:0.9em;opacity:0.9;">${ad.description}</span>
                    </div>
                </a>
            `;
            
            // Track click
            container.querySelector('.custom-ad').addEventListener('click', () => {
                AdsManager.trackClick(ad.id);
            });
        }
    },

    // ===== MÉTODO 3: PropellerAds / PopAds / Outras Redes =====
    popAds: {
        enabled: false,
        scriptUrl: '', // URL do script da rede de ads
        
        init() {
            if (!this.enabled || !this.scriptUrl) return;
            const script = document.createElement('script');
            script.src = this.scriptUrl;
            document.head.appendChild(script);
        }
    },

    // ===== MÉTODO 4: Adsterra / Monetag =====
    nativeAds: {
        enabled: false,
        apiKey: '', // Sua chave API
        
        async fetchAds() {
            if (!this.enabled) return [];
            // Implementação específica da API
            return [];
        }
    },

    // ===== TRACKING =====
    trackImpression(adId) {
        const today = new Date().toISOString().split('T')[0];
        statsRef.child(`ads/impressions/${today}/${adId}`).transaction(count => (count || 0) + 1);
    },

    trackClick(adId) {
        const today = new Date().toISOString().split('T')[0];
        statsRef.child(`ads/clicks/${today}/${adId}`).transaction(count => (count || 0) + 1);
        
        // Registrar no histórico do usuário
        const user = auth.currentUser;
        if (user) {
            usersRef.child(user.uid + '/adClicks').push({
                adId,
                timestamp: Date.now(),
                date: today
            });
        }
    },

    // ===== INICIALIZAÇÃO =====
    init() {
        console.log('📢 AdsManager initializing...');
        
        // Tentar Google AdSense primeiro
        this.googleAdSense.init();
        
        // Fallback para anúncios personalizados
        if (this.customAds.enabled) {
            // Renderizar em cada posição
            setTimeout(() => {
                this.customAds.render(this.positions.top, 0);
                this.customAds.render(this.positions.mid, 1);
                this.customAds.render(this.positions.bottom, 2);
                this.customAds.render(this.positions.left, 3);
                this.customAds.render(this.positions.right, 1);
                this.customAds.render(this.positions.beforeDownload, 0);
            }, 100);
        }
        
        // Pop ads
        this.popAds.init();
        
        console.log('✅ AdsManager ready!');
    },

    // ===== UTILITÁRIOS PARA ADICIONAR NOVOS ADS =====
    // Use esta função para adicionar anúncios dinamicamente
    addCustomAd(adData) {
        this.customAds.ads.push({
            id: 'ad_' + Date.now(),
            ...adData
        });
        this.init(); // Re-renderizar
    },

    // Atualizar anúncio existente
    updateAd(adId, newData) {
        const index = this.customAds.ads.findIndex(a => a.id === adId);
        if (index !== -1) {
            this.customAds.ads[index] = { ...this.customAds.ads[index], ...newData };
        }
    }
};

// ===== COMO ADICIONAR SEUS ANÚNCIOS =====
/*
1. GOOGLE ADSENSE:
   - Crie conta em https://www.google.com/adsense
   - Substitua 'ca-pub-XXXXXXXXXXXXXXXX' pelo seu ID real
   - Mude googleAdSense.enabled para true
   - Desative customAds.enabled

2. ANÚNCIOS PERSONALIZADOS (Afiliados/Próprios):
   - Edite o array customAds.ads acima
   - Adicione título, descrição, imagem e link
   - Mantenha customAds.enabled = true

3. PROPPELLERADS / POPADS:
   - Registre-se na plataforma
   - Copie o URL do script fornecido
   - Cole em popAds.scriptUrl
   - Mude popAds.enabled para true

4. ADSTERRA / MONETAG:
   - Obtenha sua API key
   - Cole em nativeAds.apiKey
   - Mude nativeAds.enabled para true

5. VIA FIREBASE (Admin Panel):
   - Acesse o console Firebase
   - Vá em Realtime Database > bebanev_downloader/ads
   - Adicione anúncios no formato JSON
*/

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    AdsManager.init();
});
