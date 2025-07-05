// Historic ordering to improve alpha-beta pruning efficiency
class TuringianosAgentV8 extends Agent{
    constructor(){
        super()
        this.name = "Turingianos";   
    }

    initialize_agent(color, board, time) {
        console.log("Initializing agent again");
        this.turns = 0; // Reset turns
        this.current_color = color; // Reset current color
        this.depth = 5; // Reset depth
        this.weight_grid = this.generateWeightGrid(board); // Generate weight grid for the first time
        // Memoization cache
        this.memoCache = new Map();
        this.historyTable = {}; // Format: { "i,j": score }
        this.matrixHashNormal = this.generateMatrixHash(board);
        this.matrixHashFlipH = this.flipMatrixH(this.matrixHashNormal);
        this.matrixHashFlipV = this.flipMatrixV(this.matrixHashNormal);
        // just square matrix
        this.matrixRotated90 = this.rotateMatrix(this.matrixHashNormal);
        // can be rectangular (this is equivalent to flip horizontal vertical)
        this.matrixRotated180 = this.rotateMatrix(this.matrixRotated90);
        // just square matrix
        this.matrixRotated270 = this.rotateMatrix(this.matrixRotated180);
        // just square matrix
        //Main Diagonal Flip = 90° rotation + vertical flip.
        // Anti-Diagonal Flip = 270° rotation + vertical flip.
        this.matrixDiagonalFlip = this.flipMatrixV(this.matrixRotated90);
        this.matrixAntiDiagonalFlip = this.flipMatrixV(this.matrixRotated270);

        this.maxTime = time/(this.matrixHashNormal.length * this.matrixHashNormal[0].length);
        this.startTime = Date.now();
        this.timeLimit = this.startTime + this.maxTime; //100ms max, tune it

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
        for (let k = 0; k < corners.length; k++) {
            const i = corners[k][0];
            const j = corners[k][1];
            grid[i][j] = 50 + 5 * scale;
        }



        // X-Squares (always -5)
        
        corners.forEach(([i, j]) => {
            if (i > 0 && j > 0) grid[i - 1][j - 1] = -5 - 1 * scale;
            if (i > 0 && j < cols - 1) grid[i - 1][j + 1] = -5 - 1 * scale;
            if (i < rows - 1 && j > 0) grid[i + 1][j - 1] = -5 - 1 * scale;
            if (i < rows - 1 && j < cols - 1) grid[i + 1][j + 1] = -5 - 1 * scale; // Scale X-square value re added -5
        });
        

        // C-Squares (always -3)
        
        corners.forEach(([i, j]) => {
            if (i > 0) grid[i - 1][j] = -5 - 1 * scale;
            if (i < rows - 1) grid[i + 1][j] = -5 - 1 * scale;
            if (j > 0) grid[i][j - 1] = -5 - 1 * scale;
            if (j < cols - 1) grid[i][j + 1] = -5 - 1 * scale; //Re added -3
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
        // use esos turnos menos el total de casillas posibles para saber el estado del juego

        const time_lowerBound = this.total_time * 0.40;
        const time_upperBound = this.total_time * 0.60; // defines constains regardlesss of time

        if (this.current_color != color){
            this.initialize_agent(color,board, time_left);
        }


        // Move Ordering Implementation (best moves first)
        const rows = board.board.length;
        const cols = board.board[0].length;
        moves.sort((a, b) => {
        // corners first
        if ((a.i === 0 && a.j === 0) || (a.i === 0 && a.j === cols - 1) || (a.i === rows - 1 && a.j === 0) || (a.i === rows - 1 && a.j === cols - 1)) {
            return 100; // a is a corner
        }
        if ((b.i === 0 && b.j === 0) || (b.i === 0 && b.j === cols - 1) || (b.i === rows - 1 && b.j === 0) || (b.i === rows - 1 && b.j === cols - 1)) {
            return 100; // b is a corner
        }
        // Then sort by history table
        const aKey = `${a.i},${a.j}`;
        const bKey = `${b.i},${b.j}`;
        return (this.historyTable[bKey] || 0) - (this.historyTable[aKey] || 0); // Higher scores first
        });
        
        // Being greeedy (depth==1) brings better play, but prone error
        //if (time_left > time_lowerBound && time_left < time_upperBound) {
         if (time_left < 60) { // if we have no time, play random
            if (Math.random() < 0.5){
                return moves[0];
        }
            else{
                return moves[Math.floor(moves.length * Math.random())];
            }
        }

         if (time_left < 2000) { // if we have no time, play random
            this.depth = 0;
        }

        if (time_left > 2000 && time_left < 6000) { // if we less time, we do less search (probably)
            this.depth = 1;
        }

        if (time_left > 6000) { // Constructor is only called once, they dont restart our agent at play time
            this.depth = 2;
        }

    
        if (time_left > 9000) { // Constructor is only called once, they dont restart our agent at play time
            this.depth = 3;
        }
        
        
        this.timeLimit = Date.now() + this.maxTime * this.depth**2;

        let bestScore = -Infinity;
        let bestMove = moves[0];
        
        if (this.turns % this.depth === 0) {
            this.memoCache.clear(); // Reset cache for each new turn to avoid crashing memory (this should use 400mb of memory at maximum if we clear it every turn)
        }

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
    rotateMatrix(matrix) {
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
        const newMatrix = [];
        for (let i = 0; i < matrix.length; i++) {
            newMatrix.push([...matrix[i]]); // Shallow copy of inner array
        }
        return newMatrix.map(row => row.slice().reverse());
    }

    // Flip a matrix vertically
    flipMatrixV (matrix) {
        const newMatrix = [];
        for (let i = 0; i < matrix.length; i++) {
            newMatrix.push([...matrix[i]]); // Shallow copy of inner array
        }
        return newMatrix.reverse();
    }
    
    getBoardHashes(board, color, depth) {
        let matrix = board.board;
        let rows = matrix.length;
        let cols = matrix[0].length;
        let hashes = [];
        let hashN = 0;
        let hashV = 0;
        let hashH = 0;
        let HashDiagonal = 0;
        let HashAntiDiagonal = 0;
        let hashRotated90 = 0;
        let hashRotated180 = 0;
        let hashRotated270 = 0;
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

                    let idx5 = this.matrixDiagonalFlip[i][j];
                    HashDiagonal += (idx5 * prime);
                    let idx6 = this.matrixAntiDiagonalFlip[i][j];
                    HashAntiDiagonal += (idx6 * prime);
                    let idx7 = this.matrixRotated90[i][j];
                    hashRotated90 += (idx7 * prime);
                    let idx8 = this.matrixRotated180[i][j];
                    hashRotated180 += (idx8 * prime);
                    let idx9 = this.matrixRotated270[i][j];
                    hashRotated270 += (idx9 * prime);

                    
                } else if (matrix[i][j] === opp) {
                    let idx1 = this.matrixHashNormal[i][j];
                    hashN += (idx1 * prime * 2 * 7 *31); // multiply by 2 to differentiate opponent's pieces
                    let idx2 = this.matrixHashFlipH[i][j];
                    hashH += (idx2 * prime * 2 * 7*31);
                    let idx3 = this.matrixHashFlipV[i][j];
                    hashV += (idx3 * prime * 2 * 7*31); // multiply by 2 to differentiate opponent's pieces

                    let idx5 = this.matrixDiagonalFlip[i][j];
                    HashDiagonal += (idx5 * prime * 2 * 7*31);
                    let idx6 = this.matrixAntiDiagonalFlip[i][j];
                    HashAntiDiagonal += (idx6 * prime * 2 * 7*31);
                    let idx7 = this.matrixRotated90[i][j];
                    hashRotated90 += (idx7 * prime * 2 * 7*31);
                    let idx8 = this.matrixRotated180[i][j];
                    hashRotated180 += (idx8 * prime * 2 * 7*31);
                    let idx9 = this.matrixRotated270[i][j];
                    hashRotated270 += (idx9 * prime * 2 * 7*31);
                }
            }
        }

        hashes.push(String(hashN) + 'D' + String(depth)  + color); // Add depth to the hash for uniqueness
        hashes.push(String(hashH) +  'D' + String(depth) + color);
        hashes.push(String(hashV) +  'D' + String(depth) + color);
        hashes.push(String(HashDiagonal) +  'D' + String(depth) + color);
        hashes.push(String(HashAntiDiagonal) +  'D' + String(depth) + color);
        hashes.push(String(hashRotated90) +  'D' + String(depth) + color);
        hashes.push(String(hashRotated180) +  'D' + String(depth) + color);
        hashes.push(String(hashRotated270) +  'D' + String(depth) + color);
        
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

        if (Date.now() > this.timeLimit){
            return this.evaluate(board, color);
        } 

        // Move Ordering Implementation (best moves first)
        const rows = board.board.length;
        const cols = board.board[0].length;
        moves.sort((a, b) => {
            // corners first
            if ((a.i === 0 && a.j === 0) || (a.i === 0 && a.j === cols - 1) || (a.i === rows - 1 && a.j === 0) || (a.i === rows - 1 && a.j === cols - 1)) {
                return -1; // a is a corner
            }
            if ((b.i === 0 && b.j === 0) || (b.i === 0 && b.j === cols - 1) || (b.i === rows - 1 && b.j === 0) || (b.i === rows - 1 && b.j === cols - 1)) {
                return 1; // b is a corner
            }
            // Then sort by history table
            const aKey = `${a.i},${a.j}`;
            const bKey = `${b.i},${b.j}`;
            return (this.historyTable[bKey] || 0) - (this.historyTable[aKey] || 0); // Higher scores first
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
                const moveKey = `${move.i},${move.j}`; // Unique identifier for the move
                this.historyTable[moveKey] = (this.historyTable[moveKey] || 0) + depth * depth; // Deeper cutoffs = more valuable
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
        const mobilityWeight = 0.25;
        const piecesWeigth = 1.25; // TODO cambiar este peso segun tamanio grilla
        
        const gridWeight = Math.min(0.1, 1 - (this.turns/100)); // Todo mismo q arriba, aca con el tiempo pesa menos tomar una esquina
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



// Historic ordering to improve alpha-beta pruning efficiency
class TuringianosAgentV9 extends Agent{
    constructor(){
        super()
        this.name = "Turingianos";   
    }

    initialize_agent(color, board, time) {
        console.log("Initializing agent again");
        this.turns = 0; // Reset turns
        this.current_color = color; // Reset current color
        this.depth = 5; // Reset depth
        this.weight_grid = this.generateWeightGrid(board); // Generate weight grid for the first time
        // Memoization cache
        this.memoCache = new Map();
        this.historyTable = {}; // Format: { "i,j": score }
        this.matrixHashNormal = this.generateMatrixHash(board);
        this.matrixHashFlipH = this.flipMatrixH(this.matrixHashNormal);
        this.matrixHashFlipV = this.flipMatrixV(this.matrixHashNormal);
        // just square matrix
        this.matrixRotated90 = this.rotateMatrix(this.matrixHashNormal);
        // can be rectangular (this is equivalent to flip horizontal vertical)
        this.matrixRotated180 = this.rotateMatrix(this.matrixRotated90);
        // just square matrix
        this.matrixRotated270 = this.rotateMatrix(this.matrixRotated180);
        // just square matrix
        //Main Diagonal Flip = 90° rotation + vertical flip.
        // Anti-Diagonal Flip = 270° rotation + vertical flip.
        this.matrixDiagonalFlip = this.flipMatrixV(this.matrixRotated90);
        this.matrixAntiDiagonalFlip = this.flipMatrixV(this.matrixRotated270);

        this.maxTime = time/(this.matrixHashNormal.length * this.matrixHashNormal[0].length);
        this.startTime = Date.now();
        this.timeLimit = this.startTime + this.maxTime; //100ms max, tune it

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
        for (let k = 0; k < corners.length; k++) {
            const i = corners[k][0];
            const j = corners[k][1];
            grid[i][j] = 50 + 5 * scale;
        }

        // X-Squares (always -5)
        for (let k = 0; k < corners.length; k++) {
            const i = corners[k][0];
            const j = corners[k][1];
            if (i > 0 && j > 0) grid[i - 1][j - 1] = -5 - 1 * scale;
            if (i > 0 && j < cols - 1) grid[i - 1][j + 1] = -5 - 1 * scale;
            if (i < rows - 1 && j > 0) grid[i + 1][j - 1] = -5 - 1 * scale;
            if (i < rows - 1 && j < cols - 1) grid[i + 1][j + 1] = -5 - 1 * scale;
        }

        // C-Squares (always -3)
        for (let k = 0; k < corners.length; k++) {
            const i = corners[k][0];
            const j = corners[k][1];
            if (i > 0) grid[i - 1][j] = -5 - 1 * scale;
            if (i < rows - 1) grid[i + 1][j] = -5 - 1 * scale;
            if (j > 0) grid[i][j - 1] = -5 - 1 * scale;
            if (j < cols - 1) grid[i][j + 1] = -5 - 1 * scale;
        }


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
        // use esos turnos menos el total de casillas posibles para saber el estado del juego

        if (this.current_color != color){
            this.initialize_agent(color,board, time_left);
        }

        // Move Ordering Implementation (best moves first)
        const rows = board.board.length;
        const cols = board.board[0].length;
        moves.sort((a, b) => {
        // corners first
        if ((a.i === 0 && a.j === 0) || (a.i === 0 && a.j === cols - 1) || (a.i === rows - 1 && a.j === 0) || (a.i === rows - 1 && a.j === cols - 1)) {
            return 100; // a is a corner
        }
        if ((b.i === 0 && b.j === 0) || (b.i === 0 && b.j === cols - 1) || (b.i === rows - 1 && b.j === 0) || (b.i === rows - 1 && b.j === cols - 1)) {
            return 100; // b is a corner
        }
        // Then sort by history table
        const aKey = `${a.i},${a.j}`;
        const bKey = `${b.i},${b.j}`;
        return (this.historyTable[bKey] || 0) - (this.historyTable[aKey] || 0); // Higher scores first
        });
        
        if (this.turns === 0) {
            this.total_time = time_left
        }
        //console.log(this.turns)
        //console.log(time_left)
        //console.log( this.total_time)

        // Calcula el ratio de tiempo restante
        let timeRatio = time_left / this.total_time;
        //console.log("Time ratio: ", timeRatio, " Depth: ", this.depth);
        // Control de profundidad basado en el tiempo restante
        if (timeRatio < 0.05) { //Configurtación de tiempo para tableros 25x25
            //console.log("Critical time, playing random move");
            //return moves[Math.floor(moves.length * Math.random())]; // Tiempo crítico
            this.depth = 0;
        } else if (timeRatio < 0.1) {
            this.depth = 1;
        }else if (timeRatio < 0.25) {
            this.depth = 1;
        } else if (timeRatio < 0.65) {
            this.depth = 2;
        } else if (timeRatio < 0.80) {
            this.depth = 2;
        } else if (timeRatio < 0.97) {
            this.depth = 1;
        } else if (timeRatio < 0.99) {
            this.depth = 1;
        } else {
            this.depth = 0; 
        }

        this.timeLimit = Date.now() + this.maxTime * this.depth**2;

        let bestScore = -Infinity;
        let bestMove = moves[0];
        
        if (this.turns % this.depth === 0) {
            this.memoCache.clear(); // Reset cache for each new turn to avoid crashing memory (this should use 400mb of memory at maximum if we clear it every turn)
        }

        for (let move of moves) {
            //console.log('move object',move, 'move i', move.y,'move j', move.x);
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
    rotateMatrix(matrix) {
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
        const newMatrix = [];
        for (let i = 0; i < matrix.length; i++) {
            newMatrix.push([...matrix[i]]); // Shallow copy of inner array
        }
        return newMatrix.map(row => row.slice().reverse());
    }

    // Flip a matrix vertically
    flipMatrixV (matrix) {
        const newMatrix = [];
        for (let i = 0; i < matrix.length; i++) {
            newMatrix.push([...matrix[i]]); // Shallow copy of inner array
        }
        return newMatrix.reverse();
    }
    
    getBoardHashes(board, color, depth) {
        let matrix = board.board;
        let rows = matrix.length;
        let cols = matrix[0].length;
        let hashes = [];
        let hashN = 0;
        let hashV = 0;
        let hashH = 0;
        let HashDiagonal = 0;
        let HashAntiDiagonal = 0;
        let hashRotated90 = 0;
        let hashRotated180 = 0;
        let hashRotated270 = 0;
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

                    let idx5 = this.matrixDiagonalFlip[i][j];
                    HashDiagonal += (idx5 * prime);
                    let idx6 = this.matrixAntiDiagonalFlip[i][j];
                    HashAntiDiagonal += (idx6 * prime);
                    let idx7 = this.matrixRotated90[i][j];
                    hashRotated90 += (idx7 * prime);
                    let idx8 = this.matrixRotated180[i][j];
                    hashRotated180 += (idx8 * prime);
                    let idx9 = this.matrixRotated270[i][j];
                    hashRotated270 += (idx9 * prime);

                    
                } else if (matrix[i][j] === opp) {
                    let idx1 = this.matrixHashNormal[i][j];
                    hashN += (idx1 * prime * 2 * 7 *31); // multiply by 2 to differentiate opponent's pieces
                    let idx2 = this.matrixHashFlipH[i][j];
                    hashH += (idx2 * prime * 2 * 7*31);
                    let idx3 = this.matrixHashFlipV[i][j];
                    hashV += (idx3 * prime * 2 * 7*31); // multiply by 2 to differentiate opponent's pieces

                    let idx5 = this.matrixDiagonalFlip[i][j];
                    HashDiagonal += (idx5 * prime * 2 * 7*31);
                    let idx6 = this.matrixAntiDiagonalFlip[i][j];
                    HashAntiDiagonal += (idx6 * prime * 2 * 7*31);
                    let idx7 = this.matrixRotated90[i][j];
                    hashRotated90 += (idx7 * prime * 2 * 7*31);
                    let idx8 = this.matrixRotated180[i][j];
                    hashRotated180 += (idx8 * prime * 2 * 7*31);
                    let idx9 = this.matrixRotated270[i][j];
                    hashRotated270 += (idx9 * prime * 2 * 7*31);
                }
            }
        }

        hashes.push(String(hashN) + 'D' + String(depth)  + color); // Add depth to the hash for uniqueness
        hashes.push(String(hashH) +  'D' + String(depth) + color);
        hashes.push(String(hashV) +  'D' + String(depth) + color);
        hashes.push(String(HashDiagonal) +  'D' + String(depth) + color);
        hashes.push(String(HashAntiDiagonal) +  'D' + String(depth) + color);
        hashes.push(String(hashRotated90) +  'D' + String(depth) + color);
        hashes.push(String(hashRotated180) +  'D' + String(depth) + color);
        hashes.push(String(hashRotated270) +  'D' + String(depth) + color);
        
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

        if (Date.now() > this.timeLimit){
            return this.evaluate(board, color);
        } 

        // Move Ordering Implementation (best moves first)
        const rows = board.board.length;
        const cols = board.board[0].length;
        moves.sort((a, b) => {
            // corners first
            if ((a.i === 0 && a.j === 0) || (a.i === 0 && a.j === cols - 1) || (a.i === rows - 1 && a.j === 0) || (a.i === rows - 1 && a.j === cols - 1)) {
                return -1; // a is a corner
            }
            if ((b.i === 0 && b.j === 0) || (b.i === 0 && b.j === cols - 1) || (b.i === rows - 1 && b.j === 0) || (b.i === rows - 1 && b.j === cols - 1)) {
                return 1; // b is a corner
            }
            // Then sort by history table
            const aKey = `${a.i},${a.j}`;
            const bKey = `${b.i},${b.j}`;
            return (this.historyTable[bKey] || 0) - (this.historyTable[aKey] || 0); // Higher scores first
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
                const moveKey = `${move.i},${move.j}`; // Unique identifier for the move
                this.historyTable[moveKey] = (this.historyTable[moveKey] || 0) + depth * depth; // Deeper cutoffs = more valuable
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
        const mobilityWeight = 0.25;
        const piecesWeigth = 1.25; // TODO cambiar este peso segun tamanio grilla
        
        const gridWeight = Math.min(0.1, 1 - (this.turns/100)); // Todo mismo q arriba, aca con el tiempo pesa menos tomar una esquina
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

