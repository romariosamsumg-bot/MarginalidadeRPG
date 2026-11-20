"""
Converte uma folha de sprites gerada (fundo transparente, 2 linhas: 8 quadros de caminhada
em cima; parado, parado-respirando, interagir, celular embaixo) no formato do jogo:
17 quadros de 160x264 px (80x132 unidades lógicas × 2), pés em y=256, corpo centralizado.

Uso: python3 -I scripts/sprites/process_sheet.py entrada.png saida.png [--preview prev.png]  (depois converta para .webp q88)
Ordem de saída (igual a src/art/characters.ts#FRAMES):
  0-3 parado (respiração) | 4-11 caminhada | 12-14 interação | 15-16 celular
"""
import sys
import numpy as np
from PIL import Image

FW, FH, FEET_Y = 160, 264, 256
TARGET_H = 236          # altura do personagem em px (≈118 unidades lógicas)


def bands(mask, axis, min_gap, min_size):
    """Divide a máscara em faixas separadas por vazios ao longo do eixo."""
    proj = mask.any(axis=axis)
    out, start, gap = [], None, 0
    for i, v in enumerate(proj):
        if v:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                out.append((start, i - gap + 1))
                start, gap = None, 0
    if start is not None:
        out.append((start, len(proj)))
    return [b for b in out if b[1] - b[0] >= min_size]


def frames_in_row(mask, y0, y1):
    sub = mask[y0:y1]
    cols = bands(sub, 0, min_gap=4, min_size=12)
    res = []
    for x0, x1 in cols:
        m = sub[:, x0:x1]
        ys = np.where(m.any(axis=1))[0]
        res.append((x0, y0 + ys[0], x1, y0 + ys[-1] + 1))
    return res


def main():
    src, dst = sys.argv[1], sys.argv[2]
    prev = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    im = Image.open(src).convert('RGBA')
    a = np.array(im)
    mask = a[:, :, 3] > 40
    rows = bands(mask, 1, min_gap=6, min_size=40)
    if len(rows) < 2:
        sys.exit(f'esperava 2 linhas, achei {len(rows)}: {rows}')
    rows = sorted(rows, key=lambda r: r[1] - r[0], reverse=True)[:2]
    rows.sort()
    walk = frames_in_row(mask, *rows[0])
    poses = frames_in_row(mask, *rows[1])
    # descarta fragmentos pequenos (sujeira, sombras soltas)
    def clean(fr):
        if not fr:
            return fr
        hmax = max(b[3] - b[1] for b in fr)
        return [b for b in fr if (b[3] - b[1]) > hmax * 0.6]
    walk, poses = clean(walk), clean(poses)
    print(f'linhas={rows} caminhada={len(walk)} poses={len(poses)}')
    if len(walk) < 6 or len(poses) < 3:
        sys.exit('folha fora do layout esperado')

    def render(b, scale):
        x0, y0, x1, y1 = b
        crop = im.crop((x0, y0, x1, y1))
        w, h = crop.size
        crop = crop.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        ca = np.array(crop)[:, :, 3] > 40
        # centro horizontal pela metade de cima (cabeça/tronco): corpo não "balança" ao andar
        upper = ca[: max(1, ca.shape[0] // 2)]
        xs = np.where(upper.any(axis=0))[0]
        cx = (xs[0] + xs[-1]) / 2 if len(xs) else crop.size[0] / 2
        frame = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        frame.alpha_composite(crop, (round(FW / 2 - cx), FEET_Y - crop.size[1]))
        return frame

    sw = TARGET_H / np.median([b[3] - b[1] for b in walk])
    sp = TARGET_H / np.median([b[3] - b[1] for b in poses])
    wf = [render(b, sw) for b in walk[:8]]
    while len(wf) < 8:
        wf.append(wf[len(wf) % max(1, len(walk))])
    pf = [render(b, sp) for b in poses[:4]]
    idle_a = pf[0]
    reach = pf[2] if len(pf) > 2 else pf[0]
    phone = pf[3] if len(pf) > 3 else pf[0]

    def breathe(frame, k):
        # Respiração: estica levemente a figura para cima, mantendo os pés no lugar.
        if k == 0:
            return frame
        h = round(FEET_Y * (1 + k))
        body = frame.crop((0, 0, FW, FEET_Y)).resize((FW, h), Image.LANCZOS)
        out = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        out.alpha_composite(body.crop((0, h - FEET_Y, FW, h)), (0, 0))
        out.alpha_composite(frame.crop((0, FEET_Y, FW, FH)), (0, FEET_Y))
        return out

    idle = [breathe(idle_a, k) for k in (0, 0.006, 0.012, 0.006)]
    order = idle + wf + [reach, reach, reach] + [phone, phone]
    sheet = Image.new('RGBA', (FW * len(order), FH), (0, 0, 0, 0))
    for i, f in enumerate(order):
        sheet.alpha_composite(f, (i * FW, 0))
    sheet.save(dst, optimize=True)
    print(f'ok: {dst} {sheet.size}')
    if prev:
        bg = Image.new('RGBA', sheet.size, (45, 74, 82, 255))
        bg.alpha_composite(sheet)
        bg.convert('RGB').save(prev, quality=85)


if __name__ == '__main__':
    main()
