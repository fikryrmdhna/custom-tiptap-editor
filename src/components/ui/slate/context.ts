import React from 'react';

// ─── LINK CONTEXT ─────────────────────────────────────────────────────────────
export interface LinkContextValue {
  onEditLink: (element: any, path: any) => void;
  onRemoveLink: (path: any) => void;
}

export const LinkContext = React.createContext<LinkContextValue>({
  onEditLink: () => {},
  onRemoveLink: () => {},
});
