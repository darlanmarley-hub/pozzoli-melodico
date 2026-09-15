import JSZip from 'jszip';

const scoreXmlCache = new Map();

/**
 * Extrai o conteúdo em texto puro do MusicXML a partir de uma URL ou caminho de arquivo.
 * Suporta arquivos .xml, .musicxml e arquivos compactados .mxl (Zip).
 * 
 * @param {string} url - URL ou caminho do arquivo da partitura
 * @returns {Promise<string>} Promessa com a string contendo o MusicXML em texto
 */
export async function extractMusicXml(url) {
  if (!url) {
    url = '/partituras/1-serie.xml';
  }

  // Tentar URL direta trocando extensão .mxl para .xml primeiro (fallback rápido)
  const directXmlUrl = url.replace(/\.mxl$/i, '.xml');

  if (scoreXmlCache.has(directXmlUrl)) {
    return scoreXmlCache.get(directXmlUrl);
  }

  if (scoreXmlCache.has(url)) {
    return scoreXmlCache.get(url);
  }

  try {
    const res = await fetch(directXmlUrl);
    if (res.ok) {
      const xmlText = await res.text();
      // Validar se o conteúdo obtido realmente parece ser XML
      if (xmlText.trim().startsWith('<') || xmlText.includes('<?xml')) {
        scoreXmlCache.set(directXmlUrl, xmlText);
        return xmlText;
      }
    }
  } catch (e) {
    console.warn('Tentativa de busca direta .xml falhou, prosseguindo com extração completa...', e);
  }

  // Buscar arquivo de origem (pode ser binário .mxl ou .xml)
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao baixar a partitura (HTTP ${response.status}): ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const uint8 = new Uint8Array(buffer, 0, 4);
  let xmlContent = '';

  // Verificar assinatura mágica do ZIP: 0x50 0x4B (PK)
  if (uint8[0] === 0x50 && uint8[1] === 0x4b) {
    const zip = await JSZip.loadAsync(buffer);
    let rootPath = null;

    // Verificar se existe META-INF/container.xml para localizar o arquivo XML principal
    if (zip.files['META-INF/container.xml']) {
      const containerText = await zip.files['META-INF/container.xml'].async('text');
      const match = containerText.match(/full-path="([^"]+)"/i);
      if (match && match[1]) {
        rootPath = match[1];
      }
    }

    // Se não encontrou no container.xml, procurar por qualquer arquivo .xml no pacote
    if (!rootPath || !zip.files[rootPath]) {
      const xmlFileKey = Object.keys(zip.files).find(
        (f) => f.toLowerCase().endsWith('.xml') && !f.startsWith('META-INF/')
      );
      rootPath = xmlFileKey || 'score.xml';
    }

    const targetFile = zip.files[rootPath];
    if (!targetFile) {
      throw new Error('Nenhum arquivo MusicXML (.xml) válido foi encontrado dentro do pacote .mxl.');
    }

    xmlContent = await targetFile.async('text');
  } else {
    // Decodificar como texto UTF-8 direto
    const decoder = new TextDecoder('utf-8');
    xmlContent = decoder.decode(buffer);
  }

  if (!xmlContent || !xmlContent.trim()) {
    throw new Error('O conteúdo da partitura extraído está vazio.');
  }

  scoreXmlCache.set(url, xmlContent);
  return xmlContent;
}

/**
 * Limpa o cache de partituras em memória.
 */
export function clearScoreCache() {
  scoreXmlCache.clear();
}
