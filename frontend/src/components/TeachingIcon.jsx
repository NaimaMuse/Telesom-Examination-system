export default function TeachingIcon({name, size=20}) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
    graduate: <><path d="m2 9 10-5 10 5-10 5Z M6 11v6c4 3 8 3 12 0v-6 M22 9v7"/></>,
    teacher: <><rect x="8" y="3" width="13" height="12" rx="2"/><circle cx="5" cy="13" r="3"/><path d="M1 22v-2a4 4 0 0 1 8 0v2m3-15h5m-5 4h3m-1 4v5m-3 1h6"/></>,
    chart: <><path d="M3 3v18h18M7 16v-5m5 5V7m5 9V4"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 13 2 2 5-5m-7 8h8"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></>,
    reschedule: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-5 4h-5l2-2m-2 2 2 2"/></>,
    book: <><path d="M12 5v15M12 5C9 3 5 3 2 5v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/></>,
    file: <><path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8m-8 4h8"/></>,
    users: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    layers: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
    star: <path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>,
    folder: <path d="M3 7V4h7l3 3h8v13H3V7Zm0 3h18"/>,
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7z"/>,
    filter: <path d="M3 4h18l-7 8v8l-4-2v-6z"/>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    play: <path d="m8 4 12 8-12 8z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.book}</svg>;
}
