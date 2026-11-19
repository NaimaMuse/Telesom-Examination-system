import { createContext, useContext, useState } from 'react';

export const PageSearchContext = createContext(null);

// Page filters and the top bar share one query, scoped to the current route.
export function usePageSearch() {
  const shared = useContext(PageSearchContext);
  const local = useState('');
  return shared || local;
}

export {matchesPageSearch} from '../utils/pageSearch.mjs';
