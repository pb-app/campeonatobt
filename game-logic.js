// =================================================================
// === GAME-LOGIC.JS - Lógica e Matemática do Jogo
// =================================================================

// --- Pontuações Padrão ---
export const DEFAULT_POINTS_MATA_MATA = {
    type: 'mata_mata', participation: 5, groupWin: 0,
    gold_R3_lose: 20, gold_R3_win: 100, gold_R4_lose: 20, gold_R4_win: 100, gold_R5_lose: 20, gold_R5_win: 100,
    gold_R3_run: 50, gold_R4_run: 50, gold_R5_run: 50,
    silver_R3_lose: 10, silver_R3_win: 30, silver_R4_lose: 10, silver_R4_win: 30, silver_R5_lose: 10, silver_R5_win: 30,
    silver_R3_run: 15, silver_R4_run: 15, silver_R5_run: 15
};

export const DEFAULT_POINTS_SORTUDO = {
    type: 'sortudo', participation: 10, perGame: 5, bonus_1st: 100, bonus_2nd: 70, bonus_3rd: 50
};

// --- Helpers Matemáticos ---

export const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const getPairKey = (p1, p2) => {
    return [p1, p2].sort().join('_');
};

export const getNextPowerOfTwo = (n) => {
    if (n <= 1) return 2;
    let power = 2;
    while (power < n) power *= 2;
    return power;
};

export const getSeedingMap = (size) => {
    if (size === 2) return [0, 1];
    if (size === 4) return [0, 3, 2, 1];
    if (size === 8) return [0, 7, 5, 3, 4, 2, 6, 1];
    if (size === 16) return [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1];
    const map = []; for(let i=0; i < size; i++) map.push(i); return map;
};

export const getRoundTitle = (roundNum, maxRound) => {
    const r = Number(roundNum);
    const max = Number(maxRound);
    if (r === max) return 'Final';
    if (r === max - 1) return 'Semi-Final';
    if (r === max - 2) return 'Quartas de Final';
    if (r === max - 3) return 'Oitavas de Final';
    return `Rodada ${r}`;
};

// --- Lógica de Grupos e Rankings ---

export const getRankings = (group) => {
    const playerStats = {};
    group.players.forEach(p => { playerStats[p.id] = { id: p.id, name: p.name, gamesWon: 0 }; });
    group.matches.forEach(match => {
        const [s1, s2] = match.score;
        if (s1 !== null && !isNaN(s1)) {
            if (playerStats[match.p[0]]) playerStats[match.p[0]].gamesWon += s1;
            if (playerStats[match.p[1]]) playerStats[match.p[1]].gamesWon += s1;
        }
        if (s2 !== null && !isNaN(s2)) {
            if (playerStats[match.p[2]]) playerStats[match.p[2]].gamesWon += s2;
            if (playerStats[match.p[3]]) playerStats[match.p[3]].gamesWon += s2;
        }
    });
    return Object.values(playerStats).sort((a, b) => b.gamesWon - a.gamesWon);
};

export const createBracketWithByes = (rankedPairs, idPrefix) => {
    const numPairs = rankedPairs.length;
    if (numPairs === 0) return [];
    const targetSize = getNextPowerOfTwo(numPairs);
    const numByes = targetSize - numPairs;
    const numRounds = Math.log2(targetSize);
    const round1Slots = new Array(targetSize).fill(null);
    const seedingMap = getSeedingMap(targetSize);

    for (let i = 0; i < numPairs; i++) {
        round1Slots[seedingMap[i]] = rankedPairs[i];
    }

    const bracket = [];
    let pairCursor = 0;

    for (let m = 0; m < targetSize / 2; m++) {
        const matchId = `${idPrefix}R1_M${m + 1}`;
        const nextRoundMatchIndex = Math.floor(m / 2);
        const nextMatchId = `${idPrefix}R2_M${nextRoundMatchIndex + 1}`;
        const pair1 = round1Slots[pairCursor++];
        const pair2 = round1Slots[pairCursor++];
        const match = { id: matchId, round: 1, pairs: [pair1, pair2], score: [null, null], winner: null, nextMatchId: nextMatchId, nextMatchSlot: m % 2 };
        
        if (pair1 === null && pair2 !== null) { match.winner = pair2; match.score = [0, 1]; match.pairs[0] = 'BYE'; } 
        else if (pair2 === null && pair1 !== null) { match.winner = pair1; match.score = [1, 0]; match.pairs[1] = 'BYE'; }
        
        bracket.push(match);
    }

    for (let r = 2; r <= numRounds; r++) { 
        const matchesInRound = targetSize / Math.pow(2, r);
        for (let m = 0; m < matchesInRound; m++) { 
            const matchId = `${idPrefix}R${r}_M${m+1}`;
            let nextMatchId = null, nextMatchSlot = null; 
            if (r < numRounds) { const nidx = Math.floor(m / 2); nextMatchId = `${idPrefix}R${r+1}_M${nidx+1}`; nextMatchSlot = m % 2; }
            bracket.push({ id: matchId, round: r, pairs: [null, null], score: [null, null], winner: null, nextMatchId, nextMatchSlot });
        }
    }
    bracket.filter(m => m.round === 1 && m.winner !== null).forEach(match => {
        const nextMatch = bracket.find(m => m.id === match.nextMatchId);
        if (nextMatch) nextMatch.pairs[match.nextMatchSlot] = match.winner;
    });
    return bracket;
};

export const getKnockoutWinners = (champData) => {
    if (!champData.goldBracket || champData.goldBracket.length === 0) return { goldWinner: null, silverWinner: null };
    const maxGold = Math.max(...champData.goldBracket.map(m => m.round));
    const maxSilver = Math.max(...champData.silverBracket.map(m => m.round));
    return {
        goldWinner: champData.goldBracket.find(m => m.round === maxGold)?.winner || null,
        silverWinner: champData.silverBracket.find(m => m.round === maxSilver)?.winner || null
    };
};

export const getGlobalTournamentStats_MataMata = (champData) => {
    const playerStats = {};
    champData.players.forEach(p => { playerStats[p.id] = { id: p.id, name: p.name, gamesWon: 0 }; });
    if (champData.groups) {
        champData.groups.forEach(g => g.matches.forEach(m => {
            const [s1, s2] = m.score;
            if (s1!=null) { if(playerStats[m.p[0]]) playerStats[m.p[0]].gamesWon+=s1; if(playerStats[m.p[1]]) playerStats[m.p[1]].gamesWon+=s1; }
            if (s2!=null) { if(playerStats[m.p[2]]) playerStats[m.p[2]].gamesWon+=s2; if(playerStats[m.p[3]]) playerStats[m.p[3]].gamesWon+=s2; }
        }));
    }
    const matches = (champData.goldBracket || []).concat(champData.silverBracket || []);
    matches.forEach(m => {
        const [s0, s1] = m.score;
        if(s0!=null && m.pairs[0]?.players) m.pairs[0].players.forEach(p => { if(playerStats[p.id]) playerStats[p.id].gamesWon+=s0; });
        if(s1!=null && m.pairs[1]?.players) m.pairs[1].players.forEach(p => { if(playerStats[p.id]) playerStats[p.id].gamesWon+=s1; });
    });
    return Object.values(playerStats).sort((a, b) => a.gamesWon - b.gamesWon);
};
