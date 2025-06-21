class TuringianosAgentV2 extends Agent{
    constructor(){
        super()
        this.name = "Turingianos";
        this.turns = 0; // Counter
        // Memoization cache
        this.memoCache = new Map();
    }
    
    compute(percept){
        var color = percept['color'] // Gets player's color
        var wtime = percept['W'] // Gets remaining time of whites color player
        var btime = percept['B'] // Gets remaining time of blacks color player
        var board = percept['board'] // Gets the current board's position
        var moves = board.valid_moves(color)
        var time_left = color == 'W' ? wtime : btime
        this.turns += 1 // Add 1 to the turn, usefull to guess if we are in early, mid or late game
        
        if (time_left < 200) { // if we have no time, play random
            var index = Math.floor(moves.length * Math.random())
            return moves[index]
        }

        if (time_left > 2000 && time_left < 5000) { // if we less time, we do less search (probably)
            this.depth = 2;
        }

        if (time_left > 200 && time_left < 2000) { // if we less time, we do less search (probably)
            this.depth = 1;
        }

        if (time_left > 5000) { // Constructor is only called once, they dont restart our agent at play time
            this.depth = 3;
        }

        let bestScore = -Infinity;
        let bestMove = moves[0];
        this.memoCache.clear(); // Reset cache for each new turn to avoid crashing memory (this should use 400mb of memory at maximum if we clear it every turn)
        // For each possible move, check negamax
        for (let move of moves) {
            let newBoard = this.simulateMove(board, move, color);
            let score = -this.negamax(newBoard, this.opponent(color), this.depth,-Infinity, Infinity);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return {'x': bestMove.x, 'y': bestMove.y};
    }

    negamax(board, color, depth, alpha, beta) {
        // TODO: order moves by heuristic to improve performance
        // TODO use a better and faster cache key, use hash of every board position
        // TODO: better heuristic function, not just count pieces
        // TODO: use transposition table to store already evaluated positions (horizontal flip and vertical flip)
        // Generate a unique cache key (board + depth)
        const cacheKey = JSON.stringify(board.board) + depth;

        // Check if this position + depth is already memoized
        if (this.memoCache.has(cacheKey)) {
            return this.memoCache.get(cacheKey);
        }

        let moves = board.valid_moves(color);
        if (depth === 0 || moves.length === 0) {
            const score = this.evaluate(board, color);
            this.memoCache.set(cacheKey, score); // Store result
            return score;
        }

        let maxScore = -Infinity;
        for (let move of moves) {
            
            let newBoard = this.simulateMove(board, move, color);
            let score = -this.negamax(newBoard, this.opponent(color), depth - 1, -beta, -alpha);
            if (score > maxScore) {
                maxScore = score;
            }
            alpha = Math.max(alpha, score);
            if (alpha >= beta) {
                break; // Beta cut-off
            }
        }
        this.memoCache.set(cacheKey, maxScore); // Store result
        return maxScore;
    }

    /**
     * Count the number of pieces for each player on the board.
     * and return the difference between the player's pieces and the opponent's pieces.
     */
    evaluate(board, color) {
        let myCount = 0, oppCount = 0;
        let opp = this.opponent(color);
        let matrix = board.board; //Retorna el tablero actual como una matriz y no como objeto Board
        // console.log("matriz:", matrix);
        //console.log("color:", color);

        // Conteo de piezas en el tablero
        // Recorre la matriz y cuenta las piezas del jugador y del oponente
        let rows = matrix.length;
        let cols = matrix[0].length;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (!matrix[i] || !matrix[i][j]) continue;
                if (matrix[i][j] === color) myCount++;
                else if (matrix[i][j] === opp) oppCount++;
            }
        }
        return myCount - oppCount;
    }

    //Simulacion básica a través de los mismos metodos del objeto Board, clonando tablero y moviendo la pieza.
    /**
     * Simulates a move on the board by cloning it and applying the move.
     * @param {Board} board - The current board state.
     * @param {Object} move - The move to simulate, with properties x and y.
     * @param {string} color - The color of the player making the move.
     * @returns {Board} - A new board state after the simulated move.
     */
    simulateMove(board, move, color) {
        let newBoard = board.clone();
        newBoard.move(move.x, move.y, color);
        return newBoard;
    }

    opponent(color) {
        return color === 'B' ? 'W' : 'B';
    }
}


