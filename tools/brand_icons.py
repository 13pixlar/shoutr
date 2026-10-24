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


def sidebar_icon_png(transparent_path):
    """Orange mark in the hub header icon slot (left of the Pro pill)."""
    mark = cropped(transparent_path)
    height = 48
    width = max(1, int(mark.width * height / mark.height))
    fitted = mark.resize((width, height), LANCZOS)
    canvas = Image.new('RGBA', (max(width, 42), height), (0, 0, 0, 0))
    canvas.paste(fitted, (0, 0), fitted)
    return png_bytes(canvas)


def sidebar_icon_svg(png):
    encoded = base64.b64encode(png).decode('ascii')
    return (
        '<svg width="21" height="20" viewBox="0 0 21 20" fill="none" '
        'xmlns="http://www.w3.org/2000/svg">'
        f'<image href="data:image/png;base64,{encoded}" width="21" height="20" '
        'preserveAspectRatio="xMinYMid meet" role="img" aria-label="Shoutr"/>'
        '</svg>\n'
    )


EMPTY_SIDEBAR_ICON = (
    '<svg width="21" height="20" viewBox="0 0 21 20" fill="none" '
    'xmlns="http://www.w3.org/2000/svg"></svg>\n'
)


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data if isinstance(data, bytes) else data.encode('utf-8'))


# Hub sidebar header: Nhe is the small gray bars; jv is the "Flow" wordmark beside Pro.
SIDEBAR_FLOW_ICON = '195938afa229e6d82a5a.svg'
SIDEBAR_FLOW_WORDMARK = '0e6b9400359d8a3d4054.svg'


def replace_renderer_svgs(renderer, svg, icon_svg):
    wordmarks = 0
    symbols = 0
    sidebar_icon = 0
    sidebar_wordmark = 0
    for path in renderer.rglob('*.svg'):
        if path.name == SIDEBAR_FLOW_ICON:
            write(path, icon_svg)
            sidebar_icon += 1
            continue
        if path.name == SIDEBAR_FLOW_WORDMARK:
            write(path, EMPTY_SIDEBAR_ICON)
            sidebar_wordmark += 1
            continue
        text = path.read_text(errors='replace')
        if '0 0 1986 328' in text[:500]:
            write(path, svg)
            wordmarks += 1
        elif 'M48.1303 41.598' in text or 'viewBox="0 0 15 14"' in text[:200]:
            write(path, svg)
            symbols += 1
    if sidebar_icon != 1 or sidebar_wordmark != 1:
        raise SystemExit(
            f'shoutr marks: expected sidebar icon and wordmark slots, found {sidebar_icon} and {sidebar_wordmark}',
        )
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
    icon_svg = sidebar_icon_svg(sidebar_icon_png(args.transparent))
    embossed = Image.open(args.embossed).convert('RGBA').resize((256, 256), LANCZOS)
    embossed_png = png_bytes(embossed)
    tray = padded(cropped(args.transparent), 64)
    tray_png = png_bytes(tray)

    if args.renderer:
        replace_renderer_svgs(Path(args.renderer), svg, icon_svg)
    if args.resources:
        replace_resource_logos(Path(args.resources), svg, embossed_png, tray_png)
    # One line, so the repack step can embed this in the inline icon component.
    print(base64.b64encode(png_bytes(padded(cropped(args.transparent), 64))).decode('ascii'))


if __name__ == '__main__':
    main()
