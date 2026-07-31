/**
 * WebSocket 서버 - 순수 Node.js 구현
 */
const crypto = require('crypto');

class WebSocketServer {
    constructor(httpServer) {
        this.clients = new Set();

        httpServer.on('upgrade', (req, socket, head) => {
            if (req.url === '/ws/logs') {
                this._handleUpgrade(req, socket, head);
            } else {
                socket.destroy();
            }
        });
    }

    _handleUpgrade(req, socket, head) {
        const key = req.headers['sec-websocket-key'];
        const acceptKey = crypto
            .createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');

        const headers = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptKey}`,
            '',
            ''
        ].join('\r\n');

        socket.write(headers);

        const client = new WebSocketClient(socket);
        this.clients.add(client);

        client.on('close', () => {
            this.clients.delete(client);
        });

        client.on('message', (msg) => {
            if (msg === 'ping') {
                client.send(JSON.stringify({ type: 'pong' }));
            }
        });
    }

    broadcast(data) {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        for (const client of this.clients) {
            try {
                client.send(message);
            } catch (e) {
                this.clients.delete(client);
            }
        }
    }

    getClientCount() {
        return this.clients.size;
    }
}

class WebSocketClient {
    constructor(socket) {
        this.socket = socket;
        this._listeners = {};
        this._buffer = Buffer.alloc(0);

        socket.on('data', (data) => this._onData(data));
        socket.on('close', () => this._emit('close'));
        socket.on('error', () => this._emit('close'));
    }

    _onData(data) {
        this._buffer = Buffer.concat([this._buffer, data]);

        while (this._buffer.length >= 2) {
            const firstByte = this._buffer[0];
            const secondByte = this._buffer[1];
            const opcode = firstByte & 0x0f;
            const masked = (secondByte & 0x80) !== 0;
            let payloadLength = secondByte & 0x7f;
            let offset = 2;

            if (payloadLength === 126) {
                if (this._buffer.length < 4) return;
                payloadLength = this._buffer.readUInt16BE(2);
                offset = 4;
            } else if (payloadLength === 127) {
                if (this._buffer.length < 10) return;
                payloadLength = Number(this._buffer.readBigUInt64BE(2));
                offset = 10;
            }

            if (masked) {
                if (this._buffer.length < offset + 4 + payloadLength) return;
                const mask = this._buffer.slice(offset, offset + 4);
                offset += 4;
                const payload = this._buffer.slice(offset, offset + payloadLength);
                for (let i = 0; i < payload.length; i++) {
                    payload[i] ^= mask[i % 4];
                }

                if (opcode === 0x01) { // text
                    this._emit('message', payload.toString('utf-8'));
                } else if (opcode === 0x08) { // close
                    this.socket.end();
                    this._emit('close');
                    return;
                } else if (opcode === 0x09) { // ping
                    this._sendFrame(0x0a, payload); // pong
                }

                this._buffer = this._buffer.slice(offset + payloadLength);
            } else {
                this._buffer = this._buffer.slice(offset + payloadLength);
            }
        }
    }

    send(data) {
        const payload = Buffer.from(data, 'utf-8');
        this._sendFrame(0x01, payload);
    }

    _sendFrame(opcode, payload) {
        let header;
        if (payload.length < 126) {
            header = Buffer.alloc(2);
            header[0] = 0x80 | opcode;
            header[1] = payload.length;
        } else if (payload.length < 65536) {
            header = Buffer.alloc(4);
            header[0] = 0x80 | opcode;
            header[1] = 126;
            header.writeUInt16BE(payload.length, 2);
        } else {
            header = Buffer.alloc(10);
            header[0] = 0x80 | opcode;
            header[1] = 127;
            header.writeBigUInt64BE(BigInt(payload.length), 2);
        }

        try {
            this.socket.write(Buffer.concat([header, payload]));
        } catch (e) {
            // ignore
        }
    }

    on(event, fn) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(fn);
    }

    _emit(event, ...args) {
        const fns = this._listeners[event] || [];
        fns.forEach(fn => fn(...args));
    }
}

module.exports = { WebSocketServer };
