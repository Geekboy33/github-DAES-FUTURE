import { useState } from 'react';
import { Upload, Lock, Unlock, FileText, Download } from 'lucide-react';
import { CryptoUtils } from '../lib/crypto';
import { DTC1BParser, ParsedBlock } from '../lib/dtc1b-parser';
import { HexViewer } from './HexViewer';

export function DTC1BProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [encryptedData, setEncryptedData] = useState<Uint8Array | null>(null);
  const [decryptedData, setDecryptedData] = useState<Uint8Array | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [keyString, setKeyString] = useState<string>('');
  const [nonce, setNonce] = useState<Uint8Array | null>(null);
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'original' | 'encrypted' | 'decrypted'>('original');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const buffer = await uploadedFile.arrayBuffer();
    const data = new Uint8Array(buffer);
    setFileData(data);
    setCurrentView('original');

    const blocks = DTC1BParser.parseBlocks(data, uploadedFile.name);
    setParsedBlocks(blocks);
  };

  const generateSampleFile = () => {
    const sampleData = DTC1BParser.createSampleDTC1BFile();
    setFileData(sampleData);
    setFile(new File([sampleData], 'sample-dtc1b.bin'));
    setCurrentView('original');

    const blocks = DTC1BParser.parseBlocks(sampleData, 'sample-dtc1b.bin');
    setParsedBlocks(blocks);
  };

  const handleEncrypt = async () => {
    if (!fileData) return;

    setLoading(true);
    try {
      const key = await CryptoUtils.generateKey();
      const generatedNonce = CryptoUtils.generateNonce();
      const encrypted = await CryptoUtils.encryptAESGCM(key, fileData, generatedNonce);

      setEncryptionKey(key);
      setNonce(generatedNonce);
      setEncryptedData(encrypted);
      setCurrentView('encrypted');

      const exportedKey = await CryptoUtils.exportKey(key);
      setKeyString(exportedKey);
    } catch (error) {
      alert('Encryption failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedData || !encryptionKey || !nonce) return;

    setLoading(true);
    try {
      const decrypted = await CryptoUtils.decryptAESGCM(encryptionKey, encryptedData, nonce);
      setDecryptedData(decrypted);
      setCurrentView('decrypted');

      const blocks = DTC1BParser.parseBlocks(decrypted, 'decrypted');
      setParsedBlocks(blocks);
    } catch (error) {
      alert('Decryption failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const downloadData = (data: Uint8Array, filename: string) => {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadKeys = () => {
    const keyData = {
      key: keyString,
      nonce: nonce ? btoa(String.fromCharCode(...nonce)) : null,
      algorithm: 'AES-256-GCM',
      createdAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'encryption-keys.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCurrentData = () => {
    switch (currentView) {
      case 'encrypted': return encryptedData;
      case 'decrypted': return decryptedData;
      default: return fileData;
    }
  };

  const currentData = getCurrentData();
  const matches = currentView !== 'encrypted' && fileData
    ? DTC1BParser.findCurrencyMatches(currentView === 'decrypted' ? decryptedData || fileData : fileData)
    : [];

  const highlights = parsedBlocks.map(block => ({
    start: block.offsetStart,
    end: block.offsetEnd,
    color: 'bg-green-600 text-white',
    label: `${block.currency} - ${DTC1BParser.formatAmount(block.amountMinorUnits, block.currency)}`
  }));

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">DTC1B File Processor</h2>
              <p className="text-sm text-slate-400">AES-256-GCM encryption and binary parsing</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!file && (
              <button
                onClick={generateSampleFile}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Generate Sample
              </button>
            )}

            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Upload File
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".file,.bin,.dtc1b,.dat"
              />
            </label>
          </div>
        </div>

        {file && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div>
                <div className="text-white font-medium">{file.name}</div>
                <div className="text-sm text-slate-400">
                  {fileData?.length} bytes • {parsedBlocks.length} blocks detected
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('original')}
                  className={`px-4 py-2 rounded transition-colors ${
                    currentView === 'original'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  Original
                </button>

                {encryptedData && (
                  <button
                    onClick={() => setCurrentView('encrypted')}
                    className={`px-4 py-2 rounded transition-colors ${
                      currentView === 'encrypted'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    Encrypted
                  </button>
                )}

                {decryptedData && (
                  <button
                    onClick={() => setCurrentView('decrypted')}
                    className={`px-4 py-2 rounded transition-colors ${
                      currentView === 'decrypted'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    Decrypted
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleEncrypt}
                disabled={!fileData || loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
              >
                <Lock className="w-4 h-4" />
                Encrypt (AES-256-GCM)
              </button>

              {encryptedData && (
                <button
                  onClick={handleDecrypt}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                  Decrypt
                </button>
              )}

              {currentData && (
                <button
                  onClick={() => downloadData(currentData, `${file.name}.${currentView}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download {currentView}
                </button>
              )}

              {keyString && (
                <button
                  onClick={downloadKeys}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Keys
                </button>
              )}
            </div>

            {keyString && (
              <div className="p-4 bg-slate-700 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Encryption Key (Base64)
                  </label>
                  <textarea
                    value={keyString}
                    readOnly
                    rows={2}
                    className="w-full bg-[#0d0d0d] text-green-400 px-3 py-2 rounded border border-slate-600 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nonce (Base64)
                  </label>
                  <input
                    value={nonce ? btoa(String.fromCharCode(...nonce)) : ''}
                    readOnly
                    className="w-full bg-[#0d0d0d] text-green-400 px-3 py-2 rounded border border-slate-600 font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {currentData ? (
          <HexViewer
            data={currentData}
            highlights={currentView !== 'encrypted' ? highlights : []}
            matches={matches}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Upload a file or generate a sample to begin
          </div>
        )}
      </div>
    </div>
  );
}
