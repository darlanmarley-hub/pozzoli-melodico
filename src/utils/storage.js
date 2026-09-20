/**
 * Storage & State Manager para o Aplicativo Pozzoli Melódico
 * Suporta extração de ID do Google Drive, módulos, salvamento de exercícios e progresso do aluno.
 */

export const extractDriveFileId = (url) => {
  if (!url) return '';
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  return url;
};

export const MODULES = [
  {
    id: 'modulo-1',
    title: 'Módulo 1 - 1ª Série Pozzoli',
    description: 'Exercícios melódicos de solfejo inicial em vídeo com metrônomo e afinação.',
    icon: 'Folder'
  },
  {
    id: 'modulo-2',
    title: 'Módulo 2 - Séries Avançadas',
    description: 'Exercícios melódicos com graus conjuntos e ampliações de registro.',
    icon: 'Folder'
  }
];

export const getDirectVideoUrl = (url) => {
  if (!url) return '';
  if (url.includes('dropbox.com')) {
    let clean = url.replace(/[?&]dl=0/, '').replace(/[?&]dl=1/, '');
    clean += clean.includes('?') ? '&raw=1' : '?raw=1';
    return clean;
  }
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }
  return url;
};

export const INITIAL_SERIES = [
  {
    id: 'primeira-serie',
    title: '1ª Série',
    subtitle: '',
    moduleId: 'modulo-1',
    moduleName: 'Módulo 1 - 1ª Série Pozzoli',
    description: '1ª Série do Método Pozzoli Melódico.',
    mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
    midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
    audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
    videoUrl: 'https://www.dropbox.com/scl/fi/rxev122eb1g94koyxqfef/serie1.mp4?rlkey=hxeihz1dob8bfacmggdncb1an&st=u5h136ev&dl=0',
    videoPcUrl: 'https://www.dropbox.com/scl/fi/rxev122eb1g94koyxqfef/serie1.mp4?rlkey=hxeihz1dob8bfacmggdncb1an&st=u5h136ev&dl=0',
    embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
    timeSignature: '4/4',
    defaultBpm: 60,
    difficulty: 'Iniciante',
    displayOrder: 1,
    isAvailable: true,
    isBuiltin: true
  },
  {
    id: 'segunda-serie',
    title: '2ª Série',
    subtitle: '',
    moduleId: 'modulo-1',
    moduleName: 'Módulo 1 - 2ª Série Pozzoli',
    description: '2ª Série do Método Pozzoli Melódico.',
    mxlUrl: '',
    midiUrl: '',
    audioUrl: '',
    videoUrl: 'https://www.dropbox.com/scl/fi/wer31gfjzpqhvvcpgo91q/serie2.mp4?rlkey=s8dltgl6fzfxwe4od3792u18s&st=a2k779xp&dl=0',
    videoPcUrl: 'https://www.dropbox.com/scl/fi/wer31gfjzpqhvvcpgo91q/serie2.mp4?rlkey=s8dltgl6fzfxwe4od3792u18s&st=a2k779xp&dl=0',
    embedUrl: '',
    timeSignature: '4/4',
    defaultBpm: 60,
    difficulty: 'Iniciante',
    displayOrder: 2,
    isAvailable: true,
    isBuiltin: true
  },
  {
    id: 'terceira-serie',
    title: '3ª Série',
    subtitle: '',
    moduleId: 'modulo-1',
    moduleName: 'Módulo 1 - 3ª Série Pozzoli',
    description: '3ª Série do Método Pozzoli Melódico.',
    mxlUrl: '',
    midiUrl: '',
    audioUrl: '',
    videoUrl: 'https://www.dropbox.com/scl/fi/mpczvks7dxag6ukmzq240/serie3.mp4?rlkey=29mqtabnfjm33fe4p7vl6aqrk&st=ryz6mj9l&dl=0',
    videoPcUrl: 'https://www.dropbox.com/scl/fi/mpczvks7dxag6ukmzq240/serie3.mp4?rlkey=29mqtabnfjm33fe4p7vl6aqrk&st=ryz6mj9l&dl=0',
    embedUrl: '',
    timeSignature: '4/4',
    defaultBpm: 60,
    difficulty: 'Iniciante',
    displayOrder: 3,
    videoScale: 1.08,
    videoTranslateY: '52px',
    isAvailable: true,
    isBuiltin: true
  }
];

const STORAGE_KEYS = {
  FAVORITES: 'pozzoli_favorites',
  STUDIED: 'pozzoli_studied',
  PROFILE: 'pozzoli_profile',
  STATS: 'pozzoli_stats',
  CUSTOM_SERIES: 'pozzoli_custom_series',
  OFFLINE_CACHE: 'pozzoli_offline_ready'
};

export const getFavorites = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const toggleFavorite = (seriesId) => {
  const favorites = getFavorites();
  const index = favorites.indexOf(seriesId);
  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push(seriesId);
  }
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  return favorites;
};

export const getStudied = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDIED);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const toggleStudied = (seriesId) => {
  const studied = getStudied();
  const index = studied.indexOf(seriesId);
  let isNowStudied = false;
  if (index >= 0) {
    studied.splice(index, 1);
  } else {
    studied.push(seriesId);
    isNowStudied = true;
    logPracticeSession(10, seriesId);
  }
  localStorage.setItem(STORAGE_KEYS.STUDIED, JSON.stringify(studied));
  return { studied, isNowStudied };
};

export const getProfile = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return data ? JSON.parse(data) : {
      name: 'Estudante de Música',
      instrument: 'Voz / Solfejo',
      avatar: '🎵',
      dailyGoalMinutes: 15,
      streakDays: 3,
      lastPracticeDate: new Date().toISOString().split('T')[0]
    };
  } catch {
    return {
      name: 'Estudante de Música',
      instrument: 'Voz / Solfejo',
      avatar: '🎵',
      dailyGoalMinutes: 15,
      streakDays: 1,
      lastPracticeDate: new Date().toISOString().split('T')[0]
    };
  }
};

export const saveProfile = (profileData) => {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profileData));
  return profileData;
};

export const getStats = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STATS);
    return data ? JSON.parse(data) : {
      totalPracticeMinutes: 45,
      totalSessions: 6,
      weeklyPractice: [15, 20, 10, 0, 0, 0, 0],
      history: []
    };
  } catch {
    return {
      totalPracticeMinutes: 0,
      totalSessions: 0,
      weeklyPractice: [0, 0, 0, 0, 0, 0, 0],
      history: []
    };
  }
};

export const logPracticeSession = (minutes, seriesId) => {
  const stats = getStats();
  stats.totalPracticeMinutes += minutes;
  stats.totalSessions += 1;
  
  const todayIndex = new Date().getDay();
  stats.weeklyPractice[todayIndex] += minutes;
  
  stats.history.unshift({
    date: new Date().toLocaleDateString('pt-BR'),
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    seriesId,
    duration: minutes
  });

  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  return stats;
};

export const getCustomSeries = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_SERIES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addCustomSeries = (newSeries) => {
  const list = getCustomSeries();
  const fileId = extractDriveFileId(newSeries.videoUrl);
  const formattedSeries = {
    ...newSeries,
    id: newSeries.id || `custom-ex-${Date.now()}`,
    driveFileId: fileId,
    createdAt: new Date().toISOString()
  };
  list.push(formattedSeries);
  localStorage.setItem(STORAGE_KEYS.CUSTOM_SERIES, JSON.stringify(list));
  return list;
};
