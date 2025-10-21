import { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, CheckCircle } from 'lucide-react';
import { bankingStore, APIKey } from '../lib/store';

interface NewKeyResult {
  apiKey: APIKey;
  secret: string;
}

export function APIKeyManager() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const availablePermissions = [
    'transfer:read',
    'transfer:write',
    'account:read',
    'account:write',
    'file:read',
    'file:write'
  ];

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = () => {
    setApiKeys(bankingStore.getAPIKeys());
  };

  const handleCreateKey = async () => {
    if (selectedPermissions.length === 0) {
      alert('Please select at least one permission');
      return;
    }

    const result = await bankingStore.createAPIKey(selectedPermissions);
    setNewKeyResult(result);
    setSelectedPermissions([]);
    setShowCreateForm(false);
    loadAPIKeys();
  };

  const handleRevokeKey = (id: string) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      bankingStore.revokeAPIKey(id);
      loadAPIKeys();
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleSecretVisibility = (keyId: string) => {
    setRevealedSecrets(prev => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-[#0d0d0d] rounded-lg border border-[#1a1a1a] overflow-hidden">
        <div className="p-6 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">API Key Management</h2>
                <p className="text-sm text-slate-400">Manage authentication credentials</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Key
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="p-6 bg-slate-750 border-b border-[#1a1a1a]">
            <h3 className="text-lg font-semibold text-white mb-4">Create New API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Select Permissions
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {availablePermissions.map(permission => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="w-4 h-4 rounded border-slate-500 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-white font-mono">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateKey}
                  disabled={selectedPermissions.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Create API Key
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedPermissions([]);
                  }}
                  className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {newKeyResult && (
          <div className="p-6 bg-green-900/20 border-b border-green-700">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-300 mb-1">API Key Created</h3>
                <p className="text-sm text-green-400">
                  Save these credentials now. The secret will not be shown again.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Public Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeyResult.apiKey.publicKey}
                    readOnly
                    className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(newKeyResult.apiKey.publicKey, 'public')}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    {copiedField === 'public' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Secret Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeyResult.secret}
                    readOnly
                    className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(newKeyResult.secret, 'secret')}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    {copiedField === 'secret' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setNewKeyResult(null)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No API keys created yet
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map(apiKey => (
                <div
                  key={apiKey.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    apiKey.active
                      ? 'bg-slate-700 border-slate-600'
                      : 'bg-[#0d0d0d] border-[#1a1a1a] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm text-white">{apiKey.publicKey}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          apiKey.active
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {apiKey.active ? 'Active' : 'Revoked'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>Created: {apiKey.createdAt.toLocaleDateString()}</span>
                        {apiKey.lastUsedAt && (
                          <span>Last used: {apiKey.lastUsedAt.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(apiKey.publicKey, `key-${apiKey.id}`)}
                        className="p-2 hover:bg-slate-600 rounded transition-colors"
                      >
                        {copiedField === `key-${apiKey.id}` ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      {apiKey.active && (
                        <button
                          onClick={() => handleRevokeKey(apiKey.id)}
                          className="p-2 hover:bg-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-400 mb-2">Permissions:</div>
                    <div className="flex flex-wrap gap-2">
                      {apiKey.permissions.map(permission => (
                        <span
                          key={permission}
                          className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded font-mono"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
