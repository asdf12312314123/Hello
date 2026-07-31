/**
 * Electron 메인 프로세스 - N자동화를 독립 데스크탑 앱으로 실행
 * 더블클릭 한 번으로 서버 + 대시보드 창 열림
 */

const { app, BrowserWindow, Tray, Menu, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;

const PORT = 8000;
const SERVER_PATH = path.join(__dirname, 'server', 'index.js');

// ===== 서버 시작 =====
function startServer() {
    return new Promise((resolve) => {
        serverProcess = fork(SERVER_PATH, [], {
            env: { ...process.env, PORT: PORT.toString() },
            silent: true
        });

        serverProcess.stdout.on('data', (data) => {
            const msg = data.toString();
            console.log('[서버]', msg.trim());
            if (msg.includes('서버 시작')) {
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error('[서버 에러]', data.toString().trim());
        });

        // 2초 후에도 안 되면 그냥 진행
        setTimeout(resolve, 2000);
    });
}

// ===== 메인 윈도우 =====
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: 'N자동화 v1.0.0',
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        // 스크린샷처럼 깔끔한 타이틀바
        frame: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadURL(`http://localhost:${PORT}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 외부 링크는 시스템 브라우저로
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// ===== 트레이 아이콘 =====
function createTray() {
    try {
        tray = new Tray(path.join(__dirname, 'icon.png'));
        const contextMenu = Menu.buildFromTemplate([
            { label: '대시보드 열기', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
            { type: 'separator' },
            { label: '종료', click: () => { app.quit(); } }
        ]);
        tray.setToolTip('N자동화 v1.0.0');
        tray.setContextMenu(contextMenu);
        tray.on('click', () => { if (mainWindow) mainWindow.show(); });
    } catch (e) {
        // 아이콘 파일 없어도 괜찮음
    }
}

// ===== 앱 시작 =====
app.whenReady().then(async () => {
    console.log('N자동화 시작...');

    // 서버 먼저 시작
    await startServer();

    // 윈도우 생성
    createWindow();
    createTray();
});

// 모든 창 닫히면 종료
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

// 앱 종료 시 서버 프로세스도 종료
app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
});
