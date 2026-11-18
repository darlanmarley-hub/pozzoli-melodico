/**
 * Storage & State Manager para o Aplicativo Pozzoli Melódico
 * Suporta extração de ID do Google Drive, módulos, salvamento de exercícios e progresso do aluno.
 * Sincroniza automaticamente com o Supabase quando autenticado.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
    let cleanUrl = url
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dropbox.com', 'dl.dropboxusercontent.com')
      .replace(/[?&]dl=[01]/g, '');
    if (!cleanUrl.includes('raw=1')) {
      cleanUrl += (cleanUrl.includes('?') ? '&' : '?') + 'raw=1';
    }
    return cleanUrl;
  }
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }
  return url;
};

export const SERIES_FOLDERS = [
  {
    id: 'primeira-serie',
    title: '1ª SÉRIE',
    subtitle: 'Exercícios em intervalos de segunda',
    description: 'Pasta da 1ª Série - Exercícios em intervalos de segunda.',
    exercises: [
      {
        id: 'serie-1-ex-1',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        seriesSubtitle: 'Exercícios em intervalos de segunda',
        title: 'Exercício Número 1',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.1 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/82fmd72izqnscmt516xq7/serie1-n1.mp4?rlkey=bht9hx78j78qmrdu9mahtyqhc&st=lqae3chz&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 1,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-2',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 2',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.2 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/4birprc72sabl20ls2uyg/serie1-n2.mp4?rlkey=a0bmfiesefis3igs9ar869pkq&st=3cnrytfr&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 2,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-3',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 3',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.3 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/ial5ujzf5r9sbx5ck0xkw/serie1-n3.mp4?rlkey=it1xetc5e4l3kamk7lu8p38f3&st=pc1quj4c&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 3,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-4',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 4',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.4 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/sj8euy5ml60imuwq5aidz/serie1-n4.mp4?rlkey=8u1ovn27r63ygxnvw6bz10e3z&st=sww1zysj&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 4,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-5',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 5',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.5 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/x7fvpvizovyhk8dhxrg1a/serie1-n5.mp4?rlkey=q9jmetl3xv1ox4muykbkazeyf&st=k02avvbl&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 5,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-6',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 6',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.6 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/ydnybumg0xfs49sb5gg1p/serie1-n6.mp4?rlkey=u54lyklokq1vwoyzujrhz55m1&st=nofqndzi&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 6,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-7',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 7',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.7 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/q9vsbwfku2v3oeefp6g0e/serie1-n7.mp4?rlkey=qvf8a4c9806uc3rg4gghpihvs&st=oor8c4lr&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 7,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-8',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 8',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.8 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/8ychfimxrs4907002rmr2/serie1-n8.mp4?rlkey=46ayrpkfyeaxont2c058y7j4u&st=5hn3u9m7&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 8,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-9',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 9',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.9 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/jbss2wewhmuft4ixpl33e/serie1-n9.mp4?rlkey=zhrsmmky0j6lxh94yytxi195i&st=0d3ijyq5&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 9,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-10',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        title: 'Primeira Série - Exercício Número 10',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.10 da 1ª Série do Método Pozzoli Melódico.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/9qbov8ok7qcd7xm2ykbo6/serie1-n10.mp4?rlkey=zh9ofcmm7p4q90f8781glsqpo&st=15tutk14&dl=0',
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 10,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      }
    ]
  },
  {
    id: 'segunda-serie',
    title: '2ª SÉRIE',
    subtitle: 'Exercícios sobre intervalos de terça',
    description: 'Pasta da 2ª Série - Exercícios sobre intervalos de terça.',
    exercises: [
      {
        id: 'serie-2-ex-1',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 1',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.1 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/94kcs7ntafwkwkqa8akbr/ex1.mp4?rlkey=t45e6i1culxfglpdolfxj4cug&st=3oznjrex&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 1,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-2',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 2',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.2 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/tfp21ttkjp6u190aum1kq/ex2.mp4?rlkey=rorpu8uydrgd719h1h0aqi3gy&st=69oopjm8&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 2,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-3',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 3',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.3 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/tcud38kzcht8j4emxhvep/ex3.mp4?rlkey=7f8cr676yxp4lsvcq68mn41ha&st=86shx7ad&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 3,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-4',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 4',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.4 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/ift3hxqvx2i0sy60ipaq0/ex4.mp4?rlkey=8vsf9z0zwec4aq948v8e5d3y9&st=8880m8lq&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 4,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-5',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 5',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.5 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/79k63foun5jppyijk6ne1/ex5.mp4?rlkey=aw1pi7h7ss8ltyjfdgcda14cg&st=km2b28xi&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 5,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-6',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 6',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.6 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/dtkf4hewcrhggbbdv7oi2/ex6.mp4?rlkey=4qyedef35qnlc8hp83x8bvseh&st=h1xblnst&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 6,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-7',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 7',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.7 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/g8pf0ax1o308dfjiwnjau/ex7.mp4?rlkey=4zzpb065cg3ns0yd0vllnl1fr&st=hv1f8kot&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 7,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-8',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 8',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.8 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/0igos0ako2v57z443sy7t/ex8.mp4?rlkey=yfdc5qjjc2cxq0v0anxwj34am&st=y8aejg87&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 8,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-9',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 9',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.9 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/yeryadj5kws7913uvbklh/ex9.mp4?rlkey=g0ija63r6no74zicr7e2igv06&st=dqry0ov1&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 9,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-2-ex-10',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'Segunda Série - Exercício Número 10',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.10 da 2ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/z7x4mg23rc1b5satl76jx/ex10.mp4?rlkey=jh8g2he8kplglir9peu44927e&st=ijdy8dh1&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 10,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      }
    ]
  },
  {
    id: 'terceira-serie',
    title: '3ª SÉRIE',
    subtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
    description: 'Pasta da 3ª Série - Exercício sobre os intervalos de segunda e terça alternados.',
    exercises: [
      {
        id: 'serie-3-ex-1',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 1',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.1 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/zyhi3em3hgcmxal1b37w6/ex1.mp4?rlkey=ffm8e7mheusoohibjw8g49f7s&st=vuoalzva&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 1,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-2',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 2',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.2 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/5d0ceni5qpmrtxmq08kh4/ex2.mp4?rlkey=qn4vm7sad6amebz4cptir1ifp&st=yk6k5ypv&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 2,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-3',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 3',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.3 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/bkwtevme6hnxwxh9creid/ex3.mp4?rlkey=m6o9qrqs3by246jwegzx8r5mf&st=ctdc1tzv&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 3,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-4',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 4',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.4 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/zy1f7t9mkh0ge5eizrhhv/ex4.mp4?rlkey=ojfhlbkz5bbqqsrtoj5yovt9w&st=0bp8bnsq&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 4,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-5',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 5',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.5 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/1bpcmw24xf0fidx8zk7rh/ex5.mp4?rlkey=sij3tfv5amt9w42zxrtujq859&st=4r15aw5i&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 5,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-6',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 6',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.6 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/lvkorvwe01fij9yuuepxn/ex6.mp4?rlkey=my3dz3fkj4x4y5x9a23k5xt5n&st=vjouyusa&dl=0',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 6,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-7',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 7',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.7 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/ek3u865v592f6sbq5cdfa/ex7.mp4?rlkey=dm1g5jcdh46lrgdpqtpurfzcm&st=towf5vyb&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 7,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-8',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 8',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.8 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/h4mgn3yaohvwc69uqr492/ex8.mp4?rlkey=2moyrrinxksyi0jh4jgd26xc2&st=kjm5bigm&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 8,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-9',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 9',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.9 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/m81bc6knilflpdh85whx3/ex9.mp4?rlkey=lq8bhl6b8nacjskv9ptjtm0ds&st=ovemda91&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 9,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-10',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 10',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.10 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/e26m7scke5pjuwh2kw6qd/ex10.mp4?rlkey=0c01yxtgap2itv6uxvmrzc49k&st=c6j4jopl&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 10,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-11',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 11',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.11 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/qf1e2odthy92d1pe3f47q/ex11.mp4?rlkey=inek87p3hdrh8kp3ikn3mj0i3&st=qawvhqbl&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 11,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-12',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 12',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.12 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/b6yuebee186p37981lr65/ex12.mp4?rlkey=ez4gi9txmp3s36knowo1oajoo&st=4qbrem4r&dl=0',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 12,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-13',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 13',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.13 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/ngwyr62pw5ypgousvhiks/ex13.mp4?rlkey=wp79f0znk7aii53nn1snarxeq&st=wee08zd4&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 13,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-14',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 14',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.14 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/ypkg1ovus4hgwjboq89ju/ex14.mp4?rlkey=pcuel5dtecy4axcwi9wjzr83f&st=58ya64iv&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 14,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-15',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 15',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.15 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/1ftrxr5t9i9uo9i5ymg2p/ex15.mp4?rlkey=vgqp7xmznsc1w3p5vzfggq3tg&st=afgs5ry6&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 15,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-16',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 16',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.16 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/a5dahjy4wiygln8v5uk2o/ex16.mp4?rlkey=3vjmwte18i9ztebvh9x3d42au&st=lkuvcazn&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 16,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-17',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 17',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.17 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/pxuidkw4yaoshdb07fpjb/ex17.mp4?rlkey=yg906expb4a9gxdkapsozpbn6&st=91m098x7&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 17,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-3-ex-18',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'Terceira Série - Exercício Número 18',
        subtitle: '⏱ 60 BPM',
        description: 'Exercício N.18 da 3ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/taxc8lr8p2jb1hgeovvqa/ex18.mp4?rlkey=vvrkxked3342cbgpeqd8k72fh&st=gtyh1aw2&dl=0',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 18,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      }
    ]
  },
  {
    id: 'quarta-serie',
    title: '4ª SÉRIE',
    subtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
    description: 'Pasta da 4ª Série - Exercícios sobre intervalos de segunda e de terça em compassos compostos.',
    exercises: [
      {
        id: 'serie-4-ex-1',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 1',
        subtitle: '6/8',
        description: 'Exercício N.1 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/k3bhodlns7b9q3r8ksn2s/ex1.mp4?rlkey=memamgic4jso8bghqhycm3icl&st=7m7702qy&dl=0',
        embedUrl: '',
        timeSignature: '6/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 1,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-2',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 2',
        subtitle: '6/8',
        description: 'Exercício N.2 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/xfcsdnob58fouobregtrc/ex2.mp4?rlkey=izzxldwn3jsq21lc6rpr8ag6p&st=4hn57pas&dl=0',
        embedUrl: '',
        timeSignature: '6/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 2,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-3',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 3',
        subtitle: '6/8',
        description: 'Exercício N.3 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/yhwjhp3sln6g909qu5b9o/Ex3.mp4?rlkey=qimn5jl1gxrz7um17jj38mco7&st=3ythwrhu&dl=0',
        embedUrl: '',
        timeSignature: '6/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 3,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-4',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 4',
        subtitle: '6/8',
        description: 'Exercício N.4 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/actd4ci9o6kga7vs7pn24/Ex4.mp4?rlkey=88qhs7nki5fesbkx2t8ivb8m2&st=vmm21v4c&dl=0',
        embedUrl: '',
        timeSignature: '6/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 4,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-5',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 5',
        subtitle: '6/8',
        description: 'Exercício N.5 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/iekqzzqg375scq54b4nn5/ex5.mp4?rlkey=22e564rwbbj3zoi8sijs3anop&st=saecdnw8&dl=0',
        embedUrl: '',
        timeSignature: '6/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 5,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-6',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 6',
        subtitle: '6/8',
        description: 'Exercício N.6 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/5ykvq776ei6tpri0lin4r/ex6.mp4?rlkey=ckkuy4znzhqik0wc2geefek7o&st=xha14hjv&dl=0',
        embedUrl: '',
        timeSignature: '6/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 6,
        isInteractiveScore: true,
        videoScale: 1.0,
        videoTranslateY: '0px',
        hasScrollbar: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-7',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 7',
        subtitle: '9/8',
        description: 'Exercício N.7 da 4ª Série do Método Pozzoli Melódico (Partitura Interativa 9/8).',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '/partituras/serie4-ex7.png',
        embedUrl: '',
        timeSignature: '9/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 7,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-8',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 8',
        subtitle: '9/8',
        description: 'Exercício N.8 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '9/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 8,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-9',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 9',
        subtitle: '9/8',
        description: 'Exercício N.9 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '9/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 9,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-10',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 10',
        subtitle: '9/8',
        description: 'Exercício N.10 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '9/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 10,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-11',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 11',
        subtitle: '9/8',
        description: 'Exercício N.11 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '9/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 11,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-12',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 12',
        subtitle: '9/8',
        description: 'Exercício N.12 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '9/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 12,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-13',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 13',
        subtitle: '12/8',
        description: 'Exercício N.13 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '12/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 13,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-14',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 14',
        subtitle: '12/8',
        description: 'Exercício N.14 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '12/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 14,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-15',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 15',
        subtitle: '12/8',
        description: 'Exercício N.15 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '12/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 15,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-16',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 16',
        subtitle: '12/8',
        description: 'Exercício N.16 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '12/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 16,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-17',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 17',
        subtitle: '12/8',
        description: 'Exercício N.17 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '12/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 17,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-4-ex-18',
        seriesId: 'quarta-serie',
        seriesTitle: '4ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de segunda e de terça em compassos compostos',
        title: 'Quarta Série - Exercício Número 18',
        subtitle: '12/8',
        description: 'Exercício N.18 da 4ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '12/8',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 18,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      }
    ]
  },
  {
    id: 'quinta-serie',
    title: '5ª SÉRIE',
    subtitle: 'Exercícios sobre intervalos de quarta',
    description: 'Pasta da 5ª Série – exercícios sobre intervalos de quarta.',
    exercises: [
      {
        id: 'serie-5-ex-1',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 1',
        subtitle: '2/4',
        description: 'Exercício N.1 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 1,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-2',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 2',
        subtitle: '2/4',
        description: 'Exercício N.2 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 2,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-3',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 3',
        subtitle: '2/4',
        description: 'Exercício N.3 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 3,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-4',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 4',
        subtitle: '2/4',
        description: 'Exercício N.4 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 4,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-5',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 5',
        subtitle: '3/4',
        description: 'Exercício N.5 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 5,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-6',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 6',
        subtitle: '3/4',
        description: 'Exercício N.6 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 6,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-7',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 7',
        subtitle: '3/4',
        description: 'Exercício N.7 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 7,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-8',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 8',
        subtitle: '4/4',
        description: 'Exercício N.8 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 8,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-9',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 9',
        subtitle: '4/4',
        description: 'Exercício N.9 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 9,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-5-ex-10',
        seriesId: 'quinta-serie',
        seriesTitle: '5ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quarta',
        title: 'Exercício Número 10',
        subtitle: '4/4',
        description: 'Exercício N.10 da 5ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 10,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      }
    ]
  },
  {
    id: 'sexta-serie',
    title: '6ª SÉRIE',
    subtitle: 'Exercícios sobre intervalos de quinta',
    description: 'Pasta da 6ª Série – exercícios sobre intervalos de quinta.',
    exercises: [
      {
        id: 'serie-6-ex-1',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 1',
        subtitle: '2/4',
        description: 'Exercício N.1 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 1,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-2',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 2',
        subtitle: '2/4',
        description: 'Exercício N.2 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 2,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-3',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 3',
        subtitle: '2/4',
        description: 'Exercício N.3 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 3,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-4',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 4',
        subtitle: '3/4',
        description: 'Exercício N.4 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 4,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-5',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 5',
        subtitle: '3/4',
        description: 'Exercício N.5 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 5,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-6',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 6',
        subtitle: '3/4',
        description: 'Exercício N.6 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 6,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-7',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 7',
        subtitle: '3/4',
        description: 'Exercício N.7 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 7,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-8',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 8',
        subtitle: '4/4',
        description: 'Exercício N.8 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 8,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-9',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 9',
        subtitle: '4/4',
        description: 'Exercício N.9 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 9,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-6-ex-10',
        seriesId: 'sexta-serie',
        seriesTitle: '6ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de quinta',
        title: 'Exercício Número 10',
        subtitle: '4/4',
        description: 'Exercício N.10 da 6ª Série do Método Pozzoli Melódico.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: '',
        embedUrl: '',
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Avançado',
        displayOrder: 10,
        isInteractiveScore: true,
        isAvailable: true,
        isBuiltin: true
      }
    ]
  },
  ...[
    {
      num: 7,
      id: 'setima-serie',
      title: '7ª SÉRIE',
      subtitle: 'Exercícios sobre intervalos da série precedente em compasso composto',
      description: 'Pasta da 7ª Série – exercícios em compasso composto.',
      difficulty: 'Avançado',
      items: [
        [1, '6/8'], [2, '6/8'], [3, '6/8'], [4, '6/8'],
        [5, '9/8'], [6, '9/8'], [7, '9/8'], [8, '9/8'],
        [9, '12/8'], [10, '12/8']
      ]
    },
    {
      num: 8,
      id: 'oitava-serie',
      title: '8ª SÉRIE',
      subtitle: 'Exercícios sobre o modo menor',
      description: 'Pasta da 8ª Série – exercícios sobre o modo menor.',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '2/4'], [3, '2/4'], [4, '2/4'],
        [5, '3/4'], [6, '3/4'], [7, '3/4'],
        [8, '4/4'], [9, '4/4'], [10, '4/4'],
        [11, '6/8'], [12, '6/8'],
        [13, '9/8'], [14, '9/8'],
        [15, '12/8']
      ]
    },
    {
      num: 9,
      id: 'nona-serie',
      title: '9ª SÉRIE',
      subtitle: 'Exercícios sobre intervalos de sexta e de sétima no modo Maior e Menor',
      description: 'Pasta da 9ª Série – intervalos de sexta e sétima no modo Maior e Menor.',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '2/4'], [3, '2/4'],
        [4, '3/4'], [5, '3/4'], [6, '3/4'],
        [7, '4/4'], [8, '4/4'], [9, '4/4'],
        [10, '2/4'], [11, '2/4'], [12, '2/4'],
        [13, '3/4'], [14, '3/4'], [15, '3/4'],
        [16, '4/4'], [17, '4/4'], [18, '4/4']
      ]
    },
    {
      num: 10,
      id: 'decima-serie',
      title: '10ª SÉRIE',
      subtitle: 'Modulação do Tom de Dó Maior aos seus tons relativos',
      description: 'Pasta da 10ª Série – modulações do tom de Dó Maior aos seus tons relativos.',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '2/4'], [3, '2/4'], [4, '2/4'],
        [5, '3/4'], [6, '3/4'], [7, '3/4'], [8, '3/4'],
        [9, '4/4'], [10, '4/4'], [11, '4/4'], [12, '4/4'],
        [13, '6/8'], [14, '6/8'], [15, '6/8'], [16, '6/8'],
        [17, '9/8'], [18, '9/8'], [19, '9/8'], [20, '9/8'],
        [21, '12/8'], [22, '12/8'], [23, '12/8'], [24, '12/8']
      ]
    },
    {
      num: 11,
      id: 'decima-primeira-serie',
      title: '11ª SÉRIE',
      subtitle: 'Exercícios sobre Modulações do tom de Lá menor ao seu tom relativo',
      description: 'Pasta da 11ª Série – modulações do tom de Lá menor ao seu tom relativo.',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '2/4'], [3, '2/4'], [4, '2/4'],
        [5, '3/4'], [6, '3/4'], [7, '3/4'], [8, '3/4'],
        [9, '4/4'], [10, '4/4'], [11, '4/4'], [12, '4/4'],
        [13, '6/8'], [14, '6/8'], [15, '6/8'], [16, '6/8'],
        [17, '9/8'], [18, '9/8'], [19, '9/8'], [20, '9/8'],
        [21, '12/8'], [22, '12/8'], [23, '12/8'], [24, '12/8']
      ]
    },
    {
      num: 12,
      id: 'decima-segunda-serie',
      title: '12ª SÉRIE',
      subtitle: 'Tercinas - Compasso simples',
      description: 'Exercícios sobre tercinas em compassos simples (N.1 a N.10).',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '3/4'], [3, '4/4'], [4, '4/4'], [5, '2/4'],
        [6, '3/4'], [7, '4/4'], [8, '3/4'], [9, '3/4'], [10, '2/4']
      ]
    },
    {
      num: 13,
      id: 'decima-terceira-serie',
      title: '13ª SÉRIE',
      subtitle: 'Tonalidades com sustenidos (Sol - Ré - Lá maior)',
      description: 'Exercícios em Sol maior, Ré maior e Lá maior em compassos simples e compostos (N.1 a N.20).',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '2/4'], [3, '3/4'], [4, '4/4'], [5, '2/4'],
        [6, '3/4'], [7, '4/4'], [8, '2/4'], [9, '3/4'], [10, '4/4'],
        [11, '6/8'], [12, '6/8'], [13, '9/8'], [14, '12/8'], [15, '6/8'],
        [16, '9/8'], [17, '12/8'], [18, '6/8'], [19, '9/8'], [20, '12/8']
      ]
    },
    {
      num: 14,
      id: 'decima-quarta-serie',
      title: '14ª SÉRIE',
      subtitle: 'Tonalidades com sustenidos (Mi - Si - Fá# menor)',
      description: 'Exercícios em Mi menor, Si menor e Fá# menor em compassos simples e compostos (N.1 a N.20).',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '2/4'], [3, '3/4'], [4, '4/4'], [5, '2/4'],
        [6, '3/4'], [7, '4/4'], [8, '2/4'], [9, '3/4'], [10, '4/4'],
        [11, '6/8'], [12, '6/8'], [13, '9/8'], [14, '12/8'], [15, '6/8'],
        [16, '9/8'], [17, '12/8'], [18, '6/8'], [19, '9/8'], [20, '12/8']
      ]
    },
    {
      num: 15,
      id: 'decima-quinta-serie',
      title: '15ª SÉRIE',
      subtitle: 'Tonalidade dos bemóis (Fá - Sib - Mib Maior)',
      description: 'Exercícios em Fá Maior, Sib Maior e Mib Maior em compassos simples e compostos (N.1 a N.20).',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '2/4'], [3, '3/4'], [4, '4/4'], [5, '2/4'],
        [6, '3/4'], [7, '4/4'], [8, '2/4'], [9, '3/4'], [10, '4/4'],
        [11, '6/8'], [12, '6/8'], [13, '9/8'], [14, '12/8'], [15, '6/8'],
        [16, '9/8'], [17, '12/8'], [18, '6/8'], [19, '9/8'], [20, '12/8']
      ]
    },
    {
      num: 16,
      id: 'decima-sexta-serie',
      title: '16ª SÉRIE',
      subtitle: 'Tonalidades com bemóis (Ré - Sol - Dó menor)',
      description: 'Exercícios em Ré menor, Sol menor e Dó menor em compassos simples e compostos (N.1 a N.20).',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '2/4'], [3, '3/4'], [4, '4/4'], [5, '2/4'],
        [6, '3/4'], [7, '4/4'], [8, '2/4'], [9, '3/4'], [10, '4/4'],
        [11, '6/8'], [12, '6/8'], [13, '9/8'], [14, '12/8'], [15, '6/8'],
        [16, '9/8'], [17, '12/8'], [18, '6/8'], [19, '9/8'], [20, '12/8']
      ]
    },
    {
      num: 17,
      id: 'decima-setima-serie',
      title: '17ª SÉRIE',
      subtitle: 'Várias formas de ataque in levare (anacruse)',
      description: 'Exercícios sobre várias formas de ataque in levare / anacruse (N.1 a N.12).',
      difficulty: 'Avançado',
      items: [
        [1, '3/4'], [2, '2/4'], [3, '3/4'], [4, '4/4'],
        [5, '4/4'], [6, '2/4'], [7, '6/8'], [8, '6/8'],
        [9, '6/8'], [10, '6/8'], [11, '4/4'], [12, '9/8']
      ]
    },
    {
      num: 18,
      id: 'decima-oitava-serie',
      title: '18ª SÉRIE',
      subtitle: 'Tonalidades com sustenidos (Mi - Si - Fá# - Dó# Maior)',
      description: 'Exercícios em Mi Maior, Si Maior, Fá# Maior e Dó# Maior em compassos simples e compostos (N.1 a N.10).',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '4/4'], [3, '6/8'], [4, '9/8'], [5, '4/4'],
        [6, '6/8'], [7, '3/4'], [8, '9/8'], [9, '2/4'], [10, '6/8']
      ]
    },
    {
      num: 19,
      id: 'decima-nona-serie',
      title: '19ª SÉRIE',
      subtitle: 'Tonalidades com sustenidos (Dó# - Sol# - Ré# - Lá# menor)',
      description: 'Exercícios em Dó# menor, Sol# menor, Ré# menor e Lá# menor em compassos simples e compostos (N.1 a N.10).',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '3/4'], [3, '6/8'], [4, '9/8'], [5, '2/4'],
        [6, '6/8'], [7, '3/4'], [8, '9/8'], [9, '4/4'], [10, '12/8']
      ]
    },
    {
      num: 20,
      id: 'vigesima-serie',
      title: '20ª SÉRIE',
      subtitle: 'Tonalidades com bemóis (Láb - Réb - Solb - Dób Maior)',
      description: 'Exercícios em Láb Maior, Réb Maior, Solb Maior e Dób Maior em compassos simples e compostos (N.1 a N.10).',
      difficulty: 'Avançado',
      items: [
        [1, '2/4'], [2, '3/4'], [3, '6/8'], [4, '9/8'], [5, '3/4'],
        [6, '6/8'], [7, '4/4'], [8, '6/8'], [9, '4/4'], [10, '9/8']
      ]
    },
    {
      num: 21,
      id: 'vigesima-primeira-serie',
      title: '21ª SÉRIE',
      subtitle: 'Tonalidades com bemóis (Fá - Sib - Mib - Láb menor)',
      description: 'Exercícios em Fá menor, Sib menor, Mib menor e Láb menor em compassos simples e compostos (N.1 a N.10).',
      difficulty: 'Avançado',
      items: [
        [1, '3/4'], [2, '4/4'], [3, '6/8'], [4, '9/8'], [5, '2/4'],
        [6, '6/8'], [7, '4/4'], [8, '9/8'], [9, '2/4'], [10, '6/8']
      ]
    },
    {
      num: 22,
      id: 'vigesima-segunda-serie',
      title: '22ª SÉRIE',
      subtitle: 'Intervalos de difícil entonação',
      description: 'Exercícios sobre intervalos de difícil entonação em compassos simples e compostos (N.1 a N.15).',
      difficulty: 'Avançado',
      items: [
        [1, '6/8'], [2, '3/4'], [3, '3/4'], [4, '2/4'], [5, '6/8'],
        [6, '4/4'], [7, '6/8'], [8, '9/8'], [9, '3/4'], [10, '4/4'],
        [11, '3/4'], [12, '6/8'], [13, '3/4'], [14, '3/4'], [15, '6/8']
      ]
    },
    {
      num: 23,
      id: 'vigesima-terceira-serie',
      title: '23ª SÉRIE',
      subtitle: 'Modulação a tom afastado',
      description: 'Exercícios sobre modulação a tom afastado em compassos simples e compostos (N.1 a N.10).',
      difficulty: 'Avançado',
      items: [
        [1, '3/4'], [2, '4/4'], [3, '4/4'], [4, '3/4'], [5, '4/4'],
        [6, '6/8'], [7, '3/4'], [8, '6/8'], [9, '3/4'], [10, '2/4']
      ]
    },
    {
      num: 24,
      id: 'vigesima-quarta-serie',
      title: '24ª SÉRIE',
      subtitle: 'Exemplos de compassos pouco usados',
      description: 'Exercícios com exemplos de compassos pouco usados (5/4 e 7/4, N.1 a N.5).',
      difficulty: 'Avançado',
      items: [
        [1, '5/4'], [2, '5/4'], [3, '5/4'], [4, '7/4'], [5, '7/4']
      ]
    }
  ].map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    description: s.description,
    exercises: s.items.map(([n, ts], idx) => ({
      id: `serie-${s.num}-ex-${n}`,
      seriesId: s.id,
      seriesTitle: s.title,
      seriesSubtitle: s.subtitle,
      title: `Exercício Número ${n}`,
      subtitle: ts,
      description: `Exercício N.${n} da ${s.title} do Método Pozzoli Melódico.`,
      mxlUrl: '',
      midiUrl: '',
      audioUrl: '',
      videoUrl: '',
      embedUrl: '',
      timeSignature: ts,
      defaultBpm: 60,
      difficulty: s.difficulty,
      displayOrder: idx + 1,
      isInteractiveScore: true,
      measuresPerRow: (['5/4', '7/4', '9/8', '12/8', '5/8', '7/8'].includes(ts) || s.num === 24) ? 1 : 2,
      isAvailable: true,
      isBuiltin: true
    }))
  }))
];

// Garante que todos os exercícios individuais exibam apenas "Exercício Número X" e a unidade de tempo / fórmula de compasso (ex: 2/4, 3/4, 4/4, 6/8, 9/8, 12/8)
SERIES_FOLDERS.forEach((folder) => {
  if (Array.isArray(folder.exercises)) {
    folder.exercises.forEach((ex) => {
      if (!ex.isDesktopMode && ex.title) {
        ex.title = ex.title.replace(/^(Primeira|Segunda|Terceira|Quarta|Quinta|Sexta|Sétima|Oitava|Nona|Décima(?:\s+(?:Primeira|Segunda|Terceira|Quarta))?)\s+Série\s*-\s*/i, '');
      }
      if (!ex.isDesktopMode && ex.timeSignature) {
        ex.subtitle = ex.timeSignature;
      }
    });
  }
});

