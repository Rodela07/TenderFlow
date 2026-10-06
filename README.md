# 📑 TenderFlow — Intelligent Tender Document Packaging System

> A fast, secure, frontend-only web application that helps office staff turn scattered PDF files into ONE complete, validated, and correctly ordered PDF package ready for official tender submission.

![TenderFlow Preview](/public/tenderflow-logo.png)

---

## ✨ Key Features

- **🌐 Dual Language Support (English & Bangla)**: Complete instant UI translation and voice assistance tailored for non-tech office staff.
- **⚡ Client-Side PDF Processing**: 100% private and in-browser processing using `pdf-lib` and `pdfjs-dist` (no files ever leave the user's computer).
- **📋 Requirements Parser**: Parses standard `requirements.json` definitions containing mandatory/optional rules, page limits, keywords, and validity constraints.
- **🔍 Smart Heuristic Matching**: Automatically matches uploaded PDFs to requirements using filenames, document titles, and OCR/text layer keywords.
- **🛡️ Validation & Guardrails**:
  - File format validation (PDF only)
  - Duplicate detection with hash/content twin locking
  - Expiry date verification against tender submission deadlines
  - Page count constraints (min/max limits)
  - Size limit checking (< 50MB overall)
- **📑 Package Assembly**:
  - Automatically generates an official **Cover Page** with metadata
  - Dynamically builds a **Table of Contents (Index Page)** with live page numbers
  - Stamps custom **Bidder Seal / Watermarks** with custom opacity & sizing
  - Stamps running header / footer page numbers
- **🎙️ Interactive Voice Guidance**: Built-in Web Speech API voice prompts in both English and Bangla.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Rodela07/TenderFlow.git

# Navigate into the project directory
cd TenderFlow

# Install dependencies
npm install

# Start the local development server
npm run dev
```

### Build for Production

```bash
# Type check and build with Vite
npm run build

# Preview production build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Vanilla CSS Design Tokens
- **Animations**: Framer Motion & Canvas Confetti
- **Icons**: Lucide React
- **PDF Engine**: `pdf-lib` & `pdfjs-dist`
- **Typography**: Poppins & Noto Sans Bengali

---

## 📄 License

MIT License © 2026 TenderFlow
