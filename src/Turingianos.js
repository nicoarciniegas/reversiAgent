// Simple negamax
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




// No alpha beta pruning, just better heuristic
class TuringianosAgentV2 extends Agent{
    constructor(){
        super()
        this.name = "Turingianos";
        this.turns = 0;
        this.weight_grid = [];
        this.current_color = '';
        this.depth = 2;
    }

    initialize_agent(color, board) {
        this.weight_grid = [];
        this.turns = 0; // Reset turns
        this.current_color = color; // Reset current color
        this.depth = 1; // Reset depth
        this.weight_grid = this.generateWeightGrid(board); // Generate weight grid for the first time
        // console.log("Weight grid", this.weight_grid);
    }

    /**
     * Generates a weight grid for any board size (square or rectangular).
     * Values:
     * - Corners: +20
     * - X-Squares (diagonal to corners): -5
     * - C-Squares (next to corners): -3
     * - Edges: +2
     * - Inner squares: 0
     */
    generateWeightGrid(board) {
        let matrix = board.board; //Retorna el tablero actual como una matriz y no como objeto Board
        // Conteo de piezas en el tablero
        // Recorre la matriz y cuenta las piezas del jugador y del oponente
        let rows = matrix.length;
        let cols = matrix[0].length;
        const maxDimension = Math.max(rows, cols);
        let grid = Array.from({ length: rows }, () => Array(cols).fill(1)); // Initialize grid with ones
        // Dynamic edge value (scales with board size)
        const baseEdgeValue = 2;
        const scaledEdgeValue = baseEdgeValue + Math.max(0, maxDimension - 8) * 0.5;
        const edgeValue = Math.round(scaledEdgeValue); // Round to integer
        const scale = Math.max(1, Math.floor(maxDimension / 8)); // Scale factor for edge values

        // Corners (always +20)
        const corners = [
            [0, 0], [0, cols - 1],
            [rows - 1, 0], [rows - 1, cols - 1]
        ];
        corners.forEach(([i, j]) => grid[i][j] = 20 + 10 * scale); // Scale corner value

        // X-Squares (always -5)
        corners.forEach(([i, j]) => {
            if (i > 0 && j > 0) grid[i - 1][j - 1] = -5 - 2 * scale;
            if (i > 0 && j < cols - 1) grid[i - 1][j + 1] = -5 - 2 * scale;
            if (i < rows - 1 && j > 0) grid[i + 1][j - 1] = -5 - 2 * scale;
            if (i < rows - 1 && j < cols - 1) grid[i + 1][j + 1] = -5 - 2 * scale; // Scale X-square value
        });

        // C-Squares (always -3)
        corners.forEach(([i, j]) => {
            if (i > 0) grid[i - 1][j] = -3 - 2 * scale;
            if (i < rows - 1) grid[i + 1][j] = -3 - 2 * scale;
            if (j > 0) grid[i][j - 1] = -3 - 2 * scale;
            if (j < cols - 1) grid[i][j + 1] = -3 - 2 * scale;
        });

        // Edges (scaled value)
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] !== 1) continue; // Skip assigned squares
                if (i === 0 || i === rows - 1 || j === 0 || j === cols - 1) {
                    grid[i][j] = edgeValue; // Dynamic edge weight
                }
            }
        }

        return grid;
    }
    
    compute(percept){
        var color = percept['color'] // Gets player's color
        var wtime = percept['W'] // Gets remaining time of whites color player
        var btime = percept['B'] // Gets remaining time of blacks color player
        var board = percept['board'] // Gets the current board's position
        var moves = board.valid_moves(color)
        var time_left = color == 'W' ? wtime : btime
        this.turns += 1 // Add 1 to the turn, usefull to guess if we are in early, mid or late game
        
        if (this.current_color != color){
            this.initialize_agent(color,board);
        }

        if (time_left < 500) { // if we have no time, play random
            var index = Math.floor(moves.length * Math.random())
            return moves[index]
        }

        if (time_left > 2000 && time_left < 4000) { // if we less time, we do less search (probably)
            this.depth = 2;
        }

        if (time_left > 500 && time_left < 2000) { // if we less time, we do less search (probably)
            this.depth = 1;
        }

        if (time_left > 4000) { // Constructor is only called once, they dont restart our agent at play time
            this.depth = 2;
        }
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
        const opp = this.opponent(color);
        const matrix = board.board;
        let score = 0;

        // Sum weights for all pieces
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (matrix[i][j] === color) {
                    score += this.weightGrid[i][j]; // Add weight for player's piece
                } else if (matrix[i][j] === opp) {
                    score -= this.weightGrid[i][j]; // Subtract weight for opponent's piece
                }
            }
        }

        // Optional: Add mobility/corner bonuses
        
        const myMoves = board.valid_moves(color).length;
        const oppMoves = board.valid_moves(opp).length;
        score += 2 * (myMoves - oppMoves); // Mobility bonus

        return score;
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



