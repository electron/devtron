import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  ICellRendererParams,
  RowClickedEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import {
  ModuleRegistry,
  CellStyleModule,
  ClientSideRowModelModule,
  RowSelectionModule,
  themeQuartz,
  ScrollApiModule,
  TooltipModule,
} from 'ag-grid-community';
import { Ban, Lock, LockOpen, Moon, PanelBottom, PanelRight, Sun } from 'lucide-react';
import { MSG_TYPE, PORT_NAME } from '../../../common/constants';
import ResizablePanel from './ResizablePanel';
import type { IpcEventDataIndexed, MessagePanel } from '../../../types/shared';
import DirectionBadge from './DirectionBadge';
import formatTimestamp from '../utils/formatTimestamp';
import DetailPanel from './DetailPanel';
import CircularButton from '../ui/CircularButton';
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowSelectionModule,
  CellStyleModule,
  ScrollApiModule,
  TooltipModule,
]);
import { useDevtronContext } from '../context/context';

const isDev = process.env.NODE_ENV === 'development';

function Panel() {
  const MAX_EVENTS_TO_DISPLAY = 20000;

  const [events, setEvents] = useState<IpcEventDataIndexed[]>([]);
  const [selectedRow, setSelectedRow] = useState<IpcEventDataIndexed | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState<boolean>(false);
  const [isPortReady, setIsPortReady] = useState<boolean>(false);

  const {
    theme,
    setTheme,
    detailPanelPosition,
    lockToBottom,
    setDetailPanelPosition,
    setLockToBottom,
  } = useDevtronContext();

  const lockToBottomRef = useRef(lockToBottom);
  const gridRef = useRef<AgGridReact<IpcEventDataIndexed> | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  const clearEvents = useCallback(() => {
    if (isDev) {
      setEvents([]);
      return;
    }

    if (!isPortReady || !portRef.current) return;

    try {
      portRef.current.postMessage({ type: MSG_TYPE.CLEAR_EVENTS } satisfies MessagePanel);
      setEvents([]);
    } catch (error) {
      console.error('Devtron - Error clearing events:', error);
    }
  }, [isPortReady]);

  useEffect(() => {
    // Update lockToBottomRef on first render
    const savedLockToBottom = localStorage.getItem('lockToBottom');
    if (savedLockToBottom) {
      const parsed = JSON.parse(savedLockToBottom);
      setLockToBottom(parsed);
      lockToBottomRef.current = parsed;
    }

    /* ---------------------- DEV MODE ---------------------- */
    if (isDev) {
      // the following import is ignored by webpack in production builds using the `IgnorePlugin`
      import('../test_data/test_data')
        .then((mod) => {
          setEvents(mod.events);
        })
        .catch((err) => {
          console.error('Failed to load test data:', err);
        });
      return;
    }
    /* ------------------------------------------------------ */

    const port = chrome.runtime.connect({ name: PORT_NAME.PANEL });
    portRef.current = port;

    const handleOnMessage = (message: MessagePanel): void => {
      if (message.type === MSG_TYPE.RENDER_EVENT) {
        setEvents((prev) => {
          const updated = [...prev, message.event].slice(-MAX_EVENTS_TO_DISPLAY);
          if (lockToBottomRef.current) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                gridRef.current?.api.ensureIndexVisible(updated.length - 1, 'bottom');
              });
            });
          }
          return updated;
        });
      }
    };

    port.onMessage.addListener(handleOnMessage);
    port.postMessage({ type: MSG_TYPE.GET_ALL_EVENTS } satisfies MessagePanel);
    setIsPortReady(true);

    const handleOnDisconnect = () => {
      console.log('Devtron - Panel disconnected');
      setIsPortReady(false);
    };
    port.onDisconnect.addListener(handleOnDisconnect);

    return () => {
      port.onMessage.removeListener(handleOnMessage);
      port.onDisconnect.removeListener(handleOnDisconnect);
      portRef.current = null;
      setIsPortReady(false);
      if (port) port.disconnect();
    };
  }, [setLockToBottom]);

  const columnDefs: ColDef<IpcEventDataIndexed>[] = useMemo(
    () => [
      {
        headerName: 'No.',
        field: 'serialNumber',
        width: 55,
        cellClass: 'flex !p-1 items-center h-full text-xs',
        headerClass: '!h-6',
      },
      {
        headerName: 'Time',
        field: 'timestamp',
        width: 100,
        valueFormatter: (params: ValueFormatterParams<IpcEventDataIndexed, any>) => {
          return formatTimestamp(params.value);
        },
        cellClass: 'flex !p-1 items-center h-full text-xs',
        headerClass: '!h-6',
      },
      {
        headerName: 'Direction',
        field: 'direction',
        width: 91,
        cellRenderer: (params: ICellRendererParams<IpcEventDataIndexed>) => {
          return <DirectionBadge direction={params.value} />;
        },
        cellClass: 'flex !p-1 items-center h-full',
        headerClass: '!h-6',
      },
      {
        headerName: 'Channel',
        field: 'channel',
        flex: 1,
        cellClass: 'font-roboto text-[13px] !p-1 h-full flex items-center',
        headerClass: '!h-6',
        cellRenderer: (params: ICellRendererParams<IpcEventDataIndexed>) => {
          return (
            <div className="" title={params.value}>
              {params.value}
              {params.data?.responseTime && (
                <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-charcoal-400">
                  Response
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Data',
        field: 'args',
        flex: 3,
        cellRenderer: (params: ICellRendererParams<IpcEventDataIndexed>) => {
          const jsonStr = JSON.stringify(params.value);
          const preview = jsonStr.length > 120 ? jsonStr.slice(0, 120) + '...' : jsonStr;
          return <span className="truncate font-space-mono text-xs">{preview}</span>;
        },
        cellClass: 'flex !p-1 items-center h-full',
        headerClass: '!h-6',
        resizable: false,
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: false,
      resizable: true,
    }),
    [],
  );

  const onRowClicked = (event: RowClickedEvent<IpcEventDataIndexed>) => {
    setSelectedRow(event.data ?? null);
    setShowDetailPanel(true);
  };

  const handleCloseDetailPanel = () => {
    setShowDetailPanel(false);
    setSelectedRow(null);
  };

  return (
    <div
      className={`flex h-screen w-full overflow-hidden bg-white dark:bg-charcoal-800 ${
        detailPanelPosition === 'bottom' ? 'flex-col' : 'flex-row'
      }`}
    >
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 px-3 py-0.5 text-sm dark:border-charcoal-400 dark:bg-charcoal-800">
          <div className="font-medium dark:text-charcoal-100">Devtron</div>
          <div className="flex gap-2">
            <CircularButton
              tooltip="Switch between Light and Dark theme"
              onClick={() => {
                setTheme(theme === 'light' ? 'dark' : 'light');
              }}
            >
              {theme === 'light' ? (
                <Sun strokeWidth={3} size={15} />
              ) : (
                <Moon strokeWidth={3} size={15} />
              )}
            </CircularButton>
            <CircularButton
              tooltip="Toggle Detail Panel position (right/bottom)"
              onClick={() => {
                setDetailPanelPosition(detailPanelPosition === 'right' ? 'bottom' : 'right');
              }}
            >
              {detailPanelPosition === 'right' ? (
                <PanelRight strokeWidth={3} size={15} />
              ) : (
                <PanelBottom strokeWidth={3} size={15} />
              )}
            </CircularButton>

            <CircularButton
              tooltip={
                lockToBottom
                  ? 'Turn Auto Scrolling Off'
                  : 'Turn Auto Scrolling On (Auto Scroll to newly added events)'
              }
              active={lockToBottom}
              onClick={() => {
                setLockToBottom(!lockToBottom);
                lockToBottomRef.current = !lockToBottom;
              }}
            >
              {lockToBottom ? (
                <Lock strokeWidth={3} size={15} />
              ) : (
                <LockOpen strokeWidth={3} size={15} />
              )}
            </CircularButton>

            <CircularButton tooltip="Clear all events" onClick={clearEvents}>
              <Ban strokeWidth={3} size={15} />
            </CircularButton>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1">
          <AgGridReact
            ref={gridRef}
            suppressScrollOnNewData={true}
            rowData={events}
            columnDefs={columnDefs}
            theme={themeQuartz
              .withParams({
                cellFontFamily: 'roboto, sans-serif',
              })
              .withParams(
                theme === 'light'
                  ? {
                      rowBorder: { style: 'solid', width: '2px', color: '#e5e7eb' },
                    }
                  : {
                      rowBorder: { style: 'solid', width: '1px', color: '#2e3135' },
                      backgroundColor: '#111113', // charcoal-800
                      foregroundColor: '#bfbfbf', // charcoal-100
                      browserColorScheme: 'dark', // to change scrollbar color
                    },
              )}
            defaultColDef={defaultColDef}
            onRowClicked={onRowClicked}
            tooltipShowDelay={100}
            tooltipShowMode="whenTruncated"
            rowSelection={'single'}
            suppressCellFocus={true}
            headerHeight={25}
            rowHeight={29}
          />
        </div>
      </div>
      {/* Details panel */}
      <ResizablePanel isOpen={showDetailPanel} direction={detailPanelPosition}>
        <DetailPanel
          selectedRow={selectedRow}
          onClose={handleCloseDetailPanel}
          direction={detailPanelPosition}
        />
      </ResizablePanel>
    </div>
  );
}

export default Panel;