class TuringianosAgentV1 extends Agent{
    constructor(){
        super()
        this.name = "Turingianos";
        this.turns = 0; // Counter
    }
    
    compute(percept){
        var color = percept['color'] // Gets player's color
        var wtime = percept['W'] // Gets remaining time of whites color player
        var btime = percept['B'] // Gets remaining time of blacks color player
        var board = percept['board'] // Gets the current board's position
        var moves = board.valid_moves(color)
        var time_left = color == 'W' ? wtime : btime
        this.turns += 1 // Add 1 to the turn, usefull to guess if we are in early, mid or late game
        
        if (time_left < 500) { // if we have no time, play random
            var index = Math.floor(moves.length * Math.random())
            return moves[index]
        }

        if (time_left > 2000 && time_left < 4000) { // if we less time, we do less search (probably)
            this.depth = 3;
        }

        if (time_left > 500 && time_left < 2000) { // if we less time, we do less search (probably)
            this.depth = 2;
        }

        if (time_left > 4000) { // Constructor is only called once, they dont restart our agent at play time
            this.depth = 4;
        }
        if (moves.length === 0) return null; // esto no deberia ser posible, el ambiente se asegura de ello.

        let bestScore = -Infinity;
        let bestMove = moves[0];

        // For each possible move, check negamax
        for (let move of moves) {
            let newBoard = this.simulateMove(board, move, color);
            let score = -this.negamax(newBoard, this.opponent(color), this.depth);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return {'x': bestMove.x, 'y': bestMove.y};
    }

    negamax(board, color, depth) {
        let moves = board.valid_moves(color);
        if (depth === 0 || moves.length === 0) {
            return this.evaluate(board, color);
        }

        let maxScore = -Infinity;
        for (let move of moves) {
            
            let newBoard = this.simulateMove(board, move, color);
            let score = -this.negamax(newBoard, this.opponent(color), depth - 1);
            if (score > maxScore) {
                maxScore = score;
            }
        }
        return maxScore;
    }

    /**
     * Count the number of pieces for each player on the board.
     * and return the difference between the player's pieces and the opponent's pieces.
     */
    evaluate(board, color) {
        let myCount = 0, oppCount = 0;
        let opp = this.opponent(color);
        let matrix = board.board; //Retorna el tablero actual como una matriz y no como objeto Board
        // console.log("matriz:", matrix);
        //console.log("color:", color);

        // Conteo de piezas en el tablero
        // Recorre la matriz y cuenta las piezas del jugador y del oponente
        let rows = matrix.length;
        let cols = matrix[0].length;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (!matrix[i] || !matrix[i][j]) continue;
                if (matrix[i][j] === color) myCount++;
                else if (matrix[i][j] === opp) oppCount++;
            }
        }
        return myCount - oppCount;
    }

    //Simulacion básica a través de los mismos metodos del objeto Board, clonando tablero y moviendo la pieza.
    /**
     * Simulates a move on the board by cloning it and applying the move.
     * @param {Board} board - The current board state.
     * @param {Object} move - The move to simulate, with properties x and y.
     * @param {string} color - The color of the player making the move.
     * @returns {Board} - A new board state after the simulated move.
     */
    simulateMove(board, move, color) {
        let newBoard = board.clone();
        newBoard.move(move.x, move.y, color);
        return newBoard;
    }

    opponent(color) {
        return color === 'B' ? 'W' : 'B';
    }
}