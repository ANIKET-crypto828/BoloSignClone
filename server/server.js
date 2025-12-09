// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const { PDFDocument, rgb } = require('pdf-lib');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ============================================
// MongoDB Schemas
// ============================================

// Document Schema for Audit Trail
const DocumentSchema = new mongoose.Schema({
  pdfId: { type: String, required: true, unique: true },
  originalHash: { type: String, required: true },
  signedHash: String,
  signedAt: Date,
  fields: [{
    type: { type: String },
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    page: Number
  }],
  signedPdfPath: String,
  originalPdfUrl: String, // NEW: Store the original URL
  createdAt: { type: Date, default: Date.now }
});

// Document Field Schema for Editor
const DocumentFieldSchema = new mongoose.Schema({
  document_id: { type: String, required: true },
  field_type: { 
    type: String, 
    required: true,
    enum: ['signature', 'text', 'image', 'date', 'radio']
  },
  page_number: { type: Number, required: true },
  x_percent: { type: Number, required: true },
  y_percent: { type: Number, required: true },
  width_percent: { type: Number, required: true },
  height_percent: { type: Number, required: true },
  label: { type: String, default: '' },
  required: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', DocumentSchema);
const DocumentField = mongoose.model('DocumentField', DocumentFieldSchema);

// ============================================
// MongoDB Atlas Connection Configuration
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boloforms';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log(`📂 Database: ${mongoose.connection.name}`);
  console.log(`🌐 Host: ${mongoose.connection.host}`);
  
  if (MONGODB_URI.includes('mongodb+srv')) {
    console.log('☁️  Using MongoDB Atlas (Cloud)');
  } else {
    console.log('💻 Using Local MongoDB');
  }
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.error('💡 Troubleshooting:');
  console.error('   1. Check your .env file exists in backend folder');
  console.error('   2. Verify MONGODB_URI is correct');
  console.error('   3. Check MongoDB Atlas Network Access (IP whitelist)');
  console.error('   4. Verify database user credentials');
  console.error('   5. Make sure username and password are not empty');
  process.exit(1);
});

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB Disconnected - Will attempt to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Reconnected Successfully');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('👋 MongoDB connection closed due to app termination');
  process.exit(0);
});

// ============================================
// Helper Functions
// ============================================

function calculateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function fitImageInBounds(imageWidth, imageHeight, boxWidth, boxHeight) {
  const imageAspect = imageWidth / imageHeight;
  const boxAspect = boxWidth / boxHeight;
  
  let finalWidth, finalHeight, offsetX, offsetY;
  
  if (imageAspect > boxAspect) {
    finalWidth = boxWidth;
    finalHeight = boxWidth / imageAspect;
    offsetX = 0;
    offsetY = (boxHeight - finalHeight) / 2;
  } else {
    finalHeight = boxHeight;
    finalWidth = boxHeight * imageAspect;
    offsetX = (boxWidth - finalWidth) / 2;
    offsetY = 0;
  }
  
  return { width: finalWidth, height: finalHeight, offsetX, offsetY };
}

// NEW: Helper to fetch and cache PDF
async function getPdfBuffer(pdfId, pdfUrl) {
  const cachedPath = path.join(__dirname, 'sample-pdfs', `${pdfId}.pdf`);
  
  // Try to load from cache first
  try {
    const buffer = await fs.readFile(cachedPath);
    console.log(`📄 Loaded PDF from cache: ${pdfId}`);
    return buffer;
  } catch (err) {
    // Not in cache, try to fetch from URL
    if (pdfUrl) {
      console.log(`🌐 Fetching PDF from URL: ${pdfUrl}`);
      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Cache it for future use
        await fs.mkdir(path.dirname(cachedPath), { recursive: true });
        await fs.writeFile(cachedPath, buffer);
        console.log(`✅ PDF cached successfully: ${pdfId}`);
        
        return buffer;
      } catch (fetchErr) {
        console.error('❌ Failed to fetch PDF:', fetchErr);
        throw fetchErr;
      }
    }
    
    // If no URL provided, create a sample PDF
    console.log('⚠️  No PDF found, creating sample...');
    const samplePdf = await PDFDocument.create();
    const page = samplePdf.addPage([595.28, 841.89]);
    page.drawText('EMPLOYMENT CONTRACT', {
      x: 50,
      y: 750,
      size: 24
    });
    page.drawText('This is a sample document for testing.', {
      x: 50,
      y: 700,
      size: 12
    });
    const buffer = Buffer.from(await samplePdf.save());
    
    // Cache the sample
    await fs.mkdir(path.dirname(cachedPath), { recursive: true });
    await fs.writeFile(cachedPath, buffer);
    
    return buffer;
  }
}

// ============================================
// Document Field API Routes
// ============================================

