#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ANALIZADOR DE ARCHIVOS BINARIOS DTC1B
Código para leer, analizar y extraer datos de archivos binarios desencriptados
"""

import os
import re
import struct
import binascii
from collections import defaultdict, Counter
import json
from datetime import datetime

class DTCAnalyzer:
    """Analizador avanzado de archivos DTC1B"""

    def __init__(self):
        self.patterns = {
            # Patrones de datos bancarios
            'bank_codes': re.compile(rb'[A-Z]{6}'),
            'account_numbers': re.compile(rb'\d{8,20}'),
            'swift_codes': re.compile(rb'[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}'),
            'iban_patterns': re.compile(rb'[A-Z]{2}\d{2}[A-Z0-9]{1,30}'),

            # Patrones de estructuras financieras
            'financial_structures': re.compile(rb'(?:BANK|ACCOUNT|BALANCE|TRANSACTION)\s*[:=]\s*[A-Z0-9]{8,16}'),
            'currency_patterns': re.compile(rb'(?:USD|EUR|GBP)\s*[:=]\s*[\d,\.]+'),
            'amount_patterns': re.compile(rb'[\d]{1,3}(?:,[\d]{3})*(?:\.[\d]{2})?'),

            # Patrones específicos DTC1B
            'dtc_specific': re.compile(rb'DTC\d{3,}'),
            'encrypted_blocks': re.compile(rb'[A-F0-9]{32,}'),
        }

        # Palabras clave para filtrar datos financieros tradicionales
        self.financial_keywords = [
            'bank', 'account', 'balance', 'transaction', 'transfer',
            'usd', 'eur', 'gbp', 'amount', 'value', 'total',
            'hsbc', 'citibank', 'federal', 'reserve', 'ecb'
        ]

    def read_binary_file(self, filepath):
        """Leer archivo binario completo"""
        try:
            with open(filepath, 'rb') as f:
                return f.read()
        except FileNotFoundError:
            print(f"❌ Archivo no encontrado: {filepath}")
            return None
        except Exception as e:
            print(f"❌ Error leyendo archivo {filepath}: {e}")
            return None

    def analyze_patterns(self, data, filename):
        """Analizar patrones en datos binarios"""
        results = {
            'filename': filename,
            'file_size': len(data),
            'patterns_found': {},
            'potential_data': {}
        }

        # Buscar todos los patrones
        for pattern_name, pattern in self.patterns.items():
            matches = pattern.findall(data)
            if matches:
                results['patterns_found'][pattern_name] = {
                    'count': len(matches),
                    'samples': [match.decode('utf-8', errors='ignore')[:50] for match in matches[:5]]
                }

        # Buscar palabras clave financieras
        text_content = data.decode('utf-8', errors='ignore').lower()
        found_keywords = {}

        for keyword in self.financial_keywords:
            count = text_content.count(keyword.lower())
            if count > 0:
                found_keywords[keyword] = count

        if found_keywords:
            results['potential_data']['financial_keywords'] = found_keywords

        return results

    def extract_structured_data(self, data, filename):
        """Extraer datos estructurados del binario"""
        extracted_data = {
            'bank_codes': [],
            'account_numbers': [],
            'swift_codes': [],
            'currency_amounts': [],
            'institutions': [],
            'metadata': {}
        }

        # Extraer códigos bancarios
        bank_codes = self.patterns['bank_codes'].findall(data)
        extracted_data['bank_codes'] = [code.decode('utf-8', errors='ignore') for code in bank_codes[:10]]

        # Extraer números de cuenta potenciales
        account_nums = self.patterns['account_numbers'].findall(data)
        extracted_data['account_numbers'] = [num.decode('utf-8', errors='ignore') for num in account_nums[:10]]

        # Extraer códigos SWIFT
        swift_codes = self.patterns['swift_codes'].findall(data)
        extracted_data['swift_codes'] = [code.decode('utf-8', errors='ignore') for code in swift_codes[:5]]

        # Extraer montos en moneda
        currency_matches = self.patterns['currency_patterns'].findall(data)
        extracted_data['currency_amounts'] = [match.decode('utf-8', errors='ignore') for match in currency_matches[:5]]

        # Buscar instituciones financieras
        text_content = data.decode('utf-8', errors='ignore')
        institutions = ['HSBC', 'Citibank', 'Federal Reserve', 'ECB', 'Banco de España']

        for institution in institutions:
            if institution.lower() in text_content.lower():
                extracted_data['institutions'].append(institution)

        # Metadatos del archivo
        extracted_data['metadata'] = {
            'file_size': len(data),
            'first_bytes': binascii.hexlify(data[:16]).decode(),
            'last_bytes': binascii.hexlify(data[-16:]).decode(),
            'entropy_score': self.calculate_entropy(data)
        }

        return extracted_data

    def calculate_entropy(self, data):
        """Calcular entropía básica para detectar datos encriptados"""
        if len(data) == 0:
            return 0

        # Calcular frecuencia de bytes
        byte_counts = Counter(data)
        entropy = 0

        for count in byte_counts.values():
            p = count / len(data)
            if p > 0:
                entropy -= p * (p).bit_length()

        return entropy

    def analyze_all_chunks(self, chunk_count=50):
        """Analizar todos los chunks disponibles"""
        all_results = {
            'summary': {},
            'detailed_analysis': [],
            'global_patterns': defaultdict(int)
        }

        total_files = 0
        files_with_data = 0

        for i in range(1, chunk_count + 1):
            filename = f"decrypted_chunk_{i}.bin"

            if os.path.exists(filename):
                total_files += 1
                data = self.read_binary_file(filename)

                if data:
                    files_with_data += 1

                    # Análisis detallado
                    analysis = self.analyze_patterns(data, filename)
                    structured = self.extract_structured_data(data, filename)

                    chunk_result = {
                        'chunk_number': i,
                        'analysis': analysis,
                        'structured_data': structured
                    }

                    all_results['detailed_analysis'].append(chunk_result)

                    # Acumular patrones globales
                    for pattern_type, pattern_data in analysis['patterns_found'].items():
                        all_results['global_patterns'][pattern_type] += pattern_data['count']

        # Resumen final
        all_results['summary'] = {
            'total_chunks_analyzed': total_files,
            'chunks_with_data': files_with_data,
            'success_rate': (files_with_data / total_files * 100) if total_files > 0 else 0,
            'most_common_patterns': dict(sorted(all_results['global_patterns'].items(),
                                               key=lambda x: x[1], reverse=True)[:10])
        }

        return all_results

    def generate_report(self, results):
        """Generar reporte completo"""
        report = f"""
{'='*80}
REPORTE DE ANÁLISIS DTC1B - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*80}

