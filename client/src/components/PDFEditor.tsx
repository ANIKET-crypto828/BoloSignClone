import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import DraggableField from './DraggableField';
import type { DocumentField, FieldType } from '../types';
import { getPageFields, saveDocumentFields, deleteField } from '../lib/api';
import type { 
  ScreenRect
} from '../utils/coords';
import type { PdfPageInfo } from '../utils/coords';
import { 
  percentToScreen, 
  screenToPercent,
  extractPageInfo 
} from '../utils/coords';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFEditorProps {
  documentId: string;
  pdfUrl: string;
  onSave?: () => void;
}

interface PlacedField {
  id: string;
  type: FieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

const PAGE_WIDTH = 800; // Fixed width for consistent rendering

export default function PDFEditor({ documentId, pdfUrl, onSave }: PDFEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [pageInfo, setPageInfo] = useState<PdfPageInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageInfo) {
      loadFields();
    }
  }, [documentId, currentPage, pageInfo]);

  async function loadFields() {
    if (!pageInfo) return;

    try {
      const data = await getPageFields(documentId, currentPage);

      if (data) {
        const fields = data.map((field: DocumentField) => {
          // Convert stored percentages to screen coordinates
          const screenRect = percentToScreen(
            {
              xPct: field.x_percent,
              yPct: field.y_percent,
              widthPct: field.width_percent,
              heightPct: field.height_percent
            },
            pageInfo
          );

          return {
            id: field.id,
            type: field.field_type,
            x: screenRect.x,
            y: screenRect.y,
            width: screenRect.width,
            height: screenRect.height,
            label: field.label
          };
        });
        
        setPlacedFields(fields);
      }
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onPageLoadSuccess(page: any) {
    // Extract page dimensions and scale info
    const info = extractPageInfo(page, PAGE_WIDTH);
    setPageInfo(info);
    console.log('Page info:', info);
  }

  function handleDrop(type: FieldType, e: React.DragEvent) {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !pageInfo) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newField: PlacedField = {
      id: `temp-${Date.now()}`,
      type,
      x,
      y,
      width: 150,
      height: 60,
      label: ''
    };

    setPlacedFields([...placedFields, newField]);
  }

  function handleDragStop(id: string, x: number, y: number) {
    setPlacedFields(
      placedFields.map((field) =>
        field.id === id ? { ...field, x, y } : field
      )
    );
  }

  function handleResizeStop(id: string, width: number, height: number, x: number, y: number) {
    setPlacedFields(
      placedFields.map((field) =>
        field.id === id ? { ...field, width, height, x, y } : field
      )
    );
  }

  async function handleDelete(id: string) {
    if (!id.startsWith('temp-')) {
      try {
        await deleteField(id);
      } catch (error) {
        console.error('Error deleting field:', error);
        alert('Error deleting field');
        return;
      }
    }
    setPlacedFields(placedFields.filter((field) => field.id !== id));
  }

  async function saveFields() {
    if (!pageInfo) {
      alert('Page info not loaded yet');
      return;
    }

    setSaving(true);
    try {
      // Convert screen coordinates to percentages for storage
      const fieldsToSave = placedFields.map((field) => {
        const screenRect: ScreenRect = {
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height
        };

        const percent = screenToPercent(screenRect, pageInfo);

        return {
          document_id: documentId,
          field_type: field.type,
          page_number: currentPage,
          x_percent: percent.xPct,
          y_percent: percent.yPct,
          width_percent: percent.widthPct,
          height_percent: percent.heightPct,
          label: field.label,
          required: true
        };
      });

      await saveDocumentFields(documentId, currentPage, fieldsToSave);

      alert('Fields saved successfully!');
      if (onSave) onSave();
      
      await loadFields();
    } catch (error) {
      console.error('Error saving fields:', error);
      alert('Error saving fields');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white p-4 shadow-lg overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Field Toolbox</h2>
        
        {pageInfo && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
            <div>PDF: {pageInfo.widthPoints.toFixed(0)} × {pageInfo.heightPoints.toFixed(0)} pts</div>
            <div>Screen: {pageInfo.widthPixels.toFixed(0)} × {pageInfo.heightPixels.toFixed(0)} px</div>
            <div>Scale: {pageInfo.scale.toFixed(2)}</div>
          </div>
        )}

        <div className="space-y-2">
          {(['signature', 'text', 'image', 'date', 'radio'] as FieldType[]).map((type) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('fieldType', type);
              }}
              className="p-3 bg-blue-500 text-white rounded cursor-move hover:bg-blue-600 transition"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Field
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={saveFields}
            disabled={saving || !pageInfo}
            className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Fields'}
          </button>
        </div>

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
        <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: `${PAGE_WIDTH}px` }}>
          <div
            ref={containerRef}
            className="relative"
            onDrop={(e) => {
              const type = e.dataTransfer.getData('fieldType') as FieldType;
              if (type) handleDrop(type, e);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
              <Page 
                pageNumber={currentPage} 
                width={PAGE_WIDTH}
                onLoadSuccess={onPageLoadSuccess}
              />
            </Document>

            {placedFields.map((field) => (
              <DraggableField
                key={field.id}
                id={field.id}
                type={field.type}
                position={{ x: field.x, y: field.y }}
                size={{ width: field.width, height: field.height }}
                onDragStop={handleDragStop}
                onResizeStop={handleResizeStop}
                onDelete={handleDelete}
                label={field.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}