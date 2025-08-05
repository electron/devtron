import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';
type DetailPanelPosition = 'right' | 'bottom';
interface DevtronContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  detailPanelPosition: DetailPanelPosition;
  setDetailPanelPosition: (position: DetailPanelPosition) => void;
  lockToBottom: boolean;
  setLockToBottom: (lock: boolean) => void;
}

const DevtronContext = createContext<DevtronContextType | undefined>(undefined);

export function useDevtronContext() {
  const context = useContext(DevtronContext);
  if (context === undefined) {
    throw new Error('useDevtronContext must be used within a DevtronProvider');
  }
  return context;
}

interface DevtronProviderProps {
  children: React.ReactNode;
}
export default function DevtronProvider({ children }: DevtronProviderProps) {
  // Theme
  const [theme, setThemeState] = useState<Theme>('light');
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.classList.toggle('dark', newTheme === 'dark');
  }, []);

  // Detail Panel Position
  const [detailPanelPosition, setDetailPanelPositionState] = useState<DetailPanelPosition>('right');
  const setDetailPanelPosition = useCallback((position: DetailPanelPosition) => {
    setDetailPanelPositionState(position);
    localStorage.setItem('detailPanelPosition', position);
  }, []);

  // Lock to Bottom
  const [lockToBottom, setLockToBottomState] = useState<boolean>(true);
  const setLockToBottom = useCallback((lock: boolean) => {
    setLockToBottomState(lock);
    localStorage.setItem('lockToBottom', JSON.stringify(lock));
  }, []);

  // Load the saved settings from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // set theme based on system preference if not set
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme: Theme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
    }

    const savedDetailPanelPosition = localStorage.getItem(
      'detailPanelPosition',
    ) as DetailPanelPosition | null;
    if (savedDetailPanelPosition) {
      setDetailPanelPosition(savedDetailPanelPosition);
    }
    const savedLockToBottom = localStorage.getItem('lockToBottom');
    if (savedLockToBottom) {
      setLockToBottom(JSON.parse(savedLockToBottom));
    }
  }, [setDetailPanelPosition, setLockToBottom, setTheme]);

  const api = useMemo(
    () => ({
      theme,
      setTheme,
      detailPanelPosition,
      setDetailPanelPosition,
      lockToBottom,
      setLockToBottom,
    }),
    [theme, setTheme, detailPanelPosition, setDetailPanelPosition, lockToBottom, setLockToBottom],
  );

  return <DevtronContext.Provider value={api}>{children}</DevtronContext.Provider>;
}
