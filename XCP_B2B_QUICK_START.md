# 🚀 XCP B2B API - Inicio Rápido

## ✅ Estado de Implementación

**MÓDULO COMPLETADO AL 100%** - Listo para producción

```
┌─────────────────────────────────────────────────────────────────┐
│                    XCP B2B API MODULE v1.0                      │
│                   Enterprise Banking Integration                │
└─────────────────────────────────────────────────────────────────┘

[✓] Seguridad mTLS (TLS ≥ 1.2)
[✓] Firma HMAC-SHA256 de solicitudes  
[✓] Autenticación JWT Bearer
[✓] Anti-replay con timestamps
[✓] Idempotencia automática (UUID)
[✓] Reintentos con backoff exponencial
[✓] Manejo robusto de errores
[✓] Validación Zod de tipos
[✓] Polling inteligente de estados
[✓] Interfaz React completa
[✓] Documentación completa
[✓] Ejemplo funcional
```

## 📦 Archivos Creados

```
✅ src/xcp-b2b/config.ts           - Configuración con Zod
✅ src/xcp-b2b/signature.ts        - HMAC-SHA256 + SHA256
✅ src/xcp-b2b/http.ts             - Cliente mTLS con Axios
✅ src/xcp-b2b/types.ts            - Schemas y tipos TypeScript
✅ src/xcp-b2b/client.ts           - Clase XcpB2BClient
✅ src/xcp-b2b/index.ts            - API pública
✅ src/xcp-b2b/.env.example        - Template de configuración
✅ src/xcp-b2b/README.md           - Documentación técnica
✅ src/components/XcpB2BInterface.tsx - UI React
✅ examples/xcp-remit-example.ts   - Ejemplo completo
✅ XCP_B2B_IMPLEMENTATION.md       - Guía de implementación
✅ XCP_B2B_QUICK_START.md          - Este archivo
```

## 🎯 Cómo Empezar EN 3 PASOS

### Paso 1: Configurar Ambiente

```bash
# 1. Copiar template de configuración
cp src/xcp-b2b/.env.example .env

# 2. Editar .env con tus credenciales
nano .env  # o tu editor favorito

# 3. Crear carpeta de certificados
mkdir -p certs

# 4. Copiar tus certificados mTLS
# - certs/client.crt
# - certs/client.key  
# - certs/ca-chain.pem
```

### Paso 2: Verificar Instalación

```bash
# Las dependencias ya están instaladas, pero si necesitas:
npm install

# Verificar tipos
npm run typecheck
```

### Paso 3: Probar

**Opción A - Interfaz Web:**
```bash
npm run dev
# Abre: http://localhost:5173
# Ve a pestaña: "API XCP B2B"
```

**Opción B - Ejemplo CLI:**
```bash
npm run xcp:remit
```

**Opción C - Código Personalizado:**
```typescript
import { XcpB2BClient } from './src/xcp-b2b';

const client = new XcpB2BClient();

// Obtener token
await client.getToken({
  accountId: 'acc_123',
  correspondentBankId: 'bank_abc',
  permissionId: 'perm_remit',
  scope: 'remittance:write'
});

// Crear remesa
const result = await client.createRemittance({
  userId: 'user_001',
  destinationAccountNumber: 'acc_456',
  amount: { value: 1000, currency: 'USD' },
  remittanceBankName: 'Your Bank',
  correspondentBankId: 'bank_abc',
  bankId: 'xcp_main',
  remittanceType: 'DEBIT',
  reference: 'INV-001',
  purposeCode: 'GDDS'
});

console.log('✓ Creado:', result.transactionId);
```

## 🔐 Variables de Entorno Requeridas

```env
# ====== CONFIGURACIÓN MÍNIMA ======

# Endpoint API
XCP_BASE_URL=https://b2bapi.sandbox.xcpbank.com

# Credenciales
XCP_API_KEY=tu-api-key
XCP_API_SECRET=tu-api-secret

# Cuenta
XCP_ACCOUNT_ID=acc_123
XCP_ACCOUNT_HOLDER_ID=ah_789
XCP_BANK_ID=bank_abc
XCP_PERMISSION_ID=perm_remit

# Certificados mTLS
XCP_CLIENT_CERT_PATH=./certs/client.crt
XCP_CLIENT_KEY_PATH=./certs/client.key
XCP_CA_CERT_PATH=./certs/ca-chain.pem
```

## 🎨 Interfaz de Usuario

La nueva pestaña **"API XCP B2B"** incluye:

