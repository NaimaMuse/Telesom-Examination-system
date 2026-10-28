import { createContext, useContext, useState } from 'react';

export const PageSearchContext = createContext(null);

// Page filters and the top bar share one query, scoped to the current route.
export function usePageSearch() {
  const shared = useContext(PageSearchContext);
  const local = useState('');
  return shared || local;
}

export function matchesPageSearch(query, ...values) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = values.flat(Infinity).filter(value => value != null).join(' ').toLocaleLowerCase();
  return terms.every(term => text.includes(term));
}
