# Características Detalladas

## Módulos Principales

### 1. Dashboard de Cuentas
**Ubicación**: `src/components/AccountDashboard.tsx`

Características:
- Visualización de balance en múltiples monedas
- Historial de transacciones en tiempo real
- Gráficos de distribución de fondos
- Resumen de actividad reciente
- Indicadores de seguridad

### 2. Procesador DTC1B
**Ubicación**: `src/components/DTC1BProcessor.tsx`

Características:
- Lectura de archivos binarios personalizados
- Detección automática de formato
- Soporte para múltiples monedas (USD, EUR, GBP)
- Validación de integridad con HMAC-SHA256
- Procesamiento por lotes
- Vista previa antes de importar
- Manejo de errores robusto

### 3. Binary Reader Avanzado
**Ubicación**: `src/components/AdvancedBinaryReader.tsx`

Características:
- Análisis profundo de archivos binarios
- Detección de patrones de moneda
- Extracción de bloques DTC1B
- Visualización hexadecimal
- Estadísticas detalladas:
  - Conteo por moneda
  - Distribución de bloques
  - Tamaño promedio de bloque
  - Totales por moneda

### 4. Enhanced Binary Viewer (Hex Viewer Pro)
**Ubicación**: `src/components/EnhancedBinaryViewer.tsx`

#### Visualización
- **5 Modos de Vista**:
  - Hexadecimal (00-FF)
  - Decimal (0-255)
  - Octal (000-377)
  - Binario (00000000-11111111)
  - ASCII (caracteres imprimibles)

#### Análisis de Datos
- **Cálculo de Entropía**: Shannon entropy (0-8 bits)
  - < 4: Datos con patrones
  - 4-6: Datos mixtos
  - > 7: Datos altamente aleatorios/encriptados
- **Estadísticas**:
  - Bytes únicos encontrados
  - Porcentaje de bytes nulos
  - Porcentaje de caracteres ASCII imprimibles
  - Byte más común y su frecuencia
- **Detección de Patrones**:
  - Secuencias repetidas de 2-8 bytes
  - Top 10 patrones más frecuentes
  - Posiciones de cada patrón

#### Búsqueda y Navegación
- **Búsqueda Flexible**:
  - Texto ASCII: busca por string
  - Hexadecimal: busca con formato `0x1A2B3C`
  - Navegación entre resultados (anterior/siguiente)
  - Contador de resultados (X de Y)
  - Resaltado visual de coincidencias

- **Sistema de Marcadores**:
  - Crea marcadores con etiquetas personalizadas
  - 6 colores diferentes para categorización
  - Click para navegar a marcador
  - Visualización de offset hexadecimal
  - Eliminar marcadores individualmente

#### Selección y Exportación
- **Selección de Bytes**:
  - Click simple para seleccionar un byte
  - Click en otro byte para seleccionar rango
  - Visualización clara del rango seleccionado
  - Muestra offset y longitud
  - Copiar selección al portapapeles

- **Exportación de Datos**:
  - **HEX**: Formato espaciado para legibilidad
  - **Base64**: Para transmisión/almacenamiento
  - **JSON**: Con metadata completa
    ```json
    {
      "fileName": "data.bin",
      "offset": 0,
      "length": 1024,
      "data": [0, 1, 2, ...]
    }
    ```
  - Exporta archivo completo o solo selección

#### Configuración
- **Bytes por fila**: 8, 16, o 32 bytes
- **Filas visibles**: 30 filas por página
- **Endianness**: Big-endian o Little-endian
- **Tipo de dato**: uint8, uint16, uint32, int8, int16, int32, float32, float64

#### Autenticación
- Detección automática de archivos encriptados
- Modal de autenticación elegante
- Credenciales predeterminadas:
  - Usuario: `amitiel2002`
  - Contraseña: `1a2b3c4d5e`
- Desencriptación AES-256-GCM
- Manejo de errores con feedback claro

### 5. Interfaz de Transferencias
**Ubicación**: `src/components/TransferInterface.tsx`

Características:
- Creación de transferencias entre cuentas
- Validación de fondos disponibles
- Conversión de moneda en tiempo real
- Confirmación de dos pasos
- Registro de auditoría automático
- Generación de comprobantes

### 6. Gestor de API Keys
**Ubicación**: `src/components/APIKeyManager.tsx`

Características:
- Generación de API keys seguras
- Rotación de claves
- Permisos granulares
- Historial de uso
- Revocación inmediata
- Expiración automática

### 7. Visor de Logs de Auditoría
**Ubicación**: `src/components/AuditLogViewer.tsx`

