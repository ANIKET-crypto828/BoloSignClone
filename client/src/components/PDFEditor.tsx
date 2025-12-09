import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import DraggableField from './DraggableField';
import type { DocumentField, FieldType } from '../types';
import { getPageFields, saveDocumentFields, deleteField } from '../lib/api';
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

export default function PDFEditor({ documentId, pdfUrl, onSave }: PDFEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFields();
  }, [documentId, currentPage]);

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
      const data = await getPageFields(documentId, currentPage);

      if (data && containerSize.width && containerSize.height) {
        const fields = data.map((field: DocumentField) => ({
          id: field.id,
          type: field.field_type,
          x: (field.x_percent / 100) * containerSize.width,
          y: (field.y_percent / 100) * containerSize.height,
          width: (field.width_percent / 100) * containerSize.width,
          height: (field.height_percent / 100) * containerSize.height,
          label: field.label,
        }));
        setPlacedFields(fields);
      }
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function handleDrop(type: FieldType, e: React.DragEvent) {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newField: PlacedField = {
      id: `temp-${Date.now()}`,
      type,
      x,
      y,
      width: 150,
      height: 60,
      label: '',
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
    // Only delete from backend if it's not a temporary field
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
    if (!containerSize.width || !containerSize.height) return;

    setSaving(true);
    try {
      const fieldsToSave = placedFields.map((field) => ({
        document_id: documentId,
        field_type: field.type,
        page_number: currentPage,
        x_percent: (field.x / containerSize.width) * 100,
        y_percent: (field.y / containerSize.height) * 100,
        width_percent: (field.width / containerSize.width) * 100,
        height_percent: (field.height / containerSize.height) * 100,
        label: field.label,
        required: true,
      }));

      await saveDocumentFields(documentId, currentPage, fieldsToSave);

      alert('Fields saved successfully!');
      if (onSave) onSave();
      
      // Reload fields to get proper IDs from backend
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
            disabled={saving}
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
        <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '800px' }}>
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
              <Page pageNumber={currentPage} width={800} />
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