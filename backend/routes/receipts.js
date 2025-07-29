const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Upload and process receipt
router.post('/upload', auth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    
    let extractedText = '';
    let extractedData = {};

    if (fileType === '.pdf') {
      // Handle PDF processing
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
    } else {
      // Handle image processing with OCR
      const result = await Tesseract.recognize(filePath, 'eng', {
        logger: m => console.log(m)
      });
      extractedText = result.data.text;
    }

    // Basic receipt data extraction (you can enhance this with more sophisticated parsing)
    extractedData = parseReceiptText(extractedText);

    res.json({
      message: 'Receipt uploaded and processed successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/${req.file.filename}`
      },
      extractedText,
      extractedData
    });

  } catch (error) {
    console.error('Receipt processing error:', error);
    res.status(500).json({ message: 'Error processing receipt' });
  }
});

// Parse receipt text to extract relevant information
function parseReceiptText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  const extractedData = {
    total: null,
    date: null,
    merchant: null,
    items: []
  };

  // Extract total amount (look for patterns like "TOTAL: $123.45" or "Total: 123.45")
  const totalPatterns = [
    /total\s*:?\s*\$?(\d+\.?\d*)/i,
    /amount\s*:?\s*\$?(\d+\.?\d*)/i,
    /grand\s*total\s*:?\s*\$?(\d+\.?\d*)/i
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedData.total = parseFloat(match[1]);
      break;
    }
  }

  // Extract date (look for common date patterns)
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedData.date = match[1];
      break;
    }
  }

  // Extract merchant name (usually in the first few lines)
  const merchantPatterns = [
    /^([A-Z\s&]+)$/,
    /^([A-Z][a-z\s&]+)$/
  ];

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    for (const pattern of merchantPatterns) {
      const match = lines[i].match(pattern);
      if (match && match[1].length > 3 && match[1].length < 50) {
        extractedData.merchant = match[1].trim();
        break;
      }
    }
    if (extractedData.merchant) break;
  }

  return extractedData;
}

// Get receipt by filename
router.get('/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({ message: 'Error retrieving file' });
  }
});

// Delete receipt file
router.delete('/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

module.exports = router; 