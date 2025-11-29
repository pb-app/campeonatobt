// =================================================================
// === LOGIC.JS - Matemática e Regras do Jogo
// =================================================================

export const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const getPairKey = (p1, p2) => [p1, p2].sort().join('_');

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

export const generateOptimizedRound = (playerIds, numLucky, pairHistory, opponentHistory) => {
    const MAX_TRIES = 50;
    let bestRound = null;
    let minScore = Infinity;

    for (let i = 0; i < MAX_TRIES; i++) {
        let playersToShuffle = [...playerIds];
        // Shuffle local (copiado da função interna)
        for (let k = playersToShuffle.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [playersToShuffle[k], playersToShuffle[j]] = [playersToShuffle[j], playersToShuffle[k]];
        }
        
        const luckyPlayers = [];
        for(let j=0; j < numLucky; j++) luckyPlayers.push(playersToShuffle.pop());
        
        const matches = [];
        let currentScore = 0;
        let possible = true;
        
        const tempPairHistory = {}; for (const k in pairHistory) tempPairHistory[k] = new Set(pairHistory[k]);
        const tempOpponentHistory = {}; for (const k in opponentHistory) tempOpponentHistory[k] = new Set(opponentHistory[k]);

        while (playersToShuffle.length >= 4) {
            const p1 = playersToShuffle.pop();
            let p2, p3, p4;
            
            let p2Index = playersToShuffle.findIndex(p => !tempPairHistory[p1] || !tempPairHistory[p1].has(p));
            if (p2Index === -1) { p2Index = 0; currentScore += 100; }
            p2 = playersToShuffle.splice(p2Index, 1)[0];

            let p3Index = playersToShuffle.findIndex(p => !tempOpponentHistory[p1] || !tempOpponentHistory[p1].has(p));
            if (p3Index === -1) { p3Index = 0; currentScore += 1; }
            p3 = playersToShuffle.splice(p3Index, 1)[0];

            let p4Index = playersToShuffle.findIndex(p => (!tempPairHistory[p3] || !tempPairHistory[p3].has(p)) && (!tempOpponentHistory[p1] || !tempOpponentHistory[p1].has(p)));
            if (p4Index === -1) { p4Index = 0; currentScore += 1; }
            p4 = playersToShuffle.splice(p4Index, 1)[0];
            
            if (!p1 || !p2 || !p3 || !p4) { possible = false; break; }
            matches.push({ p: [p1, p2, p3, p4], score: [null, null] });
            
            if (!tempPairHistory[p1]) tempPairHistory[p1] = new Set(); tempPairHistory[p1].add(p2);
            if (!tempPairHistory[p2]) tempPairHistory[p2] = new Set(); tempPairHistory[p2].add(p1);
            if (!tempPairHistory[p3]) tempPairHistory[p3] = new Set(); tempPairHistory[p3].add(p4);
            if (!tempPairHistory[p4]) tempPairHistory[p4] = new Set(); tempPairHistory[p4].add(p3);
        }
        
        if (possible && currentScore < minScore) { minScore = currentScore; bestRound = { matches, luckyPlayers }; }
        if (minScore === 0) break;
    }
    return bestRound;
};

export const updateHistories = (champData, round) => {
    for (const key in champData.pairHistory) if (Array.isArray(champData.pairHistory[key])) champData.pairHistory[key] = new Set(champData.pairHistory[key]);
    for (const key in champData.opponentHistory) if (Array.isArray(champData.opponentHistory[key])) champData.opponentHistory[key] = new Set(champData.opponentHistory[key]);

    round.matches.forEach(match => {
        const [p1, p2, p3, p4] = match.p;
        if (!champData.pairHistory[p1]) champData.pairHistory[p1] = new Set(); champData.pairHistory[p1].add(p2);
        if (!champData.pairHistory[p2]) champData.pairHistory[p2] = new Set(); champData.pairHistory[p2].add(p1);
        if (!champData.pairHistory[p3]) champData.pairHistory[p3] = new Set(); champData.pairHistory[p3].add(p4);
        if (!champData.pairHistory[p4]) champData.pairHistory[p4] = new Set(); champData.pairHistory[p4].add(p3);
        
        const pair1 = [p1, p2]; const pair2 = [p3, p4];
        for(const pA of pair1) { if (!champData.opponentHistory[pA]) champData.opponentHistory[pA] = new Set(); pair2.forEach(pB => champData.opponentHistory[pA].add(pB)); }
        for(const pB of pair2) { if (!champData.opponentHistory[pB]) champData.opponentHistory[pB] = new Set(); pair1.forEach(pA => champData.opponentHistory[pB].add(pA)); }
    });
    const serializablePairHistory = {}; for (const key in champData.pairHistory) serializablePairHistory[key] = Array.from(champData.pairHistory[key]);
    const serializableOpponentHistory = {}; for (const key in champData.opponentHistory) serializableOpponentHistory[key] = Array.from(champData.opponentHistory[key]);
    
    return { pairHistory: serializablePairHistory, opponentHistory: serializableOpponentHistory };
};