export const INITIAL_SERIES = SERIES_FOLDERS.flatMap(folder => folder.exercises);

const STORAGE_KEYS = {
  FAVORITES: 'pozzoli_favorites',
  STUDIED: 'pozzoli_studied',
  PROFILE: 'pozzoli_profile',
  STATS: 'pozzoli_stats',
  CUSTOM_SERIES: 'pozzoli_custom_series',
  OFFLINE_CACHE: 'pozzoli_offline_ready',
  AUTH_USER: 'pozzoli_auth_user',
  PAUSED_USER: 'pozzoli_paused_device_user',
  DEVICE_ID: 'pozzoli_device_id',
  DEVICE_SESSION_TOKEN: 'pozzoli_device_session_token',
  ACTIVE_DEVICE_SESSION: 'pozzoli_active_device_session'
};

export const getPausedDeviceUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAUSED_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const savePausedDeviceUser = (user, replacedBy = 'outro dispositivo') => {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.PAUSED_USER);
      return null;
    }
    const payload = {
      user,
      replacedBy,
      pausedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.PAUSED_USER, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
};

export const clearPausedDeviceUser = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.PAUSED_USER);
  } catch {
    // ignore
  }
};

export const getLocalActiveDeviceSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_DEVICE_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getDeviceId = () => {
  try {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_default';
  }
};

