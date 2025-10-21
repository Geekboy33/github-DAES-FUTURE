# Módulo XCP B2B API - Implementación Completa

## 📋 Resumen Ejecutivo

Se ha implementado un **módulo de nivel Enterprise** para integración con la API XCP B2B de transferencias bancarias internacionales. El módulo incluye seguridad de grado bancario con mTLS, firma HMAC, y manejo robusto de errores.

## 🎯 Características Implementadas

### ✅ Seguridad
- **mTLS (Mutual TLS)**: Autenticación bidireccional con certificados cliente (TLS ≥ 1.2)
- **HMAC-SHA256**: Firma criptográfica de todas las solicitudes
- **Anti-Replay**: Validación de timestamp con ventana de ±5 minutos
- **Idempotencia**: Keys UUID automáticos para prevenir duplicados
- **JWT Bearer**: Autenticación token-based con renovación

### ✅ Endpoints Implementados
1. `POST /api-keys/token` - Obtener JWT
2. `POST /remittance` - Crear remesa
3. `GET /remittance/{id}` - Consultar estado
4. `POST /webhooks` - Registrar webhooks
5. `GET /accounts/{id}/balance` - Consultar balance
6. `POST /statements` - Solicitar extractos

### ✅ Características Técnicas
- TypeScript estricto con validación Zod
- Reintentos automáticos con backoff exponencial
- Timeouts configurables
- Logging estructurado
- Manejo robusto de errores
- Polling inteligente de estados

## 📁 Estructura de Archivos

```
CoreCentralbank/
├── src/
│   ├── xcp-b2b/                      # Módulo XCP B2B
│   │   ├── config.ts                 # Configuración y validación
│   │   ├── signature.ts              # Utilidades HMAC/SHA256
│   │   ├── http.ts                   # Cliente HTTP con mTLS
│   │   ├── types.ts                  # Tipos y schemas Zod
│   │   ├── client.ts                 # Cliente principal
│   │   ├── index.ts                  # Exportaciones públicas
│   │   ├── .env.example              # Plantilla de configuración
│   │   └── README.md                 # Documentación detallada
│   └── components/
│       └── XcpB2BInterface.tsx       # Interfaz React
├── examples/
│   └── xcp-remit-example.ts          # Ejemplo completo de uso
└── package.json                       # Dependencias actualizadas
```

## 🚀 Guía de Uso Rápido

### 1. Configuración Inicial

**a) Crear archivo .env en la raíz del proyecto:**

```bash
cp src/xcp-b2b/.env.example .env
```

**b) Configurar variables de entorno:**

```env
# API Endpoint
XCP_BASE_URL=https://b2bapi.sandbox.xcpbank.com

# Credenciales
XCP_API_KEY=tu-api-key-aqui
XCP_API_SECRET=tu-api-secret-aqui

# Información de Cuenta
XCP_ACCOUNT_ID=acc_123456
XCP_ACCOUNT_HOLDER_ID=ah_789012
XCP_BANK_ID=bank_abc
XCP_PERMISSION_ID=perm_remit

# Certificados mTLS
XCP_CLIENT_CERT_PATH=./certs/client.crt
XCP_CLIENT_KEY_PATH=./certs/client.key
XCP_CA_CERT_PATH=./certs/ca-chain.pem
```

**c) Preparar certificados mTLS:**

Coloca tus certificados en la carpeta `certs/`:

```bash
mkdir -p certs
# Copia tus certificados aquí:
# - client.crt (certificado cliente)
# - client.key (clave privada)
# - ca-chain.pem (cadena CA)
```

### 2. Uso desde TypeScript/Node

```typescript
import { XcpB2BClient } from './src/xcp-b2b';

// Inicializar cliente
const client = new XcpB2BClient();

// 1. Obtener token JWT
const token = await client.getToken({
  accountId: 'acc_123',
  correspondentBankId: 'bank_abc',
  permissionId: 'perm_remit',
  scope: 'remittance:write remittance:read'
});

// Token se configura automáticamente en el cliente

// 2. Crear remesa
const remittance = await client.createRemittance({
  userId: 'user_001',
  destinationAccountNumber: 'acc_456',
  amount: { value: 1000.00, currency: 'USD' },
  remittanceBankName: 'Your Bank',
  correspondentBankId: 'bank_abc',
  bankId: 'xcp_main',
  remittanceType: 'DEBIT',
  reference: 'INV-2025-0001',
  purposeCode: 'GDDS',
  orderingCustomer: {
    name: 'ACME LLC',
    iban: 'GB29NWBK60161331926819',
    bic: 'NWBKGB2L'
  },
  beneficiary: {
    name: 'Beta SA',
    iban: 'DE89370400440532013000',
    bic: 'COBADEFF'
  },
  chargeBearer: 'SHARED'
});

console.log('Transaction ID:', remittance.transactionId);

// 3. Esperar completación
const final = await client.waitForRemittanceCompletion(
  remittance.transactionId,
  { maxAttempts: 24, intervalMs: 5000 }
);

console.log('Status:', final.status);
console.log('MT103:', final.mt103Reference);
```

### 3. Ejecutar Ejemplo

```bash
# Ejecutar ejemplo completo
npm run xcp:remit

# O directamente con tsx
npx tsx examples/xcp-remit-example.ts
```

### 4. Uso desde la Interfaz Web

1. Inicia el servidor: `npm run dev`
2. Abre: `http://localhost:5173`
3. Navega a la pestaña **"API XCP B2B"**
4. Sigue los pasos en pantalla:
   - Obtener Token JWT
   - Llenar formulario de remesa
   - Enviar y monitorear estado

## 🔐 Detalles de Seguridad

