// ===== AUTHENTICATION MODULE =====
let currentUser = null;

function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showError('Preencha email e senha.');
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            currentUser = userCredential.user;
            updateUI();
            showError(''); // Clear error
        })
        .catch(error => {
            showError('Erro ao entrar: ' + error.message);
        });
}

function register() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showError('Preencha email e senha.');
        return;
    }
    
    if (password.length < 6) {
        showError('Senha deve ter pelo menos 6 caracteres.');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            currentUser = userCredential.user;
            
            // Salvar dados do usuário no database
            usersRef.child(currentUser.uid).set({
                email: email,
                createdAt: Date.now(),
                downloadsCount: 0,
                lastActive: Date.now()
            });
            
            updateUI();
            showError('');
        })
        .catch(error => {
            showError('Erro ao registrar: ' + error.message);
        });
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        updateUI();
    });
}

function updateUI() {
    const userInfo = document.getElementById('user-info');
    const loginForm = document.getElementById('login-form');
    const userEmail = document.getElementById('user-email');
    
    if (currentUser) {
        userInfo.style.display = 'flex';
        loginForm.style.display = 'none';
        userEmail.textContent = currentUser.email;
    } else {
        userInfo.style.display = 'none';
        loginForm.style.display = 'block';
    }
}

// Auth state listener
auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUI();
    
    if (user) {
        // Atualizar último acesso
        usersRef.child(user.uid).update({ lastActive: Date.now() });
    }
});
