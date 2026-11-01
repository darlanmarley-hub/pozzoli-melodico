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
        id: 'serie-1-versao-computador',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        seriesSubtitle: 'Exercícios em intervalos de segunda',
        title: 'SÉRIE COMPLETA',
        subtitle: 'Formato computador',
        description: 'Vídeo da 1ª Série em formato horizontal panorâmico gravado para telas de computador.',
        mxlUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.xml',
        midiUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid',
        audioUrl: '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mp3',
        videoUrl: 'https://www.dropbox.com/scl/fi/yx5razo8j6h0evevubpf5/desktop.mp4?rlkey=zrvdkbyotqwgswjtcowvd50sr&st=225dx2cj&dl=0',
        videoPcUrl: 'https://www.dropbox.com/scl/fi/yx5razo8j6h0evevubpf5/desktop.mp4?rlkey=zrvdkbyotqwgswjtcowvd50sr&st=225dx2cj&dl=0',
        isDesktopMode: true,
        embedUrl: 'https://www.soundslice.com/slices/2gm7c/embed/',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Iniciante',
        displayOrder: 0,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
      {
        id: 'serie-1-ex-1',
        seriesId: 'primeira-serie',
        seriesTitle: '1ª SÉRIE',
        seriesSubtitle: 'Exercícios em intervalos de segunda',
        title: 'Primeira Série - Exercício Número 1',
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
        id: 'serie-2-versao-computador',
        seriesId: 'segunda-serie',
        seriesTitle: '2ª SÉRIE',
        seriesSubtitle: 'Exercícios sobre intervalos de terça',
        title: 'SÉRIE COMPLETA',
        subtitle: 'Formato computador',
        description: 'Vídeo da 2ª Série em formato horizontal panorâmico gravado para telas de computador.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/p6enknypr9x52mmupgm0s/desktop.mp4?rlkey=ijoxmb6p9ehn8cp4dxvf2dfky&st=b5tsotut&dl=0',
        videoPcUrl: 'https://www.dropbox.com/scl/fi/p6enknypr9x52mmupgm0s/desktop.mp4?rlkey=ijoxmb6p9ehn8cp4dxvf2dfky&st=b5tsotut&dl=0',
        isDesktopMode: true,
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 0,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
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
        id: 'serie-3-versao-computador',
        seriesId: 'terceira-serie',
        seriesTitle: '3ª SÉRIE',
        seriesSubtitle: 'Exercício sobre os intervalos de segunda e terça alternados',
        title: 'SÉRIE COMPLETA',
        subtitle: 'Formato computador',
        description: 'Vídeo da 3ª Série em formato horizontal panorâmico gravado para telas de computador.',
        mxlUrl: '',
        midiUrl: '',
        audioUrl: '',
        videoUrl: 'https://www.dropbox.com/scl/fi/avfx8bwfirb7mg82cvkk0/Desktop.mp4?rlkey=l24yji324dhrarxk1e86z3cj6&st=36ev20yo&dl=0',
        videoPcUrl: 'https://www.dropbox.com/scl/fi/avfx8bwfirb7mg82cvkk0/Desktop.mp4?rlkey=l24yji324dhrarxk1e86z3cj6&st=36ev20yo&dl=0',
        isDesktopMode: true,
        embedUrl: '',
        timeSignature: '2/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 0,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      },
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
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 3,
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
        timeSignature: '3/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 4,
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
        timeSignature: '4/4',
        defaultBpm: 60,
        difficulty: 'Intermediário',
        displayOrder: 5,
        videoScale: 1.0,
        videoTranslateY: '0px',
        isAvailable: true,
        isBuiltin: true
      }
    ]
  }
];

export const INITIAL_SERIES = SERIES_FOLDERS.flatMap(folder => folder.exercises);

const STORAGE_KEYS = {
  FAVORITES: 'pozzoli_favorites',
  STUDIED: 'pozzoli_studied',
  PROFILE: 'pozzoli_profile',
  STATS: 'pozzoli_stats',
  CUSTOM_SERIES: 'pozzoli_custom_series',
  OFFLINE_CACHE: 'pozzoli_offline_ready',
  AUTH_USER: 'pozzoli_auth_user'
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
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
};

export const clearAuthUser = async () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
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

    const currentProfile = overrides.profile || getProfile();
    const currentFavorites = overrides.favorites || getFavorites();
    const currentStudied = overrides.studied || getStudied();
    const currentStats = overrides.stats || getStats();
    const currentCustom = overrides.customSeries || getCustomSeries();

    await supabase.from('profiles').upsert({
      id: userId,
      email: currentProfile.email || session.user.email,
      name: currentProfile.name || 'Estudante de Música',
      instrument: currentProfile.instrument || 'Voz / Solfejo',
      avatar: currentProfile.avatar || '🎵',
      photo_url: currentProfile.photoUrl || null,
      plan: currentProfile.plan || 'vitalicio',
      daily_goal_minutes: currentProfile.dailyGoalMinutes || 15,
      streak_days: currentProfile.streakDays || 1,
      last_practice_date: currentProfile.lastPracticeDate || new Date().toISOString().split('T')[0],
      favorites: currentFavorites,
      studied: currentStudied,
      custom_series: currentCustom,
      stats: currentStats,
      updated_at: new Date().toISOString()
    });

    // Sincroniza/ativa registro na tabela users_plano (anual ou vitalicio)
    const planName = currentProfile.plan === 'anual' ? 'anual' : 'vitalicio';
    const { data: planoRow } = await supabase
      .from('planos')
      .select('id')
      .eq('nome', planName)
      .maybeSingle();

    if (planoRow?.id) {
      const { data: existingUserPlano } = await supabase
        .from('users_plano')
        .select('id, status, data_inicio')
        .eq('id', userId)
        .maybeSingle();

      if (!existingUserPlano) {
        await supabase.from('users_plano').insert({
          id: userId,
          plano_id: planoRow.id,
          data_inicio: new Date().toISOString(),
          status: 'ativo'
        });
      } else if (existingUserPlano.status === 'primeiro-acesso') {
        await supabase
          .from('users_plano')
          .update({
            status: 'ativo',
            data_inicio: existingUserPlano.data_inicio || new Date().toISOString()
          })
          .eq('id', userId);
      }
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
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(data.stats));
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
