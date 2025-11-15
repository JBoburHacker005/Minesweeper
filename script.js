// Game configuration
const difficulties = {
    easy: { rows: 9, cols: 9, bombs: 10 },
    medium: { rows: 16, cols: 16, bombs: 40 },
    hard: { rows: 16, cols: 30, bombs: 99 }
};

let currentDifficulty = 'easy';
let board = [];
let revealed = [];
let flagged = [];
let gameOver = false;
let gameWon = false;
let timer = 0;
let timerInterval = null;
let firstClick = true;

// DOM elements
const gameBoard = document.getElementById('game-board');
const difficultySelect = document.getElementById('difficulty');
const restartBtn = document.getElementById('restart');
const bombCountEl = document.getElementById('bomb-count');
const flagCountEl = document.getElementById('flag-count');
const timerEl = document.getElementById('timer');
const messageEl = document.getElementById('message');

// Initialize game
function initGame() {
    const config = difficulties[currentDifficulty];
    board = [];
    revealed = [];
    flagged = [];
    gameOver = false;
    gameWon = false;
    timer = 0;
    firstClick = true;
    
    // Clear timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Reset UI
    messageEl.classList.add('hidden');
    messageEl.className = 'message hidden';
    timerEl.textContent = '0';
    flagCountEl.textContent = '0';
    
    // Create empty board
    for (let i = 0; i < config.rows; i++) {
        board[i] = [];
        revealed[i] = [];
        flagged[i] = [];
        for (let j = 0; j < config.cols; j++) {
            board[i][j] = 0;
            revealed[i][j] = false;
            flagged[i][j] = false;
        }
    }
    
    // Update bomb count
    bombCountEl.textContent = config.bombs;
    
    // Render board
    renderBoard();
}

// Place bombs randomly
function placeBombs(excludeRow, excludeCol) {
    const config = difficulties[currentDifficulty];
    let bombsPlaced = 0;
    
    while (bombsPlaced < config.bombs) {
        const row = Math.floor(Math.random() * config.rows);
        const col = Math.floor(Math.random() * config.cols);
        
        // Don't place bomb on first click or if already has bomb
        if ((row === excludeRow && col === excludeCol) || board[row][col] === -1) {
            continue;
        }
        
        board[row][col] = -1; // -1 represents bomb
        bombsPlaced++;
    }
    
    // Calculate numbers
    for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
            if (board[i][j] !== -1) {
                board[i][j] = countAdjacentBombs(i, j);
            }
        }
    }
}

// Count adjacent bombs
function countAdjacentBombs(row, col) {
    const config = difficulties[currentDifficulty];
    let count = 0;
    
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            
            if (newRow >= 0 && newRow < config.rows && 
                newCol >= 0 && newCol < config.cols && 
                board[newRow][newCol] === -1) {
                count++;
            }
        }
    }
    
    return count;
}

// Render game board
function renderBoard() {
    const config = difficulties[currentDifficulty];
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    
    for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            if (revealed[i][j]) {
                cell.classList.add('revealed');
                if (board[i][j] === -1) {
                    cell.classList.add('bomb');
                    cell.textContent = '💣';
                } else if (board[i][j] > 0) {
                    cell.textContent = board[i][j];
                    cell.classList.add(`number-${board[i][j]}`);
                }
            } else if (flagged[i][j]) {
                cell.classList.add('flagged');
            }
            
            // Event listeners
            cell.addEventListener('click', () => handleCellClick(i, j));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(i, j);
            });
            
            gameBoard.appendChild(cell);
        }
    }
}

// Handle cell click
function handleCellClick(row, col) {
    if (gameOver || gameWon || flagged[row][col]) return;
    
    // Place bombs after first click
    if (firstClick) {
        placeBombs(row, col);
        firstClick = false;
        startTimer();
    }
    
    if (revealed[row][col]) return;
    
    revealCell(row, col);
    renderBoard();
    checkWin();
}

// Reveal cell
function revealCell(row, col) {
    const config = difficulties[currentDifficulty];
    
    if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) return;
    if (revealed[row][col] || flagged[row][col]) return;
    
    revealed[row][col] = true;
    
    // If bomb, game over
    if (board[row][col] === -1) {
        gameOver = true;
        revealAllBombs();
        showMessage('You lose 😢', 'lose');
        stopTimer();
        return;
    }
    
    // If empty cell, reveal adjacent cells
    if (board[row][col] === 0) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                revealCell(row + i, col + j);
            }
        }
    }
}

// Handle right click (flag)
function handleRightClick(row, col) {
    if (gameOver || gameWon || revealed[row][col]) return;
    
    flagged[row][col] = !flagged[row][col];
    updateFlagCount();
    renderBoard();
}

// Reveal all bombs
function revealAllBombs() {
    const config = difficulties[currentDifficulty];
    for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
            if (board[i][j] === -1) {
                revealed[i][j] = true;
            }
        }
    }
}

// Reveal all cells (for win condition)
function revealAllCells() {
    const config = difficulties[currentDifficulty];
    for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
            if (board[i][j] !== -1) {
                revealed[i][j] = true;
            }
        }
    }
}

// Check win condition
function checkWin() {
    const config = difficulties[currentDifficulty];
    let revealedCount = 0;
    
    for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
            if (revealed[i][j] && board[i][j] !== -1) {
                revealedCount++;
            }
        }
    }
    
    const totalCells = config.rows * config.cols;
    const totalBombs = config.bombs;
    
    if (revealedCount === totalCells - totalBombs) {
        gameWon = true;
        showMessage('You win 🎉', 'win');
        stopTimer();
        // Reveal all cells except bombs when winning
        revealAllCells();
        renderBoard();
    }
}

// Update flag count
function updateFlagCount() {
    const config = difficulties[currentDifficulty];
    let flagCount = 0;
    
    for (let i = 0; i < config.rows; i++) {
        for (let j = 0; j < config.cols; j++) {
            if (flagged[i][j]) flagCount++;
        }
    }
    
    flagCountEl.textContent = flagCount;
}

// Show message
function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
    messageEl.classList.add(type);
}

// Timer functions
function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        timerEl.textContent = timer;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Event listeners
difficultySelect.addEventListener('change', (e) => {
    currentDifficulty = e.target.value;
    initGame();
});

restartBtn.addEventListener('click', () => {
    initGame();
});

// Initialize game on load
initGame();

