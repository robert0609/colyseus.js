// colyseus.js@0.17.1
import NodeWebSocket from 'ws';

const WebSocket = globalThis.WebSocket || NodeWebSocket;
class WebSocketTransport {
    events;
    ws;
    protocols;
    constructor(events) {
        this.events = events;
    }
    send(data) {
        if (!!wx) {
            this.ws.send({ data });
        }
        else {
            this.ws.send(data);
        }
    }
    sendUnreliable(data) {
        console.warn("colyseus.js: The WebSocket transport does not support unreliable messages");
    }
    /**
     * @param url URL to connect to
     * @param headers custom headers to send with the connection (only supported in Node.js. Web Browsers do not allow setting custom headers)
     */
    connect(url, headers) {
        if (!!wx) {
            // 若是微信小程序环境
            this.ws = wx.connectSocket({
                url,
                protocols: Array.isArray(this.protocols) ? this.protocols : [this.protocols]
            });
            this.ws.onOpen(this.events.onopen);
            this.ws.onMessage(this.events.onmessage);
            this.ws.onClose(this.events.onclose);
            this.ws.onError(({ errMsg }) => {
                this.events.onerror({ code: -1e4, reason: errMsg });
            });
        }
        else {
            try {
                // Node or Bun environments (supports custom headers)
                this.ws = new WebSocket(url, { headers, protocols: this.protocols });
            }
            catch (e) {
                // browser environment (custom headers not supported)
                this.ws = new WebSocket(url, this.protocols);
            }
            this.ws.binaryType = 'arraybuffer';
            this.ws.onopen = this.events.onopen;
            this.ws.onmessage = this.events.onmessage;
            this.ws.onclose = this.events.onclose;
            this.ws.onerror = this.events.onerror;
        }
    }
    close(code, reason) {
        if (!!wx) {
            this.ws.send({ code, reason });
        }
        else {
            this.ws.close(code, reason);
        }
    }
    get isOpen() {
        return this.ws.readyState === WebSocket.OPEN;
    }
}

export { WebSocketTransport };
//# sourceMappingURL=WebSocketTransport.mjs.map
