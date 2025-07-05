
class LordDemonio extends Agent {
    constructor() {
        super();
        // Configuración optimizada de tiempos
        this.TIME_RESERVE = 4000; // 4 segundos de reserva
        this.PHASE_TIME_RATIOS = {
            opening: 0.30,  // 30% del tiempo disponible en apertura
            midgame: 0.25,  // 25% en medio juego
            endgame: 0.45   // 45% en finales
        };
        this.MIN_MOVE_TIME = 500;    // 500ms mínimo por jugada
        this.MAX_MOVE_TIME = 5000;   // 5 segundos máximo por jugada
        this.MAX_FIRST_MOVE_TIME = 2000; // 2 segundos máximo para primera jugada
        this.moveCount = 0;
        this.totalTime = 0;
    }

    compute(percept) {
        const startTime = Date.now();
        const { color, board } = percept;
        
        // Inicialización en primer movimiento
        if (this.moveCount === 0) {
            this.totalTime = percept[color];
        }

        const remainingTime = percept[color];
        this.moveCount++;

        // Manejo de tiempo crítico (usar reserva)
        if (remainingTime <= this.TIME_RESERVE) {
            const quickMove = this.getQuickMove(board, color);
            //console.log(`Modo rápido (${remainingTime}ms restantes). Movimiento elegido:`, quickMove);
            return quickMove;
        }

        const moves = board.valid_moves(color);
        if (moves.length === 0) {
            //console.log("No hay movimientos válidos. Pasando turno.");
            return null;
        }

        // 1. Determinar fase del juego
        const gamePhase = this.getGamePhase(board);
        
        // 2. Calcular tiempo disponible (considerando reserva)
        const usableTime = remainingTime - this.TIME_RESERVE;
        const timeBudget = this.calculateTimeBudget(
            usableTime,
            gamePhase,
            this.moveCount,
            board
        );

        //console.log(`Fase: ${gamePhase}, Movimiento: ${this.moveCount}, Tiempo asignado: ${timeBudget}ms, Tiempo restante: ${remainingTime}ms`);

        // 3. Búsqueda del mejor movimiento
        const result = this.findBestMove(
            board,
            color,
            moves,
            startTime,
            timeBudget,
            gamePhase
        );

        const timeUsed = Date.now() - startTime;
        //console.log(`Tiempo usado: ${timeUsed}ms, Mejor movimiento:`, result.bestMove, `Puntuación: ${result.bestScore.toFixed(2)}`);
        
        return result.bestMove;
    }

    calculateTimeBudget(usableTime, gamePhase, moveCount, board) {
        // Tiempo base según fase del juego
        let timeBudget = usableTime * this.PHASE_TIME_RATIOS[gamePhase];
        
        // Ajuste especial para primera jugada
        if (moveCount === 1) {
            return Math.min(
                this.MAX_FIRST_MOVE_TIME,
                Math.max(this.MIN_MOVE_TIME, timeBudget)
            );
        }
        
        // Ajuste por tamaño del tablero
        const sizeFactor = this.getSizeFactor(board);
        timeBudget *= sizeFactor;
        
        // Aplicar límites absolutos
        return Math.max(
            this.MIN_MOVE_TIME,
            Math.min(timeBudget, this.MAX_MOVE_TIME)
        );
    }

    getSizeFactor(board) {
        const cellCount = board.board.length * board.board[0].length;
        // Escala basada en tamaño del tablero
        if (cellCount <= 100) return 1.0;    // 10x10
        if (cellCount <= 400) return 1.2;    // 20x20
        return 1.4;                          // 30x30
    }

    getGamePhase(board) {
        const totalCells = board.board.length * board.board[0].length;
        const filledCells = this.countFilledCells(board);
        const fillRatio = filledCells / totalCells;
        
        if (fillRatio < 0.3) return 'opening';
        if (fillRatio > 0.7) return 'endgame';
        return 'midgame';
    }

