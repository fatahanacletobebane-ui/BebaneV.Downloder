// ===== APP INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 BebaneV.Downloader v1.0 iniciado');
    
    // Verificar conexão Firebase
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            console.log('✅ Conectado ao Firebase Realtime Database');
        } else {
            console.log('❌ Desconectado do Firebase');
        }
    });
    
    // Registrar visita
    const today = new Date().toISOString().split('T')[0];
    statsRef.child(`visits/${today}`).transaction(count => (count || 0) + 1);
    
    // Inicializar Analytics
    analytics.logEvent('page_view', {
        page_title: 'BebaneV.Downloader',
        page_location: window.location.href
    });
    
    // Atualizar título da página
    document.title = 'BebaneV.Downloader - Download YouTube, Facebook, TikTok';
});

// ===== SERVICE WORKER (Opcional - para PWA) =====
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        console.log('✅ Service Worker registrado');
    }).catch(err => {
        console.log('❌ Service Worker falhou:', err);
    });
}
