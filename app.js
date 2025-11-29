// =================================================================
// === APP.JS - Controlador Principal
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, query, Timestamp, getDoc, writeBatch, runTransaction, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importações Locais (Nossos módulos)
import { appState, dataCache, icons } from './state.js';
import { renderTelaoView } from './view.js';

// Configuração do Firebase (Igual ao anterior)
const firebaseConfig = {
  apiKey: "AIzaSyDeS-rk8OJKhghv1djVucmR3-erOa-ppMY",
  authDomain: "campeonato-sortudo.firebaseapp.com",
  projectId: "campeonato-sortudo",
  storageBucket: "campeonato-sortudo.firebasestorage.app",
  messagingSenderId: "706083235199",
  appId: "1:706083235199:web:5eca6041bb817401ee264a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const MASTER_ID = "campeonato-sortudo-admin"; 

// --- CONTROLE DE ESTADO E ROTAS ---

// Renderizador Central (Decide o que mostrar)
const render = () => {
    const loading = document.getElementById('loading-spinner');
    const main = document.getElementById('main-content');
    
    if (appState.currentView !== 'loading') {
        loading.classList.add('hidden');
        main.classList.remove('hidden');
    }

    // Modo Telão (Chama a função do view.js)
    if (appState.isTelaoMode) {
        renderTelaoView();
        return;
    }

    // Modo Admin/Normal (Ainda não migramos totalmente para view.js, então mantém aqui ou migra depois)
    // Para este passo inicial, vamos focar em fazer o TELÃO funcionar com a nova estrutura.
    if (appState.currentView === 'login') {
        // Render Login Form (Copie sua função renderLogin aqui ou mova para view.js)
        main.innerHTML = `<div class="p-8 bg-white rounded shadow text-center"><h2>Login</h2><button id="login-anon" class="bg-blue-500 text-white p-2 rounded">Entrar</button></div>`;
        document.getElementById('login-anon').onclick = () => signInAnonymously(auth);
    } else if (appState.currentView === 'championshipList') {
        // Render List (Simplificado para teste)
        const list = dataCache.championships.map(c => `<div class="border p-2 my-2 flex justify-between"><span>${c.name}</span><button class="open-btn bg-blue-500 text-white px-2 rounded" data-id="${c.id}">Ver</button></div>`).join('');
        main.innerHTML = `<div class="p-4"><h2>Campeonatos</h2>${list}</div>`;
        document.querySelectorAll('.open-btn').forEach(b => b.onclick = () => navigateTo('championshipView', b.dataset.id));
    } else if (appState.currentView === 'championshipView') {
        // Se não for telão, mostra uma msg simples por enquanto
        main.innerHTML = `<div class="p-4">Painel de Controle do Torneio (Em migração...) <br> <button id="go-telao" class="bg-green-500 text-white p-2 rounded mt-4">Abrir Telão</button></div>`;
        document.getElementById('go-telao').onclick = () => {
            const url = `${window.location.origin}${window.location.pathname}?telao=true&champId=${appState.currentChampionshipId}`;
            window.open(url, '_blank');
        };
    }
};

// Navegação
const navigateTo = (view, id = null) => {
    appState.currentView = view;
    appState.currentChampionshipId = id;
    
    if (view === 'championshipView' || view === 'telaoView') {
        // Listener do Campeonato
        onSnapshot(doc(db, 'users', MASTER_ID, 'championships', id, 'data', 'main'), (snap) => {
            if (snap.exists()) {
                dataCache.activeChampionship = { id: snap.id, ...snap.data() };
                render();
            }
        });
    } else {
        render();
    }
};

// Inicialização (Ouvintes Globais)
onAuthStateChanged(auth, (user) => {
    if (user) {
        appState.userId = user.uid;
        // Ouve lista de campeonatos (Do mestre, por enquanto)
        onSnapshot(collection(db, 'users', MASTER_ID, 'championships'), (snap) => {
            dataCache.championships = snap.docs.map(d => ({id: d.id, ...d.data()}));
            
            // Lógica de URL para Telão
            const params = new URLSearchParams(window.location.search);
            if (params.has('telao') && params.get('champId')) {
                appState.isTelaoMode = true;
                navigateTo('telaoView', params.get('champId'));
            } else {
                navigateTo('championshipList');
            }
        });
    } else {
        navigateTo('login');
    }
});