export const getDeviceName = () => {
  try {
    const ua = navigator.userAgent || '';
    if (/iPhone/i.test(ua)) return 'iPhone (iOS)';
    if (/iPad/i.test(ua)) return 'iPad (iOS)';
    if (/Android/i.test(ua)) return 'Celular Android';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'Computador Mac';
    if (/Windows/i.test(ua)) return 'Computador Windows';
    if (/Linux/i.test(ua)) return 'Computador Linux';
    return 'Outro Dispositivo';
  } catch {
    return 'Outro Dispositivo';
  }
};

export const checkActiveDeviceConflict = async (userId) => {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return { hasConflict: false, activeDevice: null };
  }
  try {
    const { data } = await supabase
      .from('profiles')
      .select('stats')
      .eq('id', userId)
      .maybeSingle();

    const activeSession = data?.stats?.activeDeviceSession;
    const currentDeviceId = getDeviceId();

    if (activeSession && activeSession.deviceId && activeSession.deviceId !== currentDeviceId) {
      return {
        hasConflict: true,
        activeDevice: activeSession
      };
    }

    return { hasConflict: false, activeDevice: null };
  } catch {
    return { hasConflict: false, activeDevice: null };
  }
};

export const registerActiveDeviceSession = async (userId) => {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const deviceId = getDeviceId();
    const deviceName = getDeviceName();
    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_SESSION_TOKEN, sessionToken);

    const activeDeviceSession = {
      deviceId,
      sessionToken,
      deviceName,
      connectedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_DEVICE_SESSION, JSON.stringify(activeDeviceSession));

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('stats')
      .eq('id', userId)
      .maybeSingle();

    const baseStats =
      profileRow?.stats && typeof profileRow.stats === 'object'
        ? profileRow.stats
        : getStats();

    const updatedStats = {
      ...baseStats,
      activeDeviceSession
    };

    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updatedStats));

    // Usa upsert para garantir criação mesmo se o perfil ainda não existir na tabela
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        stats: updatedStats,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (upsertErr) {
      console.warn('Erro ao atualizar stats.activeDeviceSession via upsert:', upsertErr);
      await supabase
        .from('profiles')
        .update({
          stats: updatedStats,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    return activeDeviceSession;
  } catch (err) {
    console.warn('Erro ao registrar sessão única do dispositivo:', err);
    return null;
  }
};

export const verifyCurrentDeviceIsActive = async (userId) => {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return { isValid: true, replacedBy: null };
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan, stats')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { isValid: true, replacedBy: null };
    }

    // Se o perfil ainda não existe no banco, cria e registra agora
    if (!data) {
      await registerActiveDeviceSession(userId);
      return { isValid: true, replacedBy: null };
    }

    // Se a compra foi reembolsada ou cancelada, revoga o acesso imediatamente
    if (data.plan === 'cancelado' || data?.stats?.accessRevoked === true) {
      return {
        isValid: false,
        isRevoked: true,
        replacedBy: null
      };
    }

    const activeSession = data?.stats?.activeDeviceSession;
    const currentDeviceId = getDeviceId();
    const localToken = localStorage.getItem(STORAGE_KEYS.DEVICE_SESSION_TOKEN);

    // Se ainda não há sessão registrada no banco, registra este aparelho como o ativo
    if (!activeSession || !activeSession.deviceId) {
      await registerActiveDeviceSession(userId);
      return { isValid: true, replacedBy: null };
    }

    // Se o deviceId ativo no banco pertence a OUTRO aparelho: DESCONECTA ESTE APARELHO!
    if (activeSession.deviceId !== currentDeviceId) {
      return {
        isValid: false,
        replacedBy: activeSession.deviceName || 'outro dispositivo'
      };
    }

    if (localToken && activeSession.sessionToken && activeSession.sessionToken !== localToken) {
      return {
        isValid: false,
        replacedBy: activeSession.deviceName || 'outra janela ou aba'
      };
    }

    return { isValid: true, replacedBy: null };
  } catch {
    return { isValid: true, replacedBy: null };
  }
};