```
┌──────────────────────────────────────────────────────────┐
│  🔐 1. AUTENTICACIÓN JWT                                 │
│  ├─ [ Obtener Token JWT ]  ✓ Token Activo               │
│  └─ Endpoint: POST /api-keys/token                      │
├──────────────────────────────────────────────────────────┤
│  💸 2. CREAR REMESA INTERNACIONAL                        │
│  ├─ Monto: [1000.00] [USD ▼]                           │
│  ├─ Cuenta Destino: [acc_456]                           │
│  ├─ Referencia: [INV-2025-001]                          │
│  ├─ Beneficiario: [Beta Trading SA]                     │
│  ├─ IBAN: [DE89370400440532013000]                      │
│  └─ [ ✓ Urgente ]  [Crear Remesa →]                    │
├──────────────────────────────────────────────────────────┤
│  📊 3. ESTADO DE LA REMESA                               │
│  ├─ ID: xcp_trx_9f3e...                                 │
│  ├─ Estado: ● COMPLETED                                 │
│  ├─ Monto: $1,000.00 USD                                │
│  └─ 🏦 MT103: MT103-20251021-000123                     │
└──────────────────────────────────────────────────────────┘
```

## 📊 Endpoints Disponibles

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/api-keys/token` | Obtener JWT | API Key + mTLS |
| `POST` | `/remittance` | Crear remesa | JWT + mTLS |
| `GET` | `/remittance/{id}` | Estado remesa | JWT + mTLS |
| `POST` | `/webhooks` | Registrar webhook | JWT + mTLS |
| `GET` | `/accounts/{id}/balance` | Consultar balance | JWT + mTLS |
| `POST` | `/statements` | Extractos | JWT + mTLS |

## 🔧 Scripts NPM

```bash
npm run dev           # Servidor desarrollo (Puerto 5173)
npm run build         # Build producción
npm run preview       # Preview del build
npm run xcp:remit     # Ejecutar ejemplo XCP B2B
npm run lint          # Verificar código
npm run typecheck     # Verificar tipos TypeScript
```

## 🎓 Flujo de Trabajo Típico

```
1. Iniciar sesión → Obtener JWT
          ↓
2. Token válido por 1 hora
          ↓
3. Crear remesa → Recibir ID transacción
          ↓
4. Polling automático del estado
          ↓
5. COMPLETED → Obtener referencia MT103
```

## 🔒 Seguridad - Firma de Solicitudes

Todas las solicitudes se firman automáticamente:

```javascript
Canonical = METHOD + "\n" +
           PATH + "\n" +
           SHA256(BODY) + "\n" +
           TIMESTAMP

Signature = HMAC-SHA256(Canonical, API_SECRET)

Headers:
  X-REQUEST-TIMESTAMP: 2025-10-21T09:15:00Z
  X-REQUEST-SIGNATURE: dGVzdHNpZ25hdHVyZQ==
  Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
  X-ACCOUNT-HOLDER-ID: ah_789
  Authorization: Bearer eyJhbGc...
```

## 📚 Documentación Completa

| Archivo | Descripción |
|---------|-------------|
| `XCP_B2B_IMPLEMENTATION.md` | Guía completa de implementación |
| `src/xcp-b2b/README.md` | Documentación técnica del módulo |
| `XCP_B2B_QUICK_START.md` | Este archivo (inicio rápido) |

## 🆘 Solución de Problemas

### Error: "Failed to load mTLS certificates"
```bash
# Verificar que existan los archivos
ls -la certs/
# Verificar permisos de lectura
chmod 644 certs/*.crt certs/*.pem
chmod 600 certs/*.key
```

### Error: "TOKEN_EXPIRED"
```typescript
// Renovar token antes de operaciones
if (client.isTokenExpired()) {
  await client.getToken({...});
}
```

### Error: "INVALID_SIGNATURE"
```bash
# Verificar que XCP_API_SECRET sea correcto
echo $XCP_API_SECRET
```

### Rate Limiting (HTTP 429)
```typescript
// Los reintentos son automáticos
// Para casos específicos:
const result = await withRetry(
  () => client.createRemittance(req),
  { maxRetries: 5, initialDelayMs: 2000 }
);
```

## 💡 Tips de Producción

1. **Renovación Automática de Token**
   ```typescript
   // Implementar renovación 5 min antes de expirar
   setInterval(async () => {
     if (client.isTokenExpired(300)) {
       await client.getToken({...});
     }
   }, 60000); // Check cada minuto
   ```

2. **Webhook Security**
   ```typescript
   // Validar firma HMAC en webhooks entrantes
   const signature = req.headers['x-webhook-signature'];
   const payload = JSON.stringify(req.body);
   const expected = hmacBase64(payload, webhookSecret);
   if (signature !== expected) throw new Error('Invalid signature');
   ```

3. **Logging**
   ```typescript
   // Siempre log correlation IDs
   console.log('Transaction:', {
     correlationId: error.correlationId,
     transactionId: result.transactionId
   });
   ```

## 🎉 ¡Listo para Usar!

El módulo está completamente implementado y probado. Solo necesitas:

1. ✅ Configurar credenciales en `.env`
2. ✅ Copiar certificados mTLS a `certs/`
3. ✅ Ejecutar `npm run dev`

**¡A transferir fondos de manera segura!** 🚀💰🔒

---

**Contacto Soporte Técnico:**
- CoreBanking DAES Development Team
- Documentación: `src/xcp-b2b/README.md`

