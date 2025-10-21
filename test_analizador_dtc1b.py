#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SCRIPT DE PRUEBA PARA EL ANALIZADOR DTC1B
Demuestra cómo usar el analizador con archivos reales
"""

import os
import sys
from analizador_dtc1b import DTCAnalyzer

def test_con_archivo_ejemplo():
    """Probar el analizador con el archivo de ejemplo DTC1B"""
    print("🧪 PRUEBA CON ARCHIVO DE EJEMPLO DTC1B")
    print("=" * 50)

    # Crear instancia del analizador
    analyzer = DTCAnalyzer()

    # Archivo de ejemplo que creamos anteriormente
    test_file = "sample-dtc1b.bin"

    if os.path.exists(test_file):
        print(f"✅ Archivo encontrado: {test_file}")

        # Leer y analizar el archivo
        data = analyzer.read_binary_file(test_file)
        if data:
            print(f"✅ Archivo leído correctamente: {len(data)} bytes")

            # Análisis básico
            analysis = analyzer.analyze_patterns(data, test_file)
            print("📊 Análisis básico completado:"            print(f"   - Tamaño: {analysis['file_size']} bytes")
            print(f"   - Patrones encontrados: {len(analysis['patterns_found'])}")
            print(f"   - Palabras clave financieras: {len(analysis['potential_data'].get('financial_keywords', {}))}")

            # Extracción estructurada
            structured = analyzer.extract_structured_data(data, test_file)
            print("🏦 Datos estructurados extraídos:"            print(f"   - Códigos bancarios: {len(structured['bank_codes'])}")
            print(f"   - Números de cuenta: {len(structured['account_numbers'])}")
            print(f"   - Instituciones: {', '.join(structured['institutions']) if structured['institutions'] else 'Ninguna'}")

            # Metadatos
            metadata = structured['metadata']
            print("📋 Metadatos del archivo:"            print(f"   - Entropía: {metadata['entropy_score']:.3f}")
            print(f"   - Seguridad: {'Encriptado' if metadata['entropy_score'] > 7 else 'Texto plano'}")

        else:
            print("❌ Error leyendo el archivo")
    else:
        print(f"❌ Archivo no encontrado: {test_file}")
        print("💡 Crea el archivo de ejemplo primero usando el componente web")

def crear_archivo_prueba():
    """Crear un archivo de prueba más complejo para demostrar capacidades"""
    print("\n🔧 CREANDO ARCHIVO DE PRUEBA AVANZADO")
    print("=" * 50)

    # Crear datos más complejos con patrones reales
    test_data = bytearray()

    # Agregar cabecera DTC1B
    test_data.extend(b'DTC1B')

    # Agregar códigos bancarios simulados
    test_data.extend(b'HSBCUK')  # Código bancario HSBC UK
    test_data.extend(b'CITIGB')  # Código bancario Citi UK

    # Agregar números de cuenta simulados
    test_data.extend(b'1234567890123456')  # Número de cuenta de 16 dígitos
    test_data.extend(b'9876543210987654')  # Otro número de cuenta

    # Agregar códigos SWIFT reales
    test_data.extend(b'HSBCGB2L')  # SWIFT HSBC Londres
    test_data.extend(b'CITIGB2L')  # SWIFT Citi Londres

    # Agregar algunos bytes de relleno con patrones
    test_data.extend(b'\x00' * 50)

    # Agregar más códigos bancarios
    test_data.extend(b'BARCG B2L')  # Barclays
    test_data.extend(b'LOYDGB2L')   # Lloyds

    # Agregar texto financiero
    test_data.extend(b'BANK: HSBC ACCOUNT: 123456789 BALANCE: 1000000.00 USD')

    # Rellenar hasta 512 bytes
    while len(test_data) < 512:
        test_data.append(0x00)

    # Guardar archivo de prueba
    with open('archivo_prueba_dtc1b.bin', 'wb') as f:
        f.write(test_data)

    print(f"✅ Archivo de prueba creado: archivo_prueba_dtc1b.bin ({len(test_data)} bytes)")

    # Analizar el archivo creado
    analyzer = DTCAnalyzer()
    data = analyzer.read_binary_file('archivo_prueba_dtc1b.bin')

    if data:
        print("🔍 Analizando archivo de prueba creado:"        analysis = analyzer.analyze_patterns(data, 'archivo_prueba_dtc1b.bin')
        structured = analyzer.extract_structured_data(data, 'archivo_prueba_dtc1b.bin')

        print(f"📊 Resultados del análisis:")
        print(f"   - Tamaño: {analysis['file_size']} bytes")
        print(f"   - Patrones detectados: {len(analysis['patterns_found'])}")
        print(f"   - Códigos bancarios: {len(structured['bank_codes'])}")
        print(f"   - Códigos SWIFT: {len(structured['swift_codes'])}")
        print(f"   - Instituciones: {', '.join(structured['institutions'])}")

        # Mostrar algunos patrones encontrados
        for pattern_name, pattern_data in analysis['patterns_found'].items():
            if pattern_data['count'] > 0:
                print(f"   - {pattern_name}: {pattern_data['count']} ocurrencias")

def comparar_con_analisis_web():
    """Comparar resultados con el análisis web"""
    print("\n🔗 COMPARACIÓN CON ANÁLISIS WEB")
    print("=" * 50)

    print("📊 El componente web EnhancedBinaryViewer incluye:")
    print("   ✅ Todas las funcionalidades del analizador Python")
    print("   ✅ Interfaz gráfica interactiva")
    print("   ✅ Análisis en tiempo real")
    print("   ✅ Visualización avanzada de datos")
    print("   ✅ Exportación de reportes JSON")
    print("   ✅ Navegación por bloques")
    print("   ✅ Análisis forense integrado")

    print("\n🔧 Ventajas del analizador Python:")
    print("   ✅ Procesamiento por lotes de múltiples archivos")
    print("   ✅ Reportes detallados en texto")
    print("   ✅ Análisis de chunks múltiples automáticamente")
    print("   ✅ Ideal para procesamiento offline")

    print("\n💡 Recomendación de uso:")
    print("   🖥️ Usa el componente web para análisis interactivo")
    print("   🐍 Usa el script Python para procesamiento por lotes")
    print("   🔄 Ambos sistemas están sincronizados y usan la misma lógica")

def main():
    """Función principal de prueba"""
    print("🚀 INICIANDO PRUEBAS DEL ANALIZADOR DTC1B")
    print("=" * 60)

    # Probar con archivo existente
    test_con_archivo_ejemplo()

    # Crear y probar archivo avanzado
    crear_archivo_prueba()

    # Comparar enfoques
    comparar_con_analisis_web()

    print("\n✅ PRUEBAS COMPLETADAS")
    print("📁 Revisa los archivos generados:")
    print("   - sample-dtc1b.bin (archivo básico)")
    print("   - archivo_prueba_dtc1b.bin (archivo avanzado)")
    print("   - dtc1b_analysis_report.txt (reporte de análisis)")

if __name__ == "__main__":
    main()

