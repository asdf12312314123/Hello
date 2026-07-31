/**
 * 로그 관리 모듈
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

class LogManager {
    constructor(maxLogs = 500) {
        this.logs = [];
        this.maxLogs = maxLogs;
        this.wsServer = null;

        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
    }

    setWebSocket(wsServer) {
        this.wsServer = wsServer;
    }

    async add(entry) {
        if (!entry.timestamp) {
            const now = new Date();
            entry.timestamp = now.toTimeString().slice(0, 8);
        }

        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 파일 기록
        this._writeToFile(entry);

        // WebSocket 브로드캐스트
        if (this.wsServer) {
            this.wsServer.broadcast({ type: 'log', data: entry });
        }

        console.log(`[${entry.timestamp}] [${entry.level}] ${entry.message}`);
    }

    _writeToFile(entry) {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const logFile = path.join(LOG_DIR, `${today}.log`);
            fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
        } catch (e) {
            // ignore
        }
    }

    getRecent(count = 100) {
        return this.logs.slice(-count);
    }

    clear() {
        this.logs = [];
    }

    getStats() {
        const total = this.logs.length;
        const errors = this.logs.filter(l => l.level === '오류').length;
        const completed = this.logs.filter(l => l.level === '완료').length;
        return { total, errors, completed, info: total - errors - completed };
    }
}

module.exports = { LogManager };
