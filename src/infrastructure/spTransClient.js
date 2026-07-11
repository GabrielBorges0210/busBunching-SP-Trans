const STANDARD_HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'SPTransBunchingMonitor/1.0 (Node.js)'
};

// Singleton to hold the session in memory
let cachedSessionCookie = null;

export async function authenticateSpTrans() {
    // If we already have a session, skip authentication
    if (cachedSessionCookie) return cachedSessionCookie;

    const token = process.env.SPTRANS_API_TOKEN;
    if (!token) throw new Error('envTokenMissing');

    console.log('auth_manager: Requesting new session from SPTrans...');

    const authUrl = `https://api.olhovivo.sptrans.com.br/v2.1/Login/Autenticar?token=${token}`;
    const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
            ...STANDARD_HEADERS,
            'Content-Length': '0'
        }
    });

    if (!response.ok) throw new Error('sptransHttpError');

    const authStatus = await response.text();
    if (authStatus !== 'true') throw new Error('sptransTokenRejected');

    const cookies = response.headers.getSetCookie();
    const validCookieString = cookies.find(cookie => 
        cookie.includes('apiCredentials=') && !cookie.startsWith('apiCredentials=;')
    );

    if (!validCookieString) throw new Error('sptransCookieMissing');

    // Store the session in RAM
    cachedSessionCookie = validCookieString.split(';')[0];
    
    console.log('auth_manager: Session acquired. Waiting for cluster propagation...');
    
    // Crucial Architecture Fix: Wait 1.5 seconds to bypass the IIS cluster race condition
    await new Promise(resolve => setTimeout(resolve, 1500));

    return cachedSessionCookie;
}

export async function fetchBusPositions() {
    // Always ensure we have a valid session before fetching
    const sessionCookie = await authenticateSpTrans();
    const positionsUrl = 'https://api.olhovivo.sptrans.com.br/v2.1/Posicao';

    const response = await fetch(positionsUrl, {
        method: 'GET',
        headers: {
            ...STANDARD_HEADERS,
            'Cookie': sessionCookie
        }
    });

    // If the session expired mid-flight, clear the cache so the next run forces a new login
    if (response.status === 401) {
        console.warn('auth_manager: Session expired or rejected. Clearing cache.');
        cachedSessionCookie = null;
        throw new Error('sptransSessionExpired');
    }

    if (!response.ok) throw new Error('sptransPositionsFetchFailed');

    return await response.json();
}