// Service for interacting with Google Sheets API, Google Drive API, and Public Google Sheets Links

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface SheetData {
  headers: string[];
  rows: string[][];
  sheetName?: string;
  allSheets?: string[];
}

/**
 * Extract Spreadsheet ID from various Google Sheets URL formats
 */
export const parseSpreadsheetId = (url: string): string | null => {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Pattern 1: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...
  const match = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];

  // Pattern 2: Raw ID pasted directly
  if (/^[a-zA-Z0-9-_]{25,60}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
};

/**
 * Dynamically load Google Identity Services (GIS) SDK
 */
export const loadGoogleSdk = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existingScript = document.getElementById('google-gis-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-sdk';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
};

/**
 * Request Google OAuth Access Token via Client-Side Popup
 */
export const requestGoogleOAuthToken = async (): Promise<string> => {
  await loadGoogleSdk();

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('SDK do Google não pôde ser carregado.'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: '651223161549-applet.apps.googleusercontent.com', // Will work with GIS interactive token flow
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error || 'Falha ao autorizar conta Google.'));
          return;
        }
        if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error('Nenhum token retornado.'));
        }
      },
      error_callback: (err: any) => {
        reject(new Error(err.message || 'Erro no login com Google.'));
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * Fetch files from Google Drive (Spreadsheets)
 */
export const fetchDriveSpreadsheets = async (accessToken: string): Promise<GoogleDriveFile[]> => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'+and+trashed%3Dfalse&fields=files(id%2Cname%2CmodifiedTime)&pageSize=30&orderBy=modifiedTime+desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro ao buscar planilhas do Drive: ${res.statusText} (${errorText})`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Fetch spreadsheet metadata and sheet names using Google Sheets API
 */
export const fetchSpreadsheetInfoWithToken = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> => {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao acessar planilha (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || 'Folha1');
  return {
    title: data.properties?.title || 'Planilha Sem Nome',
    sheets
  };
};

/**
 * Fetch rows from a specific sheet range using Google Sheets API
 */
export const fetchSheetValuesWithToken = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName?: string
): Promise<SheetData> => {
  const range = sheetName ? `'${sheetName}'!A1:ZZ` : 'A1:ZZ';
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao ler dados da planilha (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const valueRows: string[][] = data.values || [];

  if (valueRows.length === 0) {
    return { headers: [], rows: [], sheetName };
  }

  const headers = valueRows[0].map(h => String(h || '').trim());
  const rows = valueRows.slice(1);

  return {
    headers,
    rows,
    sheetName
  };
};

/**
 * Parse CSV text into headers and rows matrix
 */
export const parseCSVText = (csvText: string): SheetData => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount >= tabCount) delimiter = ';';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
};

/**
 * Fetch spreadsheet data by public link or export endpoint
 */
export const fetchPublicSheetDataByUrl = async (url: string): Promise<SheetData> => {
  const spreadsheetId = parseSpreadsheetId(url);
  if (!spreadsheetId) {
    throw new Error('URL do Google Sheets inválida. Certifique-se de copiar o link completo da planilha.');
  }

  // Try direct gviz CSV export endpoint
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
  
  try {
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error(`Não foi possível acessar a planilha publicamente (${res.status}).`);
    }
    const text = await res.text();
    if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      throw new Error('A planilha precisa estar com acesso público habilitado ("Qualquer pessoa com o link") ou você pode usar o botão "Conectar Conta Google".');
    }
    return parseCSVText(text);
  } catch (err: any) {
    // Retry with /export?format=csv
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    const res = await fetch(exportUrl);
    if (!res.ok) {
      throw new Error(err.message || 'Erro ao carregar planilha pública.');
    }
    const text = await res.text();
    return parseCSVText(text);
  }
};
