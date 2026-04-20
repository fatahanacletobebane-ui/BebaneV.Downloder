// ===== AUTHENTICATION - Firebase v10 Modular =====
// Este arquivo funciona COM o script type="module" do index.html

// Aguardar Firebase inicializar
let authInitialized = false;

function waitForFirebase() {
    return new Promise((resolve) => {
        const check = setInterval(() => {
            if (window.firebaseAuth) {
                clearInterval(check);
                authInitialized = true;
                resolve();
            }
        }, 100);
        // Timeout após 5 segundos
        setTimeout(() => {
            clearInterval(check);
            if (!authInitialized) {
                console.error('❌ Firebase Auth não carregou');
                showError('Erro de conexão. Recarregue a página.');
            }
        }, 5000);
    });
}

// Login
async function login() {
    await waitForFirebase();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showError('⚠️ Preencha email e senha.');
        return;
    }

    try {
        const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        console.log('✅ Login OK:', userCredential.user.email);
        showError('');
    } catch (error) {
        console.error('Login error:', error);
        showError('❌ ' + translateAuthError(error.code));
    }
}

// Registro
async function register() {
    await waitForFirebase();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showError('⚠️ Preencha email e senha.');
        return;
    }
    if (password.length < 6) {
        showError('⚠️ Senha deve ter pelo menos 6 caracteres.');
        return;
    }

    try {
        const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        const { set, ref } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
        
        const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        const user = userCredential.user;
        
        // Salvar no database
        await set(ref(window.firebaseDatabase, 'bebanev_downloader/users/' + user.uid), {
            email: email,
            createdAt: Date.now(),
            downloadsCount: 0,
            lastActive: Date.now(),
            online: true
        });
        
        console.log('✅ Registro OK:', email);
        showError('');
    } catch (error) {
        console.error('Register error:', error);
        showError('❌ ' + translateAuthError(error.code));
    }
}

// Logout
async function logout() {
    await waitForFirebase();
    
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        const { update, ref } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
        
        if (window.currentUser) {
            await update(ref(window.firebaseDatabase, 'bebanev_downloader/users/' + window.currentUser.uid), {
                online: false,
                lastActive: Date.now()
            });
        }
        await signOut(window.firebaseAuth);
        console.log('✅ Logout OK');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Tradução de erros
function translateAuthError(code) {
    const errors = {
        'auth/invalid-email': 'Email inválido',
        'auth/user-disabled': 'Conta desativada',
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/email-already-in-use': 'Email já está registrado',
        'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
        'auth/invalid-credential': 'Email ou senha incorretos',
        'auth/network-request-failed': 'Sem internet. Verifique sua conexão.',
        'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
        'auth/invalid-password': 'Senha inválida'
    };
    return errors[code] || 'Erro: ' + code;
}

// Atualizar UI quando auth muda
function updateAuthUI() {
    const userInfo = document.getElementById('user-info');
    const loginForm = document.getElementById('login-form');
    const userEmail = document.getElementById('user-email');
    
    if (!userInfo || !loginForm) return;
    
    if (window.currentUser) {
        userInfo.style.display = 'flex';
        loginForm.style.display = 'none';
        userEmail.textContent = window.currentUser.email;
    } else {
        userInfo.style.display = 'none';
        loginForm.style.display = 'block';
    }
}

// Observar mudanças de auth (fallback se o module script falhar)
document.addEventListener('DOMContentLoaded', () => {
    // Verificar periodicamente se o auth do module script já atualizou
    const checkAuth = setInterval(() => {
        if (window.currentUser !== undefined) {
            updateAuthUI();
            clearInterval(checkAuth);
        }
    }, 500);
});