export const getAuthUser = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveAuthUser = (user) => {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      return null;
    }
    localStorage.removeItem(STORAGE_KEYS.PAUSED_USER);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
};

export const clearAuthUser = async (releaseDeviceLock = true, replacedBy = null) => {
  try {
    const existingUser = getAuthUser();
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_DEVICE_SESSION);
    localStorage.removeItem(STORAGE_KEYS.DEVICE_SESSION_TOKEN);

    if (!releaseDeviceLock && existingUser) {
      // Quando desconectado por outro aparelho, guarda os dados do usuário e mantém o token do Supabase
      // para que o botão de "Voltar a entrar neste dispositivo com 1 clique" funcione imediatamente!
      savePausedDeviceUser(existingUser, replacedBy || 'outro dispositivo');
      return;
    }

    clearPausedDeviceUser();

    if (isSupabaseConfigured && supabase) {
      if (releaseDeviceLock) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;
          if (userId) {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('stats')
              .eq('id', userId)
              .maybeSingle();

            if (profileRow?.stats?.activeDeviceSession?.deviceId === getDeviceId()) {
              const updatedStats = {
                ...profileRow.stats,
                activeDeviceSession: null
              };
              localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updatedStats));
              await supabase
                .from('profiles')
                .update({ stats: updatedStats, updated_at: new Date().toISOString() })
                .eq('id', userId);
            }
          }
        } catch {
          // Ignora falha ao liberar trava
        }
        await supabase.auth.signOut();
      }
    }
  } catch (e) {
    console.error(e);
  }
};

