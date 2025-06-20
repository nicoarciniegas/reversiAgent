class TuringianosAgent extends Agent{
    constructor(){
        super()
    }

    compute(percept){
        var color = percept['color'] // Gets player's color
        var wtime = percept['W'] // Gets remaining time of whites color player
        var btime = percept['B'] // Gets remaining time of blacks color player
        var board = percept['board'] // Gets the current board's position
        var moves = board.valid_moves(color)

        /*
        // Mostrar en consola
        console.log("color:", color)
        console.log("wtime:", wtime)
        console.log("btime:", btime)
        console.log("board:", board)
        console.log("moves:", moves)
        */

        if (moves.length === 0) return null;

        let bestScore = -Infinity;
        let bestMove = moves[0];

        for (let move of moves) {
            let newBoard = this.simulateMove(board, move, color);
            let score = -this.negamax(newBoard, this.opponent(color), 1);
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

    evaluate(board, color) {
        let myCount = 0, oppCount = 0;
        let opp = this.opponent(color);
        let matrix = board.board; //Retorna el tablero actual como una matriz y no como objeto Board
        console.log("matriz:", matrix);
        //console.log("color:", color);
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

    //Simulacion básica a través de los mismos metodos del objeto Board
    simulateMove(board, move, color) {
        let newBoard = board.clone();
        newBoard.move(move.x, move.y, color);
        return newBoard;
    }

    /*
    simulateMove(board, move, color) {
        const opponent = color === 'W' ? 'B' : 'W';
        const size = board.length;
        const directions = [
            [0, 1], [1, 0], [0, -1], [-1, 0],
            [1, 1], [-1, -1], [1, -1], [-1, 1]
        ];

        const newBoard = board.map(row => [...row]);
        newBoard[move.y][move.x] = color;

        for (let [dx, dy] of directions) {
            let x = move.x + dx;
            let y = move.y + dy;
            const toFlip = [];

            while (x >= 0 && x < size && y >= 0 && y < size && newBoard[y][x] === opponent) {
                toFlip.push([x, y]);
                x += dx;
                y += dy;
            }

            if (x >= 0 && x < size && y >= 0 && y < size && newBoard[y][x] === color) {
                for (let [fx, fy] of toFlip) {
                    newBoard[fy][fx] = color;
                }
            }
        }

        return newBoard;
    }
    */

    opponent(color) {
        return color === 'B' ? 'W' : 'B';
    }
}

/*
// Funcion de prueba para simular un movimiento
// Este método crea un tablero de ejemplo y simula un movimiento para verificar su funcionamiento.
function testSimulateMove() {

    let agent = new TuringianosAgent();

    // Crea un tablero de ejemplo 8x8 con sus respectivas piezas iniciales
    let board = [];
    for (let i = 0; i < 8; i++) {
        board[i] = [];
        for (let j = 0; j < 8; j++) board[i][j] = ' ';
    }
    board[3][3] = 'W';
    board[3][4] = 'B';
    board[4][3] = 'B';
    board[4][4] = 'W';

    // Movimiento de prueba
    let move = {x: 2, y: 3};
    let color = 'B';

    // Llama a simulateMove y muestra el resultado
    let newBoard = agent.simulateMove(board, move, color);
    console.log("Tablero original:", board);
    console.log("Nuevo tablero:", newBoard);
}


// Llama a la función de prueba 
// testSimulateMove();
*/