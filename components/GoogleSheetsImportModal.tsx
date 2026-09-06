import React, { useState } from 'react';
import { Modal, Button, Input } from './ui';
import { 
  parseSpreadsheetId, 
  fetchPublicSheetDataByUrl, 
  requestGoogleOAuthToken, 
  fetchDriveSpreadsheets, 
  fetchSpreadsheetInfoWithToken, 
  fetchSheetValuesWithToken, 
  GoogleDriveFile, 
  SheetData 
} from '../services/googleSheetsService';
import { dataService } from '../services/mockSupabase';
import { Client, Product } from '../types';
import { FileSpreadsheet, Link2, LogIn, RefreshCw, CheckCircle2, AlertCircle, Table } from 'lucide-react';

interface GoogleSheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'clients' | 'products';
  onImportSuccess: () => void;
}

export const GoogleSheetsImportModal: React.FC<GoogleSheetsImportModalProps> = ({
  isOpen,
  onClose,
  type,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'drive'>('url');
  
  // URL Mode State
  const [sheetUrl, setSheetUrl] = useState('');
  
  // OAuth / Drive State
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [sheetTabs, setSheetTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('');
  
  // Loaded Data State
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Column Mappings State
  const [mappings, setMappings] = useState<Record<string, number>>({});

  // Reset state when modal closes
  const handleClose = () => {
    setSheetUrl('');
    setSheetData(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setImporting(false);
    setMappings({});
    onClose();
  };

  // Helper to normalize header text for auto-matching
  const normalize = (txt: string) => 
    txt.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Auto detect columns whenever headers change
  const autoDetectColumns = (headers: string[]) => {
    const newMap: Record<string, number> = {};

    headers.forEach((h, idx) => {
      const norm = normalize(h);
      
      if (type === 'clients') {
        if (!('nome' in newMap) && (norm.includes('nome') || norm.includes('cliente') || norm.includes('razao') || norm.includes('comprador'))) {
          newMap['nome'] = idx;
        } else if (!('telefone' in newMap) && (norm.includes('telef') || norm.includes('cel') || norm.includes('contato') || norm.includes('zap') || norm.includes('fone'))) {
          newMap['telefone'] = idx;
        } else if (!('endereco' in newMap) && (norm.includes('ender') || norm.includes('rua') || norm.includes('logradou'))) {
          newMap['endereco'] = idx;
        } else if (!('bairro' in newMap) && norm.includes('bairro')) {
          newMap['bairro'] = idx;
        } else if (!('cidade' in newMap) && (norm.includes('cidad') || norm.includes('municip'))) {
          newMap['cidade'] = idx;
        } else if (!('is_mumbuca' in newMap) && (norm.includes('mumbuca') || norm.includes('cartao'))) {
          newMap['is_mumbuca'] = idx;
        }
      } else {
        // Products
        if (!('nome' in newMap) && (norm.includes('nome') || norm.includes('produt') || norm.includes('descri') || norm.includes('item'))) {
          newMap['nome'] = idx;
        } else if (!('categoria' in newMap) && (norm.includes('categ') || norm.includes('grup') || norm.includes('tipo') || norm.includes('setor'))) {
          newMap['categoria'] = idx;
        } else if (!('valor_avista' in newMap) && (norm.includes('vista') || norm.includes('dinheiro') || norm.includes('desconto'))) {
          newMap['valor_avista'] = idx;
        } else if (!('valor_parcelado' in newMap) && (norm.includes('parcelad') || norm.includes('prazo') || norm.includes('preco') || norm.includes('valor') || norm.includes('venda'))) {
          newMap['valor_parcelado'] = idx;
        }
      }
    });

    setMappings(newMap);
  };

  // Load public sheet data by URL
  const handleLoadByUrl = async () => {
    if (!sheetUrl.trim()) {
      setErrorMsg('Cole o link da sua planilha do Google Sheets.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const data = await fetchPublicSheetDataByUrl(sheetUrl);
      if (data.headers.length === 0) {
        throw new Error('A planilha está vazia ou sem cabeçalhos.');
      }
      setSheetData(data);
      autoDetectColumns(data.headers);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Não foi possível carregar a planilha.');
    } finally {
      setLoading(false);
    }
  };

  // Connect Google Account via OAuth
  const handleConnectGoogle = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await requestGoogleOAuthToken();
      setAccessToken(token);
      
      // Fetch Drive Spreadsheets
      const files = await fetchDriveSpreadsheets(token);
      setDriveFiles(files);
      if (files.length > 0) {
        handleSelectDriveFile(files[0].id, token);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao conectar com a conta do Google.');
    } finally {
      setLoading(false);
    }
  };

  // Select a Google Drive file
  const handleSelectDriveFile = async (fileId: string, tokenToUse?: string) => {
    const token = tokenToUse || accessToken;
    if (!token) return;

    setSelectedFileId(fileId);
    setLoading(true);
    setErrorMsg(null);

    try {
      const info = await fetchSpreadsheetInfoWithToken(token, fileId);
      setSheetTabs(info.sheets);
      
      const defaultTab = info.sheets[0] || 'Folha1';
      setSelectedTab(defaultTab);

      // Load sheet data
      const data = await fetchSheetValuesWithToken(token, fileId, defaultTab);
      setSheetData(data);
      autoDetectColumns(data.headers);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao carregar dados da planilha do Drive.');
    } finally {
      setLoading(false);
    }
  };

  // Switch tab inside selected spreadsheet
  const handleSelectSheetTab = async (tabName: string) => {
    if (!accessToken || !selectedFileId) return;
    setSelectedTab(tabName);
    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await fetchSheetValuesWithToken(accessToken, selectedFileId, tabName);
      setSheetData(data);
      autoDetectColumns(data.headers);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao carregar aba da planilha.');
    } finally {
      setLoading(false);
    }
  };

  // Process and import rows into database
  const handleImport = async () => {
    if (!sheetData || sheetData.rows.length === 0) {
      setErrorMsg('Nenhum dado para importar.');
      return;
    }

    if (mappings['nome'] === undefined) {
      setErrorMsg(`Selecione qual coluna contém o ${type === 'clients' ? 'Nome do Cliente' : 'Nome do Produto'}.`);
      return;
    }

    setImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setImportProgress({ current: 0, total: sheetData.rows.length });

    let countSuccess = 0;

    try {
      if (type === 'clients') {
        for (let i = 0; i < sheetData.rows.length; i++) {
          const row = sheetData.rows[i];
          const nomeVal = row[mappings['nome']]?.trim();
          
          if (!nomeVal) continue; // Skip empty names

          const telVal = mappings['telefone'] !== undefined ? row[mappings['telefone']]?.trim() : '';
          const endVal = mappings['endereco'] !== undefined ? row[mappings['endereco']]?.trim() : '';
          const bairroVal = mappings['bairro'] !== undefined ? row[mappings['bairro']]?.trim() : '';
          const cidadeVal = mappings['cidade'] !== undefined ? row[mappings['cidade']]?.trim() : '';
          
          const mumbucaRaw = mappings['is_mumbuca'] !== undefined ? normalize(row[mappings['is_mumbuca']] || '') : '';
          const isMumbuca = mumbucaRaw === 'sim' || mumbucaRaw === 'true' || mumbucaRaw === '1' || mumbucaRaw === 's';

          const newClientData: Omit<Client, 'id'> = {
            nome: nomeVal,
            telefone: telVal || '',
            endereco: endVal || '',
            bairro: bairroVal || '',
            cidade: cidadeVal || '',
            vendedor_id: '',
            is_mumbuca: isMumbuca
          };

          await dataService.createClient(newClientData);
          countSuccess++;
          setImportProgress({ current: countSuccess, total: sheetData.rows.length });
        }
      } else {
        // Products
        for (let i = 0; i < sheetData.rows.length; i++) {
          const row = sheetData.rows[i];
          const nomeVal = row[mappings['nome']]?.trim();
          
          if (!nomeVal) continue;

          const catVal = mappings['categoria'] !== undefined ? row[mappings['categoria']]?.trim() : 'Geral';
          
          // Parse values
          const cleanCurrency = (txt?: string) => {
            if (!txt) return 0;
            const num = txt.replace(/[^\d.,]/g, '').replace(',', '.');
            return parseFloat(num) || 0;
          };

          const vistaVal = mappings['valor_avista'] !== undefined ? cleanCurrency(row[mappings['valor_avista']]) : 0;
          let parcVal = mappings['valor_parcelado'] !== undefined ? cleanCurrency(row[mappings['valor_parcelado']]) : 0;
          
          if (parcVal === 0 && vistaVal > 0) parcVal = vistaVal;
          if (vistaVal === 0 && parcVal > 0) {}

          const newProductData: Omit<Product, 'id'> = {
            nome: nomeVal,
            categoria: catVal || 'Geral',
            valor_avista: vistaVal,
            valor_parcelado: parcVal,
            ativo: true
          };

          await dataService.createProduct(newProductData);
          countSuccess++;
          setImportProgress({ current: countSuccess, total: sheetData.rows.length });
        }
      }

      setSuccessMsg(`Sucesso! ${countSuccess} ${type === 'clients' ? 'clientes' : 'produtos'} importados para o banco de dados.`);
      onImportSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro durante a importação.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Importar ${type === 'clients' ? 'Clientes' : 'Produtos'} do Google Sheets`}
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 text-gray-800 dark:text-gray-200">
        
        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className={`flex items-center gap-2 py-2 px-4 border-b-2 text-sm font-semibold transition-colors ${
              activeTab === 'url'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
            onClick={() => { setActiveTab('url'); setErrorMsg(null); }}
          >
            <Link2 size={16} /> Link da Planilha (URL)
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 py-2 px-4 border-b-2 text-sm font-semibold transition-colors ${
              activeTab === 'drive'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
            onClick={() => { setActiveTab('drive'); setErrorMsg(null); }}
          >
            <LogIn size={16} /> Conectar Conta Google
          </button>
        </div>

        {/* Tab 1: URL Mode */}
        {activeTab === 'url' && (
          <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Cole o link da sua planilha do Google Sheets (ex: <i>https://docs.google.com/spreadsheets/d/...</i>).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <Button onClick={handleLoadByUrl} disabled={loading} className="whitespace-nowrap flex items-center gap-1.5">
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                Carregar
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Drive OAuth Mode */}
        {activeTab === 'drive' && (
          <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-lg border border-gray-200 dark:border-gray-700">
            {!accessToken ? (
              <div className="text-center py-3">
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                  Autorize o acesso para listar diretamente suas planilhas salvas no Google Drive.
                </p>
                <Button onClick={handleConnectGoogle} disabled={loading} className="mx-auto flex items-center gap-2">
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={16} />}
                  Conectar com Google
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400 font-semibold">
                  <span>✓ Conta Google Conectada</span>
                  <button 
                    onClick={handleConnectGoogle} 
                    className="text-gray-500 hover:text-brand-primary underline"
                  >
                    Trocar / Atualizar
                  </button>
                </div>

                {driveFiles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Escolha a Planilha:</label>
                      <select
                        value={selectedFileId || ''}
                        onChange={(e) => handleSelectDriveFile(e.target.value)}
                        className="w-full text-xs p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        {driveFiles.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    {sheetTabs.length > 1 && (
                      <div>
                        <label className="text-xs font-semibold block mb-1">Aba (Folha):</label>
                        <select
                          value={selectedTab}
                          onChange={(e) => handleSelectSheetTab(e.target.value)}
                          className="w-full text-xs p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        >
                          {sheetTabs.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-2 border border-red-500/20">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-xs flex items-center gap-2 border border-green-500/20">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Loaded Sheet Content & Mapping Controls */}
        {sheetData && sheetData.headers.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <Table size={16} className="text-brand-primary" /> 
                Mapeamento das Colunas ({sheetData.rows.length} registros encontrados)
              </h4>
            </div>

            <p className="text-xs text-gray-500">
              Confirme qual coluna da sua planilha corresponde a cada campo do sistema:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {type === 'clients' ? (
                <>
                  <div>
                    <label className="font-semibold block mb-1">
                      Nome do Cliente <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mappings['nome'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, nome: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Selecione --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Telefone / Celular</label>
                    <select
                      value={mappings['telefone'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, telefone: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Ignorar --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Endereço</label>
                    <select
                      value={mappings['endereco'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, endereco: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Ignorar --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Bairro</label>
                    <select
                      value={mappings['bairro'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, bairro: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Ignorar --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Cidade</label>
                    <select
                      value={mappings['cidade'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, cidade: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Ignorar --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Mumbuca (Sim/Não)</label>
                    <select
                      value={mappings['is_mumbuca'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, is_mumbuca: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Ignorar --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="font-semibold block mb-1">
                      Nome do Produto <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mappings['nome'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, nome: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Selecione --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Categoria</label>
                    <select
                      value={mappings['categoria'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, categoria: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Padrão (Geral) --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Preço À Vista (R$)</label>
                    <select
                      value={mappings['valor_avista'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, valor_avista: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Ignorar --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Preço Parcelado / Venda (R$)</label>
                    <select
                      value={mappings['valor_parcelado'] ?? ''}
                      onChange={(e) => setMappings({ ...mappings, valor_parcelado: Number(e.target.value) })}
                      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">-- Ignorar --</option>
                      {sheetData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Data Preview Table */}
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Pré-visualização das 3 primeiras linhas:
              </h5>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      {sheetData.headers.map((h, idx) => (
                        <th key={idx} className="p-2 border-b border-gray-200 dark:border-gray-700 font-semibold truncate max-w-[120px]">
                          {h || `Col ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetData.rows.slice(0, 3).map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-gray-100 dark:border-gray-800">
                        {sheetData.headers.map((_, cIdx) => (
                          <td key={cIdx} className="p-2 truncate max-w-[120px] text-gray-600 dark:text-gray-300">
                            {row[cIdx] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Progress / Action */}
            {importing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Importando para o banco...</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-brand-primary h-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={importing}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleImport} 
                disabled={importing || mappings['nome'] === undefined}
                className="flex items-center gap-1.5"
              >
                {importing ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                {importing ? 'Importando...' : `Importar ${sheetData.rows.length} Registros`}
              </Button>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
};