📊 RESUMEN EJECUTIVO:
• Chunks totales analizados: {results['summary']['total_chunks_analyzed']}
• Chunks con datos válidos: {results['summary']['chunks_with_data']}
• Tasa de éxito: {results['summary']['success_rate']:.1f}%

🔍 PATRONES MÁS FRECUENTES:
"""

        for pattern, count in results['summary']['most_common_patterns'].items():
            report += f"• {pattern}: {count} ocurrencias\n"

        report += f"\n{'='*80}\n"

        # Detalles por chunk
        for chunk_result in results['detailed_analysis'][:5]:  # Mostrar primeros 5
            chunk = chunk_result['chunk_number']
            analysis = chunk_result['analysis']
            structured = chunk_result['structured_data']

            report += f"""
CHUNK {chunk}:
• Tamaño del archivo: {analysis['file_size']} bytes
• Patrones encontrados: {len(analysis['patterns_found'])}
• Instituciones financieras: {', '.join(structured['institutions']) if structured['institutions'] else 'Ninguna'}
• Códigos bancarios: {', '.join(structured['bank_codes'][:3]) if structured['bank_codes'] else 'Ninguno'}
• Códigos SWIFT: {', '.join(structured['swift_codes']) if structured['swift_codes'] else 'Ninguno'}
"""

        return report

def main():
    """Función principal"""
    print("🔍 INICIANDO ANÁLISIS DE ARCHIVOS DTC1B")
    print("=" * 60)

    analyzer = DTCAnalyzer()

    # Analizar todos los chunks
    results = analyzer.analyze_all_chunks()

    # Generar reporte
    report = analyzer.generate_report(results)

    # Guardar reporte
    with open('dtc1b_analysis_report.txt', 'w', encoding='utf-8') as f:
        f.write(report)

    print(report)
    print("💾 Reporte guardado en: dtc1b_analysis_report.txt")

if __name__ == "__main__":
    main()

