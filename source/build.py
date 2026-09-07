"""Build the completely self-contained game using only the Python standard library."""
from pathlib import Path
import argparse


def build(output: Path) -> None:
    root = Path(__file__).resolve().parent
    preamble = '\n'.join((root / name).read_text(encoding='utf-8')
                         for name in ['support.js', 'engine.js'])
    game = '\n'.join((root / name).read_text(encoding='utf-8')
                     for name in ['systems.js', 'world.js', 'game.js', 'render.js', 'mobile.js', 'ui.js'])
    script = preamble + '\nif(Engine){\n' + game + '\n}\n'
    (root / 'combined.js').write_text(script, encoding='utf-8')
    shell = (root / 'shell.html').read_text(encoding='utf-8')
    shell = shell.replace('<!--MOBILE_STYLES-->', '<style>\n' + (root / 'mobile.css').read_text(encoding='utf-8') + '\n</style>')
    if shell.count('<!--SCRIPTS-->') != 1:
        raise ValueError('The HTML shell must contain exactly one script marker.')
    html = shell.replace('<!--SCRIPTS-->', '<script>\n' + script.replace('</script', '<\\/script') + '\n</script>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding='utf-8')
    print(f'Built {output}: {len(html.encode("utf-8")):,} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent.parent / 'bramblebound.html')
    args = parser.parse_args()
    try:
        build(args.output.resolve())
    except (OSError, ValueError) as error:
        parser.exit(1, f'Build failed: {error}\n')