// alpha beta pruning and memoization
class TuringianosAgentV3 extends Agent{
    constructor(){
        super()
        this.name = "Turingianos";
        this.turns = 0; // Counter
        // Memoization cache
        this.memoCache = new Map();
        this.depth = 3; // Default depth
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
            this.depth = 0;
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

// alpha beta pruning, memoization and heuristic with grid weight, and movilization bonus
class TuringianosAgentV4 extends Agent{
    constructor(){
        super()
        this.name = "Turingianos";
        this.turns = 0;
        this.weight_grid = [];
        this.current_color = '';
        this.depth = 3;
        // Memoization cache
        this.memoCache = new Map();
    }

    initialize_agent(color, board) {
        console.log("Initializing agent again");
        this.weight_grid = [];
        this.turns = 0; // Reset turns
        this.current_color = color; // Reset current color
        this.depth = 3; // Reset depth
        this.weight_grid = this.generateWeightGrid(board); // Generate weight grid for the first time
        // Memoization cache
        this.memoCache = new Map();
        console.log("Weight grid", this.weight_grid);
    }

    /**
     * Generates a weight grid for any board size (square or rectangular).
     * Values:
     * - Corners: +20
     * - X-Squares (diagonal to corners): -5
     * - C-Squares (next to corners): -3
     * - Edges: +2
     * - Inner squares: 0
     */
    generateWeightGrid(board) {
        let matrix = board.board; //Retorna el tablero actual como una matriz y no como objeto Board
        // Conteo de piezas en el tablero
        // Recorre la matriz y cuenta las piezas del jugador y del oponente
        let rows = matrix.length;
        let cols = matrix[0].length;
        const maxDimension = Math.max(rows, cols);
        let grid = Array.from({ length: rows }, () => Array(cols).fill(1)); // Initialize grid with ones
        // Dynamic edge value (scales with board size)
        const baseEdgeValue = 1;
        const scaledEdgeValue = baseEdgeValue + Math.floor(Math.max(0, maxDimension - 10) * 0.25);
        const edgeValue = Math.round(scaledEdgeValue); // Round to integer
        const scale = Math.max(1,maxDimension/10); // Scale factor for edge values

        const corners = [
            [0, 0], [0, cols - 1],
            [rows - 1, 0], [rows - 1, cols - 1]
        ];
        corners.forEach(([i, j]) => grid[i][j] = 4 + 2 * scale); // Scale corner value

        // X-Squares (always -5)
        
        corners.forEach(([i, j]) => {
            if (i > 0 && j > 0) grid[i - 1][j - 1] = -1 - 1 * scale;
            if (i > 0 && j < cols - 1) grid[i - 1][j + 1] = -1 - 1 * scale;
            if (i < rows - 1 && j > 0) grid[i + 1][j - 1] = -1 - 1 * scale;
            if (i < rows - 1 && j < cols - 1) grid[i + 1][j + 1] = -1 - 1 * scale; // Scale X-square value
        });
        

        // C-Squares (always -3)
        
        corners.forEach(([i, j]) => {
            if (i > 0) grid[i - 1][j] = -1 - 1 * scale;
            if (i < rows - 1) grid[i + 1][j] = -1 - 1 * scale;
            if (j > 0) grid[i][j - 1] = -1 - 1 * scale;
            if (j < cols - 1) grid[i][j + 1] = -1 - 1 * scale;
        });
        

        // Edges (scaled value)
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] !== 1) continue; // Skip assigned squares
                if (i === 0 || i === rows - 1 || j === 0 || j === cols - 1) {
                    grid[i][j] = edgeValue; // Dynamic edge weight
                }
            }
        }

        return grid;
    }
    
    compute(percept){
        var color = percept['color'] // Gets player's color
        var wtime = percept['W'] // Gets remaining time of whites color player
        var btime = percept['B'] // Gets remaining time of blacks color player
        var board = percept['board'] // Gets the current board's position
        var moves = board.valid_moves(color)
        var time_left = color == 'W' ? wtime : btime
        this.turns += 1 // Add 1 to the turn, usefull to guess if we are in early, mid or late game
        
        if (this.current_color != color){
            this.initialize_agent(color,board);
        }
        
        if (time_left < 600) { // if we have no time, check only 1 move
            this.depth = 0;
        }

        if (time_left < 70) { // if we have no time, play random
            var index = Math.floor(moves.length * Math.random())
            return moves[index]
        }
        
        if (time_left > 2000 && time_left < 5000) { // if we less time, we do less search (probably)
            this.depth = 1;
        }

        if (time_left > 600 && time_left < 2000) { // if we less time, we do less search (probably)
            this.depth = 1;
        }

        if (time_left > 5000) { // Constructor is only called once, they dont restart our agent at play time
            this.depth = 3;
        }
        if (this.turns < 40) { // Early game, use less depth
            this.depth = 1; 
        }

        let bestScore = -Infinity;
        let bestMove = moves[0];
        if (this.turns % 2 === 0) {
            this.memoCache.clear(); // Reset cache for each new turn to avoid crashing memory (this should use 400mb of memory at maximum if we clear it every turn)
        }
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
        let opp = this.opponent(color);
        let matrix = board.board;
        let score = 0;
        let rows = matrix.length;
        let cols = matrix[0].length;
        // Sum weights for all pieces
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (matrix[i][j] === color) {
                    score += this.weight_grid[i][j]; // Add weight for player's piece
                } else if (matrix[i][j] === opp) {
                    score -= this.weight_grid[i][j]; // Subtract weight for opponent's piece
                }
            }
        }
        
        const myMoves = board.valid_moves(color).length;
        const oppMoves = board.valid_moves(opp).length;
        //console.log("My moves:", myMoves, "Opponent moves:", oppMoves);
        score += 1*(myMoves - oppMoves); // Mobility bonus
        
        return score;
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

