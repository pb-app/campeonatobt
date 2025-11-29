// =================================================================
// === STATE.JS - Dados e Configurações
// =================================================================

export const DEFAULT_POINTS_SORTUDO = {
    type: 'sortudo',
    participation: 10,
    perGame: 5,
    bonus_1st: 100,
    bonus_2nd: 70,
    bonus_3rd: 50,
};

export const DEFAULT_POINTS_MATA_MATA = {
    type: 'mata_mata',
    participation: 5,
    groupWin: 0,
    gold_R3_lose: 20, gold_R3_win: 100, gold_R4_lose: 20, gold_R4_win: 100,
    gold_R5_lose: 20, gold_R5_win: 100, gold_R3_run: 50, gold_R4_run: 50,
    gold_R5_run: 50, silver_R3_lose: 10, silver_R3_win: 30,
    silver_R4_lose: 10, silver_R4_win: 30, silver_R5_lose: 10,
    silver_R5_win: 30, silver_R3_run: 15, silver_R4_run: 15,
    silver_R5_run: 15
};

export const appState = {
    userId: null,
    userEmail: null,
    isAuthReady: false,
    isAdmin: false,
    canEdit: false,
    isTelaoMode: false,
    currentView: 'loading',
    currentChampionshipId: null,
    currentRankingId: null,
};

export const dataCache = {
    allRankings: [],
    championships: [],
    globalPlayers: [],
    activeChampionship: null,
};

export const icons = {
    // (Copie os ícones do icons.js para cá se preferir centralizar, 
    // ou importe do icons.js no app.js. 
    // O app.js que te passei importa do icons.js, então aqui não precisa)
};
