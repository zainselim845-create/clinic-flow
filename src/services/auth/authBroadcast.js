export function broadcastTenantUpdate(type, payload) {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel('clinicflow_tenants_sync');
      channel.postMessage({ type, payload, timestamp: Date.now() });
      setTimeout(() => {
        try { channel.close(); } catch (closeErr) {
          console.warn('[AuthService] BroadcastChannel close error:', closeErr);
        }
      }, 1000);
    } catch (err) {
      console.warn('[AuthService] BroadcastChannel update error:', err);
    }
  }

  // Same-window / same-tab instant reactive dispatch
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('clinicflow_sync', { detail: { type, payload, timestamp: Date.now() } }));
    } catch (evtErr) {
      console.warn('[AuthService] CustomEvent dispatch error:', evtErr);
    }
  }
}
