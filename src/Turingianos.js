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


// alpha beta pruning, memoization and heuristic with grid weight, and movilization bonus, movement with moment, mas peso a los movimientos
// cercanos, estrategia para forzar algun camino estrategicamente
class TuringianosAgentV5 extends Agent{
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
            if (i > 0 && j > 0) grid[i - 1][j - 1] = -5 - 1 * scale;
            if (i > 0 && j < cols - 1) grid[i - 1][j + 1] = -5 - 1 * scale;
            if (i < rows - 1 && j > 0) grid[i + 1][j - 1] = -5 - 1 * scale;
            if (i < rows - 1 && j < cols - 1) grid[i + 1][j + 1] = -5 - 1 * scale; // Scale X-square value re added -5
        });
        

        // C-Squares (always -3)
        
        corners.forEach(([i, j]) => {
            if (i > 0) grid[i - 1][j] = -3 - 1 * scale;
            if (i < rows - 1) grid[i + 1][j] = -3 - 1 * scale;
            if (j > 0) grid[i][j - 1] = -3 - 1 * scale;
            if (j < cols - 1) grid[i][j + 1] = -3 - 1 * scale; //Re added -3
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
        
        if (time_left < 666) { // if we have no time, check only 1 move
            this.depth = 0;
        }

        if (time_left < 70) { // if we have no time, play random
            var index = Math.floor(moves.length * Math.random())
            return moves[index]
        }
        /*
        if (time_left > 5000 && time_left < 6666 { // if we less time, we do less search (probably)
            this.depth = 2;
        }
        */
        if (time_left > 2000 && time_left < 6666) { // if we less time, we do less search (probably)
            this.depth = 2;
        }
         if (time_left > 666 && time_left < 2000) { // if we less time, we do less search (probably)
            this.depth = 1;
        }

        if (time_left > 6666) { // Constructor is only called once, they dont restart our agent at play time
            this.depth = 2;
        }
        if (this.turns < 7) { // Strong opening - tuned to less than 7 turns
            this.depth = 4; 
        }

        let bestScore = -Infinity;
        let bestMove = moves[0];
        if (this.turns % 31 === 0) {
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

     getBoardHash(board) {
        // .flat() creates a 1D array, .join('') creates a single string.
        // This is much faster than JSON.stringify for caching.
        return board.board.flat().join('');
    }


    negamax(board, color, depth, alpha, beta) {
        // Uses the new, faster hashing function for the cache key.
        const cacheKey = this.getBoardHash(board) + depth;

        if (this.memoCache.has(cacheKey)) {
            return this.memoCache.get(cacheKey);
        }

        let moves = board.valid_moves(color);
        if (depth === 0 || moves.length === 0) {
            const score = this.evaluate(board, color);
            this.memoCache.set(cacheKey, score);
            return score;
        }

        // Move Ordering Implementation
        // Sort moves based on the weight_grid value of the destination square.
        // This makes alpha-beta pruning much more effective.
        moves.sort((a, b) => {
            const scoreA = this.weight_grid[a.y][a.x];
            const scoreB = this.weight_grid[b.y][b.x];
            return scoreB - scoreA; // Sort in descending order (best moves first)
        });


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
        
        this.memoCache.set(cacheKey, maxScore);
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
        const mobilityWeight = 5 * Math.max(1, Math.max(rows, cols) / 4);
        score += mobilityWeight * (myMoves - oppMoves); // Mobility bonus, scaled by board size
        //score += 1*(myMoves - oppMoves); // Mobility bonus
        
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


// alpha beta pruning, memoization and heuristic with grid weight, and movilization bonus
// Endgame way too heavy needs more tuning, crashes game
class TuringianosAgentV6 extends Agent{
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
            if (i > 0 && j > 0) grid[i - 1][j - 1] = -5 - 1 * scale;
            if (i > 0 && j < cols - 1) grid[i - 1][j + 1] = -5 - 1 * scale;
            if (i < rows - 1 && j > 0) grid[i + 1][j - 1] = -5 - 1 * scale;
            if (i < rows - 1 && j < cols - 1) grid[i + 1][j + 1] = -5 - 1 * scale; // Scale X-square value re added -5
        });
        

        // C-Squares (always -3)
        
        corners.forEach(([i, j]) => {
            if (i > 0) grid[i - 1][j] = -3 - 1 * scale;
            if (i < rows - 1) grid[i + 1][j] = -3 - 1 * scale;
            if (j > 0) grid[i][j - 1] = -3 - 1 * scale;
            if (j < cols - 1) grid[i][j + 1] = -3 - 1 * scale; //Re added -3
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
        //Endgame solver strategy
        const emptySquares = board.board.flat().filter(p => p === ' ').length;
        //const isEndgame = emptySquares <= (board.board.flat().length / 4)-3; // Or whatever threshold, sides minus 3 repeated cells TOO HEAVY
        //const isEndgame = emptySquares <= ((1/board.board.flat().length )*100) *2; // Or whatever threshold, sides minus 3 repeated cells TOO HEAVY
        //console.log(((1/board.board.flat().length )*100) *2)
        const totalSquares = board.board.flat().length;
        const endgameThreshold = Math.min(Math.floor(totalSquares * 0.02), 17); // Use 2% of the board, but cap it at 17
        const isEndgame = emptySquares <= endgameThreshold;
        
        console.log("Is empty:", emptySquares);
        console.log("Is endgame:", isEndgame);

        if (this.current_color != color){
            this.initialize_agent(color,board);
        }
        
        if (time_left < 30) {
            return moves[Math.floor(moves.length * Math.random())];
        }

        if (time_left < 333) {
            this.depth = 0;
        } else if (time_left < 2000) {
            this.depth = 1;
        } else if (time_left < 10000) {
            this.depth = 2;
        } else { 
            this.depth = 3; 
        }
        if (this.turns < 13) {
            this.depth = 4;
        }

        let bestScore = -Infinity;
        let bestMove = moves[0];
        if (this.turns % 31 === 0) {
            this.memoCache.clear(); // Reset cache for each new turn to avoid crashing memory (this should use 400mb of memory at maximum if we clear it every turn)
        }
        // For each possible move, check negamax
        for (let move of moves) {
            let newBoard = this.simulateMove(board, move, color);
            let score = -this.negamax(newBoard, this.opponent(color), this.depth, -Infinity, Infinity, isEndgame); //added endgame flag
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return {'x': bestMove.x, 'y': bestMove.y};
    }

     getBoardHash(board) {
        // .flat() creates a 1D array, .join('') creates a single string.
        // This is much faster than JSON.stringify for caching.
        return board.board.flat().join('');
    }


    negamax(board, color, depth, alpha, beta, isEndgame) {
        // Uses the new, faster hashing function for the cache key.
        const cacheKey = this.getBoardHash(board) + depth + isEndgame;
        if (this.memoCache.has(cacheKey)) {
            return this.memoCache.get(cacheKey);
        }

        let moves = board.valid_moves(color);
        
        if (moves.length === 0 && board.valid_moves(this.opponent(color)).length === 0) {
            // Game over. Return the exact disc difference. A large multiplier ensures this is preferred over heuristic scores.
            const my_pieces = board.board.flat().filter(p => p === this.current_color).length;
            const opp_pieces = board.board.flat().filter(p => p === this.opponent(this.current_color)).length;
            const finalScore = (my_pieces - opp_pieces) * 1000;
            this.memoCache.set(cacheKey, finalScore);
            return finalScore;
        }
        if (!isEndgame && depth === 0) {
            const score = this.evaluate(board, color);
            this.memoCache.set(cacheKey, score);
            return score;
        }
        if (moves.length === 0) {
            return -this.negamax(board, this.opponent(color), depth, -beta, -alpha, this.isEndgame);
        }
        // Move Ordering Implementation
        // Sort moves based on the weight_grid value of the destination square.
        // This makes alpha-beta pruning much more effective.
        moves.sort((a, b) => {
            const scoreA = this.weight_grid[a.y][a.x];
            const scoreB = this.weight_grid[b.y][b.x];
            return scoreB - scoreA; // Sort in descending order (best moves first)
        });


        let maxScore = -Infinity;
        for (let move of moves) {
            let newBoard = this.simulateMove(board, move, color);

            // The recursive call depends on whether we are in the endgame or not.
            let score;
            if (this.isEndgame) {
                depth=1 // In the endgame, search all the way down. Don't decrement depth.
                // In the endgame, search all the way down. Don't decrement depth.
                score = -this.negamax(newBoard, this.opponent(color), depth, -beta, -alpha, true);
            } else {
            // In the mid-game, decrement depth.
                score = -this.negamax(newBoard, this.opponent(color), depth - 1, -beta, -alpha, false);
             }

            if (score > maxScore) {
                maxScore = score;
            }
            alpha = Math.max(alpha, score);
            if (alpha >= beta) {
                break; // Prune the search
            }
        }
        
        this.memoCache.set(cacheKey, maxScore);
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
        const mobilityWeight = 5 * Math.max(1, Math.max(rows, cols) / 4);
        score += mobilityWeight * (myMoves - oppMoves); // Mobility bonus, scaled by board size
        //score += 1*(myMoves - oppMoves); // Mobility bonus
        
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

// alpha beta pruning, memoization and heuristic with grid weight,mobilization bonus, and transposition table
class TuringianosAgentV7 extends Agent{
    constructor(){
        super()
        this.name = "Turingianos";
        this.turns = 0;
        this.weight_grid = [];
        this.current_color = '';
        this.depth = 5;
        // Memoization cache
        this.memoCache = new Map();
        this.matrixHashNormal = []
        this.matrixHashFlipH = []
        this.matrixHashFlipV = []
        // TODO rotaciones si matriz es cuadrada
        
    }

    initialize_agent(color, board) {
        console.log("Initializing agent again");
        this.turns = 0; // Reset turns
        this.current_color = color; // Reset current color
        this.depth = 4; // Reset depth
        this.weight_grid = this.generateWeightGrid(board); // Generate weight grid for the first time
        // Memoization cache
        this.memoCache = new Map();
        console.log("Weight grid", this.weight_grid);
        this.matrixHashNormal = this.generateMatrixHash(board)
        this.matrixHashFlipH = this.flipMatrixH(this.matrixHashNormal)
        this.matrixHashFlipV = this.flipMatrixV(this.matrixHashNormal)

        console.log("hash grid", this.matrixHashNormal  );
        console.log("hash grid flipH", this.matrixHashFlipH  );
        console.log("hash grid flipV", this.matrixHashFlipV  );


    }
    generateMatrixHash(board){
        let matrix = board.board; //Retorna el tablero actual como una matriz y no como objeto Board
        // Conteo de piezas en el tablero
        // Recorre la matriz y cuenta las piezas del jugador y del oponente
        let rows = matrix.length;
        let cols = matrix[0].length;
        let count = 0;
        let grid = []
        for (let i = 0; i < rows; i++) {
            let prow = [];
            for (let j = 0; j < cols; j++) {
                count += 1;
                prow.push(count);
            }
            grid.push(prow);
        }
        return grid
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
        let grid = Array.from({ length: rows }, () => Array(cols).fill(0)); // Initialize grid with ones
        // Dynamic edge value (scales with board size)
        const baseEdgeValue = 1;
        const scaledEdgeValue = baseEdgeValue + Math.floor(Math.max(0, maxDimension - 10)) * 0.25;
        const edgeValue = Math.round(scaledEdgeValue+1); // Round to integer
        const scale = Math.max(1,maxDimension/10); // Scale factor for edge values

        const corners = [
            [0, 0], [0, cols - 1],
            [rows - 1, 0], [rows - 1, cols - 1]
        ];
        corners.forEach(([i, j]) => grid[i][j] = 10 + 2 * scale); // Scale corner value

        // X-Squares (always -5)
        
        corners.forEach(([i, j]) => {
            if (i > 0 && j > 0) grid[i - 1][j - 1] = -5 - 1 * scale;
            if (i > 0 && j < cols - 1) grid[i - 1][j + 1] = -5 - 1 * scale;
            if (i < rows - 1 && j > 0) grid[i + 1][j - 1] = -5 - 1 * scale;
            if (i < rows - 1 && j < cols - 1) grid[i + 1][j + 1] = -5 - 1 * scale; // Scale X-square value re added -5
        });
        

        // C-Squares (always -3)
        
        corners.forEach(([i, j]) => {
            if (i > 0) grid[i - 1][j] = -3 - 1 * scale;
            if (i < rows - 1) grid[i + 1][j] = -3 - 1 * scale;
            if (j > 0) grid[i][j - 1] = -3 - 1 * scale;
            if (j < cols - 1) grid[i][j + 1] = -3 - 1 * scale; //Re added -3
        });
        

        // Edges (scaled value)
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] !== 0) continue; // Skip assigned squares
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
        const time_lowerBound = this.total_time * 0.40;
        const time_upperBound = this.total_time * 0.60; // defines constains regardlesss of time
        if (this.turns === 1) {
            this.total_time = time_left;
        }
        if (this.current_color != color){
            this.initialize_agent(color,board);
        }
        // Being greeedy (depth==1) brings better play, but prone error
        //if (time_left > time_lowerBound && time_left < time_upperBound) {
        
        if (this.turns > 20) { // just guessing number of turn in after aperture
            this.depth = 3;
        }

        if (time_left < time_upperBound) {
            this.depth = 1;
        }
        else if(time_left < time_lowerBound){
            this.depth = 0;
        }
        if (time_left < 100) { //caso extremo
            return moves[Math.floor(moves.length * Math.random())];
        }
        
        let bestScore = -Infinity;
        let bestMove = moves[0];
        if (this.turns % 20 === 0) {
            this.memoCache.clear(); // Reset cache for each new turn to avoid crashing memory (this should use 400mb of memory at maximum if we clear it every turn)
        }
        // For each possible move, check negamax
        //TODO: Even with the check, the best move is not always in the list of valid moves.
        // This is a bug in the negamax implementation, not in the agent.
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

    // Rotate a matrix 90 degrees clockwise
    rotate(matrix) {
        const n = matrix.length;
        const m = matrix[0].length;
        const newMatrix = Array.from({ length: m }, () => Array(n));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                newMatrix[j][n - 1 - i] = matrix[i][j];
            }
        }
        return newMatrix;
    }
    // Flip a matrix horizontally
    flipMatrixH(matrix) {
        return matrix.map(row => row.slice().reverse());
    }

    // Flip a matrix vertically
    flipMatrixV (matrix) {
        return matrix.reverse();
    }
    
    getBoardHashes(board, color, depth) {
        let matrix = board.board;
        let rows = matrix.length;
        let cols = matrix[0].length;
        let hashes = [];
        let hashN = 0;
        let hashV = 0;
        let hashH = 0;
        let opp = this.opponent(color);
        const prime = 31; // A common prime number for hash functions

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (matrix[i][j] === color) {
                    let idx1 = this.matrixHashNormal[i][j];
                    hashN += (idx1 * prime);
                    let idx2 = this.matrixHashFlipH[i][j];
                    hashH += (idx2 * prime);
                    let idx3 = this.matrixHashFlipV[i][j];
                    hashV += (idx3 * prime); 
                    
                } else if (matrix[i][j] === opp) {
                    let idx1 = this.matrixHashNormal[i][j];
                    hashN += (idx1 * prime * 2 * 7); // multiply by 2 to differentiate opponent's pieces
                    let idx2 = this.matrixHashFlipH[i][j];
                    hashH += (idx2 * prime * 2 * 7);
                    let idx3 = this.matrixHashFlipV[i][j];
                    hashV += (idx3 * prime * 2 * 7); // multiply by 2 to differentiate opponent's pieces
                }
            }
        }
        hashes.push(String(hashN) + 'D' + String(depth)); // Add depth to the hash for uniqueness
        hashes.push(String(hashH) +  'D' + String(depth));
        hashes.push(String(hashV) +  'D' + String(depth));
        return hashes;
    }

    negamax(board, color, depth, alpha, beta) {
        // Uses the new, faster hashing function for the cache key.
        const cachesKeys = this.getBoardHashes(board,color, depth) ;

        for (let i = 0; i < cachesKeys.length; i++) {
            if (this.memoCache.has(cachesKeys[i])) {
                // console.log("Cache hit for key:", cachesKeys[i], 'hashes ', cachesKeys);
                return this.memoCache.get(cachesKeys[i]);
            }   
        }

        let moves = board.valid_moves(color);
        if (depth === 0 || moves.length === 0) {
            const score = this.evaluate(board, color);
            for (let i = 0; i < cachesKeys.length; i++) {
                this.memoCache.set(cachesKeys[i], score);
            }
            return score;
        }

        // Move Ordering Implementation
        // Sort moves based on the weight_grid value of the destination square.
        // This makes alpha-beta pruning much more effective.
        //  TODO sortear esto con nuestra funcion evaluadora y luego evitar
        // volver a evaluar lo mismo (o tal vez el cache lo arregla?)
        // inicializar alpha y beta segun mejores scores de este sorteo
        //moves.sort((a, b) => {
        //    const scoreA = this.weight_grid[a.x][a.y];
        //   const scoreB = this.weight_grid[b.x][b.y];
        //   return scoreB - scoreA; // Sort in descending order (best moves first)
        //});


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
        
        for (let i = 0; i < cachesKeys.length; i++) {
            this.memoCache.set(cachesKeys[i], maxScore);
        }
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
        let myPieces = 0;
        let oppPieces = 0;
        let myWeight = 0;
        let oppWeight = 0;
        // Sum weights for all pieces
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (matrix[i][j] === color) {
                    myWeight += this.weight_grid[i][j]; // Add weight for player's piece
                    myPieces += 1;
                } else if (matrix[i][j] === opp) {
                    oppWeight += this.weight_grid[i][j]; // Subtract weight for opponent's piece
                    oppPieces += 1;
                }
            }
        }
        
        const myMoves = board.valid_moves(color).length;
        const oppMoves = board.valid_moves(opp).length;
        let mobilityWeight = 5 * Math.max(1, Math.max(rows, cols) / 4);
        const piecesWeigth = 1 * this.turns/30; // TODO cambiar este peso segun tamanio grilla
        // TODO si el oponente tiene muchas piezas en early toca darle mas poder a posibles movimientos
        
        if (myMoves < 10){
            mobilityWeight = 40 ;
        }
        if (myMoves < 5){
            mobilityWeight = 80 ;
        }
        
        const gridWeight = 200 / this.turns; // Todo mismo q arriba, aca con el tiempo pesa menos tomar una esquina
        score += mobilityWeight * (myMoves - oppMoves); // Mobility bonus, scaled by board size
        score += piecesWeigth * (myPieces - oppPieces); // Pieces weight, scaled by turns
        score += gridWeight * (myWeight - oppWeight);

        
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
