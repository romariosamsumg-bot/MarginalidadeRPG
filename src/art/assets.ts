/**
 * Arte pintada gerada com Higgsfield (GPT Image 2.6) para este projeto — ver docs/ARTE_GERADA.md.
 * Tudo é local (empacotado pelo Vite); se algo falhar ao carregar, o jogo usa a arte procedural.
 */
import retratoMagrao from '../assets/art/retrato_magrao.jpg';
import retratoLia from '../assets/art/retrato_lia.jpg';
import retratoSolange from '../assets/art/retrato_solange.jpg';
import retratoMiro from '../assets/art/retrato_miro.jpg';
import retratoNando from '../assets/art/retrato_nando.jpg';
import retratoZe from '../assets/art/retrato_ze.jpg';
import retratoPlayer0 from '../assets/art/retrato_player0.jpg';
import retratoPlayer1 from '../assets/art/retrato_player1.jpg';
import retratoPlayer2 from '../assets/art/retrato_player2.jpg';
import panoramaNoite from '../assets/art/panorama_noite.jpg';
import panoramaEntardecer from '../assets/art/panorama_entardecer.jpg';
import cardVila from '../assets/art/card_vila.jpg';
import cardEncomenda from '../assets/art/card_encomenda.jpg';
import cardOficina from '../assets/art/card_oficina.jpg';

export const PORTRAIT_ART: Record<string, string> = {
  magrao: retratoMagrao, lia: retratoLia, solange: retratoSolange, miro: retratoMiro, nando: retratoNando, ze: retratoZe,
  player0: retratoPlayer0, player1: retratoPlayer1, player2: retratoPlayer2
};

/** Panorama do morro: 2150×560 px, camada de fundo (parallax 0,15). */
export const PANORAMA = { noite: panoramaNoite, entardecer: panoramaEntardecer, width: 2150, height: 560, tower: { x: 1429, y: 29 } };

export const CARD_ART: Record<string, string> = { vila: cardVila, encomenda: cardEncomenda, oficina_fechada: cardOficina };