export const syncUserDataToSupabase = async (overrides = {}) => {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    // Busca o stats atual no Supabase para NUNCA corromper nem sobrescrever activeDeviceSession do servidor
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('stats')
      .eq('id', userId)
      .maybeSingle();

    const serverActiveSession =
      profileRow?.stats && typeof profileRow.stats === 'object'
        ? profileRow.stats.activeDeviceSession
        : null;

    const currentProfile = overrides.profile || getProfile();
    const currentFavorites = overrides.favorites || getFavorites();
    const currentStudied = overrides.studied || getStudied();
    const rawStats = overrides.stats || getStats();

    // Mantém estritamente a sessão de dispositivo que está gravada no servidor
    const currentStats = {
      ...rawStats,
      activeDeviceSession: serverActiveSession
    };
    const currentCustom = overrides.customSeries || getCustomSeries();

    await supabase.from('profiles').upsert({
      id: userId,
      email: currentProfile.email || session.user.email,
      name: currentProfile.name || 'Estudante de Música',
      instrument: currentProfile.instrument || 'Voz / Solfejo',
      avatar: currentProfile.avatar || '🎵',
      photo_url: currentProfile.photoUrl || null,
      daily_goal_minutes: currentProfile.dailyGoalMinutes || 15,
      streak_days: currentProfile.streakDays || 1,
      last_practice_date: currentProfile.lastPracticeDate || new Date().toISOString().split('T')[0],
      favorites: currentFavorites,
      studied: currentStudied,
      custom_series: currentCustom,
      stats: currentStats,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    // Ativa status inicial 'primeiro-acesso' -> 'ativo' quando aplicável (sem criar/alterar plano pelo cliente)
    const { data: existingUserPlano } = await supabase
      .from('users_plano')
      .select('id, status, data_inicio')
      .eq('id', userId)
      .maybeSingle();

    if (existingUserPlano?.status === 'primeiro-acesso') {
      await supabase
        .from('users_plano')
        .update({
          status: 'ativo',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }
  } catch (err) {
    console.warn('Falha ao sincronizar com o Supabase:', err);
  }
};

export const loadUserDataFromSupabase = async (userId) => {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const [{ data, error }, { data: userPlano }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('users_plano')
        .select('status, data_inicio, data_final, plano_id, planos(nome, titulo)')
        .eq('id', userId)
        .maybeSingle()
    ]);

    if (error || !data) return null;

    const resolvedPlan = userPlano?.planos?.nome || data.plan || 'vitalicio';

    const mergedProfile = {
      ...getProfile(),
      name: data.name || 'Estudante de Música',
      email: data.email || '',
      instrument: data.instrument || 'Voz / Solfejo',
      avatar: data.avatar || '🎵',
      photoUrl: data.photo_url || null,
      plan: resolvedPlan,
      planStatus: userPlano?.status || 'ativo',
      planStartDate: userPlano?.data_inicio || null,
      planEndDate: userPlano?.data_final || null,
      dailyGoalMinutes: data.daily_goal_minutes ?? 15,
      streakDays: data.streak_days ?? 1,
      lastPracticeDate: data.last_practice_date || new Date().toISOString().split('T')[0]
    };

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(mergedProfile));

    if (Array.isArray(data.favorites)) {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(data.favorites));
    }
    if (Array.isArray(data.studied)) {
      localStorage.setItem(STORAGE_KEYS.STUDIED, JSON.stringify(data.studied));
    }
    if (data.stats && typeof data.stats === 'object') {
      const mergedStats = {
        ...data.stats,
        activeDeviceSession: data.stats.activeDeviceSession || null
      };
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(mergedStats));
    }
    if (Array.isArray(data.custom_series)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_SERIES, JSON.stringify(data.custom_series));
    }

    return {
      profile: mergedProfile,
      favorites: Array.isArray(data.favorites) ? data.favorites : getFavorites(),
      studied: Array.isArray(data.studied) ? data.studied : getStudied(),
      stats: data.stats || getStats(),
      customSeries: Array.isArray(data.custom_series) ? data.custom_series : getCustomSeries()
    };
  } catch (err) {
    console.warn('Falha ao carregar dados do Supabase:', err);
    return null;
  }
};

export const getFavorites = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const isItemFavorite = (favList = [], item) => {
  if (!item) return false;
  const id = typeof item === 'string' ? item : item.id;
  const seriesId = typeof item === 'object' ? item.seriesId : null;
  return favList.includes(id) || (seriesId ? favList.includes(seriesId) : false);
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
  syncUserDataToSupabase({ favorites });
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

export const isItemStudied = (studiedList = [], item) => {
  if (!item) return false;
  const id = typeof item === 'string' ? item : item.id;
  const seriesId = typeof item === 'object' ? item.seriesId : null;
  return studiedList.includes(id) || (seriesId ? studiedList.includes(seriesId) : false);
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
  syncUserDataToSupabase({ studied });
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
  syncUserDataToSupabase({ profile: profileData });
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
  syncUserDataToSupabase({ stats });
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
  syncUserDataToSupabase({ customSeries: list });
  return list;
};