### Firma de Solicitudes (HMAC-SHA256)

Cada solicitud se firma con el siguiente algoritmo:

```
Canonical Request = METHOD + "\n" +
                   PATH + "\n" +
                   base64(SHA256(BODY)) + "\n" +
                   TIMESTAMP_RFC3339

Signature = base64(HMAC-SHA256(Canonical Request, API_SECRET))
```

Headers automáticos agregados:
- `X-REQUEST-TIMESTAMP`: Timestamp RFC3339 UTC
- `X-REQUEST-SIGNATURE`: Firma HMAC
- `Idempotency-Key`: UUID v4
- `X-ACCOUNT-HOLDER-ID`: ID del titular
- `Authorization`: Bearer JWT (después del token)

### mTLS (Mutual TLS)

Todas las comunicaciones usan mTLS:
- Servidor valida cliente con certificado
- Cliente valida servidor con CA chain
- TLS versión mínima: 1.2
- Algoritmos fuertes requeridos

## 🔄 Manejo de Errores y Reintentos

### Estrategia de Reintentos

**Se reintenta automáticamente:**
- HTTP 5xx (errores de servidor)
- HTTP 429 (rate limiting)
- Timeouts de red
- Errores de conexión

**NO se reintenta:**
- HTTP 4xx (errores de cliente)
- Errores de validación
- Fallos de autenticación

### Backoff Exponencial

```
Intento 1: 1000ms + jitter
Intento 2: 2000ms + jitter
Intento 3: 4000ms + jitter
Intento 4: 8000ms + jitter
...
Máximo: 30000ms
```

Jitter: ±30% aleatorio para evitar "thundering herd"

## 📊 Códigos de Estado de Remesas

| Estado | Descripción | Final |
|--------|-------------|-------|
| `PENDING` | Pendiente de procesamiento | No |
| `PROCESSING` | En proceso | No |
| `COMPLETED` | Completada exitosamente | Sí |
| `REJECTED` | Rechazada por validación | Sí |
| `FAILED` | Falló durante procesamiento | Sí |
| `CANCELLED` | Cancelada por usuario | Sí |

## 🎨 Interfaz de Usuario

La interfaz React (`XcpB2BInterface.tsx`) proporciona:

- ✅ Obtención visual de token JWT
- ✅ Formulario completo de remesas
- ✅ Validación en tiempo real
- ✅ Indicadores de estado
- ✅ Visualización de MT103
- ✅ Manejo de errores
- ✅ Monitoreo de estados

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo

# Producción
npm run build            # Build de producción
npm run preview          # Preview del build

# XCP B2B
npm run xcp:remit        # Ejecutar ejemplo de remesa
npm run xcp:test         # Alias del anterior

# Calidad
npm run lint             # Linter
npm run typecheck        # Verificación de tipos
```

## 🧪 Testing

### Certificados de Prueba

Para desarrollo local, genera certificados auto-firmados:

```bash
# Generar certificado cliente (solo para testing)
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/client.key \
  -out certs/client.crt \
  -days 365 -nodes \
  -subj "/CN=XCP-Test-Client"

# Usar el mismo como CA (solo para testing)
cp certs/client.crt certs/ca-chain.pem
```

⚠️ **IMPORTANTE**: En producción usa certificados firmados por una CA real.

## 🔧 Configuración Avanzada

### Timeouts Personalizados

```env
# Token endpoint (default: 30s)
XCP_TOKEN_TIMEOUT_MS=30000

# Business endpoints (default: 60s)
XCP_REQUEST_TIMEOUT_MS=60000
```

### Reintentos Personalizados

```env
# Número máximo de reintentos (default: 3)
XCP_MAX_RETRIES=3

# Delay inicial en ms (default: 1000)
XCP_RETRY_DELAY_MS=1000
```

### Debug Mode

```env
# Habilitar logs detallados
XCP_DEBUG=true
```

## 📞 Soporte API

### Códigos de Error Comunes

| Código | Descripción | Acción |
|--------|-------------|--------|
| `TOKEN_EXPIRED` | Token JWT expirado | Renovar token |
| `INVALID_SIGNATURE` | Firma HMAC inválida | Verificar API_SECRET |
| `NETWORK_ERROR` | Error de red | Reintentar |
| `HTTP_401` | No autorizado | Verificar credenciales |
| `HTTP_403` | Sin permisos | Verificar permissionId |
| `HTTP_429` | Rate limit | Esperar backoff |
| `POLLING_TIMEOUT` | Timeout en polling | Aumentar timeout |

### Contacto

Para soporte técnico de la API XCP B2B:
- Documentación: [URL de documentación XCP]
- Soporte: [Email de soporte]
- Status: [URL de status page]

## 🛡️ Mejores Prácticas

1. **Nunca commitear secretos**
   - Mantén `.env` fuera de git
   - Usa `.env.example` como template

2. **Rotar credenciales regularmente**
   - API Keys cada 90 días
   - Certificados antes de expirar

3. **Monitorear expiraciones**
   - Token JWT expira en 1 hora
   - Implementar renovación automática

4. **Usar idempotencia**
   - Conservar mismo `idempotencyKey` en reintentos
   - Evita duplicados en casos de timeout

5. **Validar webhooks**
   - Verificar firma HMAC en webhooks entrantes
   - Usar HTTPS en endpoints de webhook

6. **Logging y observabilidad**
   - Log correlation IDs siempre
   - Monitorear tasas de error
   - Alertas en rate limiting

## 📄 Licencia

Uso interno - Propiedad de CoreBanking DAES

---

**Versión**: 1.0.0  
**Última actualización**: 21 de Octubre, 2025  
**Autor**: CoreBanking Development Team

