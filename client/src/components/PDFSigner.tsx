import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { DocumentField, FieldValue } from '../types';
import { getDocumentFields, signPDF } from '../lib/api';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFSignerProps {
  documentId: string;
  pdfUrl: string;
}

export default function PDFSigner({ documentId, pdfUrl }: PDFSignerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [signerEmail, setSignerEmail] = useState('');
  const [signing, setSigning] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadFields();
  }, [documentId]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [currentPage]);

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
            value: field.field_type === 'radio' ? false : '',
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

  function handleFieldChange(fieldId: string, value: string | boolean) {
    setFieldValues({
      ...fieldValues,
      [fieldId]: {
        ...fieldValues[fieldId],
        value,
      },
    });
  }

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
      alert('Signature saved! You can now submit the document.');
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

    const requiredFields = fields.filter((f) => f.required && f.field_type !== 'signature');
    for (const field of requiredFields) {
      const value = fieldValues[field.id]?.value;
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        alert(`Please fill in all required fields: ${field.label || field.field_type}`);
        return;
      }
    }

    setSigning(true);
    try {
      // Get the original PDF URL (extract from proxy URL if needed)
      const originalPdfUrl = pdfUrl.includes('proxy-pdf?url=')
        ? decodeURIComponent(pdfUrl.split('proxy-pdf?url=')[1])
        : pdfUrl;

      console.log('📄 Submitting document with:', {
        documentId,
        fieldsCount: fields.length,
        pdfUrl: originalPdfUrl,
        containerSize
      });

      // Convert fields to backend format
      const fieldsForSigning = fields.map((field) => {
        let fieldValue = fieldValues[field.id]?.value || '';
        
        // Use signature image for signature fields
        if (field.field_type === 'signature') {
          fieldValue = signatureImage;
        }
        
        // Calculate pixel coordinates from percentages
        const x = (field.x_percent / 100) * containerSize.width;
        const y = (field.y_percent / 100) * containerSize.height;
        const width = (field.width_percent / 100) * containerSize.width;
        const height = (field.height_percent / 100) * containerSize.height;

        return {
          type: field.field_type,
          x,
          y,
          width,
          height,
          page: field.page_number,
          value: fieldValue,
        };
      });

      console.log('📝 Fields for signing:', fieldsForSigning);

      const result = await signPDF({
        pdfId: documentId,
        fields: fieldsForSigning,
        pdfDimensions: {
          width: containerSize.width,
          height: containerSize.height,
        },
        pdfUrl: originalPdfUrl, // Pass the original PDF URL
      });

      console.log('✅ Signing result:', result);
      
      alert(`Document signed successfully!\n\nProcessed ${result.processedFields} fields.\nAudit ID: ${result.auditId}`);
      
      // Download the signed PDF
      if (result.pdfUrl) {
        window.open(`http://localhost:3001${result.pdfUrl}`, '_blank');
      }
    } catch (error) {
      console.error('❌ Error signing document:', error);
      alert(`Error signing document: ${error.message}`);
    } finally {
      setSigning(false);
    }
  }

  const pageFields = fields.filter((f) => f.page_number === currentPage);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white p-4 shadow-lg overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Fill & Sign Document</h2>

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
              Save Signature
            </button>
          </div>
          {signatureImage && (
            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
              ✓ Signature saved
            </div>
          )}
        </div>

        <button
          onClick={submitSignedDocument}
          disabled={signing}
          className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600 disabled:bg-gray-400 font-medium"
        >
          {signing ? 'Signing Document...' : 'Submit Signed Document'}
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
              <span>
                {currentPage} / {numPages}
              </span>
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
        <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '800px' }}>
          <div ref={containerRef} className="relative">
            <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
              <Page pageNumber={currentPage} width={800} />
            </Document>

            {pageFields.map((field) => {
              if (!containerSize.width || !containerSize.height) return null;

              const x = (field.x_percent / 100) * containerSize.width;
              const y = (field.y_percent / 100) * containerSize.height;
              const width = (field.width_percent / 100) * containerSize.width;
              const height = (field.height_percent / 100) * containerSize.height;

              return (
                <div
                  key={field.id}
                  className="absolute border-2 border-blue-400 bg-blue-50 rounded flex items-center justify-center pointer-events-none"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    height: `${height}px`,
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