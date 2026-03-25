// 游戏变量
let peer = null;
let conn = null;
let currentPlayer = 'black';
let board = Array(30).fill().map(() => Array(30).fill(null));
let timer = 99;
let timerInterval = null;
let gameStarted = false;
let playerRole = null;
let peerId = null;
let score = { black: 0, white: 0 };

// DOM元素
const boardElement = document.getElementById('board');
const timerElement = document.getElementById('timer');
const statusElement = document.getElementById('status');
const player1Element = document.getElementById('player1');
const player2Element = document.getElementById('player2');
const newGameButton = document.getElementById('new-game');
const copyLinkButton = document.getElementById('copy-link');

// 添加连接界面
function addConnectionUI() {
    const container = document.querySelector('.container');
    const connectionDiv = document.createElement('div');
    connectionDiv.className = 'connection-ui';
    connectionDiv.innerHTML = `
        <div class="connection-section">
            <h3>连接设置</h3>
            <div class="connection-info">
                <p>你的ID: <span id="your-id">生成中...</span></p>
                <input type="text" id="peer-id-input" placeholder="输入对方ID">
                <button id="connect-btn">连接</button>
            </div>
        </div>
    `;
    container.insertBefore(connectionDiv, boardElement);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .connection-ui {
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        .connection-section h3 {
            margin-bottom: 10px;
            color: #333;
        }
        .connection-info {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .connection-info p {
            margin: 0;
            font-weight: bold;
        }
        #your-id {
            color: #3498db;
        }
        #peer-id-input {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        #connect-btn {
            padding: 8px 16px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
        }
        #connect-btn:hover {
            background-color: #2980b9;
        }
    `;
    document.head.appendChild(style);
    
    // 事件监听
    document.getElementById('connect-btn').addEventListener('click', connectToPeer);
}

// 初始化棋盘
function initBoard() {
    boardElement.innerHTML = '';
    board = Array(15).fill().map(() => Array(15).fill(null));
    
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', () => handleCellClick(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// 处理单元格点击
function handleCellClick(row, col) {
    if (!gameStarted || board[row][col] || currentPlayer !== playerRole) return;
    
    // 落子
    board[row][col] = currentPlayer;
    updateCell(row, col, currentPlayer);
    
    // 检查胜负
    if (checkWin(row, col, currentPlayer)) {
        // 更新比分
        score[currentPlayer]++;
        updateScore();
        statusElement.textContent = `${currentPlayer === 'black' ? '黑棋' : '白棋'}获胜！`;
        gameStarted = false;
        clearInterval(timerInterval);
        // 发送游戏结束消息
        if (conn) {
            conn.send({ type: 'gameOver', winner: currentPlayer, score: score });
        }
        // 3秒后自动开始新游戏
        setTimeout(continueGame, 3000);
        return;
    }
    
    // 切换玩家
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    updatePlayerIndicator();
    resetTimer();
    
    // 发送落子信息给对方
    if (conn) {
        conn.send({ type: 'move', row, col, player: currentPlayer });
    }
}

// 更新单元格状态
function updateCell(row, col, player) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.className = `cell ${player}`;
    }
}

// 检查胜负
function checkWin(row, col, player) {
    const directions = [
        [0, 1],   // 水平
        [1, 0],   // 垂直
        [1, 1],   // 对角线
        [1, -1]   // 反对角线
    ];
    
    for (const [dx, dy] of directions) {
        let count = 1;
        
        // 正方向
        for (let i = 1; i < 5; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (newRow >= 0 && newRow < 30 && newCol >= 0 && newCol < 30 && board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        
        // 反方向
        for (let i = 1; i < 5; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (newRow >= 0 && newRow < 30 && newCol >= 0 && newCol < 30 && board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        
        if (count >= 5) {
            return true;
        }
    }
    
    return false;
}

// 更新玩家指示器
function updatePlayerIndicator() {
    if (currentPlayer === 'black') {
        player1Element.classList.add('current-player');
        player2Element.classList.remove('current-player');
    } else {
        player1Element.classList.remove('current-player');
        player2Element.classList.add('current-player');
    }
}

// 更新比分
function updateScore() {
    document.getElementById('black-score').textContent = score.black;
    document.getElementById('white-score').textContent = score.white;
}

// 重置计时器
function resetTimer() {
    clearInterval(timerInterval);
    timer = 99;
    timerElement.textContent = timer;
    
    timerInterval = setInterval(() => {
        timer--;
        timerElement.textContent = timer;
        
        if (timer <= 0) {
            clearInterval(timerInterval);
            // 超时处理
            const winner = currentPlayer === 'black' ? 'white' : 'black';
            score[winner]++;
            updateScore();
            statusElement.textContent = `${currentPlayer === 'black' ? '黑棋' : '白棋'}超时！${winner === 'black' ? '黑棋' : '白棋'}获胜！`;
            gameStarted = false;
            // 发送超时消息
            if (conn) {
                conn.send({ type: 'gameOver', winner: winner, score: score });
            }
            // 3秒后自动开始新游戏
            setTimeout(continueGame, 3000);
        }
    }, 1000);
}

// 初始化PeerJS
function initPeer() {
    // 生成随机ID
    peerId = Math.random().toString(36).substring(2, 10);
    peer = new Peer(peerId);
    
    // 当Peer连接成功
    peer.on('open', (id) => {
        document.getElementById('your-id').textContent = id;
        statusElement.textContent = '等待连接...';
    });
    
    // 当收到连接请求
    peer.on('connection', (connection) => {
        conn = connection;
        playerRole = 'black'; // 接收方为黑棋
        setupConnection();
    });
    
    // 错误处理
    peer.on('error', (err) => {
        console.error('PeerJS错误:', err);
        statusElement.textContent = '连接错误';
    });
}

// 连接到对方
function connectToPeer() {
    const peerIdInput = document.getElementById('peer-id-input').value;
    if (!peerIdInput) return;
    
    conn = peer.connect(peerIdInput);
    playerRole = 'white'; // 发起方为白棋
    setupConnection();
}

// 设置连接
function setupConnection() {
    if (!conn) return;
    
    conn.on('open', () => {
        statusElement.textContent = '连接成功！';
        gameStarted = true;
        initBoard();
        updatePlayerIndicator();
        resetTimer();
    });
    
    conn.on('data', (data) => {
        handleReceivedData(data);
    });
    
    conn.on('close', () => {
        statusElement.textContent = '连接已关闭';
        gameStarted = false;
        clearInterval(timerInterval);
    });
    
    conn.on('error', (err) => {
        console.error('连接错误:', err);
        statusElement.textContent = '连接错误';
    });
}

// 处理接收到的数据
function handleReceivedData(data) {
    if (data.type === 'move') {
        // 更新棋盘
        board[data.row][data.col] = data.player === 'white' ? 'black' : 'white';
        updateCell(data.row, data.col, board[data.row][data.col]);
        
        // 切换玩家
        currentPlayer = data.player;
        updatePlayerIndicator();
        resetTimer();
        
        // 检查胜负
        if (checkWin(data.row, data.col, board[data.row][data.col])) {
            statusElement.textContent = `${board[data.row][data.col] === 'black' ? '黑棋' : '白棋'}获胜！`;
            gameStarted = false;
            clearInterval(timerInterval);
        }
    } else if (data.type === 'gameOver') {
        // 更新比分
        score = data.score;
        updateScore();
        statusElement.textContent = `${data.winner === 'black' ? '黑棋' : '白棋'}获胜！`;
        gameStarted = false;
        clearInterval(timerInterval);
        // 3秒后自动开始新游戏
        setTimeout(continueGame, 3000);
    } else if (data.type === 'newGame') {
        // 重置游戏状态
        gameStarted = false;
        clearInterval(timerInterval);
        initBoard();
        currentPlayer = 'black';
        updatePlayerIndicator();
        statusElement.textContent = '对方开始新游戏...';
        
        // 自动开始新游戏
        setTimeout(() => {
            gameStarted = true;
            statusElement.textContent = '游戏进行中...';
            resetTimer();
        }, 1000);
    }
}

// 复制ID
function copyLink() {
    const id = document.getElementById('your-id').textContent;
    navigator.clipboard.writeText(id).then(() => {
        alert('ID已复制到剪贴板！');
    });
}

// 初始化游戏
function initGame() {
    addConnectionUI();
    initPeer();
}

// 事件监听
copyLinkButton.addEventListener('click', copyLink);

// 继续游戏函数
function continueGame() {
    // 重置游戏状态
    gameStarted = false;
    clearInterval(timerInterval);
    initBoard();
    currentPlayer = 'black';
    updatePlayerIndicator();
    statusElement.textContent = '准备开始新游戏...';
    
    // 如果已连接，通知对方
    if (conn) {
        conn.send({ type: 'newGame' });
    }
    
    // 自动开始新游戏
    setTimeout(() => {
        gameStarted = true;
        statusElement.textContent = '游戏进行中...';
        resetTimer();
    }, 1000);
}

// 初始化游戏
initGame();