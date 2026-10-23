#!/usr/bin/env python3
"""Write the Shoutr mark over the vendor logo files.

The transparent waveform is the in-app and tray mark. The embossed
rounded square is the window icon. Both come from img/ in the project.
"""

import argparse
import base64
import io
from pathlib import Path

from PIL import Image

LANCZOS = getattr(getattr(Image, 'Resampling', Image), 'LANCZOS')


def cropped(path):
    image = Image.open(path).convert('RGBA')
    box = image.getbbox()
    if box:
        image = image.crop(box)
    return image


def padded(image, size, margin=0.08):
    inner = int(size * (1 - margin * 2))
    fitted = image.resize((inner, inner), LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    offset = (size - inner) // 2
    canvas.paste(fitted, (offset, offset), fitted)
    return canvas


def png_bytes(image):
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


def waveform_svg(png):
    encoded = base64.b64encode(png).decode('ascii')
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Shoutr">'
        f'<image href="data:image/png;base64,{encoded}" width="128" height="128"/>'
        '</svg>\n'
    )


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data if isinstance(data, bytes) else data.encode('utf-8'))


def replace_renderer_svgs(renderer, svg):
    wordmarks = 0
    symbols = 0
    for path in renderer.rglob('*.svg'):
        text = path.read_text(errors='replace')
        if '0 0 1986 328' in text[:500] or 'viewBox="26 0 45 20"' in text[:200]:
            write(path, svg)
            wordmarks += 1
        elif 'M48.1303 41.598' in text or 'viewBox="0 0 15 14"' in text[:200]:
            write(path, svg)
            symbols += 1
    if wordmarks < 1 or symbols < 1:
        raise SystemExit(f'shoutr marks: expected the wordmark and the symbol, found {wordmarks} and {symbols}')


def replace_resource_logos(resources, svg, embossed_png, tray_png):
    logos = resources / 'assets' / 'logos'
    names = [
        'flow-symbol.svg',
        'flow-name.svg',
        'flow-compact.svg',
        'flow-new.svg',
        'wispr.svg',
        'wispr-flow.svg',
        'wispr-flow-wordmark.svg',
    ]
    for name in names:
        path = logos / name
        if path.exists():
            write(path, svg)
    write(logos / 'wispr-logo.png', embossed_png)
    icons = resources / 'assets' / 'icons'
    write(icons / 'shoutr.png', embossed_png)
    write(icons / 'wispr-logo.png', embossed_png)
    tray = resources / 'assets' / 'tray'
    write(tray / 'TrayIconWindows.png', tray_png)
    write(tray / 'TrayIconMac@2x.png', tray_png)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--transparent', required=True)
    parser.add_argument('--embossed', required=True)
    parser.add_argument('--renderer')
    parser.add_argument('--resources')
    args = parser.parse_args()

    mark = padded(cropped(args.transparent), 128)
    mark_png = png_bytes(mark)
    svg = waveform_svg(mark_png)
    embossed = Image.open(args.embossed).convert('RGBA').resize((256, 256), LANCZOS)
    embossed_png = png_bytes(embossed)
    tray = padded(cropped(args.transparent), 64)
    tray_png = png_bytes(tray)

    if args.renderer:
        replace_renderer_svgs(Path(args.renderer), svg)
    if args.resources:
        replace_resource_logos(Path(args.resources), svg, embossed_png, tray_png)
    # One line, so the repack step can embed this in the inline icon component.
    print(base64.b64encode(png_bytes(padded(cropped(args.transparent), 64))).decode('ascii'))


if __name__ == '__main__':
    main()