Características:
- Registro completo de todas las acciones
- Filtrado por:
  - Tipo de acción
  - Usuario
  - Rango de fechas
  - Estado
- Exportación de logs
- Verificación de integridad HMAC
- Búsqueda en tiempo real

## Librerías Auxiliares

### Crypto Utilities
**Ubicación**: `src/lib/crypto.ts`

Funciones:
- `generateKey()`: Genera claves AES-256-GCM
- `encryptAESGCM()`: Encriptación con autenticación
- `decryptAESGCM()`: Desencriptación verificada
- `sha256()`: Hash SHA-256
- `hmacSHA256()`: HMAC para integridad
- `verifyHMAC()`: Verificación timing-safe
- `deriveKeyFromPassword()`: PBKDF2 key derivation
- `decryptWithPassword()`: Desencriptación con contraseña

### DTC1B Parser
**Ubicación**: `src/lib/dtc1b-parser.ts`

Funciones:
- `findCurrencyMatches()`: Encuentra códigos de moneda
- `parseBlocks()`: Extrae bloques estructurados
- Detección de:
  - Códigos ISO alfabéticos (USD, EUR, GBP)
  - Códigos ISO numéricos (840, 978, 826)
- Extracción de montos (BigInt)
- Niveles de confianza (high, medium, low)

### Format Detector
**Ubicación**: `src/lib/format-detector.ts`

Detecta:
- AES-256-GCM encriptado
- AES-256-CBC encriptado
- GZIP comprimido
- ZIP comprimido
- Plaintext DTC1B
- Formato personalizado DTC1B
- Calcula entropía y confianza
- Extrae headers, IV, tags de autenticación

### Store Manager
**Ubicación**: `src/lib/store.ts`

Características:
- Gestión de estado global
- Persistencia en Supabase
- Cache local para performance
- Sincronización automática
- Manejo de conflictos
- Encriptación de datos sensibles

## Seguridad

### Encriptación
- **AES-256-GCM**: Encriptación autenticada
- **PBKDF2**: 100,000 iteraciones para derivación de claves
- **Random IV**: Vector de inicialización único por operación
- **Authentication Tags**: Verificación de integridad

### Integridad
- **HMAC-SHA256**: Firma de transacciones
- **Timing-safe comparisons**: Previene timing attacks
- **Audit logs**: Registro inmutable de acciones

### Base de Datos
- **Row Level Security (RLS)**: Aislamiento de datos
- **Authenticated access only**: Sin acceso anónimo
- **Prepared statements**: Prevención de SQL injection
- **Encrypted at rest**: Datos encriptados en disco

## Performance

### Optimizaciones
- **Virtual scrolling**: Manejo de archivos grandes
- **Lazy loading**: Carga bajo demanda
- **Memoization**: Cache de cálculos costosos
- **Web Workers**: Procesamiento en background (futuro)
- **Indexed DB**: Cache persistente (futuro)

### Límites
- Archivos hasta 100MB en memoria
- Procesamiento de hasta 1000 bloques simultáneos
- Búsqueda en archivos de hasta 50MB
- Análisis de entropía en chunks de 1MB

## Compatibilidad

### Navegadores
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### APIs Requeridas
- Web Crypto API
- FileReader API
- Clipboard API
- Local Storage
- IndexedDB (opcional)

## Extensibilidad

### Agregar Nuevas Monedas
1. Actualizar `ISO_CURRENCIES` en `dtc1b-parser.ts`
2. Agregar código numérico a `ISO_NUMERIC_CODES`
3. Actualizar interfaz en componentes

### Agregar Formatos de Archivo
1. Crear detector en `format-detector.ts`
2. Implementar parser específico
3. Registrar en `detectFormat()`

### Agregar Modos de Vista
1. Agregar tipo a `ViewMode` en `EnhancedBinaryViewer.tsx`
2. Implementar renderizado en `renderByte()`
3. Agregar opción en selector

## Roadmap

### Versión 2.0
- [ ] Edición de archivos binarios
- [ ] Comparación de archivos (diff)
- [ ] Decodificadores de protobuf
- [ ] Visualizador de estructuras C/C++
- [ ] Tema claro/oscuro

### Versión 3.0
- [ ] Plugins system
- [ ] Macro recording
- [ ] Scripting engine
- [ ] Collaborative editing
- [ ] Cloud sync

## Métricas

### Tamaño del Build
- CSS: ~22 KB (comprimido)
- JavaScript: ~268 KB (comprimido)
- Total: ~290 KB

### Performance
- Time to Interactive: < 2s
- First Contentful Paint: < 1s
- Largest Contentful Paint: < 2.5s
