
import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { DocumentField, FieldValue } from '../types';
import { getDocumentFields, signPDF } from '../lib/api';
import { 
  PdfPageInfo, 
  percentToScreen, 
  percentToPdf,
  extractPageInfo 
} from '../utils/coords';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFSignerProps {
  documentId: string;
  pdfUrl: string;
}

const PAGE_WIDTH = 800;

// Image Field Input Component
function ImageFieldInput({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) {
  const [preview, setPreview] = useState<string>(value);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        onChange(dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file (PNG, JPG, GIF)');
    }
  };

  const clearImage = () => {
    setPreview('');
    onChange('');
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <>
          <img
            src={preview}
            alt="Preview"
            className="w-full h-32 object-contain bg-gray-100 rounded border"
          />
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <span className="block text-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                Change
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <button
              onClick={clearImage}
              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition">
            <svg
              className="w-10 h-10 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-600 font-medium">Upload Image</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF (max 5MB)</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

export default function PDFSigner({ documentId, pdfUrl }: PDFSignerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [pageInfo, setPageInfo] = useState<PdfPageInfo | null>(null);
  const [signerEmail, setSignerEmail] = useState('');
  const [signing, setSigning] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadFields();
  }, [documentId]);

  async function loadFields() {
    try {
      const data = await getDocumentFields(documentId);

      if (data) {
        setFields(data);
        const initialValues: Record<string, FieldValue> = {};
        data.forEach((field: DocumentField) => {
          initialValues[field.id] = {
            field_id: field.id,
            field_type: field.field_type,
            value: field.field_type === 'radio' ? false : ''
          };
        });
        setFieldValues(initialValues);
      }
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onPageLoadSuccess(page: any) {
    const info = extractPageInfo(page, PAGE_WIDTH);
    setPageInfo(info);
  }

  function handleFieldChange(fieldId: string, value: string | boolean) {
    setFieldValues({
      ...fieldValues,
      [fieldId]: {
        ...fieldValues[fieldId],
        value
      }
    });
  }

  // Signature canvas functions
  function clearSignature() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureImage('');
  }

  function saveSignature() {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureImage(dataUrl);
      alert('Signature saved!');
    }
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  async function submitSignedDocument() {
    if (!signerEmail) {
      alert('Please enter your email');
      return;
    }

    if (!signatureImage) {
      alert('Please draw and save your signature first');
      return;
    }

    if (!pageInfo) {
      alert('Page info not loaded');
      return;
    }

    // Validate required fields
    const requiredFields = fields.filter((f) => f.required && f.field_type !== 'signature');
    for (const field of requiredFields) {
      const value = fieldValues[field.id]?.value;
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        alert(`Please fill in: ${field.label || field.field_type}`);
        return;
      }
    }

    setSigning(true);
    try {
      const originalPdfUrl = pdfUrl.includes('proxy-pdf?url=')
        ? decodeURIComponent(pdfUrl.split('proxy-pdf?url=')[1])
        : pdfUrl;

      const fieldsForSigning = fields.map((field) => {
        let fieldValue = fieldValues[field.id]?.value || '';
        
        if (field.field_type === 'signature') {
          fieldValue = signatureImage;
        }
        
        const pdfRect = percentToPdf(
          {
            xPct: field.x_percent,
            yPct: field.y_percent,
            widthPct: field.width_percent,
            heightPct: field.height_percent
          },
          pageInfo
        );

        return {
          type: field.field_type,
          x: pdfRect.x,
          y: pdfRect.y,
          width: pdfRect.width,
          height: pdfRect.height,
          page: field.page_number,
          value: fieldValue
        };
      });

      const result = await signPDF({
        pdfId: documentId,
        fields: fieldsForSigning,
        pdfDimensions: {
          widthPoints: pageInfo.widthPoints,
          heightPoints: pageInfo.heightPoints
        },
        pdfUrl: originalPdfUrl
      });

      alert(`Document signed successfully!\n\nProcessed ${result.processedFields} fields.\nAudit ID: ${result.auditId}`);
      
      if (result.pdfUrl) {
        window.open(`https://bolosignclone-backend.onrender.com${result.pdfUrl}`, '_blank');
      }
    } catch (error: any) {
      console.error('Error signing document:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSigning(false);
    }
  }

  const pageFields = fields.filter((f) => f.page_number === currentPage);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white p-4 shadow-lg overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Fill & Sign</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Your Email</label>
          <input
            type="email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="your@email.com"
            required
          />
        </div>

        {pageFields.map((field) => (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium mb-1">
              {field.label || field.field_type.toUpperCase()}
              {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {field.field_type === 'text' && (
              <input
                type="text"
                value={fieldValues[field.id]?.value as string || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="w-full p-2 border rounded"
                required={field.required}
              />
            )}
            
            {field.field_type === 'date' && (
              <input
                type="date"
                value={fieldValues[field.id]?.value as string || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="w-full p-2 border rounded"
                required={field.required}
              />
            )}
            
            {field.field_type === 'radio' && (
              <input
                type="checkbox"
                checked={fieldValues[field.id]?.value as boolean || false}
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                className="w-4 h-4"
              />
            )}
            
            {field.field_type === 'image' && (
              <ImageFieldInput
                value={fieldValues[field.id]?.value as string || ''}
                onChange={(value) => handleFieldChange(field.id, value)}
              />
            )}
          </div>
        ))}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <label className="block text-sm font-medium mb-2">
            Signature <span className="text-red-500">*</span>
          </label>
          <canvas
            ref={canvasRef}
            width={280}
            height={120}
            className="border-2 border-blue-300 rounded cursor-crosshair bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={clearSignature}
              className="flex-1 px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
            >
              Clear
            </button>
            <button
              onClick={saveSignature}
              className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
          {signatureImage && (
            <div className="mt-2 text-xs text-green-600">✓ Signature saved</div>
          )}
        </div>

        <button
          onClick={submitSignedDocument}
          disabled={signing || !pageInfo}
          className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600 disabled:bg-gray-400 font-medium"
        >
          {signing ? 'Signing...' : 'Submit Signed Document'}
        </button>

        {numPages > 1 && (
          <div className="mt-6">
            <h3 className="font-bold mb-2">Pages</h3>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span>{currentPage} / {numPages}</span>
              <button
                onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage === numPages}
                className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: `${PAGE_WIDTH}px` }}>
          <div ref={containerRef} className="relative">
            <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
              <Page 
                pageNumber={currentPage} 
                width={PAGE_WIDTH}
                onLoadSuccess={onPageLoadSuccess}
              />
            </Document>

            {pageInfo && pageFields.map((field) => {
              const screenRect = percentToScreen(
                {
                  xPct: field.x_percent,
                  yPct: field.y_percent,
                  widthPct: field.width_percent,
                  heightPct: field.height_percent
                },
                pageInfo
              );

              return (
                <div
                  key={field.id}
                  className="absolute border-2 border-blue-400 bg-blue-50 rounded flex items-center justify-center pointer-events-none"
                  style={{
                    left: `${screenRect.x}px`,
                    top: `${screenRect.y}px`,
                    width: `${screenRect.width}px`,
                    height: `${screenRect.height}px`
                  }}
                >
                  <span className="text-xs text-blue-600 font-medium">
                    {field.label || field.field_type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}