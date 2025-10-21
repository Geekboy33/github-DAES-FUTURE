import { useState, useEffect } from 'react';
import { Shield, Search, FileText, Download } from 'lucide-react';
import { bankingStore, AuditLog } from '../lib/store';
import { CryptoUtils } from '../lib/crypto';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [verifyingSignature, setVerifyingSignature] = useState(false);
  const [signatureValid, setSignatureValid] = useState<boolean | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, serviceFilter]);

  const loadLogs = () => {
    setLogs(bankingStore.getAuditLogs());
  };

  const filterLogs = () => {
    let filtered = logs;

    if (serviceFilter !== 'all') {
      filtered = filtered.filter(log => log.service === serviceFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(term) ||
        log.service.toLowerCase().includes(term) ||
        log.actorId.toLowerCase().includes(term) ||
        JSON.stringify(log.data).toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  };

  const verifyLogSignature = async (log: AuditLog) => {
    setVerifyingSignature(true);
    setSignatureValid(null);

    try {
      const dataString = JSON.stringify({
        service: log.service,
        action: log.action,
        actorId: log.actorId,
        data: log.data
      });

      const isValid = await CryptoUtils.verifyHMAC(
        'audit-secret-key',
        dataString,
        log.hmacSignature
      );

      setSignatureValid(isValid);
    } catch (error) {
      console.error('Signature verification failed:', error);
      setSignatureValid(false);
    } finally {
      setVerifyingSignature(false);
    }
  };

  const exportLogs = () => {
    const exportData = filteredLogs.map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      service: log.service,
      action: log.action,
      actorId: log.actorId,
      data: log.data,
      hmacSignature: log.hmacSignature
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const services = Array.from(new Set(logs.map(log => log.service)));

  const getServiceColor = (service: string) => {
    const colors: Record<string, string> = {
      transfer: 'text-blue-400',
      api_keys: 'text-purple-400',
      account: 'text-green-400',
      file: 'text-yellow-400',
      auth: 'text-red-400'
    };
    return colors[service] || 'text-slate-400';
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-900 text-green-300',
      update: 'bg-blue-900 text-blue-300',
      delete: 'bg-red-900 text-red-300',
      read: 'bg-slate-700 text-slate-300'
    };
    return colors[action] || 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="flex h-full bg-black">
      <div className="flex-1 flex flex-col">
        <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Audit Logs</h2>
                <p className="text-sm text-slate-400">Immutable security audit trail</p>
              </div>
            </div>

            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Services</option>
              {services.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-sm text-slate-400">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  onClick={() => {
                    setSelectedLog(log);
                    setSignatureValid(null);
                  }}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedLog?.id === log.id
                      ? 'bg-blue-600 border-2 border-blue-500'
                      : 'bg-[#0d0d0d] hover:bg-slate-750 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${getServiceColor(log.service)}`}>
                        {log.service}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {log.createdAt.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="font-mono text-xs">{log.id}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs">Actor: {log.actorId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="w-96 bg-[#0d0d0d] border-l border-[#1a1a1a] flex flex-col">
          <div className="p-6 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Log Details</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Log ID</label>
                <div className="bg-black p-2 rounded font-mono text-xs text-white break-all">
                  {selectedLog.id}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Timestamp</label>
                <div className="bg-black p-2 rounded text-white">
                  {selectedLog.createdAt.toISOString()}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Service</label>
                <div className="bg-black p-2 rounded text-white">
                  {selectedLog.service}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Action</label>
                <div className="bg-black p-2 rounded text-white">
                  {selectedLog.action}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Actor ID</label>
                <div className="bg-black p-2 rounded font-mono text-xs text-white">
                  {selectedLog.actorId}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Data</label>
                <div className="bg-black p-2 rounded font-mono text-xs text-white max-h-40 overflow-auto">
                  {JSON.stringify(selectedLog.data, null, 2)}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">HMAC Signature</label>
                <div className="bg-black p-2 rounded font-mono text-xs text-green-400 break-all">
                  {selectedLog.hmacSignature}
                </div>
              </div>
            </div>

            <button
              onClick={() => verifyLogSignature(selectedLog)}
              disabled={verifyingSignature}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {verifyingSignature ? 'Verifying...' : 'Verify Signature'}
            </button>

            {signatureValid !== null && (
              <div className={`mt-4 p-3 rounded-lg ${
                signatureValid
                  ? 'bg-green-900/20 border border-green-700'
                  : 'bg-red-900/20 border border-red-700'
              }`}>
                <div className="text-sm font-semibold">
                  {signatureValid ? (
                    <span className="text-green-300">✓ Signature Valid</span>
                  ) : (
                    <span className="text-red-300">✗ Signature Invalid</span>
                  )}
                </div>
                <div className="text-xs mt-1">
                  {signatureValid ? (
                    <span className="text-green-400">Log integrity verified</span>
                  ) : (
                    <span className="text-red-400">Log may have been tampered with</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
