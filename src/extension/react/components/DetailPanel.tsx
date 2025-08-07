import ReactJson from '@microlink/react-json-view';
import { X } from 'lucide-react';
import DirectionBadge from './DirectionBadge';
import type { IpcEventDataIndexed } from '../../../types/shared';
import formatTimestamp from '../utils/formatTimestamp';
import CircularButton from '../ui/CircularButton';
import { useDevtronContext } from '../context/context';

type Props = {
  selectedRow: IpcEventDataIndexed | null;
  onClose: () => void;
  direction?: 'right' | 'bottom';
};
function DetailPanel({ selectedRow, onClose, direction = 'right' }: Props) {
  const { theme } = useDevtronContext();
  if (!selectedRow) return null;

  const { serviceWorkerVersionId, serviceWorkerScope } = selectedRow.serviceWorkerDetails || {};

  const timestamp = formatTimestamp(selectedRow.timestamp);

  const isBottomDocked = direction === 'bottom';

  return (
    <div
      className={`flex h-full flex-col border-gray-300 bg-gray-50 text-gray-700 dark:border-charcoal-400 dark:bg-charcoal-800 dark:text-charcoal-100 ${
        isBottomDocked ? 'border-t' : 'border-l'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 px-3 py-0.5 dark:border-charcoal-400 dark:bg-charcoal-800">
        <div className="text-sm font-medium">Details:</div>
        <CircularButton onClick={onClose}>
          <X strokeWidth={3} size={14} />
        </CircularButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 text-[.85rem]">
        <div className={isBottomDocked ? 'flex gap-4' : ''}>
          <div
            className={`${isBottomDocked ? 'flex-shrink-0 gap-y-12' : 'mb-4'} flex flex-col gap-y-2`}
          >
            {/* Channel */}
            <div className="flex items-center gap-x-1">
              <span className="font-medium"> Channel: </span>
              {selectedRow.channel && (
                <span className="block max-w-96 break-all rounded bg-gray-200 px-1 py-0.5 dark:bg-charcoal-500">
                  {selectedRow.channel}
                </span>
              )}
            </div>

            {/* Time */}
            <div>
              <span className="font-medium">Time: </span>
              <span className="">{timestamp}</span>
            </div>

            {/* Direction */}
            <div className="flex w-fit items-center gap-x-1">
              <span className="font-medium">Direction: </span>
              <DirectionBadge direction={selectedRow.direction} />
            </div>

            {/* Method */}
            {selectedRow.method && (
              <div className="flex w-fit items-center gap-x-1">
                <span className="text-nowrap font-medium">Method: </span>
                <span className="block max-w-96 break-all rounded bg-gray-200 px-1 py-0.5 dark:bg-charcoal-500">
                  {selectedRow.method}
                </span>
              </div>
            )}

            {/* Service Worker Scope */}
            {serviceWorkerScope && (
              <div className="flex w-fit items-center gap-x-1">
                <span className="text-nowrap font-medium">SW Scope: </span>
                <span className="block max-w-96 break-all rounded bg-gray-200 px-1 py-0.5 dark:bg-charcoal-500">
                  {serviceWorkerScope}
                </span>
              </div>
            )}

            {/* Service Worker Version ID */}
            {serviceWorkerVersionId && (
              <div className="flex w-fit items-center gap-x-1">
                <span className="text-nowrap font-medium">SW Version ID: </span>
                <span className="block max-w-96 break-all rounded bg-gray-200 px-1 py-0.5 dark:bg-charcoal-500">
                  {serviceWorkerVersionId}
                </span>
              </div>
            )}
          </div>

          {/* Args */}
          <div
            className={`h-fit rounded border border-gray-200 dark:border-0 dark:bg-charcoal-600 ${isBottomDocked ? 'flex-1' : ''}`}
          >
            <ReactJson
              src={selectedRow.args}
              theme={theme === 'dark' ? 'monokai' : 'rjv-default'}
              displayDataTypes={false}
              displayObjectSize={false}
              enableClipboard={false}
              collapsed={false}
              name={`data`}
              style={{
                fontSize: '13px',
                fontFamily: 'Space Mono, Monaco, Menlo, "Ubuntu Mono", monospace',
                padding: '8px',
                backgroundColor: theme === 'dark' ? '' : 'white',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailPanel;
