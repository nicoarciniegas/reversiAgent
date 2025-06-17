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

        // Mostrar en consola
        console.log("color:", color)
        console.log("wtime:", wtime)
        console.log("btime:", btime)
        console.log("board:", board)
        console.log("moves:", moves)

        /*
        let depth = 3; //  Ajustar según tiempo y tamaño del tablero
        let maximizing = true;
        let result = this.minimax(board, depth, -Infinity, Infinity, maximizing, color);
        return result.move;
        */

        //return {'x':columna, 'y':fila}
    }

    
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

    minimax() {
        // Implementar el algoritmo Minimax para evaluar los movimientos posibles
        // y seleccionar el mejor movimiento basado en la evaluación del tablero.
        // Este método debería considerar la profundidad del árbol de decisiones,
        // así como la función de evaluación definida más abajo.
    }

    evaluate() {
        // Implementar una función de evaluación para el tablero
        // que considere la cantidad de fichas, posiciones estratégicas, etc.
    }

}

// Método de prueba para simular un movimiento
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
testSimulateMove();