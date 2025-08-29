import type { CustomFilterDisplayProps } from 'ag-grid-react';
import { Check } from 'lucide-react';
import type { Direction } from '../../../types/shared';
import DirectionBadge from '../components/DirectionBadge';

const ALL_DIRECTIONS: Direction[] = [
  'renderer-to-main',
  'main-to-renderer',
  'service-worker-to-main',
  'main-to-service-worker',
  'renderer',
  'main',
];

export default function DirectionFilter({
  model,
  onModelChange,
}: CustomFilterDisplayProps<string[]>) {
  const selected: Direction[] = model ?? [];

  const toggle = (dir: Direction) => {
    if (selected.includes(dir)) {
      const next = selected.filter((d) => d !== dir);
      onModelChange(next.length ? next : null);
    } else {
      onModelChange([...selected, dir]);
    }
  };

  return (
    <div className="flex flex-col gap-1 p-1">
      {ALL_DIRECTIONS.map((dir) => {
        const isSelected = selected.includes(dir);
        return (
          <div
            key={dir}
            onClick={() => toggle(dir)}
            className="flex cursor-pointer items-center gap-1 rounded-sm p-1 transition-all duration-150"
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-sm border-2 transition-all duration-150 ${
                isSelected
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-300 hover:border-gray-400 dark:border-charcoal-300'
              } `}
            >
              {isSelected && <Check size={12} strokeWidth={3} />}
            </div>
            <DirectionBadge direction={dir} />
          </div>
        );
      })}

      {selected.length > 0 && (
        <div className="mt-1 flex items-center justify-center border-t border-gray-100 pt-1 dark:border-charcoal-300">
          <button
            onClick={() => onModelChange(null)}
            className="w-full text-center text-xs text-gray-500 transition-colors duration-150 hover:text-gray-700 dark:text-charcoal-100 dark:hover:text-gray-100"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
