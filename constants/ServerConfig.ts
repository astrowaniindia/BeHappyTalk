// ─── Central server config ────────────────────────────────────────────────────
//
// PRODUCTION: Uses custom domain → provider.behappytalk.com
//             DNS must point to the active Render server.
//             Changing Render servers = just update DNS, no code change needed.
//
// LOCAL DEV:  Swap RENDER_URL to http://192.168.x.x:3000 temporarily.

const RENDER_URL = 'https://provider.behappytalk.com';
// const RENDER_URL = 'http://192.168.29.168:3000'; // ← local dev only

// Wrapper to automatically bypass localtunnel and ngrok warning landing pages
const originalFetch = global.fetch;
global.fetch = function (input: any, init?: any) {
  const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
  if (url.includes('loca.lt') || url.includes('ngrok')) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      init.headers.set('bypass-tunnel-reminder', 'true');
      init.headers.set('ngrok-skip-browser-warning', 'true');
    } else if (Array.isArray(init.headers)) {
      init.headers.push(['bypass-tunnel-reminder', 'true']);
      init.headers.push(['ngrok-skip-browser-warning', 'true']);
    } else {
      init.headers['bypass-tunnel-reminder'] = 'true';
      init.headers['ngrok-skip-browser-warning'] = 'true';
    }
  }
  return originalFetch(input, init);
};

export const API_URL = `${RENDER_URL}/api`;
export const SOCKET_URL = RENDER_URL;

export const secureFetch = async (input: any, init?: any): Promise<Response> => {
  let newInit = init ? { ...init } : {};
  let headers: any = {};
  
  if (newInit.headers) {
    if (newInit.headers instanceof Headers) {
      newInit.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(newInit.headers)) {
      newInit.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      headers = { ...newInit.headers };
    }
  }
  
  headers['bypass-tunnel-reminder'] = 'true';
  headers['ngrok-skip-browser-warning'] = 'true';
  newInit.headers = headers;
  
  return fetch(input, newInit);
};
