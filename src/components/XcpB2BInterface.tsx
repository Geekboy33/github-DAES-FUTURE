/**
 * XCP B2B API Interface Component
 * UI for managing bank-to-bank remittances via API
 */

import { useState, useEffect } from 'react';
import {
  Send,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Building2,
  Key,
  Shield,
  Zap,
  Activity,
  FileText,
  Database,
} from 'lucide-react';
import { balanceStore, formatCurrency as formatBalanceCurrency, type CurrencyBalance } from '../lib/balances-store';

interface RemittanceFormData {
  userId: string;
  destinationAccountNumber: string;
  amount: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'CHF' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR' | 'MXN' | 'BRL' | 'RUB' | 'KRW' | 'SGD' | 'HKD';
  reference: string;
  purposeCode: string;
  beneficiaryName: string;
  beneficiaryIban: string;
  beneficiaryBic: string;
  urgent: boolean;
}

interface RemittanceStatus {
  transactionId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED';
  amount: { value: number; currency: string };
  reference?: string;
  mt103Reference?: string;
  createdAt: string;
  completedAt?: string;
}

export function XcpB2BInterface() {
  const [hasToken, setHasToken] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remittanceStatus, setRemittanceStatus] = useState<RemittanceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableBalances, setAvailableBalances] = useState<CurrencyBalance[]>([]);
  const [selectedBalance, setSelectedBalance] = useState<CurrencyBalance | null>(null);

  const [formData, setFormData] = useState<RemittanceFormData>({
    userId: 'user_xcp_demo_001',
    destinationAccountNumber: '',
    amount: '',
    currency: 'USD',
    reference: '',
    purposeCode: 'GDDS',
    beneficiaryName: '',
    beneficiaryIban: '',
    beneficiaryBic: '',
    urgent: false,
  });

  // Load balances on mount
  useEffect(() => {
    const balances = balanceStore.getBalances();
    setAvailableBalances(balances);

    // Subscribe to balance changes
    const unsubscribe = balanceStore.subscribe((updatedBalances) => {
      setAvailableBalances(updatedBalances);
    });

    return unsubscribe;
  }, []);

  // Update selected balance when currency changes
  useEffect(() => {
    const balance = availableBalances.find(b => b.currency === formData.currency);
    setSelectedBalance(balance || null);
  }, [formData.currency, availableBalances]);

  const handleObtainToken = async () => {
    setIsLoadingToken(true);
    setError(null);
    try {
      // In a real implementation, this would call the XCP B2B client
      await new Promise(resolve => setTimeout(resolve, 1500));
      setHasToken(true);
      alert('✅ Token obtenido exitosamente. Válido por 1 hora.');
    } catch (err) {
      setError('Error al obtener token de autenticación');
    } finally {
      setIsLoadingToken(false);
    }
  };

  const handleSubmitRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate
      if (!hasToken) {
        throw new Error('Debe obtener un token primero');
      }

      if (!formData.destinationAccountNumber || !formData.amount || !formData.beneficiaryName) {
        throw new Error('Complete todos los campos requeridos');
      }

      // Validate balance if available
      const requestedAmount = parseFloat(formData.amount);
      if (selectedBalance && selectedBalance.totalAmount < requestedAmount) {
        throw new Error(
          `Balance insuficiente: Tienes ${formatBalanceCurrency(selectedBalance.totalAmount, formData.currency)} ` +
          `pero intentas transferir ${formatBalanceCurrency(requestedAmount, formData.currency)}`
        );
      }

      if (selectedBalance && requestedAmount > 0) {
        console.log('[XCP B2B] Using balance:', {
          currency: selectedBalance.currency,
          available: selectedBalance.totalAmount,
          requested: requestedAmount,
          remaining: selectedBalance.totalAmount - requestedAmount
        });
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockStatus: RemittanceStatus = {
        transactionId: `xcp_trx_${Date.now()}`,
        status: 'PENDING',
        amount: { value: parseFloat(formData.amount), currency: formData.currency },
        reference: formData.reference || `REF-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      setRemittanceStatus(mockStatus);

      // Simulate status update after 5 seconds
      setTimeout(() => {
        setRemittanceStatus(prev => prev ? {
          ...prev,
          status: 'COMPLETED',
          mt103Reference: `MT103-${Date.now()}`,
          completedAt: new Date().toISOString(),
        } : null);
      }, 5000);

      alert('✅ Remesa creada exitosamente. ID: ' + mockStatus.transactionId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la remesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RemittanceFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400';
      case 'PENDING': return 'text-yellow-400';
      case 'PROCESSING': return 'text-[#00ff88]';
      case 'REJECTED': return 'text-red-400';
      case 'FAILED': return 'text-red-500';
      default: return 'text-[#80ff80]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-5 h-5" />;
      case 'PENDING': return <Clock className="w-5 h-5" />;
      case 'PROCESSING': return <Activity className="w-5 h-5 animate-spin" />;
      case 'REJECTED': return <AlertCircle className="w-5 h-5" />;
      case 'FAILED': return <AlertCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-black overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              XCP B2B API - Remesas Internacionales
            </h1>
            <p className="text-purple-100">
              Transferencias bancarias seguras con mTLS + HMAC-SHA256
            </p>
          </div>
          <Shield className="w-16 h-16 text-white opacity-20" />
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Security Features Banner */}
        <div className="bg-[#0d0d0d] rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Características de Seguridad
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
              <Key className="w-8 h-8 text-[#00ff88]" />
              <div>
                <div className="text-sm font-semibold text-white">mTLS</div>
                <div className="text-xs text-[#80ff80]">TLS ≥ 1.2</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
              <Shield className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-sm font-semibold text-white">HMAC</div>
                <div className="text-xs text-[#80ff80]">SHA-256</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-sm font-semibold text-white">JWT</div>
                <div className="text-xs text-[#80ff80]">Bearer Auth</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
              <Activity className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-sm font-semibold text-white">Anti-Replay</div>
                <div className="text-xs text-[#80ff80]">±5 min</div>
              </div>
            </div>
          </div>
        </div>

        {/* Token Management */}
        <div className="bg-[#0d0d0d] rounded-xl p-6 border border-[#1a1a1a]">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Key className="w-6 h-6 text-yellow-400" />
            1. Autenticación JWT
          </h3>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleObtainToken}
              disabled={isLoadingToken || hasToken}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                hasToken
                  ? 'bg-green-600 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoadingToken ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Obteniendo Token...
                </>
              ) : hasToken ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Token Activo
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Obtener Token JWT
                </>
              )}
            </button>

            {hasToken && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                Token válido por 60 minutos
              </div>
            )}
          </div>

          <div className="mt-4 bg-slate-700/50 rounded-lg p-4">
            <p className="text-sm text-slate-300">
              <strong>Endpoint:</strong> POST /api-keys/token
            </p>
            <p className="text-sm text-slate-300 mt-1">
              <strong>Auth:</strong> Bearer API_KEY + mTLS
            </p>
          </div>
        </div>

        {/* Available Balances */}
        {availableBalances.length > 0 && (
          <div className="bg-[#0d0d0d] rounded-xl p-6 border border-green-700/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Balances Disponibles</h3>
                  <p className="text-sm text-[#80ff80]">Fondos cargados desde el analizador DTC1B</p>
                </div>
              </div>
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {availableBalances.slice(0, 15).map((balance) => {
                const isSelected = balance.currency === formData.currency;
                const isMain = ['USD', 'EUR', 'GBP', 'CHF'].includes(balance.currency);
                return (
                  <div
                    key={balance.currency}
                    className={`rounded-lg p-3 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-500 ring-2 ring-blue-400'
                        : isMain
                        ? 'bg-green-900/20 border-green-600/50 hover:border-green-500'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => handleInputChange('currency', balance.currency)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-white">
                        {balance.currency}
                      </span>
                      {isSelected && <CheckCircle className="w-3 h-3 text-[#00ff88]" />}
                    </div>
                    <div className="text-sm font-bold text-white">
                      {formatBalanceCurrency(balance.totalAmount, balance.currency)}
                    </div>
                    <div className="text-xs text-[#80ff80] mt-1">
                      {balance.transactionCount} txns
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedBalance && (
              <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Balance seleccionado: <strong>{formatBalanceCurrency(selectedBalance.totalAmount, selectedBalance.currency)}</strong>
                  </span>
                </div>
              </div>
            )}

            {availableBalances.length === 0 && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-300">
                  No hay balances disponibles. Ve al <strong>Analizador de Archivos Grandes</strong> para cargar un archivo DTC1B.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remittance Form */}
        <div className="bg-[#0d0d0d] rounded-xl p-6 border border-[#1a1a1a]">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Send className="w-6 h-6 text-green-400" />
            {availableBalances.length > 0 ? '3' : '2'}. Crear Remesa Internacional
          </h3>

          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmitRemittance} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Monto *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="1000.00"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Seleccionar moneda"
                    title="Seleccionar moneda"
                  >
                    <option value="USD">USD - Dólares</option>
                    <option value="EUR">EUR - Euros</option>
                    <option value="GBP">GBP - Libras</option>
                    <option value="CHF">CHF - Francos</option>
                    <option value="CAD">CAD - Dólares Canadienses</option>
                    <option value="AUD">AUD - Dólares Australianos</option>
                    <option value="JPY">JPY - Yenes</option>
                    <option value="CNY">CNY - Yuan</option>
                    <option value="INR">INR - Rupias</option>
                    <option value="MXN">MXN - Pesos Mexicanos</option>
                    <option value="BRL">BRL - Reales</option>
                    <option value="RUB">RUB - Rublos</option>
                    <option value="KRW">KRW - Won</option>
                    <option value="SGD">SGD - Dólares Singapur</option>
                    <option value="HKD">HKD - Dólares Hong Kong</option>
                  </select>
                </div>
              </div>

              {/* Destination Account */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cuenta Destino *
                </label>
                <input
                  type="text"
                  required
                  value={formData.destinationAccountNumber}
                  onChange={(e) => handleInputChange('destinationAccountNumber', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="acc_456"
                />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Referencia
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="INV-2025-0001"
                />
              </div>

              {/* Purpose Code */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Código de Propósito
                </label>
                <input
                  type="text"
                  value={formData.purposeCode}
                  onChange={(e) => handleInputChange('purposeCode', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="GDDS"
                />
              </div>

              {/* Beneficiary Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del Beneficiario *
                </label>
                <input
                  type="text"
                  required
                  value={formData.beneficiaryName}
                  onChange={(e) => handleInputChange('beneficiaryName', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Beta Trading SA"
                />
              </div>

              {/* Beneficiary IBAN */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  IBAN del Beneficiario
                </label>
                <input
                  type="text"
                  value={formData.beneficiaryIban}
                  onChange={(e) => handleInputChange('beneficiaryIban', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="DE89370400440532013000"
                />
              </div>
            </div>

            {/* Urgent Checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="urgent"
                checked={formData.urgent}
                onChange={(e) => handleInputChange('urgent', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="urgent" className="text-sm font-medium text-slate-300">
                Transferencia Urgente (cargos adicionales aplican)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!hasToken || isSubmitting}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Procesando Remesa...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Crear Remesa
                </>
              )}
            </button>
          </form>
        </div>

        {/* Remittance Status */}
        {remittanceStatus && (
          <div className="bg-[#0d0d0d] rounded-xl p-6 border border-[#1a1a1a]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#00ff88]" />
              {availableBalances.length > 0 ? '4' : '3'}. Estado de la Remesa
            </h3>

            <div className="bg-slate-700/50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#80ff80]">ID de Transacción</div>
                  <div className="text-lg font-mono font-bold text-white">{remittanceStatus.transactionId}</div>
                </div>
                <div className={`flex items-center gap-2 ${getStatusColor(remittanceStatus.status)}`}>
                  {getStatusIcon(remittanceStatus.status)}
                  <span className="font-bold text-lg">{remittanceStatus.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-[#80ff80]">Monto</div>
                  <div className="text-xl font-bold text-white">
                    {remittanceStatus.amount.value.toFixed(2)} {remittanceStatus.amount.currency}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#80ff80]">Referencia</div>
                  <div className="text-lg font-mono text-white">{remittanceStatus.reference || 'N/A'}</div>
                </div>

                {remittanceStatus.mt103Reference && (
                  <div>
                    <div className="text-sm text-[#80ff80]">Referencia MT103</div>
                    <div className="text-lg font-mono text-green-400">{remittanceStatus.mt103Reference}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-[#80ff80]">Creado</div>
                  <div className="text-sm text-white">{new Date(remittanceStatus.createdAt).toLocaleString()}</div>
                </div>

                {remittanceStatus.completedAt && (
                  <div>
                    <div className="text-sm text-[#80ff80]">Completado</div>
                    <div className="text-sm text-white">{new Date(remittanceStatus.completedAt).toLocaleString()}</div>
                  </div>
                )}
              </div>

              {remittanceStatus.status === 'COMPLETED' && (
                <div className="mt-4 bg-green-900/20 border border-green-500 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <div className="text-green-300 font-semibold">Transferencia Completada</div>
                    <div className="text-green-400 text-sm">Los fondos han sido transferidos exitosamente</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* API Documentation Link */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <FileText className="w-12 h-12 text-[#00ff88] flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Documentación Completa</h3>
              <p className="text-slate-300 text-sm mb-4">
                Para integración completa del módulo XCP B2B, consulta la documentación en{' '}
                <code className="bg-[#0d0d0d] px-2 py-1 rounded text-[#00ff88]">src/xcp-b2b/README.md</code>
              </p>
              <div className="text-xs text-[#80ff80] space-y-1">
                <div>• Implementación mTLS con certificados cliente</div>
                <div>• Firma HMAC-SHA256 de todas las solicitudes</div>
                <div>• Manejo automático de reintentos con backoff exponencial</div>
                <div>• Validación de esquemas con Zod</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

