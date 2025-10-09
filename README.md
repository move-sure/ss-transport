# Document AI + OpenAI Health Report Processor

🤖 **All-in-One PDF Health Report Text Extraction and Structuring**

## 📋 What it does:
- Extracts text from PDF health reports using **Google Document AI**
- Structures the extracted data into JSON using **Google Gemini API**
- Focuses on extracting patient health values (ignores reference ranges)
- Provides both raw text and structured JSON output

## 🎯 Features:
- Single Python file application
- Embedded HTML interface
- Real-time processing with progress indicators
- Copy-to-clipboard functionality
- Fallback parsing if OpenAI is unavailable

## 📁 Required Files:
- `main.py` - Main application
- `credentials.json` - Google Document AI authentication
- `requirements.txt` - Python dependencies

## 🚀 Quick Start:

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Add your credentials.json** (Google Document AI)

3. **Run the application:**
   ```bash
python main.py
   ```

4. **Open browser:** http://localhost:5000

## 🔧 Configuration:
- Document AI Project ID: `583871470068`
- OpenAI API key: Embedded in code
- Max file size: 16MB

---
*Consolidated single-file application for medical document processing*