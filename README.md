# 🎬 BebaneV.Downloader

**Download de vídeos do YouTube, Facebook e TikTok em MP4/MP3**

![Version](https://img.shields.io/badge/version-1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Firebase](https://img.shields.io/badge/firebase-realtime-orange)

## ✨ Funcionalidades

- ✅ **YouTube** - Downloads em múltiplas qualidades
- ✅ **Facebook** - Vídeos públicos e Reels  
- ✅ **TikTok** - Sem watermark
- 🎵 **MP3** - Extração de áudio
- 🎥 **MP4** - Vídeo em 1080p, 720p, 480p, 360p
- 📊 **Firebase Analytics** - Estatísticas em tempo real
- 🔐 **Autenticação** - Login/Registro de usuários
- 📢 **Sistema de Ads** - Múltiplas redes de publicidade
- 📱 **Responsivo** - Funciona em mobile e desktop

## 🚀 Como usar no GitHub Pages

1. Fork este repositório
2. Vá em **Settings &gt; Pages**
3. Selecione branch `main` e pasta `/ (root)`
4. Seu site estará em `https://seuusername.github.io/bebanev-downloader`

## 📢 Como adicionar Anúncios

### Opção 1: Google AdSense
Edite `js/ads-manager.js`:
```javascript
googleAdSense: {
    enabled: true,
    clientId: 'ca-pub-SEU_ID_AQUI'
}
