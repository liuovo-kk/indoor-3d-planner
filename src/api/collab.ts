import { CollabMessage } from '../types';

export type CollabCallback = {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (msg: CollabMessage) => void;
  onError?: (err: Event) => void;
};

const WS_URL = 'ws://172.31.68.25:15005';

class CollabClient {
  private ws: WebSocket | null = null;
  private callbacks: CollabCallback = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private _connected = false;

  get connected() {
    return this._connected;
  }

  connect(cb: CollabCallback) {
    this.callbacks = cb;
    this.doConnect();
  }

  private doConnect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this._connected = true;
      this.startPing();
      this.callbacks.onOpen?.();
      this.send({ type: 'join' });
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.stopPing();
      this.callbacks.onClose?.();
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      this.callbacks.onError?.(err);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as CollabMessage;
        this.callbacks.onMessage?.(msg);
      } catch (e) {
        console.error('[Collab] 消息解析失败:', e);
      }
    };
  }

  send(msg: CollabMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._connected = false;
    this.ws?.close();
    this.ws = null;
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 10000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, 3000);
  }
}

const collabClient = new CollabClient();
export default collabClient;
