import { Rnd } from 'react-rnd';
import type { FieldType } from '../types';

interface DraggableFieldProps {
  id: string;
  type: FieldType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onDragStop: (id: string, x: number, y: number) => void;
  onResizeStop: (id: string, width: number, height: number, x: number, y: number) => void;
  onDelete: (id: string) => void;
  label?: string;
}

const fieldColors: Record<FieldType, string> = {
  signature: 'bg-blue-100 border-blue-400',
  text: 'bg-green-100 border-green-400',
  image: 'bg-purple-100 border-purple-400',
  date: 'bg-yellow-100 border-yellow-400',
  radio: 'bg-pink-100 border-pink-400',
};

const fieldIcons: Record<FieldType, string> = {
  signature: '✍️',
  text: '📝',
  image: '🖼️',
  date: '📅',
  radio: '⚪',
};

export default function DraggableField({
  id,
  type,
  position,
  size,
  onDragStop,
  onResizeStop,
  onDelete,
  label,
}: DraggableFieldProps) {
  return (
    <Rnd
      position={position}
      size={size}
      onDragStop={(_e, d) => {
        onDragStop(id, d.x, d.y);
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        onResizeStop(
          id,
          parseInt(ref.style.width),
          parseInt(ref.style.height),
          position.x,
          position.y
        );
      }}
      bounds="parent"
      minWidth={80}
      minHeight={40}
      className={`${fieldColors[type]} border-2 rounded cursor-move flex items-center justify-center relative group`}
    >
      <div className="flex flex-col items-center justify-center text-xs font-medium text-gray-700 pointer-events-none">
        <span className="text-lg">{fieldIcons[type]}</span>
        <span>{label || type.toUpperCase()}</span>
      </div>
      <button
        onClick={() => onDelete(id)}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
      >
        ×
      </button>
    </Rnd>
  );
}