    findBestMove(board, color, moves, startTime, timeBudget, gamePhase) {
        // 1. Selección de candidatos
        const candidates = this.selectCandidateMoves(moves, board, color, gamePhase);
        
        // 2. Determinar profundidad de búsqueda
        const depth = this.calculateSearchDepth(
            board,
            candidates.length,
            timeBudget,
            gamePhase
        );

        //console.log(`Evaluando ${candidates.length} candidatos con profundidad ${depth}`);

        // 3. Evaluación de movimientos
        let bestMove = candidates[0];
        let bestScore = -Infinity;

        for (const move of candidates) {
            if (Date.now() - startTime >= timeBudget) {
                //console.log(`Tiempo agotado. Movimientos evaluados: ${candidates.indexOf(move)}/${candidates.length}`);
                break;
            }

            const simulated = board.clone();
            if (!simulated.move(move.x, move.y, color)) {
                //console.warn(`Movimiento inválido detectado:`, move);
                continue;
            }

            const score = this.evaluateMove(
                simulated,
                color,
                depth - 1,
                startTime,
                timeBudget
            );

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
                //console.log(`Nuevo mejor movimiento:`, move, `Puntuación: ${score.toFixed(2)}`);
            }
        }

        return { bestMove, bestScore };
    }

    selectCandidateMoves(moves, board, color, gamePhase) {
        // Filtrado por importancia estratégica
        const filtered = moves.filter(move => 
            this.isStrategicMove(move, board, color, gamePhase)
        );

        // Asegurar mínimo de candidatos
        const safeCandidates = filtered.length > 0 ? filtered : moves.slice(0, 5);

        // Ordenar por potencial y limitar
        return safeCandidates
            .sort((a, b) => this.evaluateMovePotential(b, board) - this.evaluateMovePotential(a, board))
            .slice(0, 15); // Máximo 15 candidatos
    }

    calculateSearchDepth(board, candidateCount, timeBudget, gamePhase) {
        const baseDepths = { opening: 2, midgame: 3, endgame: 4 };
        let depth = baseDepths[gamePhase];
        
        // Ajuste basado en tiempo disponible por candidato
        const timePerCandidate = timeBudget / Math.max(1, candidateCount);
        
        if (timePerCandidate < 150) depth = Math.max(1, depth - 2);
        else if (timePerCandidate < 300) depth = Math.max(1, depth - 1);
        
        //console.log(`Profundidad calculada: ${depth} (tiempo por candidato: ${timePerCandidate.toFixed(1)}ms)`);
        return depth;
    }

    evaluateMove(board, color, depth, startTime, timeBudget) {
        if (depth <= 0 || Date.now() - startTime >= timeBudget) {
            const score = this.quickEvaluate(board, color);
            return score;
        }

        const opponentColor = color === 'W' ? 'B' : 'W';
        const moves = board.valid_moves(color);
        
        if (moves.length === 0) return -Infinity;
        
        let bestScore = -Infinity;
        const candidates = this.selectCandidateMoves(moves, board, color, 'midgame');
        
        for (const move of candidates) {
            if (Date.now() - startTime >= timeBudget) break;
            
            const simulated = board.clone();
            simulated.move(move.x, move.y, color);
            
            const score = -this.evaluateMove(
                simulated,
                opponentColor,
                depth - 1,
                startTime,
                timeBudget
            );
            
            bestScore = Math.max(bestScore, score);
        }
        
        return bestScore;
    }

    getQuickMove(board, color) {
        // Evaluación rápida cuando queda poco tiempo
        const moves = board.valid_moves(color);
        if (moves.length === 0) return null;
        
        let bestMove = moves[0];
        let bestScore = -Infinity;
        
        for (const move of moves.slice(0, 5)) { // Solo evaluar 5 movimientos
            const simulated = board.clone();
            simulated.move(move.x, move.y, color);
            const score = this.quickEvaluate(simulated, color);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    quickEvaluate(board, color) {
        // Evaluación rápida con pesos estratégicos
        const weights = this.getEvaluationWeights(board);
        const score = (
            this.evaluateCorners(board, color) * weights.corner +
            this.evaluateEdges(board, color) * weights.edge +
            this.evaluateCenter(board, color) * weights.center +
            this.evaluateMobility(board, color) * weights.mobility
        );
        return score;
    }

    getEvaluationWeights(board) {
        const gamePhase = this.getGamePhase(board);
        const isLargeBoard = board.board.length * board.board[0].length > 100;
        
        if (gamePhase === 'opening') {
            return {
                corner: isLargeBoard ? 6 : 10,
                edge: isLargeBoard ? 4 : 6,
                center: isLargeBoard ? 5 : 3,
                mobility: 2
            };
        }
        
        if (gamePhase === 'endgame') {
            return {
                corner: 15,
                edge: 5,
                center: 2,
                mobility: 3
            };
        }
        
        // Midgame
        return {
            corner: 10,
            edge: 5,
            center: 4,
            mobility: 3
        };
    }

    isStrategicMove(move, board, color, gamePhase) {
        const { x, y } = move;
        const width = board.board[0].length;
        const height = board.board.length;
        
        // Esquinas son siempre estratégicas
        if ((x === 0 || x === width-1) && (y === 0 || y === height-1)) return true;
        
        // En apertura, priorizar bordes
        if (gamePhase === 'opening' && 
            (x === 0 || x === width-1 || y === 0 || y === height-1)) return true;
            
        // En finales, priorizar movimientos que ganan fichas
        if (gamePhase === 'endgame') {
            const simulated = board.clone();
            simulated.move(x, y, color);
            return (this.countPieces(simulated, color) - this.countPieces(board, color)) > 2;
        }
            
        return true;
    }

    evaluateMovePotential(move, board) {
        const width = board.board[0].length;
        const height = board.board.length;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Distancia al centro (menor es mejor)
        const centrality = 100 - Math.sqrt(Math.pow(move.x - centerX, 2) + Math.pow(move.y - centerY, 2));
        
        // Bonus por bordes y esquinas
        let positionBonus = 0;
        if (move.x === 0 || move.x === width-1 || move.y === 0 || move.y === height-1) {
            positionBonus = 30;
            if ((move.x === 0 || move.x === width-1) && (move.y === 0 || move.y === height-1)) {
                positionBonus = 50; // Bonus extra por esquinas
            }
        }
        
        return centrality + positionBonus;
    }

    evaluateCorners(board, color) {
        const opponentColor = color === 'W' ? 'B' : 'W';
        const width = board.board[0].length;
        const height = board.board.length;
        const corners = [
            [0, 0], [0, height-1], [width-1, 0], [width-1, height-1]
        ];
        
        let score = 0;
        for (const [x, y] of corners) {
            if (board.board[y][x] === color) score++;
            else if (board.board[y][x] === opponentColor) score--;
        }
        return score;
    }

    evaluateEdges(board, color) {
        const opponentColor = color === 'W' ? 'B' : 'W';
        const width = board.board[0].length;
        const height = board.board.length;
        let score = 0;
        
        for (let x = 0; x < width; x++) {
            if (board.board[0][x] === color) score++;
            else if (board.board[0][x] === opponentColor) score--;
            
            if (board.board[height-1][x] === color) score++;
            else if (board.board[height-1][x] === opponentColor) score--;
        }
        
        for (let y = 1; y < height-1; y++) {
            if (board.board[y][0] === color) score++;
            else if (board.board[y][0] === opponentColor) score--;
            
            if (board.board[y][width-1] === color) score++;
            else if (board.board[y][width-1] === opponentColor) score--;
        }
        
        return score;
    }

    evaluateCenter(board, color) {
        const opponentColor = color === 'W' ? 'B' : 'W';
        const width = board.board[0].length;
        const height = board.board.length;
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const radius = Math.min(width, height) / 4;
        let score = 0;
        
        // Asegurarse de que los índices sean enteros
        const startY = Math.max(0, Math.floor(centerY - radius));
        const endY = Math.min(height, Math.ceil(centerY + radius));
        const startX = Math.max(0, Math.floor(centerX - radius));
        const endX = Math.min(width, Math.ceil(centerX + radius));
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (board.board[y][x] === color) score++;
                else if (board.board[y][x] === opponentColor) score--;
            }
        }
        
        return score;
    }

    evaluateMobility(board, color) {
        const opponentColor = color === 'W' ? 'B' : 'W';
        return board.valid_moves(color).length - board.valid_moves(opponentColor).length;
    }

    countFilledCells(board) {
        let count = 0;
        for (const row of board.board) {
            for (const cell of row) {
                if (cell !== ' ') count++;
            }
        }
        return count;
    }

    countPieces(board, color) {
        let count = 0;
        for (const row of board.board) {
            for (const cell of row) {
                if (cell === color) count++;
            }
        }
        return count;
    }
}