// GET /fields/:documentId - Get all fields for a document
app.get('/fields/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { page } = req.query;

    const query = { document_id: documentId };
    if (page) {
      query.page_number = parseInt(page);
    }

    const fields = await DocumentField.find(query).sort({ page_number: 1, created_at: 1 });

    res.json(fields.map(field => ({
      id: field._id.toString(),
      document_id: field.document_id,
      field_type: field.field_type,
      page_number: field.page_number,
      x_percent: field.x_percent,
      y_percent: field.y_percent,
      width_percent: field.width_percent,
      height_percent: field.height_percent,
      label: field.label,
      required: field.required,
      created_at: field.created_at
    })));
  } catch (error) {
    console.error('❌ Error fetching fields:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /fields/:documentId - Save fields for a document
app.post('/fields/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { pageNumber, fields } = req.body;

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Invalid fields data' });
    }

    // Delete existing fields for this page
    await DocumentField.deleteMany({ 
      document_id: documentId, 
      page_number: pageNumber 
    });

    // Insert new fields
    const fieldsToInsert = fields.map(field => ({
      document_id: documentId,
      field_type: field.field_type,
      page_number: pageNumber,
      x_percent: field.x_percent,
      y_percent: field.y_percent,
      width_percent: field.width_percent,
      height_percent: field.height_percent,
      label: field.label || '',
      required: field.required !== undefined ? field.required : true
    }));

    if (fieldsToInsert.length > 0) {
      await DocumentField.insertMany(fieldsToInsert);
    }

    console.log(`✅ Saved ${fieldsToInsert.length} fields for document ${documentId}, page ${pageNumber}`);

    res.json({ 
      success: true, 
      message: 'Fields saved successfully',
      count: fieldsToInsert.length 
    });
  } catch (error) {
    console.error('❌ Error saving fields:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /fields/delete/:fieldId - Delete a specific field
app.delete('/fields/delete/:fieldId', async (req, res) => {
  try {
    const { fieldId } = req.params;

    const result = await DocumentField.findByIdAndDelete(fieldId);

    if (!result) {
      return res.status(404).json({ error: 'Field not found' });
    }

    console.log(`✅ Deleted field ${fieldId}`);

    res.json({ 
      success: true, 
      message: 'Field deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting field:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PDF Signing API Routes (UPDATED)
// ============================================

// POST /sign-pdf - Main signing endpoint (UPDATED)
app.post('/sign-pdf', async (req, res) => {
  try {
    const { pdfId, fields, pdfDimensions, pdfUrl } = req.body;
    
    // Better validation
    if (!pdfId) {
      return res.status(400).json({ error: 'Missing pdfId' });
    }
    
    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Missing or invalid fields array' });
    }

    console.log(`📄 Processing PDF signature for: ${pdfId}`);
    console.log(`📊 Fields to process: ${fields.length}`);

    // Get the PDF buffer (from cache or URL)
    const pdfBuffer = await getPdfBuffer(pdfId, pdfUrl);
    const originalHash = calculateHash(pdfBuffer);
    console.log(`🔒 Original PDF Hash: ${originalHash.substring(0, 16)}...`);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // Process each field
    let processedCount = 0;
    for (const field of fields) {
      if (!field.value) {
        console.log(`⚠️  Skipping empty field: ${field.type}`);
        continue;
      }

      const page = pages[field.page - 1] || pages[0];
      const { x, y, width, height } = field;

      switch (field.type) {
        case 'signature':
        case 'image':
          try {
            const base64Data = field.value.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            let image;
            try {
              image = await pdfDoc.embedPng(imageBuffer);
            } catch {
              try {
                image = await pdfDoc.embedJpg(imageBuffer);
              } catch (err) {
                console.error('❌ Failed to embed image:', err);
                continue;
              }
            }

            const imageDims = image.scale(1);
            const fitted = fitImageInBounds(
              imageDims.width,
              imageDims.height,
              width,
              height
            );

            page.drawImage(image, {
              x: x + fitted.offsetX,
              y: y + fitted.offsetY,
              width: fitted.width,
              height: fitted.height
            });
            processedCount++;
            console.log(`✅ Added ${field.type} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
          } catch (err) {
            console.error(`❌ Error processing ${field.type}:`, err);
          }
          break;

        case 'text':
          page.drawText(field.value || 'Sample Text', {
            x,
            y: y + height / 2 - 5,
            size: 12,
            color: rgb(0, 0, 0)
          });
          processedCount++;
          break;

        case 'date':
          const dateStr = field.value || new Date().toLocaleDateString();
          page.drawText(dateStr, {
            x,
            y: y + height / 2 - 5,
            size: 12,
            color: rgb(0, 0, 0)
          });
          processedCount++;
          break;

        case 'radio':
          if (field.value === true) {
            page.drawCircle({
              x: x + width / 2,
              y: y + height / 2,
              size: width / 2 - 2,
              borderColor: rgb(0, 0, 0),
              borderWidth: 2
            });
            page.drawCircle({
              x: x + width / 2,
              y: y + height / 2,
              size: width / 3,
              color: rgb(0, 0, 0)
            });
            processedCount++;
          }
          break;
      }
    }

    console.log(`✅ Processed ${processedCount} fields`);

    const signedPdfBytes = await pdfDoc.save();
    const signedBuffer = Buffer.from(signedPdfBytes);
    const signedHash = calculateHash(signedBuffer);
    console.log(`🔒 Signed PDF Hash: ${signedHash.substring(0, 16)}...`);

    // Save to filesystem
    const outputDir = path.join(__dirname, 'signed-pdfs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const signedFilename = `${pdfId}-signed-${Date.now()}.pdf`;
    const signedPath = path.join(outputDir, signedFilename);
    await fs.writeFile(signedPath, signedBuffer);

    // Store audit trail in MongoDB
    const docRecord = await Document.findOneAndUpdate(
      { pdfId },
      {
        pdfId,
        originalHash,
        signedHash,
        signedAt: new Date(),
        originalPdfUrl: pdfUrl || null,
        fields: fields.map(f => ({
          type: f.type,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          page: f.page
        })),
        signedPdfPath: signedPath
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Document signed successfully!`);
    console.log(`📊 Audit Record ID: ${docRecord._id}`);

    res.json({
      success: true,
      pdfUrl: `/download/${signedFilename}`,
      originalHash,
      signedHash,
      auditId: docRecord._id,
      processedFields: processedCount,
      message: 'PDF signed successfully with audit trail'
    });

  } catch (error) {
    console.error('❌ Error signing PDF:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// GET /download/:filename - Download signed PDF
app.get('/download/:filename', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'signed-pdfs', req.params.filename);
    const buffer = await fs.readFile(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

// GET /audit/:pdfId - Get audit trail
app.get('/audit/:pdfId', async (req, res) => {
  try {
    const doc = await Document.findOne({ pdfId: req.params.pdfId });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      pdfId: doc.pdfId,
      originalHash: doc.originalHash,
      signedHash: doc.signedHash,
      signedAt: doc.signedAt,
      fieldsCount: doc.fields.length,
      integrity: doc.originalHash !== doc.signedHash ? 'Modified' : 'Intact',
      createdAt: doc.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /verify - Verify PDF integrity
app.post('/verify', async (req, res) => {
  try {
    const { pdfId, providedHash } = req.body;
    
    const doc = await Document.findOne({ pdfId });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in audit trail' });
    }

    const isValid = doc.signedHash === providedHash;

    res.json({
      isValid,
      storedHash: doc.signedHash,
      providedHash,
      signedAt: doc.signedAt,
      message: isValid ? 'Document integrity verified' : 'Document has been tampered with'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /health - Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'healthy', 
    service: 'BoloForms Signature Engine',
    mongodb: dbStatus,
    database: mongoose.connection.name,
    host: mongoose.connection.host
  });
});

// GET /stats - Get database statistics
app.get('/stats', async (req, res) => {
  try {
    const totalDocs = await Document.countDocuments();
    const totalFields = await DocumentField.countDocuments();
    const recentDocs = await Document.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('pdfId signedAt createdAt');

    res.json({
      totalDocuments: totalDocs,
      totalFields: totalFields,
      recentDocuments: recentDocs,
      database: mongoose.connection.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static PDFs
app.use('/sample-pdfs', express.static(path.join(__dirname, 'sample-pdfs')));

// GET /proxy-pdf - Proxy PDF from external URL
app.get('/proxy-pdf', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`📥 Proxying PDF from: ${url}`);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
    
    console.log(`✅ PDF proxied successfully (${buffer.length} bytes)`);
    
  } catch (error) {
    console.error('❌ Error proxying PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log(`🚀 BoloForms Signature Engine`);
  console.log('='.repeat(60));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log(`   GET    /fields/:documentId     - Get document fields`);
  console.log(`   POST   /fields/:documentId     - Save document fields`);
  console.log(`   DELETE /fields/delete/:fieldId - Delete field`);
  console.log(`   POST   /sign-pdf              - Sign a PDF document`);
  console.log(`   GET    /download/:filename    - Download signed PDF`);
  console.log(`   GET    /audit/:pdfId          - Get audit trail`);
  console.log(`   POST   /verify                - Verify PDF integrity`);
  console.log(`   GET    /health                - Health check`);
  console.log(`   GET    /stats                 - Database statistics`);
  console.log(`   GET    /proxy-pdf             - Proxy external PDF`);
  console.log('');
  console.log('='.repeat(60));
  console.log('');
});