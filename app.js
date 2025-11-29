
        // =================================================================
        // === IMPORTAÇÕES E CONFIGURAÇÃO DO FIREBASE
        // =================================================================
        import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { 
            getAuth, 
            signInAnonymously, 
            onAuthStateChanged 
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { 
            getFirestore, 
            doc, 
            setDoc, 
            onSnapshot, 
            collection, 
            query,
            Timestamp,
            getDoc,
            writeBatch,
            runTransaction,
            deleteDoc,
            addDoc // *** CORREÇÃO 1: Importar addDoc ***
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // Configuração do Firebase (Substitua pelos seus dados)
        const firebaseConfig = {
          apiKey: "AIzaSyDeS-rk8OJKhghv1djVucmR3-erOa-ppMY",
          authDomain: "campeonato-sortudo.firebaseapp.com",
          projectId: "campeonato-sortudo",
          storageBucket: "campeonato-sortudo.firebasestorage.app",
          messagingSenderId: "706083235199",
          appId: "1:706083235199:web:5eca6041bb817401ee264a"
        };

        // Inicialização dos serviços do Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        setLogLevel('debug'); // Ativa logs detalhados do Firestore no console

        // =================================================================
        // === CONSTANTES E ESTADO GLOBAL
        // =================================================================
        
        // ID Mestre (Admin)
        const MESTRE_USER_ID = "campeonato-sortudo-admin";
        const ADMIN_PASSWORD = "adm2025"; 

        // Estado global reativo do aplicativo
        let appState = {
            userId: null,
            isAuthReady: false,
            isAdmin: false, 
            isTelaoMode: false,
            currentView: 'loading', 
            currentChampionshipId: null,
            currentRankingId: null, 
        };

        // Caches de dados globais (ouvintes do Firestore)
        let allRankings = []; 
        let championships = []; 
        let globalPlayers = []; 
        let activeChampionship = null; 

        // Funções de cancelamento de inscrição (listeners)
        let unsubscribeRankingsList = () => {}; 
        let unsubscribeChampionships = () => {}; 
        let unsubscribeGlobalPlayers = () => {}; 
        let unsubscribeActiveChampionship = () => {}; 

        // Pontuações Padrão (Modelo Mata-Mata)
        const DEFAULT_POINTS_MATA_MATA = {
            type: 'mata_mata',
            participation: 5,
            groupWin: 0,
            gold_R3_lose: 20,  // Semi-final Ouro (4º lugar)
            gold_R3_win: 100, // Campeão Ouro (Chave de 4)
            gold_R4_lose: 20,  // Semi-final Ouro (4º lugar)
            gold_R4_win: 100, // Campeão Ouro (Chave de 8)
            gold_R5_lose: 20,  // Semi-final Ouro (4º lugar)
            gold_R5_win: 100, // Campeão Ouro (Chave de 16)
            gold_R3_run: 50,  // Vice Ouro (Chave de 4)
            gold_R4_run: 50,  // Vice Ouro (Chave de 8)
            gold_R5_run: 50,  // Vice Ouro (Chave de 16)
            silver_R3_lose: 10, // Semi-final Prata
            silver_R3_win: 30, // Campeão Prata (Chave de 4)
            silver_R4_lose: 10, // Semi-final Prata
            silver_R4_win: 30, // Campeão Prata (Chave de 8)
            silver_R5_lose: 10, // Semi-final Prata
            silver_R5_win: 30, // Campeão Prata (Chave de 16)
            silver_R3_run: 15, // Vice Prata (Chave de 4)
            silver_R4_run: 15, // Vice Prata (Chave de 8)
            silver_R5_run: 15, // Vice Prata (Chave de 16)
        };
        
        // Pontuações Padrão (Modelo Sortudo)
        const DEFAULT_POINTS_SORTUDO = {
            type: 'sortudo',
            participation: 10,
            perGame: 5,
            bonus_1st: 100,
            bonus_2nd: 70,
            bonus_3rd: 50,
        };

      // Biblioteca de Ícones SVG
      const icons = {
            users: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            plus: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
            trash: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
            swords: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline><line x1="11" y1="5" x2="5" y2="11"></line><line x1="8" y1="8" x2="4" y2="4"></line><line x1="3" y1="5" x2="5" y2="3"></line></svg>',
            trophy: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>',
            shield: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block text-yellow-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
            shieldOff: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block text-gray-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>',
            award: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"></polyline></svg>',
            arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
            eye: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
            logIn: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>',
            logOut: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
            check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            settings: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
            shovel: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3 text-red-600"><path d="M2 22v-5l5-5 5 5v5H2z"></path><path d="M9.5 17H14a5 5 0 0 0 5-5V7A2 2 0 0 0 17 5H7a2 2 0 0 0-2 2v5a5 5 0 0 0 5 5z"></path><path d="M9.5 17v5"></path></svg>', 
            shovelSmall: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22v-5l5-5 5 5v5H2z"></path><path d="M9.5 17H14a5 5 0 0 0 5-5V7A2 2 0 0 0 17 5H7a2 2 0 0 0-2 2v5a5 5 0 0 0 5 5z"></path><path d="M9.5 17v5"></path></svg>',
            printer: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
            fileDown: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
            tv: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
            shuffle: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>'
        };

        // =================================================================
        // === CONTROLES DO DOM E MODAL
        // =================================================================
        
        // Funções utilitárias para mostrar/esconder o Modal
        const showModal = (title, message) => {
            modalTitle.textContent = title;
            modalMessage.innerHTML = message; 
            modal.classList.remove('hidden');
        };
        const hideModal = () => modal.classList.add('hidden');
        
        // Referências do DOM (buscadas após o carregamento do script)
        const appContainer = document.getElementById('app-container');
        const mainContent = document.getElementById('main-content');
        const loadingSpinner = document.getElementById('loading-spinner');
        const headerButtons = document.getElementById('header-buttons');
        const userIdFooter = document.getElementById('user-id-footer');
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalCloseBtn = document.getElementById('modal-close-btn');
        const modalCloseIcon = document.getElementById('modal-close-icon');

        // Adiciona listeners do Modal
        modalCloseBtn.addEventListener('click', hideModal);
        modalCloseIcon.addEventListener('click', hideModal);
        modal.addEventListener('click', hideModal);
        modal.firstElementChild.addEventListener('click', (e) => e.stopPropagation()); // Impede de fechar ao clicar dentro do modal


        // =================================================================
        // === ROTEAMENTO E RENDERIZAÇÃO PRINCIPAL
        // =================================================================

        /**
         * Renderiza a view principal com base no estado global (appState.currentView)
         */
        const render = () => {
            // Esconde o spinner se não estivermos na view 'loading'
            if (appState.currentView !== 'loading') {
                loadingSpinner.classList.add('hidden');
                mainContent.classList.remove('hidden');
            } else {
                loadingSpinner.classList.remove('hidden');
                mainContent.classList.add('hidden');
                return;
            }

            // Renderiza os botões do cabeçalho (exceto no telão)
            if (!appState.isTelaoMode) {
                renderHeaderButtons();
            }

            // Seleciona qual view renderizar
            switch (appState.currentView) {
                case 'login': 
                    renderLogin();
                    break;
                case 'championshipList':
                    renderChampionshipList();
                    break;
                case 'globalRanking':
                    renderGlobalRanking();
                    break;
                case 'championshipView':
                    renderChampionshipView();
                    break;
                case 'telaoView':
                    renderTelaoView();
                    break;
                default:
                    mainContent.innerHTML = `<p>Estado desconhecido: ${appState.currentView}</p>`;
            }
        };

        /**
         * Navega para uma nova view e (opcionalmente) carrega dados
         */
        const navigateTo = (view, champId = null) => {
            if (view === 'login') {
                appState.isAdmin = false;
            }
            appState.currentView = view;
            appState.currentChampionshipId = champId;

            // Para qualquer navegação, cancela o ouvinte do campeonato ativo anterior
            unsubscribeActiveChampionship();
            activeChampionship = null;

            if ((view === 'championshipView' || view === 'telaoView') && champId) {
                // Se for a view de um campeonato, encontra o rankingId dele
                const champ = championships.find(c => c.id === champId);
                if (champ && champ.rankingId) {
                    if (appState.currentRankingId !== champ.rankingId) {
                        appState.currentRankingId = champ.rankingId;
                        listenToGlobalPlayers(); // Carrega os jogadores do ranking vinculado
                    }
                } else if (championships.length > 0 && !champ) {
                    console.warn("Navegando para o telão, mas a lista de campeonatos ainda não tem o ID:", champId);
                }
                // Inicia o ouvinte para este campeonato específico
                listenToActiveChampionship(champId);
            } else if (view === 'globalRanking') {
                // Se for o ranking global, carrega os jogadores
                listenToGlobalPlayers();
                render();
            } else {
                // Para outras views (Login, Lista), apenas renderiza
                render();
            }
        };

        /**
         * Renderiza os botões de "Ranking" / "Voltar" / "Login/Sair" no cabeçalho
         */
        const renderHeaderButtons = () => {
            let navHtml = ''; 
            let authHtml = ''; 

            // Botão de Navegação (Ranking Geral / Voltar)
            if (appState.currentView === 'championshipList') {
                navHtml = `
                <button
                    id="nav-to-ranking"
                    class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
                    🏆 ${icons.award}
                    Ranking Geral
                </button>
                `;
            } else if (appState.currentView === 'globalRanking' || appState.currentView === 'championshipView') {
                navHtml = `
                <button
                    id="nav-to-list"
                    class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
                    ${icons.arrowLeft}
                    Voltar
                </button>
                `;
            }

            // Botão de Autenticação (Login / Sair)
            if (appState.currentView !== 'login') {
                if (appState.isAdmin) {
                    authHtml = `
                    <button
                        id="nav-to-login"
                        class="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
                        ${icons.logOut}
                        Sair (Admin)
                    </button>
                    `;
                } else {
                    authHtml = `
                    <button
                        id="nav-to-login"
                        class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
                        ${icons.logIn}
                        Login (Admin)
                    </button>
                    `;
                }
            }
            
            headerButtons.innerHTML = navHtml + authHtml; 

            // Adiciona listeners aos botões renderizados
            const rankingBtn = document.getElementById('nav-to-ranking');
            if (rankingBtn) rankingBtn.addEventListener('click', () => navigateTo('globalRanking'));
            
            const listBtn = document.getElementById('nav-to-list');
            if (listBtn) listBtn.addEventListener('click', () => navigateTo('championshipList'));
            
            const loginBtn = document.getElementById('nav-to-login');
            if (loginBtn) loginBtn.addEventListener('click', () => navigateTo('login'));
        };

        // =================================================================
        // === VIEW: LOGIN
        // =================================================================
        const renderLogin = () => {
            mainContent.innerHTML = `
                <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto animate-fade-in">
                    <h2 class="text-3xl font-bold text-center text-cyan-600 mb-8">Bem-vindo(a) 🎾</h2>
                    
                    <div class="space-y-4">
                        <button
                            id="visitor-login-btn"
                            class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-6 rounded-lg shadow-sm transition-all flex items-center justify-center gap-3 text-lg">
                            ${icons.eye}
                            Modo Visitante
                        </button>
                        
                        <button
                            id="admin-login-btn"
                            class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all flex items-center justify-center gap-3 text-lg">
                            ${icons.logIn}
                            Modo Administrador
                        </button>
                    </div>
                </div>
            `;

            // Listeners da tela de Login
            document.getElementById('visitor-login-btn').addEventListener('click', () => {
                appState.isAdmin = false;
                navigateTo('championshipList');
            });
            document.getElementById('admin-login-btn').addEventListener('click', () => {
                const password = prompt("Digite a senha de administrador:");
                if (password === ADMIN_PASSWORD) {
                    appState.isAdmin = true;
                    navigateTo('championshipList');
                } else if (password !== null) { 
                    showModal("Acesso Negado", "Senha incorreta.");
                }
            });
        };

        // =================================================================
        // === VIEW: LISTA DE CAMPEONATOS
        // =================================================================
        const renderChampionshipList = () => {
            // Ordena os campeonatos (mais novos primeiro)
            const sortedChampionships = [...championships].sort((a, b) => b.createdAt - a.createdAt);
            
            const championshipsListHtml = sortedChampionships.length === 0
                ? `<p class="text-gray-500 text-center py-4">Nenhum campeonato cadastrado.</p>`
                : sortedChampionships.map(champ => {
                    let statusColor = 'text-yellow-600';
                    let statusText = 'Em andamento';
                    if (champ.status === 'registration') { statusColor = 'text-cyan-600'; statusText = 'Em Inscrição'; }
                    if (champ.status === 'finished') { statusColor = 'text-emerald-600'; statusText = 'Finalizado 🏅'; }
                    
                    const ranking = allRankings.find(r => r.id === champ.rankingId);
                    const rankingHtml = ranking ? `<span class="block text-xs text-orange-600 font-medium">${ranking.name}</span>` : '';
                    
                    // Mostra o tipo de torneio (Mata-Mata ou Sortudo)
                    const typeIcon = (champ.type === 'sortudo') ? icons.shuffle : icons.swords;
                    const typeText = (champ.type === 'sortudo') ? 'Torneio Sortudo' : 'Mata-Mata';
                    
                    const deleteButtonHtml = appState.isAdmin ? `
                    <button
                        class="delete-champ-btn text-rose-600 hover:text-rose-700 transition-colors p-2 rounded-lg bg-gray-100"
                        data-id="${champ.id}">
                        ${icons.trash}
                    </button>` : '';

                    return `
                    <div class="flex flex-col sm:flex-row justify-between items-center bg-white border border-gray-200 p-4 rounded-xl shadow-sm animate-fade-in-sm gap-3">
                        <div>
                            <span class="text-gray-800 font-bold text-lg">${champ.name}</span>
                            <span class="block text-sm ${statusColor}">${statusText}</span>
                            <span class="block text-xs text-purple-600 font-medium flex items-center gap-1.5">${typeIcon} ${typeText}</span>
                            ${rankingHtml}
                            <span class="block text-xs text-gray-500">${new Date(champ.createdAt?.toDate()).toLocaleDateString()}</span>
                        </div>
                        <div class="flex gap-2">
                             <button
                                class="open-champ-btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-2 text-sm"
                                data-id="${champ.id}">
                                ${icons.eye} Ver
                            </button>
                            ${deleteButtonHtml}
                        </div>
                    </div>
                    `}).join('');

            // Opções de rankings para o <select>
            const rankingsOptions = allRankings.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

            // Formulário de Novo Campeonato (Admin)
            const newChampionshipFormHtml = appState.isAdmin ? `
            <form id="add-championship-form">
                <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-8 border border-gray-200">
                    <h2 class="text-2xl font-bold text-cyan-600 mb-4">🎾 Novo Campeonato</h2>
                    
                    <div class="mb-4">
                        <label for="championship-name-input" class="block text-sm font-medium text-gray-700 mb-1">Nome do Campeonato</label>
                        <input
                            type="text"
                            id="championship-name-input"
                            placeholder="ex: Torneio de Verão"
                            class="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            required
                        />
                    </div>
                    
                    <div class="mb-4">
                        <label for="ranking-select" class="block text-sm font-medium text-gray-700 mb-1">Vincular ao Ranking</label>
                        <div class="flex gap-2">
                            <select id="ranking-select" class="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" required>
                                ${rankingsOptions.length > 0 ? rankingsOptions : '<option disabled>Nenhum ranking encontrado...</option>'}
                            </select>
                            <button type="button" id="add-new-ranking-btn" class="flex-shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white font-bold p-3 rounded-lg shadow-md transition-all">
                                ${icons.plus}
                            </button>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Torneio</label>
                        <div class="flex gap-4">
                            <label class="flex items-center p-3 bg-gray-50 border border-gray-300 rounded-lg flex-1 cursor-pointer">
                                <input type="radio" id="type-select-mata-mata" name="champ-type" value="mata_mata" class="h-5 w-5 text-cyan-600 focus:ring-cyan-500" checked>
                                <span class="ml-3 font-medium text-gray-800">Grupos e Mata-Mata</span>
                            </label>
                            <label class="flex items-center p-3 bg-gray-50 border border-gray-300 rounded-lg flex-1 cursor-pointer">
                                <input type="radio" id="type-select-sortudo" name="champ-type" value="sortudo" class="h-5 w-5 text-purple-600 focus:ring-purple-500">
                                <span class="ml-3 font-medium text-gray-800">Torneio Sortudo</span>
                            </label>
                        </div>
                    </div>

                    <div id="points-config-container">
                        </div>
                    
                    <button
                        type="submit"
                        id="add-championship-btn"
                        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        ${icons.plus}
                        <span>Criar Campeonato</span>
                    </button>
                </div>
            </form>
            ` : ''; 

            mainContent.innerHTML = `
                <div class="animate-fade-in">
                    ${newChampionshipFormHtml}
                    <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-gray-200">
                        <h3 class="text-2xl font-bold mb-5 text-cyan-600">Histórico de Campeonatos</h3>
                        <div class="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                            ${championshipsListHtml}
                        </div>
                    </div>
                </div>
            `;
            // Adiciona listeners (se admin)
            if (appState.isAdmin) {
                const addForm = document.getElementById('add-championship-form');
                if (addForm) addForm.addEventListener('submit', handleAddChampionship);
                
                const addRankingBtn = document.getElementById('add-new-ranking-btn');
                if (addRankingBtn) addRankingBtn.addEventListener('click', handleAddNewRanking);
                
                document.querySelectorAll('.delete-champ-btn').forEach(btn => {
                    btn.addEventListener('click', () => handleDeleteChampionship(btn.dataset.id));
                });
                
                // Listeners para os botões de tipo de torneio (para mudar o formulário de pontos)
                const radioMataMata = document.getElementById('type-select-mata-mata');
                const radioSortudo = document.getElementById('type-select-sortudo');
                if (radioMataMata) radioMataMata.addEventListener('change', renderPointsConfigForm);
                if (radioSortudo) radioSortudo.addEventListener('change', renderPointsConfigForm);
                
                // Renderiza o formulário de pontos inicial (Mata-Mata, o padrão)
                renderPointsConfigForm();
            }

            // Listeners para todos (Visitante e Admin)
            document.querySelectorAll('.open-champ-btn').forEach(btn => {
                btn.addEventListener('click', () => navigateTo('championshipView', btn.dataset.id));
            });
        };

       /**
         * (NOVO) Renderiza o formulário de pontos (Mata-Mata Híbrido: Ouro/Prata + 1º/2º/3º)
         */
        const renderPointsConfigForm = () => {
            const container = document.getElementById('points-config-container');
            if (!container) return; // Só executa se o container existir (modo admin)

            const type = document.querySelector('input[name="champ-type"]:checked')?.value || 'mata_mata';

            if (type === 'sortudo') {
                container.innerHTML = `
                    <h3 class="text-lg font-semibold text-gray-700 mb-3">Configuração (Torneio Sortudo)</h3>
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label for="sortudo-rounds" class="block text-xs font-medium text-gray-700 mb-1">Nº de Rodadas</label>
                            <input type="number" id="sortudo-rounds" min="1" value="5"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="sortudo-lucky-games" class="block text-xs font-medium text-gray-700 mb-1">Games do Sortudo (BYE)</label>
                            <input type="number" id="sortudo-lucky-games" min="0" value="6"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-700 mb-3">Pontuação (Ranking)</h3>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        <div>
                            <label for="points-sortudo-participation" class="block text-xs font-medium text-gray-500 mb-1">Participação</label>
                            <input type="number" id="points-sortudo-participation" min="0" value="${DEFAULT_POINTS_SORTUDO.participation}"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-sortudo-per-game" class="block text-xs font-medium text-gray-500 mb-1">Pts. por Game Ganho</label>
                            <input type="number" id="points-sortudo-per-game" min="0" value="${DEFAULT_POINTS_SORTUDO.perGame}"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-sortudo-1st" class="block text-xs font-medium text-yellow-500 mb-1">Bônus 1º Lugar 🥇</label>
                            <input type="number" id="points-sortudo-1st" min="0" value="${DEFAULT_POINTS_SORTUDO.bonus_1st}"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-sortudo-2nd" class="block text-xs font-medium text-gray-500 mb-1">Bônus 2º Lugar 🥈</label>
                            <input type="number" id="points-sortudo-2nd" min="0" value="${DEFAULT_POINTS_SORTUDO.bonus_2nd}"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-sortudo-3rd" class="block text-xs font-medium text-orange-600 mb-1">Bônus 3º Lugar 🥉</label>
                            <input type="number" id="points-sortudo-3rd" min="0" value="${DEFAULT_POINTS_SORTUDO.bonus_3rd}"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                    </div>
                `;
            } else {
                // --- MODO MATA-MATA (Híbrido Ouro/Prata + 1º/2º/3º) ---
                container.innerHTML = `
                    <h3 class="text-lg font-semibold text-gray-700 mb-3">Pontuação (Mata-Mata Híbrido)</h3>
                    <div class="grid grid-cols-2 md:grid-cols-2 gap-3 mb-4">
                         <div>
                            <label for="points-mm-participation" class="block text-xs font-medium text-gray-500 mb-1">Participação</label>
                            <input type="number" id="points-mm-participation" min="0" value="10"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-mm-group-win" class="block text-xs font-medium text-blue-500 mb-1">Pts. por Vitória (Grupo)</label>
                            <input type="number" id="points-mm-group-win" min="0" value="5"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                    </div>
                    <h4 class="text-base font-semibold text-yellow-500 mb-2">Chave Ouro 🥇</h4>
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div>
                            <label for="points-mm-gold-1st" class="block text-xs font-medium text-yellow-500 mb-1">Bônus 1º Lugar 🥇</label>
                            <input type="number" id="points-mm-gold-1st" min="0" value="100"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-mm-gold-2nd" class="block text-xs font-medium text-gray-500 mb-1">Bônus 2º Lugar 🥈</label>
                            <input type="number" id="points-mm-gold-2nd" min="0" value="80"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-mm-gold-3rd" class="block text-xs font-medium text-orange-600 mb-1">Bônus 3º/4º Lugar 🥉</label>
                            <input type="number" id="points-mm-gold-3rd" min="0" value="50"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                    </div>
                    <h4 class="text-base font-semibold text-gray-600 mb-2">Chave Prata 🥈</h4>
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div>
                            <label for="points-mm-silver-1st" class="block text-xs font-medium text-gray-700 mb-1">Bônus 1º Lugar</label>
                            <input type="number" id="points-mm-silver-1st" min="0" value="40"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-mm-silver-2nd" class="block text-xs font-medium text-gray-500 mb-1">Bônus 2º Lugar</label>
                            <input type="number" id="points-mm-silver-2nd" min="0" value="30"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                        <div>
                            <label for="points-mm-silver-3rd" class="block text-xs font-medium text-gray-500 mb-1">Bônus 3º/4º Lugar</label>
                            <input type="number" id="points-mm-silver-3rd" min="0" value="20"
                                   class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-center text-gray-800">
                        </div>
                    </div>
                `;
            }
        };

/**
         * Lida com a criação de um novo campeonato (ambos os tipos)
         * --- CORREÇÃO: Salva a nova pontuação HÍBRIDA do Mata-Mata ---
         */
        const handleAddChampionship = async (e) => {
            e.preventDefault();
            const input = document.getElementById('championship-name-input');
            const button = document.getElementById('add-championship-btn');
            const champName = input.value.trim();
            if (!champName) return;

            const rankingId = document.getElementById('ranking-select').value;
            if (!rankingId) {
                showModal("Erro", "Nenhum ranking foi selecionado. Crie um ranking primeiro.");
                return;
            }
            
            button.disabled = true;
            button.lastChild.textContent = "Criando...";
            
            // Pega o tipo de torneio e as configurações de pontos
            const champType = document.querySelector('input[name="champ-type"]:checked').value;
            let pointsConfig = {};
            let champConfig = {}; // Config específica do torneio (ex: N_Rodadas)

            if (champType === 'sortudo') {
                champConfig = {
                    numRounds: parseInt(document.getElementById('sortudo-rounds').value) || 5,
                    luckyGames: parseInt(document.getElementById('sortudo-lucky-games').value) || 0,
                };
                pointsConfig = {
                    type: 'sortudo',
                    participation: parseInt(document.getElementById('points-sortudo-participation').value) || 0,
                    perGame: parseInt(document.getElementById('points-sortudo-per-game').value) || 0,
                    bonus_1st: parseInt(document.getElementById('points-sortudo-1st').value) || 0,
                    bonus_2nd: parseInt(document.getElementById('points-sortudo-2nd').value) || 0,
                    bonus_3rd: parseInt(document.getElementById('points-sortudo-3rd').value) || 0,
                };
            } else {
                // Mata-Mata (HÍBRIDO)
                pointsConfig = {
                    type: 'mata_mata_hybrid', // Novo tipo para lógica de cálculo
                    participation: parseInt(document.getElementById('points-mm-participation').value) || 0,
                    groupWin: parseInt(document.getElementById('points-mm-group-win').value) || 0,
                    // Bônus Chave Ouro
                    gold_1st: parseInt(document.getElementById('points-mm-gold-1st').value) || 0,
                    gold_2nd: parseInt(document.getElementById('points-mm-gold-2nd').value) || 0,
                    gold_3rd: parseInt(document.getElementById('points-mm-gold-3rd').value) || 0,
                    // Bônus Chave Prata
                    silver_1st: parseInt(document.getElementById('points-mm-silver-1st').value) || 0,
                    silver_2nd: parseInt(document.getElementById('points-mm-silver-2nd').value) || 0,
                    silver_3rd: parseInt(document.getElementById('points-mm-silver-3rd').value) || 0,
                };
            }

            try {
                const batch = writeBatch(db);
                const champCollectionRef = collection(db, 'users', appState.userId, 'championships');
                const newChampRef = doc(champCollectionRef);
                
                // Documento Principal (Metadados)
                batch.set(newChampRef, {
                    name: champName,
                    createdAt: Timestamp.now(),
                    status: 'registration', // Começa sempre em inscrição
                    winnerGold: null,
                    winnerSilver: null,
                    pointsConfig: pointsConfig, // Salva a configuração de pontos
                    rankingId: rankingId,
                    type: champType // Salva o tipo de torneio (mata_mata ou sortudo)
                });
                
                // Documento de Dados (Sub-coleção)
                const champDataRef = doc(db, 'users', appState.userId, 'championships', newChampRef.id, 'data', 'main');
                
                // Estrutura de dados inicial baseada no tipo
                const initialData = {
                    players: [],
                    status: 'registration',
                    config: champConfig, // Salva a config (N_rodadas, etc)
                    // Campos específicos do tipo
                    ...(champType === 'sortudo' ? {
                        rounds: [],
                        pairHistory: {}, 
                        opponentHistory: {}, 
                    } : {
                        groups: [],
                        goldBracket: [],
                        silverBracket: [],
                    })
                };
                batch.set(champDataRef, initialData);
                
                await batch.commit();
                
                input.value = '';
                const typeText = (champType === 'sortudo') ? 'Torneio Sortudo' : 'Mata-Mata';
                showModal("Sucesso!", `Campeonato "${champName}" (${typeText}) criado.`);
            } catch (error) {
                console.error("Erro ao criar campeonato:", error);
                showModal("Erro", "Não foi possível criar o campeonato.");
            }
            button.disabled = false;
            button.lastChild.textContent = "Criar Campeonato";
        };
        
        /**
         * Lida com a exclusão de um campeonato
         */
        const handleDeleteChampionship = async (champId) => {
            const champ = championships.find(c => c.id === champId);
            if (window.prompt(`Para confirmar, digite o nome do campeonato: "${champ.name}"`) !== champ.name) {
                showModal("Cancelado", "A exclusão foi cancelada.");
                return;
            }
            
            try {
                // Exclui o documento de dados (sub-coleção)
                await deleteDoc(doc(db, 'users', appState.userId, 'championships', champId, 'data', 'main'));
                // Exclui o documento principal
                await deleteDoc(doc(db, 'users', appState.userId, 'championships', champId));
            } catch (error) {
                console.error("Erro ao excluir campeonato:", error);
                showModal("Erro", "Não foi possível excluir o campeonato.");
            }
        };
        /**
         * Lida com a adição de um novo Ranking (lista de nomes)
         */
        const handleAddNewRanking = async () => {
            const name = prompt("Nome do novo ranking (ex: Temporada 2025):");
            if (!name || name.trim() === '') return;
            
            // Gera um ID amigável (slug)
            const id = name.trim().toLowerCase()
                .replace(/\s+/g, '-') 
                .replace(/[^a-z0-9-]/g, ''); 
                
            if (!id) {
                showModal("Erro", "Nome inválido. Use letras e números.");
                return;
            }
            
            if (allRankings.find(r => r.id === id || r.name.toLowerCase() === name.trim().toLowerCase())) {
                showModal("Erro", "Um ranking com esse nome ou ID já existe.");
                return;
            }
            
            const newRanking = { id, name: name.trim() };
            const newList = [...allRankings, newRanking];
            
            try {
                // Salva a *lista* de rankings em app_data
                await setDoc(doc(db, 'users', appState.userId, 'app_data', 'rankings'), { list: newList });
                showModal("Sucesso!", `Ranking "${name.trim()}" foi criado.`);
            } catch (error) {
                console.error("Erro ao criar ranking:", error);
                showModal("Erro", "Não foi possível salvar o novo ranking.");
            }
        };

       // =================================================================
        // === VIEW: RANKING GERAL
        // =================================================================
        const renderGlobalRanking = () => {
            // Ordena os jogadores por pontos
            const sortedPlayers = [...globalPlayers].sort((a, b) => b.points - a.points);
            
            const rankingsHtml = sortedPlayers.length === 0
                ? `<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum jogador neste ranking.</td></tr>`
                : sortedPlayers.map((player, index) => `
                    <tr class="border-b border-amber-100 animate-fade-in-sm">
                        <td class="p-3 sm:p-4 font-bold text-lg text-cyan-600">${index + 1}º</td>
                        <td class="p-3 sm:p-4 font-medium text-gray-800">${player.name}</td>
                        <td class="p-3 sm:p-4 font-bold text-xl text-orange-600">${player.points || 0}</td>
                        <td class="p-3 sm:p-4 text-center text-emerald-600">${player.goldWins || 0}</td>
                        <td class="p-3 sm:p-4 text-center text-gray-600">${player.silverWins || 0}</td>
                        <td class="p-3 sm:p-4 text-center text-rose-600">${player.coveiroWins || 0}</td>
                    </tr>
                `).join('');

            // Opções de rankings para o <select>
            const rankingsOptions = allRankings.map(r => 
                `<option value="${r.id}" ${r.id === appState.currentRankingId ? 'selected' : ''}>
                    ${r.name}
                </option>`
            ).join('');

            // Botões de Admin
            let adminButtonsHtml = '';
            if (appState.isAdmin) {
                adminButtonsHtml = `
                <button id="manage-rankings-btn" class="flex-shrink-0 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold p-3 rounded-lg shadow-sm transition-all" title="Gerenciar Rankings">
                    ${icons.settings}
                </button>
                
                <button id="reset-season-btn" class="flex-shrink-0 bg-rose-500 hover:bg-rose-600 text-white font-bold p-3 rounded-lg shadow-sm transition-all" title="Nova Temporada (Zerar Pontos)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
                `;
            }
            
            const printButtonHtml = `
                <button id="print-ranking-pdf-btn" class="flex-shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white font-bold p-3 rounded-lg shadow-sm transition-all" title="Gerar PDF do Ranking">
                    ${icons.fileDown}
                </button>
            `;

            const rankingSelectorHtml = `
                <div class="mb-6">
                    <label for="ranking-view-select" class="block text-sm font-medium text-gray-700 mb-1">Visualizando Ranking:</label>
                    <div class="flex gap-2">
                        <select id="ranking-view-select" class="w-full bg-white border border-gray-300 text-gray-800 rounded-lg p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                            ${rankingsOptions.length > 0 ? rankingsOptions : '<option disabled>Nenhum ranking...</option>'}
                        </select>
                        ${adminButtonsHtml}
                        ${printButtonHtml}
                    </div>
                </div>
            `;

            mainContent.innerHTML = `
                <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 animate-fade-in border border-gray-200">
                    <h2 class="text-3xl font-bold mb-6 text-cyan-600 flex items-center gap-3">
                        🏆 ${icons.award} Ranking Geral
                    </h2>
                    ${rankingSelectorHtml}
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-max text-left">
                            <thead>
                                <tr class="bg-amber-100">
                                    <th class="p-3 sm:p-4 rounded-tl-lg text-gray-600">Pos.</th>
                                    <th class="p-3 sm:p-4 text-gray-600">Jogador</th>
                                    <th class="p-3 sm:p-4 text-gray-600">Pontos</th>
                                    <th class="p-3 sm:p-4 text-center text-gray-600">🥇 Ouro</th>
                                    <th class="p-3 sm:p-4 text-center text-gray-600">🥈 Prata</th>
                                    <th class="p-3 sm:p-4 text-center rounded-tr-lg text-gray-600">👻 ${icons.shovelSmall}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-amber-100">
                                ${rankingsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Listeners da tela de Ranking
            const rankingViewSelect = document.getElementById('ranking-view-select');
            if (rankingViewSelect) rankingViewSelect.addEventListener('change', handleViewRankingChange);
            
            const manageRankingsBtn = document.getElementById('manage-rankings-btn');
            if (manageRankingsBtn) manageRankingsBtn.addEventListener('click', renderRankingManagementModal);
            
            const printRankingBtn = document.getElementById('print-ranking-pdf-btn');
            if (printRankingBtn) printRankingBtn.addEventListener('click', handlePrintRankingPDF);

            // Novo Listener: Botão Resetar Temporada
            const resetSeasonBtn = document.getElementById('reset-season-btn');
            if (resetSeasonBtn) resetSeasonBtn.addEventListener('click', handleResetSeason);
        };
        /**
         * Zera a pontuação de todos os jogadores para iniciar nova temporada
         */
        const handleResetSeason = async () => {
            if (!appState.isAdmin) return;

            // Confirmação 1
            if (!confirm("⚠️ ATENÇÃO: Vai iniciar uma NOVA TEMPORADA?\n\nIsso irá ZERAR a pontuação, vitórias e estatísticas de TODOS os jogadores deste ranking.\n\nOs jogadores continuarão na lista, mas com 0 pontos. Essa ação não pode ser desfeita.")) {
                return;
            }

            // Confirmação 2 (Segurança extra)
            const confirmWord = prompt("Para confirmar, digite a palavra ZERAR (em maiúsculo):");
            if (confirmWord !== "ZERAR") {
                alert("Ação cancelada. A palavra de confirmação estava incorreta.");
                return;
            }

            showModal("Reiniciando Temporada...", "Zerando pontuações de todos os jogadores. Aguarde...");

            try {
                const batch = writeBatch(db);
                let count = 0;
                
                // Prepara a atualização para cada jogador
                globalPlayers.forEach(player => {
                    const playerRef = doc(db, 'users', appState.userId, 'rankings', appState.currentRankingId, 'players', player.id);
                    batch.update(playerRef, {
                        points: 0,
                        goldWins: 0,
                        silverWins: 0,
                        coveiroWins: 0
                    });
                    count++;
                });

                // O Firebase limita batches a 500 operações. Se tiver mais que isso, precisaria de lógica extra,
                // mas para Beach Tennis local isso geralmente sobra.
                if (count > 0) {
                    await batch.commit();
                    hideModal();
                    showModal("Sucesso!", "Nova temporada iniciada! Todos os pontos foram zerados.");
                } else {
                    hideModal();
                    showModal("Aviso", "Não havia jogadores para zerar.");
                }

            } catch (error) {
                console.error("Erro ao zerar temporada:", error);
                hideModal();
                showModal("Erro", "Falha ao zerar os pontos: " + error.message);
            }
        };

        
        /**
         * Renderiza o modal de gerenciamento (excluir) rankings
         */
        const renderRankingManagementModal = () => {
            const rankingsHtml = allRankings.map(r => {
                // Verifica se o ranking está em uso
                const inUse = championships.find(c => c.rankingId === r.id);
                const deleteBtn = inUse ? 
                    `<span class="text-xs text-gray-500" title="Em uso pelo camp: ${inUse.name}">Em uso</span>` :
                    `<button class="delete-ranking-btn text-rose-600 hover:text-rose-700" data-id="${r.id}" data-name="${r.name}">${icons.trash}</button>`;
                
                return `
                <div class="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                    <span class="text-gray-800 font-medium">${r.name}</span>
                    ${deleteBtn}
                </div>
                `;
            }).join('');
            
            const modalContent = `
                <p class="text-sm text-gray-500 mb-4">Você só pode excluir rankings que não estão sendo usados por nenhum campeonato.</p>
                <div class="space-y-2">
                    ${rankingsHtml.length > 0 ? rankingsHtml : '<p>Nenhum ranking criado.</p>'}
                </div>
            `;
            
            showModal("Gerenciar Rankings", modalContent);
            
            // Adiciona listeners aos botões de excluir (dentro do modal)
            document.querySelectorAll('.delete-ranking-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const name = e.currentTarget.dataset.name;
                    handleDeleteRanking(id, name);
                });
            });
        };

        /**
         * Lida com a exclusão de um Ranking (lista de nomes)
         */
        const handleDeleteRanking = async (rankingId, rankingName) => {
            if (!confirm(`Tem certeza que deseja excluir o ranking "${rankingName}"? Esta ação não pode ser desfeita.`)) {
                return;
            }
            
            // Dupla verificação (não deve ser necessário, mas é seguro)
            const inUse = championships.find(c => c.rankingId === rankingId);
            if (inUse) {
                showModal("Erro", `Não é possível excluir. Este ranking está em uso pelo campeonato "${inUse.name}".`);
                return;
            }
            
            // Filtra a lista de rankings
            const newList = allRankings.filter(r => r.id !== rankingId);
            
            try {
                // Salva a nova lista (sem o ranking excluído)
                await setDoc(doc(db, 'users', appState.userId, 'app_data', 'rankings'), { list: newList });
                hideModal(); // Fecha o modal de gerenciamento
            } catch (error) {
                console.error("Erro ao excluir ranking:", error);
                showModal("Erro", "Não foi possível excluir o ranking.");
            }
        };

        /**
         * Lida com a troca do ranking visualizado
         */
        const handleViewRankingChange = (e) => {
            const newRankingId = e.target.value;
            appState.currentRankingId = newRankingId;
            globalPlayers = []; // Limpa os jogadores antigos
            render(); // Renderiza a view (mostrará o "Nenhum jogador...")
            listenToGlobalPlayers(); // Busca os novos jogadores
        };

/**
         * (ADMIN) Função para renomear um jogador em todo o torneio
         */
        const handleEditPlayerName = async (playerId, currentName) => {
            const newName = prompt(`Digite o novo nome para: ${currentName}`, currentName);
            
            if (!newName || newName.trim() === "" || newName === currentName) return;

            if (!confirm(`Confirmar alteração de "${currentName}" para "${newName}" em TODO o torneio?`)) return;

            const newChampData = JSON.parse(JSON.stringify(activeChampionship)); // Clona o objeto

            // 1. Atualiza na lista principal de inscritos
            const playerIndex = newChampData.players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) newChampData.players[playerIndex].name = newName;

            // 2. Atualiza nos Grupos (se existirem)
            if (newChampData.groups) {
                newChampData.groups.forEach(group => {
                    // Atualiza lista de players do grupo
                    const gpIndex = group.players.findIndex(p => p.id === playerId);
                    if (gpIndex !== -1) group.players[gpIndex].name = newName;

                    // Atualiza nomes nos jogos (matches)
                    group.matches.forEach(match => {
                        const pIndex = match.p.indexOf(playerId);
                        if (pIndex !== -1) {
                            // pIndex 0 e 1 são a dupla 1 (names[0])
                            // pIndex 2 e 3 são a dupla 2 (names[1])
                            const nameIndex = (pIndex <= 1) ? 0 : 1;
                            
                            // Reconstrói o nome da dupla. Ex: "João / Maria"
                            // Precisamos achar o parceiro para não perder o nome dele
                            const partnerId = (pIndex % 2 === 0) ? match.p[pIndex + 1] : match.p[pIndex - 1];
                            const partnerName = newChampData.players.find(p => p.id === partnerId)?.name || "Parceiro";
                            
                            // Define a ordem correta (mantendo a lógica original de quem é p1/p2)
                            const isFirstInPair = (pIndex % 2 === 0);
                            const newPairName = isFirstInPair ? `${newName} / ${partnerName}` : `${partnerName} / ${newName}`;
                            
                            match.names[nameIndex] = newPairName;
                        }
                    });
                });
            }

            // 3. Atualiza no Mata-Mata (Ouro e Prata)
            const updateBracketNames = (bracket) => {
                if (!bracket) return;
                bracket.forEach(match => {
                    if (match.pairs) {
                        match.pairs.forEach(pair => {
                            if (pair && pair !== 'BYE' && pair.players) {
                                const playerInPair = pair.players.find(p => p.id === playerId);
                                if (playerInPair) {
                                    // Atualiza o nome individual dentro do objeto da dupla
                                    playerInPair.name = newName;
                                    
                                    // Atualiza o nome de exibição da dupla (ex: "João / Maria")
                                    const p1 = pair.players[0].name;
                                    const p2 = pair.players[1].name;
                                    pair.name = `${p1} / ${p2}`;
                                }
                            }
                        });
                        // Se o vencedor já foi definido e é essa dupla, atualiza o vencedor também
                        if (match.winner && match.winner.players) {
                             const playerInWinner = match.winner.players.find(p => p.id === playerId);
                             if (playerInWinner) {
                                 playerInWinner.name = newName;
                                 match.winner.name = `${match.winner.players[0].name} / ${match.winner.players[1].name}`;
                             }
                        }
                    }
                });
            };

            updateBracketNames(newChampData.goldBracket);
            updateBracketNames(newChampData.silverBracket);

            // Salva tudo
            await saveActiveChampionship(newChampData);
        };

        /**
         * Renderiza a seção de administração de nomes (apenas Admin)
         */
        const renderNameCorrectionSection = () => {
            if (!appState.isAdmin) return '';

            // Cria os itens da lista (hidden por padrão, aparece ao clicar no botão)
            const playerItems = activeChampionship.players.map(p => `
                <div class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-sm mb-2">
                    <span>${p.name}</span>
                    <button class="edit-name-btn text-blue-600 hover:text-blue-800 font-bold px-2" data-id="${p.id}" data-name="${p.name}">
                        EDITAR
                    </button>
                </div>
            `).join('');

            return `
                <div class="mt-12 border-t-2 border-gray-200 pt-6">
                    <details class="bg-white rounded-lg shadow p-4">
                        <summary class="cursor-pointer font-bold text-gray-600 flex items-center gap-2 select-none">
                            ✏️ Ferramenta de Correção de Nomes (Admin)
                        </summary>
                        <div class="mt-4 p-2 bg-gray-100 rounded max-h-60 overflow-y-auto">
                            <p class="text-xs text-gray-500 mb-3">Clique em editar para renomear um jogador. A alteração reflete nos grupos e chaves automaticamente.</p>
                            ${playerItems}
                        </div>
                    </details>
                </div>
            `;
        };

        
        // =================================================================
        // === VIEW: CAMPEONATO (Bifurcação)
        // =================================================================
        const renderChampionshipView = () => {
            if (!activeChampionship) {
                mainContent.innerHTML = `
                <div class="text-center py-20 animate-fade-in">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600 mx-auto"></div>
                    <p class="mt-4 text-gray-500">Carregando campeonato...</p>
                </div>
                `;
                return;
            }

            // Pega o "documento principal" (metadados)
            const champInfo = championships.find(c => c.id === appState.currentChampionshipId);
            const champType = champInfo?.type || 'mata_mata'; // Padrão é 'mata_mata'

            let html = '';
            
            // Renderiza os botões superiores (Telão, PDF)
            html += renderTopButtons(champInfo);

            // Bifurcação: Renderiza o layout correto para o tipo de torneio
            if (champType === 'sortudo') {
                html += renderChampionshipView_Sortudo(champInfo);
            } else {
                html += renderChampionshipView_MataMata(champInfo);
            }
            
            mainContent.innerHTML = html;

            // Adiciona os Listeners específicos da view
            addChampionshipViewListeners(champInfo, champType);
        };
        /**
         * Renderiza os botões superiores (Telão, PDF)
         */
        const renderTopButtons = (champInfo) => {
            let topButtonsHtml = '';
            
            if (appState.isAdmin) { 
                let pdfButtonHtml = '';
                if (champInfo?.status === 'finished') {
                    pdfButtonHtml = `
                        <button id="print-champ-pdf-btn" class="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2">
                            ${icons.fileDown}
                            Gerar PDF
                        </button>
                    `;
                }
                const telaoButtonHtml = `
                    <button id="launch-telao-btn" class="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2">
                        ${icons.tv}
                        Abrir Telão
                    </button>
                `;
                
                topButtonsHtml = `
                <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-8 animate-fade-in border border-gray-200">
                    <div class="flex flex-col sm:flex-row justify-center gap-4">
                        ${telaoButtonHtml}
                        ${pdfButtonHtml}
                    </div>
                </div>
                `;
            }
            return topButtonsHtml;
        };

        /**
         * Adiciona os Listeners da View do Campeonato
         */
        const addChampionshipViewListeners = (champInfo, champType) => {
            if (appState.isAdmin) {
                
                // --- Listener do Botão Editar Nome ---
                document.querySelectorAll('.edit-name-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        handleEditPlayerName(btn.dataset.id, btn.dataset.name);
                    });
                });

                // --- NOVO: Listener para salvar a Quadra (ao mudar o valor) ---
                document.querySelectorAll('.court-input').forEach(input => {
                    input.addEventListener('change', async (e) => {
                        const val = e.target.value;
                        const type = e.target.dataset.type;
                        const newChampData = JSON.parse(JSON.stringify(activeChampionship));

                        if (type === 'group') {
                            const gIndex = e.target.dataset.groupIndex;
                            const mIndex = e.target.dataset.matchIndex;
                            newChampData.groups[gIndex].matches[mIndex].court = val;
                        } else if (type === 'bracket') {
                            const bType = e.target.dataset.bracketType;
                            const mId = e.target.dataset.matchId;
                            const match = newChampData[bType].find(m => m.id === mId);
                            if (match) match.court = val;
                        }
                        await saveActiveChampionship(newChampData);
                    });
                });
                // -------------------------------------------------------------

                if (activeChampionship.status === 'registration') {
                    const addExistingForm = document.getElementById('add-existing-player-form');
                    if (addExistingForm) addExistingForm.addEventListener('submit', handleAddExistingPlayerToChampionship);
                    const addNewForm = document.getElementById('add-new-player-form');
                    if (addNewForm) addNewForm.addEventListener('submit', handleAddNewPlayerToChampionship);
                    document.querySelectorAll('.delete-player-btn').forEach(btn => {
                        btn.addEventListener('click', () => handleDeletePlayerFromChampionship(btn.dataset.id));
                    });
                }
                const launchTelaoBtn = document.getElementById('launch-telao-btn');
                if (launchTelaoBtn) launchTelaoBtn.addEventListener('click', handleLaunchTelao);
                if (champInfo?.status === 'finished') {
                    const printChampBtn = document.getElementById('print-champ-pdf-btn');
                    if (printChampBtn) printChampBtn.addEventListener('click', () => handlePrintChampionshipPDF(champType));
                }

                if (champType === 'sortudo') {
                    const generateBtn = document.getElementById('generate-champ-btn-sortudo');
                    if (generateBtn) generateBtn.addEventListener('click', handleGenerateChampionship_Sortudo);
                    document.querySelectorAll('.confirm-sortudo-score-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const { roundIndex, matchIndex } = e.currentTarget.dataset;
                            handleConfirmSortudoScore(roundIndex, matchIndex);
                        });
                    });
                    const finalizeBtn = document.getElementById('finalize-champ-btn-sortudo');
                    if (finalizeBtn) finalizeBtn.addEventListener('click', handleManualFinalize_Sortudo);
                } else {
                    const generateBtn = document.getElementById('generate-champ-btn-mm');
                    if (generateBtn) generateBtn.addEventListener('click', handleGenerateChampionship_MataMata);
                    document.querySelectorAll('.confirm-group-score-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const { groupIndex, matchIndex } = e.currentTarget.dataset;
                            handleConfirmGroupScore(groupIndex, matchIndex);
                        });
                    });
                    if (activeChampionship.status === 'groups') {
                        const finalizeBtn = document.getElementById('finalize-groups-btn');
                        if (finalizeBtn) finalizeBtn.addEventListener('click', handleFinalizeGroups);
                    }
                    if (activeChampionship.status === 'knockout' || champInfo?.status === 'finished') {
                         document.querySelectorAll('.confirm-knockout-score-btn').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const { bracketType, matchId } = e.currentTarget.dataset;
                                handleConfirmKnockoutScore(bracketType, matchId);
                            });
                        });
                    }
                    const finalizeBtn = document.getElementById('finalize-champ-btn-mm');
                    if (finalizeBtn) finalizeBtn.addEventListener('click', handleManualFinalize_MataMata);
                }
            }
            if (champType === 'mata_mata' && (activeChampionship.status === 'groups' || activeChampionship.status === 'knockout' || champInfo?.status === 'finished')) {
                document.querySelectorAll('.print-group-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const groupIndex = e.currentTarget.dataset.groupIndex;
                        handlePrintGroup(groupIndex);
                    });
                });
            }
        };

        /**
         * Salva o objeto activeChampionship (data/main) no Firestore
         */
        const saveActiveChampionship = async (newChampData) => {
            if (!appState.userId || !appState.currentChampionshipId) return;
            if (!appState.isAdmin) {
                console.warn("Modo Visitante: Alterações não foram salvas.");
                return;
            }
            try {
                const champDataRef = doc(db, 'users', appState.userId, 'championships', appState.currentChampionshipId, 'data', 'main');
                await setDoc(champDataRef, newChampData);
            } catch (error) {
                console.error("Erro ao salvar campeonato:", error);
                showModal("Erro", "Não foi possível salvar as alterações.");
            }
        };
        
        /**
         * Renderiza a Inscrição de Jogadores (Comum a ambos os tipos)
         */
        const renderPlayerRegistration = (champType) => {
            const playersListHtml = activeChampionship.players.length === 0
                ? `<p class="text-gray-500 text-center py-4">Nenhum jogador cadastrado neste torneio.</p>`
                : activeChampionship.players.map(player => {
                    const deleteButton = appState.isAdmin ? `
                    <button class="delete-player-btn text-rose-600 hover:text-rose-700 transition-colors" data-id="${player.id}">
                        ${icons.trash}
                    </button>` : '';
                    return `
                    <div class="flex justify-between items-center bg-amber-50 p-3 rounded-lg animate-fade-in-sm border border-amber-200">
                        <span class="text-gray-800 font-medium">${player.name}</span>
                        ${deleteButton}
                    </div>
                    `
                }).join('');

            const playerCount = activeChampionship.players.length;
            
            // Lógica do Botão Gerar (baseado no tipo)
            let generateButtonHtml = '';
            if (champType === 'sortudo') {
                const minPlayers = 4;
                const canGenerate = playerCount >= minPlayers;
                generateButtonHtml = `
                <div class="mt-8 text-center">
                    <button
                        id="generate-champ-btn-sortudo"
                        type="button"
                        ${!canGenerate ? 'disabled' : ''}
                        class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg shadow-xl transition-all flex items-center justify-center gap-3 text-lg mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                        ${icons.shuffle}
                        Sortear Rodadas
                    </button>
                    ${!canGenerate ? `<p class="text-rose-600 text-sm mt-3">O Torneio Sortudo requer no mínimo ${minPlayers} jogadores. Você tem ${playerCount}.</p>` : ''}
                </div>
                `;
            } else {
                // Mata-Mata
                const isMultipleOfFour = playerCount % 4 === 0;
                const minPlayersForGroups = 4;
                const canGenerate = playerCount >= minPlayersForGroups && isMultipleOfFour;
                generateButtonHtml = `
                <div class="mt-8 text-center">
                    <button
                        id="generate-champ-btn-mm"
                        type="button"
                        ${!canGenerate ? 'disabled' : ''}
                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-lg shadow-xl transition-all flex items-center justify-center gap-3 text-lg mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                        ${icons.swords}
                        Gerar Grupos
                    </button>
                    ${!canGenerate ? `<p class="text-rose-600 text-sm mt-3">O campeonato (Mata-Mata) requer um número de jogadores múltiplo de 4 (ex: 4, 8, 12...). Você tem ${playerCount}.</p>` : ''}
                </div>
                `;
            }
            
            // Filtra jogadores disponíveis do ranking
            const playersInTournamentIds = new Set(activeChampionship.players.map(p => p.id));
            const availablePlayersFromRanking = globalPlayers.filter(p => !playersInTournamentIds.has(p.id));
            const existingPlayersOptions = availablePlayersFromRanking.length > 0
                ? availablePlayersFromRanking.map(p => `<option value="${p.id}">${p.name}</option>`).join('')
                : '<option disabled>Nenhum jogador disponível no ranking</option>';

            const addPlayerFormHtml = appState.isAdmin ? `
            <div class="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <form id="add-existing-player-form">
                    <label for="existing-player-select" class="block text-sm font-medium text-gray-700 mb-1">Adicionar do Ranking</label>
                    <div class="flex gap-2">
                        <select id="existing-player-select" class="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" ${availablePlayersFromRanking.length === 0 ? 'disabled' : ''}>
                            ${existingPlayersOptions}
                        </select>
                        <button
                            type="submit"
                            id="add-existing-player-btn"
                            class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            ${availablePlayersFromRanking.length === 0 ? 'disabled' : ''}>
                            ${icons.plus}
                        </button>
                    </div>
                </form>
                <form id="add-new-player-form">
                    <label for="new-player-name-input" class="block text-sm font-medium text-gray-700 mb-1">Adicionar Novo Jogador</label>
                    <div class="flex gap-2">
                        <input
                            type="text"
                            id="new-player-name-input"
                            placeholder="Nome do Novo Jogador"
                            class="flex-grow bg-gray-50 border border-gray-300 text-gray-800 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                            type="submit"
                            id="add-new-player-btn"
                            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            ${icons.plus}
                        </button>
                    </div>
                </form>
            </div>
            ` : '';

            return `
                <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 animate-fade-in border border-gray-200">
                    ${addPlayerFormHtml}
                    <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
                        <h3 class="text-xl font-semibold mb-4 text-cyan-600 flex items-center gap-2">
                            ${icons.users}
                            Jogadores Inscritos (${playerCount})
                        </h3>
                        <div class="max-h-96 overflow-y-auto pr-2 space-y-2">
                            ${playersListHtml}
                        </div>
                    </div>
                    ${appState.isAdmin ? generateButtonHtml : ''}
                </div>
            `;
        };

        /**
         * Lida com a adição de um novo jogador ao torneio (vindo do Ranking)
         */
        const handleAddExistingPlayerToChampionship = async (e) => {
            e.preventDefault();
            const select = document.getElementById('existing-player-select');
            const button = document.getElementById('add-existing-player-btn');
            const playerId = select.value;
            if (!playerId) {
                showModal("Erro", "Nenhum jogador selecionado.");
                return;
            }
            
            const player = globalPlayers.find(p => p.id === playerId);
            if (!player) {
                showModal("Erro", "Jogador não encontrado. Tente atualizar a página.");
                return;
            }
            
            const alreadyInTournament = activeChampionship.players.some(
                p => p.id === playerId
            );
            if (alreadyInTournament) {
                showModal("Duplicidade Detectada", `O jogador "${player.name}" já está inscrito neste torneio.`);
                return;
            }
            
            button.disabled = true;
            const newChampData = {
                ...activeChampionship,
                players: [...activeChampionship.players, { id: player.id, name: player.name }]
            };
            await saveActiveChampionship(newChampData);
            button.disabled = false;
        };

        /**
         * Lida com a adição de um novo jogador ao torneio (e ao Ranking)
         * ---
         * *** CORREÇÃO 1 (Bug do Ranking) ***
         * Esta função foi modificada para adicionar o novo jogador DIRETAMENTE
         * ao Ranking Global (com 0 pts) e SÓ ENTÃO adicioná-lo ao torneio
         * usando o ID oficial do Firebase.
         * ---
         */
        const handleAddNewPlayerToChampionship = async (e) => {
            e.preventDefault();
            const input = document.getElementById('new-player-name-input');
            const button = document.getElementById('add-new-player-btn');
            const playerName = input.value.trim();
            if (!playerName) return;

            // Pega o RankingID atual para salvar o novo jogador
            const rankingId = appState.currentRankingId;
            if (!rankingId) {
                showModal("Erro Crítico", "Nenhum ranking selecionado. Não é possível adicionar novo jogador.");
                return;
            }

            // Verifica se o jogador já existe no Ranking Global
            const existingPlayerInRanking = globalPlayers.find(p => p.name.toLowerCase() === playerName.toLowerCase());
            if (existingPlayerInRanking) {
                showModal("Jogador Já Existe", `Um jogador chamado "${playerName}" já existe no ranking. Use o menu "Adicionar do Ranking" para adicioná-lo.`);
                return;
            }

            // Verifica se já está neste torneio (caso de digitação rápida)
            const alreadyInTournament = activeChampionship.players.some(
                p => p.name.toLowerCase() === playerName.toLowerCase()
            );
            if (alreadyInTournament) {
                showModal("Duplicidade Detectada", `O jogador "${playerName}" já está inscrito neste torneio.`);
                return;
            }

            button.disabled = true;
            
            try {
                // 1. Cria o jogador no Ranking Global PRIMEIRO
                const playersCollectionRef = collection(db, 'users', appState.userId, 'rankings', rankingId, 'players');
                const newPlayerDoc = await addDoc(playersCollectionRef, {
                    name: playerName,
                    points: 0,
                    goldWins: 0,
                    silverWins: 0,
                    coveiroWins: 0
                });
                
                // 2. Cria o objeto do jogador com o ID OFICIAL
                const newPlayer = {
                    id: newPlayerDoc.id, 
                    name: playerName
                };
                
                // 3. Adiciona o jogador (com ID oficial) ao torneio
                const newChampData = {
                    ...activeChampionship,
                    players: [...activeChampionship.players, newPlayer]
                };
                
                // 4. Salva o torneio
                await saveActiveChampionship(newChampData);
                
                input.value = '';
                // O 'onSnapshot' do globalPlayers irá atualizar a lista automaticamente.
                
            } catch (error) {
                console.error("Erro ao criar novo jogador:", error);
                showModal("Erro", "Não foi possível criar o novo jogador no ranking.");
            }
            
            button.disabled = false;
        };

        /**
         * Lida com a remoção de um jogador DO TORNEIO (não do ranking)
         */
        const handleDeletePlayerFromChampionship = async (playerId) => {
            if (!confirm("Tem certeza que deseja remover este jogador DO TORNEIO?")) return;
            
            const newChampData = {
                ...activeChampionship,
                players: activeChampionship.players.filter(p => p.id !== playerId)
            };
            await saveActiveChampionship(newChampData);
        };
        
        // =================================================================
        // === LÓGICA (Mata-Mata)
        // =================================================================
        
        /**
         * Renderiza a view do campeonato (Mata-Mata)
         */
        const renderChampionshipView_MataMata = (champInfo) => {
            let html = '';
            
            // Se finalizado, mostra grupos e chave
            if (champInfo?.status === 'finished') {
                html = renderGroupStage() + renderKnockoutView(true);
            } 
            // Se em mata-mata, mostra grupos e chave
            else if (activeChampionship.status === 'knockout') {
                html = renderGroupStage() + renderKnockoutView(false);
            } 
            // Se em grupos, mostra apenas os grupos
            else if (activeChampionship.status === 'groups') {
                html = renderGroupStage();
            } 
            // Se em inscrição, mostra apenas a inscrição
            else { 
                html = renderPlayerRegistration('mata_mata');
            }

            // --- ADICIONADO: Seção de Correção de Nomes no final ---
            if (activeChampionship.status !== 'registration') {
                html += renderNameCorrectionSection();
            }

            return html;
        };
        /**
         * Renderiza a Fase de Grupos (Mata-Mata) - Com campo de Quadra
         */
        const renderGroupStage = () => {
            let allScoresFilled = true;
            const isDisabled = !appState.isAdmin ? 'disabled' : '';
            const isLocked = (activeChampionship.status === 'knockout' || activeChampionship.status === 'finished');

            const groupsHtml = activeChampionship.groups.map((group, groupIndex) => {
                const rankings = getRankings(group);
                
                const matchesHtml = group.matches.map((match, matchIndex) => {
                    const score1 = match.score[0];
                    const score2 = match.score[1];
                    if (score1 === null || score2 === null) allScoresFilled = false;
                    const confirmButtonDisplay = (isLocked || !appState.isAdmin) ? 'hidden' : '';

                    return `
                    <div class="bg-amber-50 p-3 sm:p-4 rounded-lg border border-amber-200">
                        <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
                            <span class="text-sm text-gray-700 text-center sm:text-left w-full sm:w-auto">${match.names[0]}</span>
                            
                            <div class="flex flex-col items-center">
                                <span class="font-bold text-cyan-600 text-xs">vs</span>
                                <input 
                                    type="number" 
                                    placeholder="Q." 
                                    value="${match.court || ''}" 
                                    class="court-input w-12 text-center text-xs border border-gray-300 rounded mt-1 bg-white focus:ring-2 focus:ring-cyan-500"
                                    data-type="group"
                                    data-group-index="${groupIndex}"
                                    data-match-index="${matchIndex}"
                                    ${isDisabled}
                                >
                            </div>

                            <span class="text-sm text-gray-700 text-center sm:text-right w-full sm:w-auto">${match.names[1]}</span>
                        </div>
                        <div class="flex justify-center items-center gap-3 mt-3">
                            <input
                                type="number" min="0" value="${score1 === null ? '' : score1}"
                                id="g-${groupIndex}-m-${matchIndex}-s0" 
                                class="w-20 bg-white border border-gray-300 text-gray-800 rounded-lg p-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isLocked ? 'opacity-70' : ''}"
                                ${isLocked ? 'disabled' : isDisabled}
                            />
                            <span class="text-gray-500">-</span>
                            <input
                                type="number" min="0" value="${score2 === null ? '' : score2}"
                                id="g-${groupIndex}-m-${matchIndex}-s1"
                                class="w-20 bg-white border border-gray-300 text-gray-800 rounded-lg p-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isLocked ? 'opacity-70' : ''}"
                                ${isLocked ? 'disabled' : isDisabled}
                            />
                            <button 
                                class="confirm-group-score-btn p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md transition-all ${confirmButtonDisplay}"
                                data-group-index="${groupIndex}"
                                data-match-index="${matchIndex}"
                                title="Confirmar Placar">
                                ${icons.check}
                            </button>
                        </div>
                    </div>
                    `;
                }).join('');
                
                const rankingsHtml = rankings.map((player, rankIndex) => `
                    <tr class="border-b border-gray-200 ${rankIndex < 2 ? 'text-emerald-600' : 'text-orange-600'}">
                        <td class="p-3 font-bold">${rankIndex + 1}º</td>
                        <td class="p-3 text-gray-800">${player.name}</td>
                        <td class="p-3 font-bold">${player.gamesWon}</td>
                    </tr>
                `).join('');

                const printButton = `
                    <button class="print-group-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-3 rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm" data-group-index="${groupIndex}">
                        ${icons.printer}
                    </button>
                `;

                return `
                <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-fade-in border border-gray-200">
                    <div class="flex justify-between items-center mb-5">
                        <h3 class="text-2xl font-bold text-cyan-600">Grupo ${groupIndex + 1}</h3>
                        ${printButton}
                    </div>
                    <div class="space-y-4 mb-6">${matchesHtml}</div>
                    <div>
                        <h4 class="text-lg font-semibold mb-3 text-gray-800">Ranking do Grupo</h4>
                        <table class="w-full text-left">
                            <thead>
                                <tr class="bg-amber-100">
                                    <th class="p-3 rounded-l-lg text-gray-600">Pos.</th>
                                    <th class="p-3 text-gray-600">Jogador</th>
                                    <th class="p-3 rounded-r-lg text-gray-600">Games Vencidos</th>
                                </tr>
                            </thead>
                            <tbody>${rankingsHtml}</tbody>
                        </table>
                        <div class="flex justify-between mt-2 text-sm">
                            <span class="text-emerald-600">▲ Dupla Ouro 🥇</span>
                            <span class="text-orange-600">▼ Dupla Prata 🥈</span>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
            
            const finalizeButtonHtml = (appState.isAdmin && activeChampionship.status === 'groups') ? `
            <div class="mt-8 text-center">
                <button
                    id="finalize-groups-btn"
                    type="button"
                    ${!allScoresFilled ? 'disabled' : ''}
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-lg shadow-xl transition-all flex items-center justify-center gap-3 text-lg mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                    ${icons.trophy}
                    ${allScoresFilled ? "Finalizar Grupos e Gerar Chaves" : "Preencha todos os placares"}
                </button>
            </div>
            ` : '';
            
            return `<div class="space-y-8 animate-fade-in">${groupsHtml}${finalizeButtonHtml}</div>`;
        };
        
        /**
         * Renderiza as Chaves de Mata-Mata (Ouro e Prata)
         */
        const renderKnockoutView = (isFinished) => {
            const goldHtml = renderBracket('Série Ouro 🥇', activeChampionship.goldBracket, 'goldBracket', isFinished);
            const silverHtml = renderBracket('Série Prata 🥈', activeChampionship.silverBracket, 'silverBracket', isFinished);
            
            let coveiroHtml = '';
            if (activeChampionship.groups && activeChampionship.groups.length > 0) {
                const stats = getGlobalTournamentStats_MataMata(activeChampionship);
                if (stats.length > 0) {
                    const minGames = stats[0].gamesWon;
                    const coveiros = stats.filter(p => p.gamesWon === minGames); 
                    const coveiroNames = coveiros.map(c => c.name).join(' / ');
                    coveiroHtml = `
                    <div class="bg-white text-gray-800 p-6 rounded-lg shadow-xl mt-8 text-center animate-fade-in border border-gray-200">
                        <h4 class="text-2xl font-black uppercase tracking-wider text-rose-600">👻 Prêmio Coveiro</h4>
                        <p class="text-4xl font-extrabold text-gray-900 mt-2">${coveiroNames}</p>
                        <p class="text-sm text-gray-500">Com apenas ${minGames} games marcados no torneio.</p>
                    </div>
                    `;
                }
            }
            
            // Botão de Finalização Manual (Mata-Mata)
            let finalizeButtonHtml = '';
            const champ = championships.find(c => c.id === appState.currentChampionshipId);
            
            if (appState.isAdmin && activeChampionship.status === 'knockout' && champ?.status !== 'finished') {
                const { goldWinner, silverWinner } = getKnockoutWinners(activeChampionship);
                
                finalizeButtonHtml = `
                <div class="mt-8 text-center bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                    <h3 class="text-2xl font-bold text-cyan-600 mb-4">Finalizar Campeonato</h3>
                    <p class="text-gray-600 mb-2">Campeão Ouro: <span class="font-bold">${goldWinner ? goldWinner.name : 'Aguardando...'}</span></p>
                    <p class="text-gray-600 mb-5">Campeão Prata: <span class="font-bold">${silverWinner ? silverWinner.name : 'Aguardando...'}</span></p>
                    <button
                        id="finalize-champ-btn-mm"
                        type="button"
                        ${(!goldWinner || !silverWinner) ? 'disabled' : ''}
                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-lg shadow-xl transition-all flex items-center justify-center gap-3 text-lg mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                        ${icons.award}
                        ${(goldWinner && silverWinner) ? "Finalizar e Lançar no Ranking" : "Aguardando Finais"}
                    </button>
                </div>
                `;
            }
            
            return `<div class="animate-fade-in">${finalizeButtonHtml}${goldHtml}${silverHtml}${coveiroHtml}</div>`;
        };

        /**
         * Renderiza uma chave (bracket) individual - Com Campo de Quadra
         */
        const renderBracket = (title, bracket, bracketType, isFinished) => {
            const rounds = {};
            if (!bracket || bracket.length === 0) {
                 return `<div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8 border border-gray-200">
                     <h3 class="text-3xl font-bold mb-6 text-cyan-600 flex items-center gap-3">${title}</h3>
                     <p class="text-gray-500">Chave ainda não gerada.</p>
                  </div>`;
            }

            bracket.forEach(match => {
                if (!rounds[match.round]) rounds[match.round] = [];
                rounds[match.round].push(match);
            });
            
            const maxRound = Math.max(...bracket.map(m => m.round));
            const final = bracket.find(m => m.round === maxRound);
            const semiFinals = bracket.filter(m => m.round === maxRound - 1);
            const champion = final?.winner; 
            const runnerUp = final?.pairs.find(p => p && p.id !== champion?.id);
            let thirdPlace = null;
            if (champion && semiFinals.length === 2) {
                const championSemi = semiFinals.find(sf => sf.pairs.some(p => p && p.id === champion.id));
                if(championSemi) thirdPlace = championSemi.pairs.find(p => p && p.id !== champion.id);
            }

            const isGold = bracketType === 'goldBracket';
            const cardStyle = isGold ? 'bg-gradient-to-r from-yellow-300 via-orange-400 to-orange-500 text-white' : 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-gray-900';
            const championNameStyle = isGold ? 'text-4xl font-extrabold text-white' : 'text-4xl font-extrabold text-gray-800';
            const runnerUpStyle = isGold ? 'text-lg font-bold text-white opacity-90' : 'text-lg font-bold text-gray-700';
            const thirdPlaceStyle = isGold ? 'text-base font-medium text-white opacity-80' : 'text-base font-medium text-gray-600';

            const championHtml = champion ? `
            <div class="${cardStyle} p-6 rounded-lg shadow-2xl mb-8 text-center animate-fade-in space-y-2">
                <div><h4 class="text-xl font-black uppercase tracking-wider ${isGold ? 'text-white' : 'text-gray-800'}">🥇 1º Lugar</h4><p class="${championNameStyle}">${champion.name}</p></div>
                ${runnerUp ? `<div><h5 class="text-lg font-bold uppercase tracking-wider ${runnerUpStyle}">🥈 2º Lugar</h5><p class="${runnerUpStyle}">${runnerUp.name}</p></div>` : ''}
                ${thirdPlace ? `<div><h6 class="text-base font-medium uppercase tracking-wider ${thirdPlaceStyle}">🥉 3º Lugar</h6><p class="${thirdPlaceStyle}">${thirdPlace.name}</p></div>` : ''}
            </div>` : '';

            const roundsHtml = Object.keys(rounds).sort((a,b) => a-b).map(roundNum => {
                const roundTitle = getRoundTitle(roundNum, maxRound);
                const matchesHtml = rounds[roundNum].map(match => {
                    const pair1 = match.pairs[0]; 
                    const pair2 = match.pairs[1]; 
                    const isPair1Winner = match.winner && pair1 && match.winner.id === pair1.id;
                    const isPair2Winner = match.winner && pair2 && match.winner.id === pair2.id;
                    const score1 = match.score[0];
                    const score2 = match.score[1];
                    const isBye = pair2 === 'BYE' || pair1 === 'BYE';
                    
                    if (isBye) {
                        const byePair = pair1 === 'BYE' ? pair2 : pair1;
                        return `<div class="bg-emerald-50 rounded-lg shadow-sm border border-emerald-200 p-4 opacity-80">
                            <p class="text-xs text-emerald-700 font-semibold mb-2">BYE (Folga)</p>
                            <div class="flex justify-between items-center"><span class="font-medium text-sm text-emerald-600 font-bold">${byePair ? byePair.name : 'Erro'}</span><span class="text-sm font-bold text-emerald-800">AVANÇA</span></div>
                        </div>`;
                    }

                    const showConfirmButton = appState.isAdmin && pair1 && pair2 && pair1 !== 'BYE' && pair2 !== 'BYE';
                    const inputDisabled = !appState.isAdmin || (!pair1 || !pair2) || pair1 === 'BYE' || pair2 === 'BYE';

                    return `
                    <div class="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-medium text-sm ${isPair1Winner ? 'text-emerald-600 font-bold' : 'text-gray-800'}">${pair1 ? pair1.name : 'Aguardando...'}</span>
                            <input type="number" min="0" value="${score1 === null ? '' : score1}" id="k-${match.id}-s0" class="w-16 bg-white border border-gray-300 text-gray-800 rounded-lg p-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 ${inputDisabled ? 'opacity-70' : ''}" ${inputDisabled ? 'disabled' : ''} />
                        </div>
                        
                        <div class="flex items-center my-2 justify-center relative">
                            <div class="flex-grow border-t border-gray-300 absolute w-full z-0"></div>
                            <input 
                                type="number" 
                                placeholder="Q." 
                                value="${match.court || ''}" 
                                class="court-input w-10 text-center text-xs border border-gray-300 rounded bg-white focus:ring-2 focus:ring-cyan-500 relative z-10 mx-2"
                                data-type="bracket"
                                data-bracket-type="${bracketType}"
                                data-match-id="${match.id}"
                                ${!appState.isAdmin ? 'disabled' : ''}
                            >
                        </div>

                        <div class="flex justify-between items-center">
                            <span class="font-medium text-sm ${isPair2Winner ? 'text-emerald-600 font-bold' : 'text-gray-800'}">${pair2 ? pair2.name : 'Aguardando...'}</span>
                            <input type="number" min="0" value="${score2 === null ? '' : score2}" id="k-${match.id}-s1" class="w-16 bg-white border border-gray-300 text-gray-800 rounded-lg p-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 ${inputDisabled ? 'opacity-70' : ''}" ${inputDisabled ? 'disabled' : ''} />
                        </div>
                        <div class="text-center mt-3 ${!showConfirmButton ? 'hidden' : ''}">
                            <button class="confirm-knockout-score-btn p-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md transition-all" data-bracket-type="${bracketType}" data-match-id="${match.id}" title="Confirmar Placar">${icons.check}</button>
                        </div>
                    </div>
                    `;
                }).join('');
                return `<div class="flex flex-col space-y-6 flex-shrink-0 w-72 sm:w-80"><h4 class="text-xl font-semibold text-gray-800">${roundTitle}</h4><div class="space-y-4">${matchesHtml}</div></div>`;
            }).join('');
            
            return `<div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8 border border-gray-200"><h3 class="text-3xl font-bold mb-6 text-cyan-600">${title}</h3>${championHtml}<div class="flex gap-4 sm:gap-6 pb-4 overflow-x-auto">${roundsHtml}</div></div>`;
        };
        /**
         * Retorna o nome da rodada (ex: Final, Semi-Final)
         */
        const getRoundTitle = (roundNum, maxRound) => {
            const r = Number(roundNum);
            const max = Number(maxRound);
            if (r === max) return 'Final';
            if (r === max - 1) return 'Semi-Final';
            if (r === max - 2) return 'Quartas de Final';
            if (r === max - 3) return 'Oitavas de Final';
            return `Rodada ${r}`;
        };

        /**
         * Retorna os vencedores (se houver) do mata-mata
         */
        const getKnockoutWinners = (champData) => {
            if (!champData.goldBracket || champData.goldBracket.length === 0) {
                return { goldWinner: null, silverWinner: null };
            }
            const maxRoundGold = Math.max(...champData.goldBracket.map(m => m.round));
            const maxRoundSilver = Math.max(...champData.silverBracket.map(m => m.round));
            const goldFinal = champData.goldBracket.find(m => m.round === maxRoundGold);
            const silverFinal = champData.silverBracket.find(m => m.round === maxRoundSilver);
            
            return {
                goldWinner: goldFinal?.winner || null,
                silverWinner: silverFinal?.winner || null
            };
        };
        
        // =================================================================
        // === LÓGICA (Sortudo)
        // =================================================================

        /**
         * Renderiza a view do campeonato (Sortudo)
         */
        const renderChampionshipView_Sortudo = (champInfo) => {
            let html = '';
            
            if (champInfo?.status === 'finished') {
                html = renderLeaderboard_Sortudo(true); // Finalizado
            } 
            else if (activeChampionship.status === 'rounds') {
                html = renderLeaderboard_Sortudo(false); // Em andamento
                html += renderRounds_Sortudo();
            } 
            else { 
                // Status 'registration'
                html = renderPlayerRegistration('sortudo');
            }
            return html;
        };

        /**
         * Renderiza o Leaderboard (Classificação) do Torneio Sortudo
         */
        const renderLeaderboard_Sortudo = (isFinished) => {
            const { leaderboard, allScoresFilled } = getLeaderboard_Sortudo();
            
            const playerRows = leaderboard.map((player, index) => {
                const rank = index + 1;
                let medal = '';
                if (rank === 1) medal = '🥇';
                if (rank === 2) medal = '🥈';
                if (rank === 3) medal = '🥉';
                
                const isCoveiro = (rank === leaderboard.length && leaderboard.length > 3);
                const saldoClass = player.saldo > 0 ? 'text-emerald-600' : (player.saldo < 0 ? 'text-rose-600' : 'text-gray-500');
                
                return `
                    <tr class="border-b border-amber-100 animate-fade-in-sm">
                        <td class="p-3 sm:p-4 font-bold text-lg text-cyan-600">${rank}º ${medal}</td>
                        <td class="p-3 sm:p-4 font-medium text-gray-800">${player.name} ${isCoveiro ? '👻' : ''}</td>
                        <td class="p-3 sm:p-4 font-bold text-xl text-orange-600">${player.totalGames}</td>
                        <td class="p-3 sm:p-4 font-bold ${saldoClass}">${player.saldo > 0 ? '+' : ''}${player.saldo}</td>
                        <td class="p-3 sm:p-4 text-center text-gray-500">${player.gamesLost}</td>
                    </tr>
                `;
            }).join('');
            
            // Botão de Finalização (Admin)
            let finalizeButtonHtml = '';
            if (appState.isAdmin && !isFinished && activeChampionship.status === 'rounds') {
                 finalizeButtonHtml = `
                <div class="mt-8 text-center bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                    <h3 class="text-2xl font-bold text-cyan-600 mb-4">Finalizar Torneio Sortudo</h3>
                    <p class="text-gray-600 mb-5">O ranking será calculado com base nesta classificação.</p>
                    <button
                        id="finalize-champ-btn-sortudo"
                        type="button"
                        ${!allScoresFilled ? 'disabled' : ''}
                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-lg shadow-xl transition-all flex items-center justify-center gap-3 text-lg mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                        ${icons.award}
                        ${allScoresFilled ? "Finalizar e Lançar no Ranking" : "Preencha todos os placares"}
                    </button>
                </div>
                `;
            }
            
            // Cabeçalho da Tabela (com a nova coluna Saldo)
            const tableHeader = `
                <thead class="bg-amber-100">
                    <tr class="text-left">
                        <th class="p-3 sm:p-4 rounded-tl-lg text-gray-600">Pos.</th>
                        <th class="p-3 sm:p-4 text-gray-600">Jogador</th>
                        <th class="p-3 sm:p-4 text-gray-600">Games Ganhos</th>
                        <th class="p-3 sm:p-4 text-gray-600">Saldo</th>
                        <th class="p-3 sm:p-4 text-center rounded-tr-lg text-gray-600">Games Perdidos</th>
                    </tr>
                </thead>
            `;

            return `
                <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 animate-fade-in border border-gray-200 mb-8">
                    <h2 class="text-3xl font-bold mb-6 text-purple-600 flex items-center gap-3">
                        ${icons.shuffle} Classificação (Leaderboard)
                    </h2>
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-max">
                            ${tableHeader}
                            <tbody class="divide-y divide-amber-100">
                                ${playerRows}
                            </tbody>
                        </table>
                    </div>
                </div>
                ${finalizeButtonHtml}
            `;
        };
        
        /**
         * Renderiza as Rodadas (Admin) do Torneio Sortudo
         */
        const renderRounds_Sortudo = () => {
            const isDisabled = !appState.isAdmin ? 'disabled' : '';
            const playerNameMap = new Map(activeChampionship.players.map(p => [p.id, p.name]));

            const roundsHtml = activeChampionship.rounds.map((round, roundIndex) => {
                
                const matchesHtml = round.matches.map((match, matchIndex) => {
                    const [p1, p2, p3, p4] = match.p;
                    const [s1, s2] = match.score;
                    
                    const pair1Name = `${playerNameMap.get(p1) || '?'} / ${playerNameMap.get(p2) || '?'}`;
                    const pair2Name = `${playerNameMap.get(p3) || '?'} / ${playerNameMap.get(p4) || '?'}`;

                    return `
                    <div class="bg-amber-50 p-3 sm:p-4 rounded-lg border border-amber-200">
                        <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
                            <span class="text-sm text-gray-700 text-center sm:text-left">${pair1Name}</span>
                            <span class="font-bold text-cyan-600">vs</span>
                            <span class="text-sm text-gray-700 text-center sm:text-right">${pair2Name}</span>
                        </div>
                        <div class="flex justify-center items-center gap-3 mt-3">
                            <input
                                type="number"
                                min="0"
                                value="${s1 === null ? '' : s1}"
                                id="s-${roundIndex}-m-${matchIndex}-s0" 
                                class="w-20 bg-white border border-gray-300 text-gray-800 rounded-lg p-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDisabled ? 'opacity-70' : ''}"
                                ${isDisabled}
                            />
                            <span class="text-gray-500">-</span>
                            <input
                                type="number"
                                min="0"
                                value="${s2 === null ? '' : s2}"
                                id="s-${roundIndex}-m-${matchIndex}-s1"
                                class="w-20 bg-white border border-gray-300 text-gray-800 rounded-lg p-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDisabled ? 'opacity-70' : ''}"
                                ${isDisabled}
                            />
                            <button 
                                class="confirm-sortudo-score-btn p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md transition-all ${isDisabled ? 'hidden' : ''}"
                                data-round-index="${roundIndex}"
                                data-match-index="${matchIndex}"
                                title="Confirmar Placar">
                                ${icons.check}
                            </button>
                        </div>
                    </div>
                    `;
                }).join('');
                
                const luckyPlayersHtml = round.luckyPlayers.map(pId => playerNameMap.get(pId) || '?').join(' / ');

                return `
                <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-fade-in border border-gray-200">
                    <h3 class="text-2xl font-bold text-cyan-600 mb-4">Rodada ${roundIndex + 1}</h3>
                    ${luckyPlayersHtml ? `
                        <div class="mb-4 bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm">
                            <span class="font-semibold text-emerald-700">Sortudos (BYE):</span> ${luckyPlayersHtml}
                            <span class="text-emerald-700">(+${activeChampionship.config.luckyGames} games)</span>
                        </div>
                    ` : ''}
                    <div class="space-y-4">${matchesHtml}</div>
                </div>
                `;
            }).join('');
            
            return `<div class="space-y-8 animate-fade-in">${roundsHtml}</div>`;
        };
        
// =================================================================
        // === VIEW: TELÃO (Bifurcação)
        // =================================================================
        const renderTelaoView = () => {
             if (!activeChampionship) {
                mainContent.innerHTML = `
                <div class="text-center py-20 animate-fade-in">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600 mx-auto"></div>
                    <p class="mt-4 text-gray-500">Aguardando dados do torneio...</p>
                </div>
                `;
                return;
            }
            
            const champInfo = championships.find(c => c.id === appState.currentChampionshipId);
            const champName = champInfo ? champInfo.name : "Campeonato";
            const champType = champInfo?.type || 'mata_mata';
            
            // Título bem compacto (5% da altura)
            let html = `<h1 class="text-2xl sm:text-3xl font-bold text-center text-cyan-600 my-2 animate-fade-in h-[5vh] flex items-center justify-center">🏖️ ${champName} 🎾</h1>`;
            
            let bottomRowHtml = '';
            
            if (activeChampionship.status === 'registration') {
                bottomRowHtml = renderPlayerRegistration_ReadOnly();
            }
            else if (champType === 'sortudo') {
                // Modo Sortudo (Layout Original)
                let sortudoContent = '';
                if (champInfo?.status === 'finished') {
                    sortudoContent = renderLeaderboard_Sortudo_ReadOnly(true);
                } else if (activeChampionship.status === 'rounds') {
                    sortudoContent = renderLeaderboard_Sortudo_ReadOnly(false);
                    sortudoContent += renderRounds_Sortudo_ReadOnly();
                }
                bottomRowHtml = `<div class="flex flex-wrap justify-center gap-6 animate-fade-in">${sortudoContent}</div>`;
            } 
            else {
                // Modo Mata-Mata (LAYOUT 16:9 OTIMIZADO)
                let bracketData = {};

                if (champInfo?.status === 'finished') {
                    bracketData = renderKnockoutView_ReadOnly(true);
                } else if (activeChampionship.status === 'knockout') {
                    bracketData = renderKnockoutView_ReadOnly(false);
                } else if (activeChampionship.status === 'groups') {
                    // Layout de Grupos (já otimizado na etapa anterior)
                    const numGroups = activeChampionship.groups.length;
                    bottomRowHtml = `
                    <div class="grid gap-2 w-full h-[92vh] px-2 animate-fade-in" style="grid-template-columns: repeat(${numGroups}, minmax(0, 1fr));">
                        ${renderGroupStage_ReadOnly()}
                    </div>
                    `;
                }
                
                // Se for Mata-Mata (Brackets)
                if (!bottomRowHtml && bracketData.goldHtml) {
                     // Altura calculada: 100vh - Título - Rodapé Coveiro
                     bottomRowHtml = `
                     <div class="flex flex-row w-full h-[88vh] px-2 gap-4 animate-fade-in items-stretch">
                        <div class="flex-1 w-1/2 h-full overflow-hidden">${bracketData.goldHtml}</div>
                        <div class="w-px bg-gray-300 h-[90%] self-center"></div>
                        <div class="flex-1 w-1/2 h-full overflow-hidden">${bracketData.silverHtml}</div>
                     </div>
                     
                     <div class="fixed bottom-0 left-0 w-full bg-gray-800 text-white text-center py-2 z-50 h-[6vh] flex items-center justify-center shadow-lg border-t-4 border-rose-500">
                        ${bracketData.coveiroHtml}
                     </div>
                     `;
                }
            }

            html += bottomRowHtml;
            mainContent.innerHTML = html;
            
            if (appState.isTelaoMode) {
                 document.body.style.backgroundColor = '#FFFAF0'; 
                 document.body.style.overflow = 'hidden'; // Trava rolagem
                 document.body.style.height = '100vh';
            }
        };
        /**
         * Renderiza Inscrição (Read-Only - Otimizado para 16:9 Multi-Colunas)
         */
        const renderPlayerRegistration_ReadOnly = () => {
            const playerCount = activeChampionship.players.length;
            
            // Lista de jogadores com fonte menor e padding
            const playersListHtml = playerCount === 0
                ? `<p class="text-gray-500 text-center py-4 text-2xl col-span-full">Aguardando inscrição dos jogadores...</p>`
                : activeChampionship.players.map(player => `
                    <div class="bg-white p-2 rounded-lg animate-fade-in-sm border border-gray-200 shadow-sm">
                        <span class="text-gray-800 font-medium text-lg">${player.name}</span>
                    </div>
                `).join('');

            // Container principal agora controla a altura (92vh) e o layout
            return `
                <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 animate-fade-in w-full border border-gray-200 h-[92vh] flex flex-col">
                    
                    <h3 class="text-3xl sm:text-4xl font-semibold mb-4 text-cyan-600 flex items-center gap-3 shrink-0">
                        ${icons.users}
                        Jogadores Inscritos (${playerCount})
                    </h3>
                    
                    <div class="flex-grow overflow-y-auto pr-2 no-scrollbar"> 
                        
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                            ${playersListHtml}
                        </div>
                    </div>
                    
                </div>
            `;
        };
    /**
         * Renderiza Grupos (Read-Only - Otimizado para 16:9 com Fontes Maiores e Quadra)
         */
        const renderGroupStage_ReadOnly = () => {
            const groupsHtml = activeChampionship.groups.map((group, groupIndex) => {
                const rankings = getRankings(group);
                
                const matchesHtml = group.matches.map((match) => {
                    const score1 = match.score[0];
                    const score2 = match.score[1];
                    const formatPairName = (nameStr) => {
                        if (!nameStr) return '-';
                        const parts = nameStr.split('/');
                        if (parts.length > 1) {
                            return `<span class="block truncate w-full">${parts[0].trim()}</span><span class="block truncate w-full">${parts[1].trim()}</span>`;
                        }
                        return `<span class="block truncate w-full">${nameStr}</span>`;
                    };

                    // NOVO: Badge da Quadra
                    const courtBadge = match.court ? `<span class="absolute top-0 right-0 bg-purple-600 text-white text-[8px] sm:text-[10px] font-bold px-1 rounded-bl">Q${match.court}</span>` : '';

                    return `
                    <div class="bg-amber-100 p-1.5 rounded border border-amber-200 mb-1 flex-grow flex flex-col justify-center min-h-[60px] relative">
                        ${courtBadge}
                        <div class="flex flex-col justify-between items-center h-full w-full">
                            <div class="text-xs sm:text-sm text-gray-900 text-center w-full font-bold leading-tight mb-0.5">${formatPairName(match.names[0])}</div>
                            <div class="flex justify-center items-center gap-2 my-1 shrink-0">
                                <span class="bg-white border border-gray-300 text-gray-900 rounded px-2 py-0.5 text-center text-sm sm:text-base font-black shadow-sm min-w-[24px]">${score1 === null ? '' : score1}</span>
                                <span class="text-gray-500 text-[10px]">x</span>
                                <span class="bg-white border border-gray-300 text-gray-900 rounded px-2 py-0.5 text-center text-sm sm:text-base font-black shadow-sm min-w-[24px]">${score2 === null ? '' : score2}</span>
                            </div>
                            <div class="text-xs sm:text-sm text-gray-900 text-center w-full font-bold leading-tight mt-0.5">${formatPairName(match.names[1])}</div>
                        </div>
                    </div>
                    `;
                }).join('');
                
                const rankingsHtml = rankings.map((player, rankIndex) => `
                    <tr class="border-b border-gray-200 ${rankIndex < 2 ? 'text-emerald-700 font-semibold' : 'text-orange-700'}">
                        <td class="py-1 px-1 font-bold text-xs sm:text-sm text-center">${rankIndex + 1}º</td>
                        <td class="py-1 px-1 text-xs sm:text-sm text-gray-900 truncate max-w-[80px]">${player.name}</td>
                        <td class="py-1 px-1 font-bold text-xs sm:text-sm text-center">${player.gamesWon}</td>
                    </tr>
                `).join('');

                return `
                <div class="bg-white rounded-xl shadow-lg p-2 animate-fade-in h-full w-full border border-gray-200 flex flex-col overflow-hidden">
                    <div class="text-center border-b border-gray-100 pb-1 mb-1 shrink-0">
                        <h3 class="text-base sm:text-lg font-black text-cyan-700 uppercase tracking-tighter">G${groupIndex + 1}</h3>
                    </div>
                    <div class="flex-grow flex flex-col justify-around overflow-hidden py-1">${matchesHtml}</div>
                    <div class="mt-1 pt-1 border-t border-gray-100 shrink-0">
                        <table class="w-full text-left table-fixed">
                            <thead><tr class="bg-amber-50"><th class="w-6 py-1 text-[10px] sm:text-xs font-bold text-gray-600 text-center">#</th><th class="py-1 text-[10px] sm:text-xs font-bold text-gray-600">Nome</th><th class="w-6 py-1 text-[10px] sm:text-xs font-bold text-gray-600 text-center">V</th></tr></thead>
                            <tbody>${rankingsHtml}</tbody>
                        </table>
                    </div>
                </div>
                `;
            }).join('');
            return groupsHtml; 
        };
        
/**
         * Renderiza Mata-Mata (Read-Only)
         */
        const renderKnockoutView_ReadOnly = (isFinished) => {
            // Passa 'true' para indicar modo Telão
            const goldHtml = renderBracket_ReadOnly('Série Ouro 🥇', activeChampionship.goldBracket, 'goldBracket', isFinished, true);
            const silverHtml = renderBracket_ReadOnly('Série Prata 🥈', activeChampionship.silverBracket, 'silverBracket', isFinished, true);
            
            let coveiroHtml = '<span class="text-gray-400 italic">Aguardando definição do Coveiro...</span>';
            
            if (activeChampionship.groups && activeChampionship.groups.length > 0) {
                const stats = getGlobalTournamentStats_MataMata(activeChampionship);
                if (stats.length > 0) {
                    const minGames = stats[0].gamesWon;
                    const coveiros = stats.filter(p => p.gamesWon === minGames);
                    const coveiroNames = coveiros.map(c => c.name).join(' / ');
                    
                    // --- MUDANÇA: Formato de Linha para o Rodapé ---
                    coveiroHtml = `
                        <div class="flex items-center gap-4 text-lg sm:text-xl">
                            <span class="text-rose-400 font-black uppercase tracking-wider">👻 PRÊMIO COVEIRO:</span>
                            <span class="font-bold text-white">${coveiroNames}</span>
                            <span class="text-sm text-gray-400 border-l border-gray-600 pl-3 ml-2">(${minGames} games)</span>
                        </div>
                    `;
                }
            }
            return { goldHtml, silverHtml, coveiroHtml }; 
        };
/**
         * Renderiza Chave Individual (Read-Only - Otimizado 16:9 com Nomes em 2 Linhas e Quadra)
         */
        const renderBracket_ReadOnly = (title, bracket, bracketType, isFinished, isTelao = false) => {
            const rounds = {};
            if (!bracket || bracket.length === 0) {
                 return `<div class="bg-white rounded-xl shadow-lg p-4 h-full border border-gray-200 flex items-center justify-center"><p class="text-gray-400">Aguardando...</p></div>`;
            }

            bracket.forEach(match => {
                if (!rounds[match.round]) rounds[match.round] = [];
                rounds[match.round].push(match);
            });
            
            const maxRound = Math.max(...bracket.map(m => m.round));
            const final = bracket.find(m => m.round === maxRound);
            const semiFinals = bracket.filter(m => m.round === maxRound - 1);
            const champion = final?.winner; 
            const runnerUp = final?.pairs.find(p => p && p.id !== champion?.id);
            let thirdPlace = null;
            if (champion && semiFinals.length === 2) {
                const championSemi = semiFinals.find(sf => sf.pairs.some(p => p && p.id === champion.id));
                if(championSemi) thirdPlace = championSemi.pairs.find(p => p && p.id !== champion.id);
            }

            const isGold = bracketType === 'goldBracket';
            const containerBg = isGold ? 'bg-orange-50' : 'bg-slate-50';
            const titleColor = isGold ? 'text-orange-600' : 'text-slate-600';
            const podioBg = isGold ? 'bg-gradient-to-r from-orange-400 to-yellow-500' : 'bg-gradient-to-r from-slate-400 to-slate-500';

            const championHtml = champion ? `
            <div class="${podioBg} text-white rounded-lg shadow-md p-2 mb-2 flex flex-row items-center justify-between gap-2 shrink-0">
                <div class="flex-1 text-center border-r border-white/30 pr-2"><div class="text-xs font-bold opacity-90 uppercase tracking-wider">🥇 Campeão</div><div class="text-xl sm:text-2xl font-black leading-tight truncate">${champion.name}</div></div>
                <div class="flex flex-col justify-center text-right pl-1 text-xs sm:text-sm">
                    ${runnerUp ? `<div class="opacity-90"><span class="font-bold">🥈 2º:</span> ${runnerUp.name}</div>` : ''}
                    ${thirdPlace ? `<div class="opacity-75 mt-0.5"><span class="font-bold">🥉 3º:</span> ${thirdPlace.name}</div>` : ''}
                </div>
            </div>` : '';

            if (isTelao) {
                const allRoundsHtml = Object.keys(rounds).sort((a,b) => a-b).map(roundNum => {
                    const roundTitle = getRoundTitle(roundNum, maxRound);
                    const matchesToShow = rounds[roundNum] || [];

                    const matchesHtmlList = matchesToShow.map(match => {
                        const pair1 = match.pairs[0]; 
                        const pair2 = match.pairs[1]; 
                        const score1 = match.score[0];
                        const score2 = match.score[1];
                        const isBye = pair2 === 'BYE' || pair1 === 'BYE';
                        
                        if (isBye && match.winner) return ''; 

                        const formatName = (pairObj, align) => {
                            if (!pairObj) return `<span class="text-gray-300 text-xs">...</span>`;
                            if (pairObj === 'BYE') return `<span class="text-gray-400 text-xs italic">BYE</span>`;
                            const nameStr = pairObj.name;
                            const parts = nameStr.split('/').map(s => s.trim());
                            if (parts.length > 1) return `<div class="flex flex-col ${align === 'right' ? 'items-end' : 'items-start'} leading-tight w-full"><span class="truncate w-full">${parts[0]}</span><span class="truncate w-full">${parts[1]}</span></div>`;
                            return `<span class="truncate w-full">${nameStr}</span>`;
                        };

                        const p1Html = formatName(pair1, 'right');
                        const p2Html = formatName(pair2, 'left');
                        
                        let scoreDisplay = '';
                        if (score1 !== null) {
                            scoreDisplay = `<div class="bg-gray-800 text-white px-1.5 py-0.5 rounded text-sm font-bold flex flex-col justify-center h-full">${score1}</div><div class="text-[10px] text-gray-400 px-0.5">x</div><div class="bg-gray-800 text-white px-1.5 py-0.5 rounded text-sm font-bold flex flex-col justify-center h-full">${score2}</div>`;
                        } else {
                            scoreDisplay = `<div class="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">vs</div>`;
                        }

                        // NOVO: Badge da Quadra
                        const courtBadge = match.court ? `<span class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white text-[9px] font-bold px-1.5 rounded-full z-10 shadow-sm">Q${match.court}</span>` : '';

                        return `
                        <div class="bg-white rounded border border-gray-200 p-1 shadow-sm flex flex-col items-center justify-center w-full min-h-[50px] relative">
                            ${courtBadge}
                            <div class="w-full flex justify-between items-center text-xs sm:text-sm font-medium text-gray-800 gap-1">
                                <div class="w-[40%] text-right flex justify-end ${score1 > score2 ? 'font-bold text-black' : ''}">${p1Html}</div>
                                <div class="flex items-center justify-center shrink-0 min-w-[40px] pt-1">${scoreDisplay}</div>
                                <div class="w-[40%] text-left flex justify-start ${score2 > score1 ? 'font-bold text-black' : ''}">${p2Html}</div>
                            </div>
                        </div>
                        `;
                    }).join('');

                    if (matchesHtmlList.trim() === '') return '';

                    return `<div class="flex-1 flex flex-col h-full min-w-0"><h4 class="text-[10px] sm:text-xs font-bold text-gray-500 uppercase text-center mb-1 shrink-0">${roundTitle}</h4><div class="flex-grow flex flex-col justify-around gap-1">${matchesHtmlList}</div></div>`;
                }).join('');

                return `<div class="${containerBg} rounded-xl shadow-inner p-2 h-full w-full border border-gray-200 flex flex-col overflow-hidden"><div class="flex justify-between items-center mb-1 shrink-0"><h3 class="text-lg sm:text-xl font-bold ${titleColor}">${title}</h3></div>${championHtml}<div class="flex-grow flex flex-row gap-2 w-full overflow-hidden">${allRoundsHtml}</div></div>`;
            }

            const roundsHtml = Object.keys(rounds).sort((a,b) => a-b).map(roundNum => `<div class="p-2">Visualização Admin</div>`).join('');
            return `<div class="bg-white p-4 text-center text-gray-500">Visualização disponível no Modo Telão.</div>`;
        };
        /**
         * Renderiza Leaderboard (Read-Only)
         */
        const renderLeaderboard_Sortudo_ReadOnly = (isFinished) => {
            const { leaderboard } = getLeaderboard_Sortudo();
            
            const playerRows = leaderboard.map((player, index) => {
                const rank = index + 1;
                let medal = '';
                if (rank === 1) medal = '🥇';
                if (rank === 2) medal = '🥈';
                if (rank === 3) medal = '🥉';
                
                const isCoveiro = (rank === leaderboard.length && leaderboard.length > 3);
                const saldoClass = player.saldo > 0 ? 'text-emerald-600' : (player.saldo < 0 ? 'text-rose-600' : 'text-gray-500');
                
                return `
                    <tr class="border-b border-amber-100">
                        <td class="p-3 sm:p-4 font-bold text-lg text-cyan-600">${rank}º ${medal}</td>
                        <td class="p-3 sm:p-4 font-medium text-gray-800 text-lg">${player.name} ${isCoveiro ? '👻' : ''}</td>
                        <td class="p-3 sm:p-4 font-bold text-xl text-orange-600">${player.totalGames}</td>
                        <td class="p-3 sm:p-4 font-bold text-lg ${saldoClass}">${player.saldo > 0 ? '+' : ''}${player.saldo}</td>
                        <td class="p-3 sm:p-4 text-center text-gray-500">${player.gamesLost}</td>
                    </tr>
                `;
            }).join('');
            
            // Cabeçalho da Tabela
            const tableHeader = `
                <thead class="bg-amber-100">
                    <tr class="text-left">
                        <th class="p-3 sm:p-4 rounded-tl-lg text-gray-600">Pos.</th>
                        <th class="p-3 sm:p-4 text-gray-600">Jogador</th>
                        <th class="p-3 sm:p-4 text-gray-600">Games Ganhos</th>
                        <th class="p-3 sm:p-4 text-gray-600">Saldo</th>
                        <th class="p-3 sm:p-4 text-center rounded-tr-lg text-gray-600">Games Perdidos</th>
                    </tr>
                </thead>
            `;

            return `
                <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 animate-fade-in border border-gray-200 mb-8 w-full lg:w-auto">
                    <h2 class="text-3xl font-bold mb-6 text-purple-600 flex items-center gap-3">
                        ${icons.shuffle} Classificação ao Vivo
                    </h2>
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-max">
                            ${tableHeader}
                            <tbody class="divide-y divide-amber-100">
                                ${playerRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };
        
        /**
         * Renderiza Rodadas (Read-Only)
         */
        const renderRounds_Sortudo_ReadOnly = () => {
            const playerNameMap = new Map(activeChampionship.players.map(p => [p.id, p.name]));

            const roundsHtml = activeChampionship.rounds.map((round, roundIndex) => {
                
                const matchesHtml = round.matches.map((match) => {
                    const [p1, p2, p3, p4] = match.p;
                    const [s1, s2] = match.score;
                    
                    const pair1Name = `${playerNameMap.get(p1) || '?'} / ${playerNameMap.get(p2) || '?'}`;
                    const pair2Name = `${playerNameMap.get(p3) || '?'} / ${playerNameMap.get(p4) || '?'}`;

                    return `
                    <div class="bg-amber-100 p-3 sm:p-4 rounded-lg border border-amber-200">
                        <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
                            <span class="text-base text-gray-700 text-center sm:text-left">${pair1Name}</span>
                            <span class="font-bold text-cyan-600">vs</span>
                            <span class="text-base text-gray-700 text-center sm:text-right">${pair2Name}</span>
                        </div>
                        <div class="flex justify-center items-center gap-3 mt-3">
                            <span class="w-20 bg-white border border-gray-300 text-gray-800 rounded-lg p-2 text-center text-2xl font-bold opacity-70">
                                ${s1 === null ? '-' : s1}
                            </span>
                            <span class="text-gray-500 text-xl">-</span>
                             <span class="w-20 bg-white border border-gray-300 text-gray-800 rounded-lg p-2 text-center text-2xl font-bold opacity-70">
                                ${s2 === null ? '-' : s2}
                            </span>
                        </div>
                    </div>
                    `;
                }).join('');
                
                const luckyPlayersHtml = round.luckyPlayers.map(pId => playerNameMap.get(pId) || '?').join(' / ');

                return `
                <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-fade-in w-full sm:max-w-sm border border-gray-200">
                    <h3 class="text-3xl font-bold text-cyan-600 mb-4">Rodada ${roundIndex + 1}</h3>
                    ${luckyPlayersHtml ? `
                        <div class="mb-4 bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm">
                            <span class="font-semibold text-emerald-700">Sortudos (BYE):</span> ${luckyPlayersHtml}
                            <span class="text-emerald-700">(+${activeChampionship.config.luckyGames} games)</span>
                        </div>
                    ` : ''}
                    <div class="space-y-4">${matchesHtml}</div>
                </div>
                `;
            }).join('');
            
            return roundsHtml;
        };

        // =================================================================
        // === AÇÕES E LÓGICA (Comum)
        // =================================================================
        
        /**
         * Abre o Telão em uma nova aba
         */
        const handleLaunchTelao = () => {
            const champId = appState.currentChampionshipId;
            if (!champId) {
                showModal("Erro", "ID do campeonato não encontrado.");
                return;
            }
            const url = `${window.location.origin}${window.location.pathname}?telao=true&champId=${champId}`;
            window.open(url, '_blank');
        };

        // =================================================================
        // === AÇÕES E LÓGICA (Mata-Mata)
        // =================================================================
        
  /**
         * Gera os Grupos (Mata-Mata)
         * --- VERSÃO CORRETA (DUPLAS) ---
         */
        const handleGenerateChampionship_MataMata = async () => {
            const playerCount = activeChampionship.players.length;
            const isMultypleOfFour = playerCount % 4 === 0;

            if (playerCount < 4 || !isMultypleOfFour) {
                showModal("Número de Jogadores Inválido", `O campeonato requer um número de jogadores múltiplo de 4 para grupos de 4 (ex: 4, 8, 12...). Você tem ${playerCount}.`);
                return;
            }
            
            const numGroups = playerCount / 4;
            
            if (!confirm(`Iniciar grupos com ${playerCount} jogadores? Os ${numGroups} melhores do ranking serão os "Cabeças de Chave" e o restante será sorteado.`)) {
                return;
            }

            try {
                // Mapeia pontos do ranking global
                const globalPlayersMap = new Map(globalPlayers.map(p => [p.id, p.points || 0]));

                // Adiciona pontos aos jogadores do torneio
                const tournamentPlayersWithPoints = activeChampionship.players.map(p => ({
                    ...p, 
                    points: globalPlayersMap.get(p.id) || 0 
                }));

                // Ordena e separa cabeças de chave
                const sortedTournamentPlayers = tournamentPlayersWithPoints.sort((a, b) => b.points - a.points);
                const seededPlayers = sortedTournamentPlayers.slice(0, numGroups);
                const unseededPlayers = sortedTournamentPlayers.slice(numGroups);

                // Embaralha os não-cabeças
                const shuffledUnseeded = unseededPlayers.sort(() => 0.5 - Math.random());

                // Cria os grupos
                const newGroupsList = []; 
                for (let i = 0; i < numGroups; i++) {
                    newGroupsList.push({
                        id: `group_${i + 1}`,
                        players: [], 
                        matches: [] 
                    });
                }

                // Distribui cabeças de chave (1 por grupo)
                for (let i = 0; i < seededPlayers.length; i++) {
                    newGroupsList[i].players.push(seededPlayers[i]);
                }

                // Distribui os demais (estilo "cobra")
                let unseededCursor = 0;
                const playersPerGroup = 4;
                for (let p_slot = 1; p_slot < playersPerGroup; p_slot++) { 
                    for (let g_index = 0; g_index < numGroups; g_index++) { 
                        if (unseededCursor < shuffledUnseeded.length) {
                            newGroupsList[g_index].players.push(shuffledUnseeded[unseededCursor]);
                            unseededCursor++;
                        }
                    }
                }

                // Cria os jogos de cada grupo (MODO DUPLAS)
                for (const group of newGroupsList) {
                    const [p1, p2, p3, p4] = group.players; 
                    
                    if (!p1 || !p2 || !p3 || !p4) {
                         console.error("Erro na distribuição de grupos. Grupo incompleto:", group.players);
                         throw new Error("Erro de lógica ao distribuir jogadores. Grupo ficou incompleto.");
                    }

                    // Jogos (p1/p2 vs p3/p4), (p1/p3 vs p2/p4), (p1/p4 vs p2/p3)
                    group.matches = [
                        { id: 1, p: [p1.id, p2.id, p3.id, p4.id], names: [`${p1.name} / ${p2.name}`, `${p3.name} / ${p4.name}`], score: [null, null] },
                        { id: 2, p: [p1.id, p3.id, p2.id, p4.id], names: [`${p1.name} / ${p3.name}`, `${p2.name} / ${p4.name}`], score: [null, null] },
                        { id: 3, p: [p1.id, p4.id, p2.id, p3.id], names: [`${p1.name} / ${p4.name}`, `${p2.name} / ${p3.name}`], score: [null, null] },
                    ];
                }
                
                const newChampData = {
                    ...activeChampionship,
                    status: 'groups',
                    groups: newGroupsList 
                };
                await saveActiveChampionship(newChampData);
                
                // Atualiza o status no documento principal (para o listener da lista)
                const champRef = doc(db, 'users', appState.userId, 'championships', appState.currentChampionshipId);
                await setDoc(champRef, { status: 'groups' }, { merge: true });

            } catch (error) {
                console.error("Erro ao gerar campeonato (cabeça de chave):", error);
                showModal("Erro", "Não foi possível gerar os grupos. " + error.message);
            }
        };
        /**
         * Confirma o placar de um jogo de grupo (Mata-Mata)
         */
        const handleConfirmGroupScore = (groupIndex, matchIndex) => {
            const val0 = document.getElementById(`g-${groupIndex}-m-${matchIndex}-s0`).value;
            const val1 = document.getElementById(`g-${groupIndex}-m-${matchIndex}-s1`).value;
            const score0 = val0 === '' ? null : parseInt(val0, 10);
            const score1 = val1 === '' ? null : parseInt(val1, 10);
            
            if (score0 === null || score1 === null || isNaN(score0) || isNaN(score1) || score0 < 0 || score1 < 0) {
                showModal("Placar Inválido", "Ambos os placares devem ser preenchidos com números positivos (ou 0).");
                return;
            }
            
            const newChampData = JSON.parse(JSON.stringify(activeChampionship));
            newChampData.groups[groupIndex].matches[matchIndex].score[0] = score0;
            newChampData.groups[groupIndex].matches[matchIndex].score[1] = score1;
            saveActiveChampionship(newChampData); 
        };

/**
         * Gera um PDF para impressão da Súmula do Grupo
         */
        const handlePrintGroup = (groupIndex) => {
            // *** CORREÇÃO: Converte o texto para número inteiro ***
            const index = parseInt(groupIndex);
            
            const group = activeChampionship.groups[index];
            const champ = championships.find(c => c.id === appState.currentChampionshipId);
            const champName = champ ? champ.name : "Torneio";
            
            let matchesHtml = '';
            group.matches.forEach((match) => {
                matchesHtml += `
                    <div class="match">
                        <div class="team">${match.names[0]}</div>
                        <div class="score-box"></div>
                        <div class="vs">vs</div>
                        <div class="score-box"></div>
                        <div class="team">${match.names[1]}</div>
                    </div>
                `;
            });
            
            const playersHtml = group.players.map(p => `<li>${p.name}</li>`).join('');
            
            const printStyles = `
                <style>
                    @page { margin: 20mm; }
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0; 
                        color: #000; 
                        width: 100%;
                    }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 5px; }
                    h2 { text-align: center; font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 0; }
                    .players { margin-bottom: 20px; }
                    .players h3 { font-size: 18px; margin-bottom: 5px; }
                    .players ul { list-style: none; padding-left: 0; margin: 0; }
                    .players li { font-size: 16px; }
                    .match { 
                        display: flex; 
                        align-items: center; 
                        justify-content: space-between; 
                        padding: 20px 0; 
                        border-bottom: 1px dashed #999; 
                        page-break-inside: avoid;
                    }
                    .team { flex: 1; font-size: 18px; font-weight: bold; }
                    .team:last-of-type { text-align: right; }
                    .vs { font-size: 14px; font-weight: bold; margin: 0 10px; }
                    .score-box {
                        width: 60px;
                        height: 40px;
                        border: 2px solid #000;
                        margin: 0 10px;
                    }
                </style>
            `;

            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir - ${champName} - Grupo ${index + 1}</title>
                        ${printStyles}
                    </head>
                    <body>
                        <h1>${champName}</h1>
                        <h2>Grupo ${index + 1}</h2>
                        <div class="players">
                            <h3>Jogadores do Grupo:</h3>
                            <ul>${playersHtml}</ul>
                        </div>
                        <h2>Jogos</h2>
                        <div class="matches">
                            ${matchesHtml}
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
      /**
         * Finaliza os grupos e gera as chaves Ouro/Prata (com Byes)
         * --- VERSÃO CORRETA (DUPLAS) ---
         */
        const handleFinalizeGroups = async () => {
            if (!confirm("Finalizar Fase de Grupos? Isso irá gerar as chaves Ouro e Prata e bloquear os grupos.")) return;

            let goldSeriesPairs = [];
            let silverSeriesPairs = [];
            let allPairs = [];

            // 1. Coleta e classifica todas as duplas por games vencidos
            activeChampionship.groups.forEach(group => {
                const rankings = getRankings(group); 

                const goldPair = {
                    id: `${rankings[0].id}_${rankings[1].id}`,
                    name: `${rankings[0].name} / ${rankings[1].name}`,
                    players: [rankings[0], rankings[1]],
                    gamesWon: rankings[0].gamesWon + rankings[1].gamesWon,
                    type: 'gold' 
                };
                goldSeriesPairs.push(goldPair);
                allPairs.push(goldPair);

                const silverPair = {
                    id: `${rankings[2].id}_${rankings[3].id}`,
                    name: `${rankings[2].name} / ${rankings[3].name}`,
                    players: [rankings[2], rankings[3]],
                    gamesWon: rankings[2].gamesWon + rankings[3].gamesWon,
                    type: 'silver'
                };
                silverSeriesPairs.push(silverPair);
                allPairs.push(silverPair);
            });

            /**
         * (NOVO HELPER) Retorna o mapa de "seeding" para um tamanho de chave.
         * Garante que Seed 1 e Seed 2 fiquem em pontas opostas.
         */
        const getSeedingMap = (size) => {
            if (size === 2) return [0, 1];
            // Seed 1 vs Seed 4, Seed 2 vs Seed 3
            if (size === 4) return [0, 3, 2, 1]; 
            // Seed 1 vs 8, Seed 4 vs 5, Seed 3 vs 6, Seed 2 vs 7
            if (size === 8) return [0, 7, 5, 3, 4, 2, 6, 1];
            // Padrão 16
            if (size === 16) return [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1];
            
            // Fallback (lógica simples se não for 2, 4, 8 ou 16)
            const map = [];
            for(let i=0; i < size; i++) map.push(i);
            return map; 
        };

            // 2. Classificação global das duplas (para aplicar Byes)
            // Ordem: Dupla Gold 1, Dupla Gold 2, ..., Dupla Silver 1, Dupla Silver 2, ...
            const rankedGoldPairs = goldSeriesPairs.sort((a, b) => b.gamesWon - a.gamesWon);
            const rankedSilverPairs = silverSeriesPairs.sort((a, b) => b.gamesWon - a.gamesWon);

            try {
                // 3. Gerar chaves com a lógica de Byes
                // Adiciona prefixos 'gold_' e 'silver_' para evitar IDs duplicados
                const goldBracket = createBracketWithByes(rankedGoldPairs, 'gold_');
                const silverBracket = createBracketWithByes(rankedSilverPairs, 'silver_');

                const newChampData = {
                    ...activeChampionship,
                    status: 'knockout',
                    goldBracket: goldBracket,
                    silverBracket: silverBracket,
                };

                await saveActiveChampionship(newChampData);

                // Atualiza o status no documento principal
                const champRef = doc(db, 'users', appState.userId, 'championships', appState.currentChampionshipId);
                await setDoc(champRef, { status: 'knockout' }, { merge: true });

            } catch (error) {
                console.error("Erro ao finalizar grupos:", error);
                showModal("Erro", "Ocorreu um erro ao gerar as chaves. " + error.message);
            }
        };
        /**
         * (Auxiliar) Retorna a próxima potência de 2
         */
        const getNextPowerOfTwo = (n) => {
            if (n <= 1) return 2;
            let power = 2;
            while (power < n) {
                power *= 2;
            }
            return power;
        };

        /**
         * (NOVO HELPER) Retorna o mapa de "seeding" para um tamanho de chave.
         * Garante que Seed 1 e Seed 2 fiquem em pontas opostas.
         */
        const getSeedingMap = (size) => {
            if (size === 2) return [0, 1];
            // Seed 1 vs Seed 4, Seed 2 vs Seed 3
            if (size === 4) return [0, 3, 2, 1]; 
            // Seed 1 vs 8, Seed 4 vs 5, Seed 3 vs 6, Seed 2 vs 7
            if (size === 8) return [0, 7, 5, 3, 4, 2, 6, 1];
            // Padrão 16
            if (size === 16) return [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1];
            
            // Fallback (lógica simples se não for 2, 4, 8 ou 16)
            const map = [];
            for(let i=0; i < size; i++) map.push(i);
            return map; 
        };

        /**
         * (Auxiliar) Cria a chave (bracket) com lógica de Seeding (BYEs opostos)
         * --- VERSÃO ATUALIZADA ---
         */
        const createBracketWithByes = (rankedPairs, idPrefix) => {
            const numPairs = rankedPairs.length;
            
            if (numPairs === 0) return [];
            
            const targetSize = getNextPowerOfTwo(numPairs);
            const numByes = targetSize - numPairs;
            const numRounds = Math.log2(targetSize);
            
            // 1. Criar os slots da Rodada 1
            const round1Slots = new Array(targetSize).fill(null);
            
            // 2. Pegar o mapa de seeding
            // O mapa nos diz onde colocar cada dupla (Seed 1, Seed 2, etc.)
            const seedingMap = getSeedingMap(targetSize);

            // 3. Colocar as duplas ranqueadas nos slots corretos
            // Ex: targetSize = 8, numPairs = 6.
            // Os 6 'rankedPairs' serão colocados nos slots ditados pelo mapa.
            // Os 2 slots restantes (para Seed 7 e 8) ficarão 'null'.
            for (let i = 0; i < numPairs; i++) {
                const pair = rankedPairs[i]; // Pega a dupla (ex: Seed 1, Seed 2...)
                const slotIndex = seedingMap[i]; // Pega a posição dela na chave (ex: 0, 7...)
                round1Slots[slotIndex] = pair;
            }
            // round1Slots agora pode se parecer com: [Pair1, Pair8, Pair6, Pair4, Pair3, Pair5, Pair7, Pair2]
            // Ou, se tiver 6 duplas: [Pair1, null, Pair5, Pair3, Pair4, Pair6, null, Pair2]
            // Os 'null' são os BYEs!

            // 4. Criar a estrutura do bracket (todas as rodadas)
            const bracket = [];
            let pairCursor = 0; // Cursor para ler os round1Slots

            // Cria a Rodada 1
            for (let m = 0; m < targetSize / 2; m++) {
                const matchId = `${idPrefix}R1_M${m + 1}`;
                const nextRoundMatchIndex = Math.floor(m / 2);
                const nextMatchId = `${idPrefix}R2_M${nextRoundMatchIndex + 1}`;
                
                const pair1 = round1Slots[pairCursor++];
                const pair2 = round1Slots[pairCursor++];

                const match = {
                    id: matchId,
                    round: 1, 
                    pairs: [pair1, pair2], 
                    score: [null, null],
                    winner: null,
                    nextMatchId: nextMatchId,
                    nextMatchSlot: m % 2,
                };
                
                // 5. Lógica de BYE: Se um slot for 'null', o outro vence
                if (pair1 === null && pair2 !== null) {
                    match.winner = pair2;
                    match.score = [0, 1]; // Placar simbólico
                    match.pairs[0] = 'BYE'; // Marca como BYE
                } else if (pair2 === null && pair1 !== null) {
                    match.winner = pair1;
                    match.score = [1, 0]; // Placar simbólico
                    match.pairs[1] = 'BYE'; // Marca como BYE
                }
                
                bracket.push(match);
            }
            
            // 6. Preenche as demais Rodadas (R2 em diante)
            for (let r = 2; r <= numRounds; r++) { 
                const matchesInRound = targetSize / Math.pow(2, r);
                for (let m = 0; m < matchesInRound; m++) { 
                    const matchId = `${idPrefix}R${r}_M${m+1}`;
                    let nextMatchId = null;
                    let nextMatchSlot = null; 

                    if (r < numRounds) { 
                        const nextRoundMatchIndex = Math.floor(m / 2); 
                        nextMatchId = `${idPrefix}R${r+1}_M${nextRoundMatchIndex+1}`;
                        nextMatchSlot = m % 2; 
                    }

                    bracket.push({
                        id: matchId,
                        round: r, 
                        pairs: [null, null], 
                        score: [null, null],
                        winner: null,
                        nextMatchId: nextMatchId,
                        nextMatchSlot: nextMatchSlot,
                    });
                }
            }
            
            // 7. Conecta os vencedores dos Byes (R1) à R2
            bracket.filter(m => m.round === 1 && m.winner !== null).forEach(match => {
                const nextMatch = bracket.find(m => m.id === match.nextMatchId);
                if (nextMatch) nextMatch.pairs[match.nextMatchSlot] = match.winner;
            });
            
            return bracket;
        };
        /**
         * Confirma o placar de um jogo do Mata-Mata (com lógica de reversão)
         */
        const handleConfirmKnockoutScore = async (bracketType, matchId) => {
            const val0 = document.getElementById(`k-${matchId}-s0`).value;
            const val1 = document.getElementById(`k-${matchId}-s1`).value;
            const score0 = val0 === '' ? null : parseInt(val0, 10);
            const score1 = val1 === '' ? null : parseInt(val1, 10);
            
            if (score0 === null || score1 === null || isNaN(score0) || isNaN(score1) || score0 < 0 || score1 < 0) {
                showModal("Placar Inválido", "Ambos os placares devem ser preenchidos com números positivos (ou 0).");
                return;
            }
            if (score0 === score1) {
                showModal("Placar Inválido", "O placar do mata-mata não pode ser um empate.");
                return;
            }
            
            const newChampData = JSON.parse(JSON.stringify(activeChampionship));
            const bracketToUpdate = newChampData[bracketType];
            
            // Encontra a partida atual
            const currentMatch = bracketToUpdate.find(m => m.id === matchId);
            if (!currentMatch) return;
            
            const oldWinner = currentMatch.winner;
            const newWinner = (score0 > score1) ? currentMatch.pairs[0] : currentMatch.pairs[1];

            // Se o placar mudou, mas o vencedor é o mesmo, apenas salva e sai
            if (oldWinner && oldWinner.id === newWinner.id) {
                currentMatch.score[0] = score0;
                currentMatch.score[1] = score1;
                await saveActiveChampionship(newChampData);
                return;
            }

            // O VENCEDOR MUDOU! (ou é o primeiro lançamento)
            // 1. Limpa o caminho do vencedor antigo
            if (oldWinner) {
                let matchToClear = currentMatch;
                while (matchToClear && matchToClear.nextMatchId) {
                    const nextMatch = bracketToUpdate.find(m => m.id === matchToClear.nextMatchId);
                    if (!nextMatch) break;
                    
                    // Se o vencedor antigo estava no próximo jogo, remove-o
                    if (nextMatch.pairs[matchToClear.nextMatchSlot]?.id === oldWinner.id) {
                        nextMatch.pairs[matchToClear.nextMatchSlot] = null;
                        nextMatch.winner = null; 
                        nextMatch.score = [null, null];
                        matchToClear = nextMatch; // Continua limpando a chave
                    } else {
                        break; // O caminho já estava limpo ou foi alterado
                    }
                }
            }

            // 2. Define o novo placar e o novo vencedor
            currentMatch.score[0] = score0;
            currentMatch.score[1] = score1;
            currentMatch.winner = newWinner;

            // 3. Avança o novo vencedor
            if (currentMatch.winner && currentMatch.nextMatchId) {
                let matchToAdvance = currentMatch;
                while (matchToAdvance && matchToAdvance.nextMatchId) {
                    const nextMatch = bracketToUpdate.find(m => m.id === matchToAdvance.nextMatchId);
                    if (!nextMatch) break;
                    
                    // Coloca o novo vencedor no slot
                    nextMatch.pairs[matchToAdvance.nextMatchSlot] = matchToAdvance.winner;
                    
                    // Se o outro par for 'BYE', avança automaticamente
                    const otherSlot = (matchToAdvance.nextMatchSlot === 0) ? 1 : 0;
                    if (nextMatch.pairs[otherSlot] === 'BYE') {
                        nextMatch.winner = matchToAdvance.winner;
                        nextMatch.score = [1, 0];
                        matchToAdvance = nextMatch; // Continua avançando
                    } else {
                        break; // Para, pois precisa do outro jogador
                    }
                }
            }
            
            // Salva o estado modificado
            await saveActiveChampionship(newChampData); 
            
            // (Não finaliza automaticamente, espera o botão manual)
        };
    /**
         * Finaliza o torneio (Mata-Mata) e lança no Ranking
         * --- CORREÇÃO: Lógica de finalização HÍBRIDA ---
         */
        const handleManualFinalize_MataMata = async () => {
            if (!confirm("Confirmar Finalização?\nEsta ação irá calcular os pontos, lançar no ranking e marcar o campeonato como 'Finalizado'. Esta ação não pode ser desfeita.")) {
                return;
            }
            
            const champRef = doc(db, 'users', appState.userId, 'championships', appState.currentChampionshipId);
            const champDoc = await getDoc(champRef);
            if (!champDoc.exists()) {
                 showModal("Erro Crítico", "Documento principal do campeonato não encontrado.");
                 return;
            }
            
            const champInfo = champDoc.data();
            const rankingId = champInfo.rankingId;
            const pointsConfig = champInfo.pointsConfig; // Pega a config salva
            
            if (!rankingId) {
                showModal("Erro Crítico", "Este campeonato não está vinculado a nenhum ranking. Os pontos não podem ser salvos.");
                return;
            }
            
            showModal("Calculando...", "Finalizando torneio e atualizando o ranking global. Aguarde...");

            try {
                // 1. Identificar Posições Finais (Ouro e Prata)
                const placements = new Map(); // Key: playerId, Value: 'gold_1st'
                
                const processBracket = (bracket, prefix) => {
                    if (!bracket || bracket.length === 0) return; 
                    const maxRound = Math.max(...bracket.map(m => m.round));
                    
                    bracket.forEach(match => {
                        // Se for a FINAL
                        if (match.round === maxRound) {
                            const winnerKey = `${prefix}_1st`; // e.g., gold_1st
                            const runnerUpKey = `${prefix}_2nd`; // e.g., gold_2nd
                            
                            if (match.winner) {
                                match.winner.players.forEach(p => placements.set(p.id, winnerKey));
                                const runnerUp = match.pairs.find(p => p.id !== match.winner.id);
                                if (runnerUp && runnerUp !== 'BYE') {
                                    runnerUp.players.forEach(p => placements.set(p.id, runnerUpKey));
                                }
                            }
                        }
                        // Se for a SEMI-FINAL
                        else if (match.round === maxRound - 1) {
                            const loserKey = `${prefix}_3rd`; // e.g., gold_3rd
                            
                            if (match.winner && match.pairs[0] && match.pairs[1] && match.pairs[0] !== 'BYE' && match.pairs[1] !== 'BYE') {
                                const loser = (match.winner.id === match.pairs[0].id) ? match.pairs[1] : match.pairs[0];
                                loser.players.forEach(p => placements.set(p.id, loserKey));
                            }
                        }
                    });
                };
                
                processBracket(activeChampionship.goldBracket, 'gold');
                processBracket(activeChampionship.silverBracket, 'silver');
                
                // 2. Calcular Pontos de Grupo
                const groupPoints = getPlayerGroupPoints_MataMata(activeChampionship, pointsConfig.groupWin || 0);
                
                // 3. Atualizar o Ranking (Transação)
                await updateGlobalRanking_MataMata(
                    activeChampionship.players,
                    placements,
                    groupPoints,
                    pointsConfig,
                    rankingId
                );

                // 4. Marcar o campeonato como finalizado
                const { goldWinner, silverWinner } = getKnockoutWinners(activeChampionship);
                await setDoc(champRef, {
                    status: 'finished',
                    winnerGold: goldWinner?.name || '?',
                    winnerSilver: silverWinner?.name || '?'
                }, { merge: true });

                hideModal();
                showModal("Sucesso!", `Ranking global atualizado! Campeões Ouro: ${goldWinner.name}.`);

            } catch (error) {
                console.error("Erro ao finalizar (manual) torneio:", error);
                showModal("Erro Crítico", "Não foi possível aplicar o ranking. Verifique o console para detalhes: " + error.message);
            }
        };
        /**
         * (Auxiliar) Calcula os pontos ganhos na fase de grupos
         */

        const getPlayerGroupPoints_MataMata = (champData, pointsPerWin) => {
            const playerPoints = new Map();
            if (pointsPerWin === 0) return playerPoints; // Economiza processamento

            champData.players.forEach(p => playerPoints.set(p.id, 0));

            champData.groups.forEach(group => {
                group.matches.forEach(match => {
                    const [p1, p2, p3, p4] = match.p;
                    const [s1, s2] = match.score;
                    
                    if (s1 === null || s2 === null) return; // Ignora jogos incompletos

                    if (s1 > s2) {
                        // Par 1 (p1/p2) venceu
                        if (playerPoints.has(p1)) playerPoints.set(p1, (playerPoints.get(p1) || 0) + pointsPerWin);
                        if (playerPoints.has(p2)) playerPoints.set(p2, (playerPoints.get(p2) || 0) + pointsPerWin);
                    } else if (s2 > s1) {
                        // Par 2 (p3/p4) venceu
                        if (playerPoints.has(p3)) playerPoints.set(p3, (playerPoints.get(p3) || 0) + pointsPerWin);
                        if (playerPoints.has(p4)) playerPoints.set(p4, (playerPoints.get(p4) || 0) + pointsPerWin);
                    }
                });
            });
            return playerPoints;
        };
        
    /**
         * (Auxiliar) Calcula o ranking de um grupo
         * --- VERSÃO CORRETA (DUPLAS) ---
         */
        const getRankings = (group) => {
            const playerStats = {};
            group.players.forEach(p => {
                playerStats[p.id] = { id: p.id, name: p.name, gamesWon: 0 };
            });
            
            group.matches.forEach(match => {
                const [p1, p2, p3, p4] = match.p;
                const [s1, s2] = match.score;
                
                if (s1 !== null && !isNaN(s1)) {
                    if (playerStats[p1]) playerStats[p1].gamesWon += s1;
                    if (playerStats[p2]) playerStats[p2].gamesWon += s1;
                }
                if (s2 !== null && !isNaN(s2)) {
                    if (playerStats[p3]) playerStats[p3].gamesWon += s2;
                    if (playerStats[p4]) playerStats[p4].gamesWon += s2;
                }
            });
            
            // Ordena por Games Vencidos
            return Object.values(playerStats).sort((a, b) => b.gamesWon - a.gamesWon);
        };
        
        /**
         * (Auxiliar) Calcula os stats globais (para Coveiro Mata-Mata)
         */
        const getGlobalTournamentStats_MataMata = (champData) => {
            const playerStats = {};
            champData.players.forEach(p => {
                playerStats[p.id] = { id: p.id, name: p.name, gamesWon: 0 };
            });

            // 1. Soma games dos Grupos
            if (champData.groups) {
                champData.groups.forEach(group => {
                    group.matches.forEach(match => {
                        const [p1, p2, p3, p4] = match.p;
                        const [s1, s2] = match.score;
                        if (s1 !== null && !isNaN(s1)) {
                            if (playerStats[p1]) playerStats[p1].gamesWon += s1;
                            if (playerStats[p2]) playerStats[p2].gamesWon += s1;
                        }
                        if (s2 !== null && !isNaN(s2)) {
                            if (playerStats[p3]) playerStats[p3].gamesWon += s2;
                            if (playerStats[p4]) playerStats[p4].gamesWon += s2;
                        }
                    });
                });
            }
            
            // 2. Soma games do Mata-Mata
            const allKnockoutMatches = (champData.goldBracket || []).concat(champData.silverBracket || []);
            allKnockoutMatches.forEach(match => {
                const [pair1, pair2] = match.pairs;
                const [s0, s1] = match.score;
                
                if (s0 !== null && !isNaN(s0) && pair1 && pair1.players) {
                    pair1.players.forEach(player => {
                        if (playerStats[player.id]) {
                            playerStats[player.id].gamesWon += s0;
                        }
                    });
                }
                if (s1 !== null && !isNaN(s1) && pair2 && pair2.players) {
                    pair2.players.forEach(player => {
                        if (playerStats[player.id]) {
                            playerStats[player.id].gamesWon += s1;
                        }
                    });
                }
            });
            
            // Ordena por menos games vencidos
            return Object.values(playerStats).sort((a, b) => a.gamesWon - b.gamesWon);
        };
        
       /**
         * (Transação) Atualiza o Ranking Global (Mata-Mata)
         * --- CORREÇÃO: Lógica de cálculo HÍBRIDA Robustecida ---
         */
        const updateGlobalRanking_MataMata = async (players, placements, groupPoints, pointsConfig, rankingId) => {
            console.log("Iniciando atualização de ranking...");
            console.log("Config de Pontos:", pointsConfig);

            // 1. Determina o Coveiro
            const stats = getGlobalTournamentStats_MataMata(activeChampionship);
            const coveiroIds = new Set();
            if (stats.length > 0) {
                const minGames = stats[0].gamesWon;
                stats.filter(p => p.gamesWon === minGames).forEach(p => coveiroIds.add(p.id));
            }

            // 2. Prepara o mapa de pontos
            const playerPointsMap = new Map();
            
            for (const player of players) {
                // Pontos base de participação
                const participationPoints = Number(pointsConfig.participation) || 0;
                
                // Pontos de Grupo (já calculados anteriormente)
                const grpPoints = groupPoints.get(player.id) || 0;
                
                // Bônus de Colocação (Mata-Mata)
                // placementKey será algo como 'gold_1st', 'silver_2nd', etc.
                const placementKey = placements.get(player.id); 
                
                let bonusPoints = 0;
                if (placementKey) {
                    // Tenta pegar do config. Se não achar, tenta fallback ou assume 0.
                    // O código original esperava keys exatas. Vamos garantir que elas batam com o formulário.
                    // As keys do formulário são: gold_1st, gold_2nd, gold_3rd, silver_1st, etc.
                    bonusPoints = Number(pointsConfig[placementKey]) || 0;
                }

                // Soma Total
                const totalPoints = participationPoints + grpPoints + bonusPoints;
                
                console.log(`Jogador: ${player.name} | Part: ${participationPoints} | Grupo: ${grpPoints} | Bonus (${placementKey}): ${bonusPoints} | TOTAL: ${totalPoints}`);
                
                playerPointsMap.set(player.id, {
                    name: player.name,
                    pointsToAdd: totalPoints,
                    goldWins: (placementKey === 'gold_1st') ? 1 : 0,
                    silverWins: (placementKey === 'silver_1st') ? 1 : 0, 
                    coveiroWins: coveiroIds.has(player.id) ? 1 : 0
                });
            }
            
            // 3. Executa a Transação
            try {
                await runTransaction(db, async (transaction) => {
                    // Lê todos os documentos
                    const playerDocsData = new Map();
                    for (const playerId of playerPointsMap.keys()) {
                        const playerRef = doc(db, 'users', appState.userId, 'rankings', rankingId, 'players', playerId);
                        const playerDoc = await transaction.get(playerRef); 
                        playerDocsData.set(playerId, playerDoc); 
                    }
                    
                    // Escreve as atualizações
                    for (const [playerId, data] of playerPointsMap.entries()) {
                        const playerDoc = playerDocsData.get(playerId); 
                        const playerRef = doc(db, 'users', appState.userId, 'rankings', rankingId, 'players', playerId); 
                        
                        if (!playerDoc.exists()) {
                            // Cria se não existe
                            transaction.set(playerRef, {
                                name: data.name,
                                points: data.pointsToAdd,
                                goldWins: data.goldWins,
                                silverWins: data.silverWins,
                                coveiroWins: data.coveiroWins
                            });
                        } else {
                            // Atualiza (SOMA aos pontos anteriores)
                            const oldData = playerDoc.data();
                            const currentPoints = Number(oldData.points) || 0;
                            const currentGold = Number(oldData.goldWins) || 0;
                            const currentSilver = Number(oldData.silverWins) || 0;
                            const currentCoveiro = Number(oldData.coveiroWins) || 0;

                            transaction.update(playerRef, {
                                name: data.name, 
                                points: currentPoints + data.pointsToAdd,
                                goldWins: currentGold + data.goldWins,
                                silverWins: currentSilver + data.silverWins,
                                coveiroWins: currentCoveiro + data.coveiroWins 
                            });
                        }
                    }
                });
                console.log("Transação de pontos concluída com sucesso!");
            } catch (e) {
                console.error("Erro na transação do ranking:", e);
                throw e; // Repassa o erro para o modal exibir
            }
        };
        // =================================================================
        // === AÇÕES E LÓGICA (Sortudo)
        // =================================================================

        /**
         * (Auxiliar) Embaralha um array
         */
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };
        
        /**
    /**
         * (Auxiliar) Gera uma chave única para um par (ordem não importa)
         */
        const getPairKey = (p1, p2) => {
            return [p1, p2].sort().join('_');
        };
        
        /**
         * (Auxiliar) Atualiza os históricos de pares e oponentes
         */
        const updateHistories = (champData, round) => {
            
            // *** CORREÇÃO DO BUG (Array.add is not a function) ***
            // Garante que o histórico interno está usando Sets, 
            // mesmo se recebeu Arrays da iteração anterior.
            for (const key in champData.pairHistory) {
                if (Array.isArray(champData.pairHistory[key])) {
                    champData.pairHistory[key] = new Set(champData.pairHistory[key]);
                }
            }
            for (const key in champData.opponentHistory) {
                if (Array.isArray(champData.opponentHistory[key])) {
                    champData.opponentHistory[key] = new Set(champData.opponentHistory[key]);
                }
            }
            // *** FIM DA CORREÇÃO ***

             // 1. Atualiza Pares (pairHistory)
            round.matches.forEach(match => {
                const [p1, p2, p3, p4] = match.p;
                const pair1Key = getPairKey(p1, p2);
                const pair2Key = getPairKey(p3, p4);

                // Adiciona p2 ao histórico de p1
                if (!champData.pairHistory[p1]) champData.pairHistory[p1] = new Set();
                champData.pairHistory[p1].add(p2);
                
                // Adiciona p1 ao histórico de p2
                if (!champData.pairHistory[p2]) champData.pairHistory[p2] = new Set();
                champData.pairHistory[p2].add(p1);
                
                // Adiciona p4 ao histórico de p3
                if (!champData.pairHistory[p3]) champData.pairHistory[p3] = new Set();
                champData.pairHistory[p3].add(p4);
                
                // Adiciona p3 ao histórico de p4
                if (!champData.pairHistory[p4]) champData.pairHistory[p4] = new Set();
                champData.pairHistory[p4].add(p3);
                
                // 2. Atualiza Oponentes (opponentHistory)
                const pair1 = [p1, p2];
                const pair2 = [p3, p4];
                
                for(const pA of pair1) {
                    if (!champData.opponentHistory[pA]) champData.opponentHistory[pA] = new Set();
                    pair2.forEach(pB => champData.opponentHistory[pA].add(pB));
                }
                for(const pB of pair2) {
                    if (!champData.opponentHistory[pB]) champData.opponentHistory[pB] = new Set();
                    pair1.forEach(pA => champData.opponentHistory[pB].add(pA));
                }
            });
            // Converte Sets para Arrays para serialização no Firestore
            const serializablePairHistory = {};
            for (const key in champData.pairHistory) {
                serializablePairHistory[key] = Array.from(champData.pairHistory[key]);
            }
            const serializableOpponentHistory = {};
            for (const key in champData.opponentHistory) {
                serializableOpponentHistory[key] = Array.from(champData.opponentHistory[key]);
            }
            
            return {
                pairHistory: serializablePairHistory,
                opponentHistory: serializableOpponentHistory
            };
        };

        /**
         * (Auxiliar) Gera UMA rodada otimizada
         */
        const generateOptimizedRound = (playerIds, numLucky, pairHistory, opponentHistory) => {
            const MAX_TRIES = 50; // Tenta 50 vezes achar uma rodada perfeita
            let bestRound = null;
            let minScore = Infinity;

            for (let i = 0; i < MAX_TRIES; i++) {
                let playersToShuffle = [...playerIds];
                shuffleArray(playersToShuffle);
                
                const luckyPlayers = [];
                for(let j=0; j < numLucky; j++) {
                    luckyPlayers.push(playersToShuffle.pop());
                }
                
                // Agora, 'playersToShuffle' só tem quem vai jogar
                const matches = [];
                let currentScore = 0;
                let possible = true;
                
                // Copia o histórico para esta tentativa (converte Array de volta para Set)
                const tempPairHistory = {};
                for (const key in pairHistory) {
                    tempPairHistory[key] = new Set(pairHistory[key]);
                }
                const tempOpponentHistory = {};
                for (const key in opponentHistory) {
                    tempOpponentHistory[key] = new Set(opponentHistory[key]);
                }

                // Tenta formar as partidas
                while (playersToShuffle.length >= 4) {
                    const p1 = playersToShuffle.pop();
                    let p2 = null, p3 = null, p4 = null;
                    
                    // Encontra P2 (parceiro de P1)
                    // Tenta achar alguém que P1 NUNCA jogou
                    let p2Index = playersToShuffle.findIndex(p => !tempPairHistory[p1] || !tempPairHistory[p1].has(p));
                    if (p2Index === -1) {
                        p2Index = 0; // Se jogou com todos, pega o primeiro
                        currentScore += 100; // Penalidade alta por repetir parceiro
                    }
                    p2 = playersToShuffle.splice(p2Index, 1)[0];

                    // Encontra P3 (oponente 1)
                    // Tenta achar alguém que P1 NUNCA enfrentou
                    let p3Index = playersToShuffle.findIndex(p => !tempOpponentHistory[p1] || !tempOpponentHistory[p1].has(p));
                    if (p3Index === -1) {
                        p3Index = 0; // Se enfrentou todos, pega o primeiro
                        currentScore += 1; // Penalidade baixa
                    }
                    p3 = playersToShuffle.splice(p3Index, 1)[0];

                    // Encontra P4 (parceiro de P3)
                    // Tenta achar alguém que P3 NUNCA jogou E que P1 NUNCA enfrentou
                    let p4Index = playersToShuffle.findIndex(p => 
                        (!tempPairHistory[p3] || !tempPairHistory[p3].has(p)) &&
                        (!tempOpponentHistory[p1] || !tempOpponentHistory[p1].has(p))
                    );
                    if (p4Index === -1) {
                         p4Index = 0; // Pega o primeiro que sobrar
                         currentScore += 1; // Penalidade baixa
                    }
                    p4 = playersToShuffle.splice(p4Index, 1)[0];
                    
                    if (!p1 || !p2 || !p3 || !p4) {
                        possible = false; // Falha na lógica
                        break;
                    }
                    
                    matches.push({ p: [p1, p2, p3, p4], score: [null, null] });
                    
                    // Atualiza o histórico temporário para este loop
                    const pair1Key = getPairKey(p1, p2);
                    const pair2Key = getPairKey(p3, p4);
                    if (!tempPairHistory[p1]) tempPairHistory[p1] = new Set();
                    tempPairHistory[p1].add(p2);
                    if (!tempPairHistory[p2]) tempPairHistory[p2] = new Set();
                    tempPairHistory[p2].add(p1);
                    if (!tempPairHistory[p3]) tempPairHistory[p3] = new Set();
                    tempPairHistory[p3].add(p4);
                    if (!tempPairHistory[p4]) tempPairHistory[p4] = new Set();
                    tempPairHistory[p4].add(p3);
                }
                
                if (possible && currentScore < minScore) {
                    minScore = currentScore;
                    bestRound = { matches, luckyPlayers };
                }
                
                if (minScore === 0) break; // Achou uma rodada perfeita
            }
            
            return bestRound;
        };

        /**
         * Gera as Rodadas (Sortudo)
         * ---
         * *** CORREÇÃO 2 (Sorteio Aleatório) ***
         * Esta função foi reescrita para usar a 'generateOptimizedRound'
         * que tenta evitar parceiros e oponentes repetidos.
         * ---
         */
        const handleGenerateChampionship_Sortudo = async () => {
            const { numRounds, luckyGames } = activeChampionship.config;
            const players = [...activeChampionship.players];
            const playerCount = players.length;
            
            if (playerCount < 4) {
                 showModal("Erro", "Mínimo de 4 jogadores necessários.");
                 return;
            }
            
            if (!confirm(`Gerar ${numRounds} rodadas para ${playerCount} jogadores? O sistema tentará não repetir duplas.`)) return;

            try {
                const newRounds = [];
                const playerIds = players.map(p => p.id);
                
                // Carrega o histórico salvo (se houver)
                let tempPairHistory = activeChampionship.pairHistory || {};
                let tempOpponentHistory = activeChampionship.opponentHistory || {};

                for (let i = 0; i < numRounds; i++) {
                    const numLucky = playerCount % 4; // Ex: 22 % 4 = 2 sortudos
                    
                    const newRound = generateOptimizedRound(
                        playerIds, 
                        numLucky, 
                        tempPairHistory, 
                        tempOpponentHistory
                    );
                    
                    if (!newRound) {
                        throw new Error("Falha ao gerar rodada otimizada.");
                    }
                    
                    newRounds.push(newRound);
                    
                    // Atualiza o histórico com os dados da rodada que ACABOU de ser gerada
                    const { pairHistory: updatedPair, opponentHistory: updatedOpponent } = updateHistories(
                        { 
                            pairHistory: tempPairHistory, 
                            opponentHistory: tempOpponentHistory 
                        }, 
                        newRound
                    );
                    tempPairHistory = updatedPair;
                    tempOpponentHistory = updatedOpponent;
                }
                
                const newChampData = {
                    ...activeChampionship,
                    status: 'rounds',
                    rounds: newRounds,
                    pairHistory: tempPairHistory, // Salva o histórico final
                    opponentHistory: tempOpponentHistory // Salva o histórico final
                };
                
                await saveActiveChampionship(newChampData);
                
                // Atualiza o status no documento principal
                const champRef = doc(db, 'users', appState.userId, 'championships', appState.currentChampionshipId);
                await setDoc(champRef, { status: 'rounds' }, { merge: true });

            } catch (error) {
                console.error("Erro ao gerar rodadas (Sortudo):", error);
                showModal("Erro", "Não foi possível gerar as rodadas. " + error.message);
            }
        };
        
        /**
         * Confirma o placar de um jogo (Sortudo)
         */
        const handleConfirmSortudoScore = (roundIndex, matchIndex) => {
            const val0 = document.getElementById(`s-${roundIndex}-m-${matchIndex}-s0`).value;
            const val1 = document.getElementById(`s-${roundIndex}-m-${matchIndex}-s1`).value;
            const score0 = val0 === '' ? null : parseInt(val0, 10);
            const score1 = val1 === '' ? null : parseInt(val1, 10);
            
            if (score0 === null || score1 === null || isNaN(score0) || isNaN(score1) || score0 < 0 || score1 < 0) {
                showModal("Placar Inválido", "Ambos os placares devem ser preenchidos com números positivos (ou 0).");
                return;
            }
            
            const newChampData = JSON.parse(JSON.stringify(activeChampionship));
            newChampData.rounds[roundIndex].matches[matchIndex].score[0] = score0;
            newChampData.rounds[roundIndex].matches[matchIndex].score[1] = score1;
            saveActiveChampionship(newChampData);
        };
        
        /**
         * (Auxiliar) Calcula o Leaderboard (Sortudo) com Saldo
         */
        const getLeaderboard_Sortudo = () => {
            const playerStats = new Map();
            activeChampionship.players.forEach(p => {
                playerStats.set(p.id, {
                    id: p.id,
                    name: p.name,
                    totalGames: 0,
                    gamesLost: 0, // SALDO: Novo campo
                    saldo: 0       // SALDO: Novo campo
                });
            });
            
            let allScoresFilled = true;
            const { luckyGames } = activeChampionship.config;

            activeChampionship.rounds.forEach(round => {
                // 1. Adiciona games dos "Sortudos"
                round.luckyPlayers.forEach(pId => {
                    const stats = playerStats.get(pId);
                    if (stats) {
                        stats.totalGames += (luckyGames || 0);
                        // SALDO: Lucky games não afetam o saldo (0 perdidos)
                    }
                });
                
                // 2. Adiciona games dos Jogos
                round.matches.forEach(match => {
                    const [p1, p2, p3, p4] = match.p;
                    const [s1, s2] = match.score;
                    
                    if (s1 === null || s2 === null) {
                        allScoresFilled = false;
                        return; // Pula este jogo se incompleto
                    }
                    
                    const stats1 = playerStats.get(p1);
                    const stats2 = playerStats.get(p2);
                    const stats3 = playerStats.get(p3);
                    const stats4 = playerStats.get(p4);
                    
                    if (stats1) { 
                        stats1.totalGames += s1; 
                        stats1.gamesLost += s2; // SALDO
                        stats1.saldo += (s1 - s2); // SALDO
                    }
                    if (stats2) { 
                        stats2.totalGames += s1; 
                        stats2.gamesLost += s2; // SALDO
                        stats2.saldo += (s1 - s2); // SALDO
                    }
                    if (stats3) { 
                        stats3.totalGames += s2; 
                        stats3.gamesLost += s1; // SALDO
                        stats3.saldo += (s2 - s1); // SALDO
                    }
                    if (stats4) { 
                        stats4.totalGames += s2; 
                        stats4.gamesLost += s1; // SALDO
                        stats4.saldo += (s2 - s1); // SALDO
                    }
                });
            });
            
            // 3. Ordena o Leaderboard
            const leaderboard = Array.from(playerStats.values());
            leaderboard.sort((a, b) => {
                // Critério 1: Total de Games (descendente)
                if (a.totalGames !== b.totalGames) {
                    return b.totalGames - a.totalGames;
                }
                // Critério 2: Saldo de Games (descendente)
                if (a.saldo !== b.saldo) {
                    return b.saldo - a.saldo;
                }
                // Critério 3: Nome (alfabético)
                return a.name.localeCompare(b.name);
            });
            
            return { leaderboard, allScoresFilled };
        };
        /**
         * Finaliza o torneio (Sortudo) e lança no Ranking
         */
        const handleManualFinalize_Sortudo = async () => {
            if (!confirm("Confirmar Finalização?\nEsta ação irá calcular os pontos, lançar no ranking e marcar o campeonato como 'Finalizado'. Esta ação não pode ser desfeita.")) {
                return;
            }
            
            const champRef = doc(db, 'users', appState.userId, 'championships', appState.currentChampionshipId);
            const champDoc = await getDoc(champRef);
            if (!champDoc.exists()) {
                 showModal("Erro Crítico", "Documento principal do campeonato não encontrado.");
                 return;
            }
            
            const champInfo = champDoc.data();
            const rankingId = champInfo.rankingId;
            const pointsConfig = champInfo.pointsConfig || DEFAULT_POINTS_SORTUDO;
            
            if (!rankingId) {
                showModal("Erro Crítico", "Este campeonato não está vinculado a nenhum ranking. Os pontos não podem ser salvos.");
                return;
            }
            
            showModal("Calculando...", "Finalizando torneio e atualizando o ranking global. Aguarde...");
            
            try {
                // 1. Pega o Leaderboard final (já ordenado)
                const { leaderboard } = getLeaderboard_Sortudo();
                
                // 2. Mapeia os bônus
                const bonusMap = new Map();
                if (leaderboard[0]) bonusMap.set(leaderboard[0].id, pointsConfig.bonus_1st || 0);
                if (leaderboard[1]) bonusMap.set(leaderboard[1].id, pointsConfig.bonus_2nd || 0);
                if (leaderboard[2]) bonusMap.set(leaderboard[2].id, pointsConfig.bonus_3rd || 0);
                
                // 3. Define o Coveiro
                const coveiroIds = new Set();
                if (leaderboard.length > 3) {
                    const lastPlayer = leaderboard[leaderboard.length - 1];
                    coveiroIds.add(lastPlayer.id);
                }
                
                // 4. Atualiza o Ranking (Transação)
                await updateGlobalRanking_Sortudo(
                    leaderboard,
                    bonusMap,
                    coveiroIds,
                    pointsConfig,
                    rankingId
                );
                
                // 5. Marcar o campeonato como finalizado
                const winnerName = leaderboard[0] ? leaderboard[0].name : '?';
                await setDoc(champRef, {
                    status: 'finished',
                    winnerGold: winnerName, // Usamos 'winnerGold' para consistência na lista
                    winnerSilver: null
                }, { merge: true });
                
                hideModal();
                showModal("Sucesso!", `Ranking global atualizado! Campeão: ${winnerName}.`);

            } catch (error) {
                console.error("Erro ao finalizar (manual) torneio sortudo:", error);
                showModal("Erro Crítico", "Não foi possível aplicar o ranking. Verifique o console para detalhes: " + error.message);
            }
        };
        
        /**
         * (Transação) Atualiza o Ranking Global (Sortudo)
         */
        const updateGlobalRanking_Sortudo = async (leaderboard, bonusMap, coveiroIds, pointsConfig, rankingId) => {
            
            // 1. Prepara o mapa de pontos
            const playerPointsMap = new Map();
            for (const player of leaderboard) {
                const participationPoints = pointsConfig.participation || 0;
                const gamePoints = (player.totalGames * (pointsConfig.perGame || 0));
                const bonusPoints = bonusMap.get(player.id) || 0;
                
                const totalPoints = participationPoints + gamePoints + bonusPoints;
                
                playerPointsMap.set(player.id, {
                    name: player.name,
                    pointsToAdd: totalPoints,
                    goldWins: (bonusMap.get(player.id) === pointsConfig.bonus_1st) ? 1 : 0, // Conta 1º lugar como "goldWin"
                    silverWins: 0, // Sortudo não tem "silverWin"
                    coveiroWins: coveiroIds.has(player.id) ? 1 : 0
                });
            }
            
            // 2. Executa a Transação
            await runTransaction(db, async (transaction) => {
                // Lê todos os documentos de jogadores necessários DENTRO da transação
                const playerDocsData = new Map();
                for (const playerId of playerPointsMap.keys()) {
                    const playerRef = doc(db, 'users', appState.userId, 'rankings', rankingId, 'players', playerId);
                    const playerDoc = await transaction.get(playerRef); 
                    playerDocsData.set(playerId, playerDoc); 
                }
                
                // Agora, escreve todas as atualizações
                for (const [playerId, data] of playerPointsMap.entries()) {
                    const playerDoc = playerDocsData.get(playerId); 
                    const playerRef = doc(db, 'users', appState.userId, 'rankings', rankingId, 'players', playerId); 
                    
                    if (!playerDoc.exists()) {
                        // *** CORREÇÃO 1 (Bug do Ranking) ***
                        // Este 'if' não deveria mais ser necessário graças à Correção em
                        // 'handleAddNewPlayerToChampionship', mas o mantemos como segurança.
                        console.warn(`Jogador ${playerId} (${data.name}) não existia no ranking. Criando...`);
                        transaction.set(playerRef, {
                            name: data.name,
                            points: data.pointsToAdd,
                            goldWins: data.goldWins,
                            silverWins: data.silverWins,
                            coveiroWins: data.coveiroWins
                        });
                    } else {
                        // Jogador existe, atualiza os pontos
                        const oldData = playerDoc.data();
                        transaction.update(playerRef, {
                            name: data.name, 
                            points: (oldData.points || 0) + data.pointsToAdd,
                            goldWins: (oldData.goldWins || 0) + data.goldWins,
                            silverWins: (oldData.silverWins || 0) + data.silverWins,
                            coveiroWins: (oldData.coveiroWins || 0) + data.coveiroWins 
                        });
                    }
                }
            });
        };
        
        // =================================================================
        // === GERAÇÃO DE PDF (Bifurcação)
        // =================================================================
        
        const handlePrintChampionshipPDF = (champType) => {
            if (champType === 'sortudo') {
                handlePrintPDF_Sortudo();
            } else {
                handlePrintPDF_MataMata();
            }
        };

        /**
         * Gera PDF (Sortudo) - Sem Emojis
         */
        const handlePrintPDF_Sortudo = () => {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                showModal("Erro", "Biblioteca PDF (jsPDF) não foi carregada.");
                return;
            }
            const champ = championships.find(c => c.id === appState.currentChampionshipId);
            if (!champ || !activeChampionship) {
                showModal("Erro", "Dados do campeonato não carregados.");
                return;
            }
            
            try {
                const doc = new jsPDF();
                let yPos = 22; 
                doc.setFontSize(18);
                doc.text(champ.name, 105, yPos, { align: 'center' });
                yPos += 10;
                doc.setFontSize(16);
                doc.text("Classificação Final (Leaderboard)", 105, yPos, { align: 'center' });
                yPos += 10;
                
                const { leaderboard } = getLeaderboard_Sortudo();
                
                // Sem Emojis no PDF
                const head = [['Pos.', 'Jogador', 'Games Ganhos', 'Saldo', 'Games Perdidos']];
                const body = leaderboard.map((p, index) => {
                    // Lógica simplificada sem medalhas no PDF
                    let rank = `${index + 1}º`;
                    if (index === 0) rank = '1º';
                    if (index === 1) rank = '2º';
                    if (index === 2) rank = '3º';
                    if (index === leaderboard.length - 1 && leaderboard.length > 3) rank = 'Coveiro';
                    
                    return [
                        rank,
                        p.name,
                        p.totalGames,
                        `${p.saldo > 0 ? '+' : ''}${p.saldo}`,
                        p.gamesLost
                    ];
                });
                
                doc.autoTable({
                    startY: yPos,
                    head: head,
                    body: body,
                    headStyles: { fillColor: [126, 34, 206] }, 
                    styles: { halign: 'center', textColor: [31, 41, 55] },
                    columnStyles: {
                        1: { halign: 'left' } 
                    }
                });
                yPos = doc.autoTable.previous.finalY + 10;
                
                doc.addPage();
                yPos = 22;
                doc.setFontSize(18);
                doc.text("Resultados das Rodadas", 105, yPos, { align: 'center' });
                yPos += 10;
                
                const playerNameMap = new Map(activeChampionship.players.map(p => [p.id, p.name]));
                
                activeChampionship.rounds.forEach((round, index) => {
                    if (yPos > 240) {
                        doc.addPage();
                        yPos = 22;
                    }
                    doc.setFontSize(14);
                    doc.text(`Rodada ${index + 1}`, 14, yPos);
                    yPos += 7;
                    
                    const luckyPlayers = round.luckyPlayers.map(pId => playerNameMap.get(pId) || '?').join(' / ');
                    if (luckyPlayers) {
                        doc.setFontSize(10);
                        doc.setTextColor(0, 100, 0); 
                        doc.text(`Sortudos (BYE): ${luckyPlayers} (+${activeChampionship.config.luckyGames} games)`, 14, yPos);
                        doc.setTextColor(0, 0, 0); 
                        yPos += 6;
                    }
                    
                    const matchesBody = round.matches.map(m => {
                        const [p1, p2, p3, p4] = m.p;
                        const pair1Name = `${playerNameMap.get(p1) || '?'} / ${playerNameMap.get(p2) || '?'}`;
                        const pair2Name = `${playerNameMap.get(p3) || '?'} / ${playerNameMap.get(p4) || '?'}`;
                        return [
                            pair1Name,
                            `${m.score[0] === null ? '-' : m.score[0]} vs ${m.score[1] === null ? '-' : m.score[1]}`,
                            pair2Name
                        ];
                    });
                    
                    doc.autoTable({
                        startY: yPos,
                        head: [['Dupla 1', 'Placar', 'Dupla 2']],
                        body: matchesBody,
                        headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255] }, 
                        styles: { halign: 'center', textColor: [31, 41, 55], fontSize: 9 },
                        columnStyles: { 0: { halign: 'left' }, 2: { halign: 'right' } }
                    });
                    yPos = doc.autoTable.previous.finalY + 10;
                });

                doc.save(`resultados_sortudo_${champ.name.toLowerCase().replace(/\s/g, '_')}.pdf`);

            } catch (error) {
                 console.error("Erro ao gerar PDF do Torneio Sortudo:", error);
                showModal("Erro", "Não foi possível gerar o PDF. " + error.message);
            }
        };
        
        /**
         * Gera PDF (Mata-Mata) - Sem Emojis
         */
        const handlePrintPDF_MataMata = () => {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                showModal("Erro", "Biblioteca PDF (jsPDF) não foi carregada.");
                return;
            }
            const champ = championships.find(c => c.id === appState.currentChampionshipId);
            if (!champ || !activeChampionship) {
                showModal("Erro", "Dados do campeonato não carregados.");
                return;
            }
            
            try {
                const doc = new jsPDF();
                let yPos = 22; 
                doc.setFontSize(18);
                doc.text(champ.name, 105, yPos, { align: 'center' });
                yPos += 10;
                
                doc.setFontSize(14);
                doc.text("Resultados Finais", 14, yPos);
                yPos += 7;
                
                const finalResults = [];
                const { goldWinner, silverWinner } = getKnockoutWinners(activeChampionship);

                // Ouro (Removido emojis das strings)
                if (goldWinner) {
                    finalResults.push(['Campeões Ouro', goldWinner.name]);
                    const maxRoundGold = Math.max(...activeChampionship.goldBracket.map(m => m.round));
                    const goldFinal = activeChampionship.goldBracket.find(m => m.round === maxRoundGold);
                    const goldRunnerUp = goldFinal.pairs.find(p => p && p.id !== goldWinner.id);
                    if (goldRunnerUp) finalResults.push(['2º Lugar Ouro', goldRunnerUp.name]);

                    const goldSemiFinals = activeChampionship.goldBracket.filter(m => m.round === maxRoundGold - 1);
                    if (goldSemiFinals.length === 2) {
                        const championSemi = goldSemiFinals.find(sf => 
                            sf.pairs.some(p => p && p.id === goldWinner.id)
                        );
                        if(championSemi) {
                            const thirdPlace = championSemi.pairs.find(p => p && p.id !== goldWinner.id);
                            if (thirdPlace) finalResults.push(['3º Lugar Ouro', thirdPlace.name]);
                        }
                    }
                }
                
                // Prata (Removido emojis das strings)
                if (silverWinner) {
                    finalResults.push(['Campeões Prata', silverWinner.name]);
                    const maxRoundSilver = Math.max(...activeChampionship.silverBracket.map(m => m.round));
                    const silverFinal = activeChampionship.silverBracket.find(m => m.round === maxRoundSilver);
                    const silverRunnerUp = silverFinal.pairs.find(p => p && p.id !== silverWinner.id);
                    if (silverRunnerUp) finalResults.push(['2º Lugar Prata', silverRunnerUp.name]);
                    
                    const silverSemiFinals = activeChampionship.silverBracket.filter(m => m.round === maxRoundSilver - 1);
                    if (silverSemiFinals.length === 2) {
                        const championSemi = silverSemiFinals.find(sf => 
                            sf.pairs.some(p => p && p.id === silverWinner.id)
                        );
                        if(championSemi) {
                            const thirdPlace = championSemi.pairs.find(p => p && p.id !== silverWinner.id);
                            if (thirdPlace) finalResults.push(['3º Lugar Prata', thirdPlace.name]);
                        }
                    }
                }

                // Coveiro (Removido emojis das strings)
                const stats = getGlobalTournamentStats_MataMata(activeChampionship);
                if (stats.length > 0) {
                    const minGames = stats[0].gamesWon;
                    const coveiros = stats.filter(p => p.gamesWon === minGames);
                    finalResults.push(['Coveiro(s)', coveiros.map(c => c.name).join(' / ')]);
                }
                
                doc.autoTable({
                    startY: yPos,
                    head: [['Prêmio', 'Dupla/Jogador']],
                    body: finalResults,
                    headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255] },
                    styles: { textColor: [31, 41, 55] },
                    theme: 'striped',
                });
                yPos = doc.autoTable.previous.finalY + 10; 
                
                doc.addPage();
                yPos = 22;
                doc.setFontSize(18);
                doc.text("Resultados da Fase de Grupos", 105, yPos, { align: 'center' });
                yPos += 10;
                
                activeChampionship.groups.forEach((group, index) => {
                    if (yPos > 240) {
                        doc.addPage();
                        yPos = 22;
                    }
                    doc.setFontSize(14);
                    doc.text(`Grupo ${index + 1}`, 14, yPos);
                    yPos += 7;
                    
                    const matchesBody = group.matches.map(m => [
                        m.names[0],
                        `${m.score[0] === null ? '-' : m.score[0]} vs ${m.score[1] === null ? '-' : m.score[1]}`,
                        m.names[1]
                    ]);
                    doc.autoTable({
                        startY: yPos,
                        head: [['Dupla 1', 'Placar', 'Dupla 2']],
                        body: matchesBody,
                        headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255] }, 
                        styles: { halign: 'center', textColor: [31, 41, 55] },
                        columnStyles: { 0: { halign: 'left' }, 2: { halign: 'right' } }
                    });
                    yPos = doc.autoTable.previous.finalY + 5;
                    
                    const rankings = getRankings(group);
                    const rankingsBody = rankings.map((p, rIndex) => [
                        `${rIndex + 1}º`,
                        p.name,
                        p.gamesWon
                    ]);
                    doc.autoTable({
                        startY: yPos,
                        head: [['Pos.', 'Jogador', 'Games Vencidos']],
                        body: rankingsBody,
                        theme: 'grid',
                        styles: { halign: 'center', fontSize: 9, textColor: [31, 41, 55] },
                        headStyles: { fillColor: [254, 243, 199], textColor: [75, 85, 99], fontSize: 10 }, 
                    });
                    yPos = doc.autoTable.previous.finalY + 12;
                });
                
                if (yPos > 180 || activeChampionship.goldBracket.length > 0) { 
                    doc.addPage();
                    yPos = 22;
                } else {
                    yPos += 5; 
                }
                
                doc.setFontSize(18);
                doc.text("Resultados do Mata-Mata", 105, yPos, { align: 'center' });
                yPos += 10;
                
                // PDF - Chave Ouro (Sem emojis)
                if (activeChampionship.goldBracket.length > 0) {
                    doc.setFontSize(16);
                    doc.text("Série Ouro", 14, yPos);
                    yPos += 7;
                    const maxRoundGold = Math.max(...activeChampionship.goldBracket.map(m => m.round));
                    const goldBody = activeChampionship.goldBracket.map(m => {
                        const roundTitle = getRoundTitle(m.round, maxRoundGold);
                        const pair1Name = m.pairs[0]?.name || (m.pairs[0] === 'BYE' ? 'BYE (Folga)' : '-');
                        const pair2Name = m.pairs[1]?.name || (m.pairs[1] === 'BYE' ? 'BYE (Folga)' : '-');
                        const score = m.score[0] === null || m.score[1] === null 
                            ? ' - '
                            : `${m.score[0]} vs ${m.score[1]}`;
                        return [
                            roundTitle,
                            pair1Name,
                            score,
                            pair2Name
                        ];
                    });
                    doc.autoTable({
                        startY: yPos,
                        head: [['Rodada', 'Dupla 1', 'Placar', 'Dupla 2']],
                        body: goldBody,
                        headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] }, 
                        styles: { halign: 'center', textColor: [31, 41, 55] },
                        columnStyles: { 1: { halign: 'left' }, 3: { halign: 'right' } }
                    });
                    yPos = doc.autoTable.previous.finalY + 10;
                }
                
                // PDF - Chave Prata (Sem emojis)
                if (activeChampionship.silverBracket.length > 0) {
                    doc.setFontSize(16);
                    doc.text("Série Prata", 14, yPos);
                    yPos += 7;
                    const maxRoundSilver = Math.max(...activeChampionship.silverBracket.map(m => m.round));
                    const silverBody = activeChampionship.silverBracket.map(m => {
                        const roundTitle = getRoundTitle(m.round, maxRoundSilver);
                        const pair1Name = m.pairs[0]?.name || (m.pairs[0] === 'BYE' ? 'BYE (Folga)' : '-');
                        const pair2Name = m.pairs[1]?.name || (m.pairs[1] === 'BYE' ? 'BYE (Folga)' : '-');
                        const score = m.score[0] === null || m.score[1] === null 
                            ? ' - '
                            : `${m.score[0]} vs ${m.score[1]}`;
                        return [
                            roundTitle,
                            pair1Name,
                            score,
                            pair2Name
                        ];
                    });
                    doc.autoTable({
                        startY: yPos,
                        head: [['Rodada', 'Dupla 1', 'Placar', 'Dupla 2']],
                        body: silverBody,
                        headStyles: { fillColor: [156, 163, 175], textColor: [31, 41, 55] }, 
                        styles: { halign: 'center', textColor: [31, 41, 55] },
                        columnStyles: { 1: { halign: 'left' }, 3: { halign: 'right' } }
                    });
                }
                
                doc.save(`resultados_mm_${champ.name.toLowerCase().replace(/\s/g, '_')}.pdf`);
                
            } catch (error) {
                 console.error("Erro ao gerar PDF do campeonato Mata-Mata:", error);
                showModal("Erro", "Não foi possível gerar o PDF. " + error.message);
            }
        };
        
        /**
         * Gera PDF (Ranking Global) - Sem Emojis
         */
        const handlePrintRankingPDF = () => {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                showModal("Erro", "Biblioteca PDF (jsPDF) não foi carregada.");
                return;
            }
            try {
                const doc = new jsPDF();
                const currentRanking = allRankings.find(r => r.id === appState.currentRankingId);
                const rankingName = currentRanking ? currentRanking.name : "Ranking";
                const title = `Ranking Geral: ${rankingName}`;
                
                doc.setFontSize(18);
                doc.text(title, 105, 22, { align: 'center' }); 
                
                const sortedPlayers = [...globalPlayers].sort((a, b) => b.points - a.points);
                // Cabeçalho sem emojis
                const head = [['Pos.', 'Jogador', 'Pontos', 'Ouro', 'Prata', 'Coveiro']];
                const body = sortedPlayers.map((p, index) => [
                    `${index + 1}º`, // Removido emojis de 1º, 2º, 3º
                    p.name,
                    p.points || 0,
                    p.goldWins || 0,
                    p.silverWins || 0,
                    p.coveiroWins || 0
                ]);
                
                doc.autoTable({
                    startY: 30,
                    head: head,
                    body: body,
                    headStyles: { fillColor: [8, 145, 178] }, 
                    styles: { halign: 'center', textColor: [31, 41, 55] },
                    headStyles: { fillColor: [254, 243, 199], textColor: [75, 85, 99] }, 
                    columnStyles: {
                        1: { halign: 'left' } 
                    }
                });
                
                doc.save(`ranking_${rankingName.toLowerCase().replace(/\s/g, '_')}.pdf`);
            } catch (error) {
                console.error("Erro ao gerar PDF do ranking:", error);
                showModal("Erro", "Não foi possível gerar o PDF. " + error.message);
            }
        };
        
        // =================================================================
        // === LISTENERS DO FIREBASE (Carregamento de Dados)
        // =================================================================

        /**
         * Ouve a coleção de jogadores do ranking selecionado
         */
        const listenToGlobalPlayers = () => {
            unsubscribeGlobalPlayers(); 
            
            if (!appState.currentRankingId) {
                console.warn("Nenhum rankingId selecionado. listenToGlobalPlayers() abortado.");
                globalPlayers = [];
                if(appState.currentView === 'globalRanking') render();
                return;
            }
            
            // O caminho para os jogadores é /users/{userId}/rankings/{rankingId}/players
            const playersCollectionRef = collection(db, 'users', appState.userId, 'rankings', appState.currentRankingId, 'players');
            const q = query(playersCollectionRef);
            
            unsubscribeGlobalPlayers = onSnapshot(q, (querySnapshot) => {
                globalPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                if (appState.currentView === 'globalRanking') {
                    render();
                }
                if (appState.currentView === 'championshipView' && activeChampionship?.status === 'registration') {
                    render();
                }
            }, (error) => {
                console.error(`Erro ao carregar ranking ${appState.currentRankingId}:`, error);
                showModal("Erro", "Não foi possível carregar o ranking selecionado.");
                globalPlayers = [];
                if(appState.currentView === 'globalRanking' || appState.currentView === 'championshipView') render();
            });
        };

        /**
         * Ouve a lista de campeonatos
         */
        const listenToChampionships = () => {
            unsubscribeChampionships();
            const champCollectionRef = collection(db, 'users', appState.userId, 'championships');
            const q = query(champCollectionRef);
            
            unsubscribeChampionships = onSnapshot(q, (querySnapshot) => {
                championships = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                if (appState.currentView === 'championshipList') {
                    render();
                }
                if (appState.isTelaoMode && appState.currentView === 'telaoView') {
                    // Atualiza o telão se o status do campeonato mudar (ex: 'finished')
                    render();
                }
            }, (error) => {
                console.error("Erro ao carregar campeonatos:", error);
                showModal("Erro", "Não foi possível carregar o histórico de campeonatos.");
            });
        };

     /**
         * Ouve os dados de um campeonato específico (data/main)
         */
        const listenToActiveChampionship = (champId) => {
            unsubscribeActiveChampionship();
            const champDataRef = doc(db, 'users', appState.userId, 'championships', champId, 'data', 'main');
            
            unsubscribeActiveChampionship = onSnapshot(champDataRef, (docSnap) => {
                if (docSnap.exists()) {
                    activeChampionship = { id: docSnap.id, ...docSnap.data() };
                    
                    // *** CORREÇÃO (Bug de Iteração v2): Adiciona checagem extra para 'null' e 'typeof object' ***
                    // Garante que o histórico é um objeto (e não null) antes de tentar iterar
                    if (activeChampionship.pairHistory && typeof activeChampionship.pairHistory === 'object') {
                        const pairHistorySets = {};
                        for (const key in activeChampionship.pairHistory) { 
                            const value = activeChampionship.pairHistory[key];
                            if (Array.isArray(value)) {
                                pairHistorySets[key] = new Set(value);
                            } else if (typeof value === 'object' && value !== null) {
                                pairHistorySets[key] = new Set(Object.keys(value)); 
                            } else {
                                pairHistorySets[key] = new Set();
                            }
                        }
                        activeChampionship.pairHistory = pairHistorySets;
                    } else {
                         activeChampionship.pairHistory = {}; // Garante que é um objeto para o resto do app
                    }

                    if (activeChampionship.opponentHistory && typeof activeChampionship.opponentHistory === 'object') {
                        const opponentHistorySets = {};
                        for (const key in activeChampionship.opponentHistory) { 
                            const value = activeChampionship.opponentHistory[key];
                             if (Array.isArray(value)) {
                                opponentHistorySets[key] = new Set(value);
                            } else if (typeof value === 'object' && value !== null) {
                                opponentHistorySets[key] = new Set(Object.keys(value));
                            } else {
                                opponentHistorySets[key] = new Set();
                            }
                        }
                        activeChampionship.opponentHistory = opponentHistorySets;
                    } else {
                        activeChampionship.opponentHistory = {}; // Garante que é um objeto para o resto do app
                    }
                    
                    render(); // Renderiza a view do campeonato com os dados atualizados
                } else {
                    showModal("Erro", "Não foi possível carregar os dados deste campeonato. (O doc 'data/main' não foi encontrado).");
                    if (!appState.isTelaoMode) navigateTo('championshipList');
                    else mainContent.innerHTML = `<h1 class="text-4xl text-rose-500 text-center p-10">Erro: Campeonato não encontrado.</h1>`;
                }
            }, (error) => {
                console.error("Erro ao carregar campeonato ativo:", error);
                showModal("Erro", "Não foi possível carregar este campeonato. Verifique as regras do Firestore.");
                if (!appState.isTelaoMode) navigateTo('championshipList');
                else mainContent.innerHTML = `<h1 class="text-4xl text-rose-500 text-center p-10">Erro de conexão.</h1>`;
            });
        };
        /**
         * Ouve a lista de nomes de Rankings (app_data/rankings)
         */
        const listenToRankingsList = () => {
            unsubscribeRankingsList();
            const rankingsDocRef = doc(db, 'users', appState.userId, 'app_data', 'rankings');
            
            unsubscribeRankingsList = onSnapshot(rankingsDocRef, async (docSnap) => {
                let list = [];
                if (docSnap.exists()) {
                    list = docSnap.data().list || [];
                }
                
                // Se não existir nenhum ranking, cria o "Ranking Geral" padrão
                if (list.length === 0) {
                    try {
                        const defaultRanking = { id: "ranking_geral", name: "Ranking Geral" };
                        await setDoc(rankingsDocRef, { list: [defaultRanking] });
                        allRankings = [defaultRanking];
                    } catch (error) {
                        console.error("Erro ao criar ranking padrão:", error);
                        showModal("Erro Crítico", "Não foi possível inicializar a lista de rankings.");
                        return;
                    }
                } else {
                    allRankings = list;
                }
                
                // Define o rankingId atual se não estiver definido ou se o selecionado foi excluído
                const selectedRankingExists = allRankings.some(r => r.id === appState.currentRankingId);
                if ((!appState.currentRankingId || !selectedRankingExists) && allRankings.length > 0) {
                    appState.currentRankingId = allRankings[0].id;
                } else if (allRankings.length === 0) {
                    appState.currentRankingId = null; 
                }
                
                // (Re)Inicia o listener de jogadores com o rankingId correto
                listenToGlobalPlayers();
                
                // Renderiza a view (exceto telão, que não depende da lista de rankings)
                if (!appState.isTelaoMode) {
                    render();
                }
            }, (error) => {
                console.error("Erro ao carregar lista de rankings:", error);
                showModal("Erro Crítico", "Não foi possível carregar a lista de rankings.");
            });
        };
        
        // =================================================================
        // === INICIALIZAÇÃO DO APP
        // =================================================================
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Erro na autenticação anônima:", error);
                    let errorMessage = "Não foi possível conectar ao Firebase. Verifique sua conexão.";
                    if (error.code === 'auth/configuration-not-found') {
                        errorMessage = "Erro de Autenticação: O 'Login Anônimo' (Anonymous) não está ATIVADO no seu painel do Firebase.";
                    }
                    showModal("Erro de Autenticação", errorMessage);
                    return;
                }
            }
            
            // Usuário está logado (anônimo ou não)
            if (user && !appState.isAuthReady) {
                // Força o uso do ID Mestre
                const effectiveUserId = MESTRE_USER_ID; 
                appState = { ...appState, userId: effectiveUserId, isAuthReady: true };
                userIdFooter.textContent = effectiveUserId; 
                
                // Verifica se está entrando em Modo Telão
                const urlParams = new URLSearchParams(window.location.search);
                const telaoChampId = urlParams.get('champId');
                
                // Inicia os listeners principais
                listenToChampionships();
                listenToRankingsList(); // Isso também vai iniciar o listenToGlobalPlayers()
                
                if (urlParams.has('telao') && telaoChampId) {
                    // MODO TELÃO
                    appState.isTelaoMode = true;
                    appState.isAdmin = false; 
                    
                    // Aplica estilos CSS para o Telão (remove header/footer, muda fundo)
                    const telaoStyles = document.createElement('style');
                    telaoStyles.innerHTML = `
                        body { background-color: #FFFAF0; } 
                        #app-container { max-width: 100%; padding: 1rem 2rem; }
                        header, footer { display: none !important; }
                    `;
                    document.head.appendChild(telaoStyles);
                    
                    navigateTo('telaoView', telaoChampId);
                } else {
                    // MODO NORMAL (Admin/Visitante)
                    appState.isTelaoMode = false;
                    navigateTo('login');
                }
            }
        });

