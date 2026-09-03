import { contextBridge } from 'electron';
import { monitorRenderer } from './electron-renderer-tracker';

// Expose excluded channels to the renderer
// This will be set by the main process before the preload script runs
if (typeof window !== 'undefined') {
  // Try to get excluded channels from a global variable set by main process
  // If not available, use an empty array (will be updated via IPC if needed)
  (window as any).__devtronExcludedChannels = (window as any).__devtronExcludedChannels || [];
}

monitorRenderer();
