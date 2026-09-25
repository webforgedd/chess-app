import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';

// Runs a real Stockfish engine (fetched from a CDN at runtime, not bundled) inside a
// hidden WebView. UCI text commands go in with `send`; every line the engine prints
// comes back through `onLine`. If the phone has no internet, `onLine` never fires and
// the caller falls back to the built-in engine (see useChessGame.ts).
const ENGINE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';

const HTML = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
  var engine = null;
  function boot() {
    fetch(${JSON.stringify(ENGINE_URL)})
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); })
      .then(function (src) {
        var blob = new Blob([src], { type: 'application/javascript' });
        engine = new Worker(URL.createObjectURL(blob));
        engine.onmessage = function (e) {
          window.ReactNativeWebView.postMessage(typeof e.data === 'string' ? e.data : JSON.stringify(e.data));
        };
        engine.onerror = function (e) { window.ReactNativeWebView.postMessage('__error__ worker: ' + e.message); };
        window.ReactNativeWebView.postMessage('__ready__');
      })
      .catch(function (err) { window.ReactNativeWebView.postMessage('__error__ ' + err); });
  }
  function onCmd(e) { if (engine) engine.postMessage(e.data); }
  document.addEventListener('message', onCmd);
  window.addEventListener('message', onCmd);
  boot();
</script>
</body></html>`;

export type StockfishHandle = { send: (cmd: string) => void };

const StockfishWebView = forwardRef<StockfishHandle, { onLine: (line: string) => void }>(({ onLine }, ref) => {
  const webref = useRef<WebView>(null);
  useImperativeHandle(ref, () => ({
    send: (cmd: string) => webref.current?.postMessage(cmd),
  }));
  return (
    <WebView
      ref={webref}
      source={{ html: HTML }}
      onMessage={(e) => onLine(e.nativeEvent.data)}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      containerStyle={{ width: 0, height: 0 }}
    />
  );
});

export default StockfishWebView;
