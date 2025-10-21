# CoreBanking System

A professional-grade banking system with advanced binary file processing, encryption, and hex viewing capabilities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Vite](https://img.shields.io/badge/Vite-5.4-646cff)

## Features

### Core Banking Operations
- **Account Dashboard**: Real-time account management and balance tracking
- **Multi-Currency Support**: EUR, USD, GBP with ISO 4217 compliance
- **Secure Transfers**: Encrypted transaction processing
- **Audit Logging**: Complete transaction history with cryptographic integrity

### Advanced Binary Processing
- **DTC1B File Parser**: Custom binary format processor for financial data
- **Encryption Support**: AES-256-GCM encryption/decryption
- **Format Detection**: Automatic detection of file formats and encryption
- **Bulk Processing**: Handle multiple files simultaneously

### Professional Hex Viewer
- **Multiple View Modes**: Hex, Decimal, Octal, Binary, ASCII
- **Data Analysis**:
  - Entropy calculation
  - Pattern detection
  - Byte statistics
  - Unique byte distribution
- **Search & Navigation**:
  - Text and hex search
  - Bookmarks with custom labels
  - Byte selection and copying
- **Export Capabilities**: HEX, Base64, JSON formats

### Security Features
- **AES-256-GCM Encryption**: Military-grade encryption
- **HMAC-SHA256 Integrity**: Transaction verification
- **API Key Management**: Secure key generation and rotation
- **User Authentication**: Password-based file access
- **Row Level Security**: Supabase RLS policies

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Encryption**: Web Crypto API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/corebanking-system.git
cd corebanking-system
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Project Structure

```
corebanking-system/
├── src/
│   ├── components/
│   │   ├── AccountDashboard.tsx      # Account management
│   │   ├── DTC1BProcessor.tsx        # Binary file processor
│   │   ├── EnhancedBinaryViewer.tsx  # Advanced hex viewer
│   │   ├── AdvancedBinaryReader.tsx  # Binary analysis tools
│   │   ├── TransferInterface.tsx     # Money transfers
│   │   ├── APIKeyManager.tsx         # API key management
│   │   └── AuditLogViewer.tsx        # Audit logs
│   ├── lib/
│   │   ├── crypto.ts                 # Cryptographic utilities
│   │   ├── dtc1b-parser.ts          # Binary format parser
│   │   ├── format-detector.ts        # File format detection
│   │   └── store.ts                  # State management
│   ├── App.tsx                       # Main application
│   └── main.tsx                      # Entry point
├── .env.example                      # Environment template
└── README.md
```

## Usage

### Processing Binary Files

1. Navigate to **DTC1B Processor**
2. Load a binary file
3. System automatically detects format and encryption
4. For encrypted files, enter credentials:
   - Username: `amitiel2002`
   - Password: `1a2b3c4d5e`

### Using Hex Viewer Pro

1. Go to **Hex Viewer Pro** tab
2. Load any binary file
3. Choose view mode (Hex, Decimal, Binary, etc.)
4. Use search to find specific bytes or text
5. Select bytes and copy/export as needed
6. Create bookmarks for important offsets

### Analysis Features

The hex viewer provides automatic analysis:
- **Entropy**: Measures randomness (0-8 bits)
- **Pattern Detection**: Finds repeating byte sequences
- **Statistics**: Null bytes, printable characters, unique bytes
- **Most Common Byte**: Frequency analysis

## Security

### Encryption
- All sensitive data uses AES-256-GCM
- PBKDF2 key derivation (100,000 iterations)
- Secure random IV generation

### Database Security
- Row Level Security (RLS) enabled
- Authenticated access only
- HMAC-SHA256 transaction integrity

### Best Practices
- Never commit `.env` file
- Rotate API keys regularly
- Use strong passwords
- Enable MFA where available

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm run typecheck # TypeScript type checking
```

## File Format Support

### DTC1B Format
Custom binary format for financial transactions:
- Currency codes (ISO 4217)
- Amount in minor units (BigInt)
- Block-based structure
- Optional AES-GCM encryption

### Supported Formats
- Plaintext DTC1B
- AES-256-GCM encrypted
- AES-256-CBC encrypted
- GZIP compressed
- ZIP compressed

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with React and TypeScript
- Powered by Supabase
- Icons by Lucide
- Styled with Tailwind CSS

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Note**: This is a demonstration system. For production use, ensure proper security audits and compliance with financial regulations.
