#!/usr/bin/env python3
"""把官网文档的网页字体裁剪成站点实际用到的字形。

用法：
    python3 scripts/subset-fonts.py scan     # 扫描构建产物，更新字符清单
    python3 scripts/subset-fonts.py build    # 按字符清单生成字体与 @font-face
    python3 scripts/subset-fonts.py          # 先 scan 再 build

前置：
    pip install fonttools brotli
    vp-docs/.vitepress/dist 已是最新构建（pnpm exec vitepress build vp-docs）

什么时候需要重新运行：
    - 文档正文新增了字体里还没有的汉字或符号（build 会列出来）
    - 新增页面、侧栏、导航文案
    - 升级了源字体版本
    - 改了 base（CSS 里的字体路径带 base）

产物（都要提交）：
    fonts/charset.json                     扫描出的字符清单
    vp-docs/public/fonts/*.woff2           裁剪后的字体（core + ext）
    vp-docs/.vitepress/theme/fonts.css     生成的 @font-face
"""

import json
import re
import subprocess
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "vp-docs/.vitepress/dist"
PUBLIC_FONTS = ROOT / "vp-docs/public/fonts"
CHARSET_FILE = ROOT / "fonts/charset.json"
CSS_FILE = ROOT / "vp-docs/.vitepress/theme/fonts.css"

# 站点挂在 /docs/ 下；改 base 时这里和 vp-docs/.vitepress/config.ts 一起改
BASE = "/docs/"

# 源字体（版本与裁剪时一致，换版本会改变字形轮廓，必须重新测像素）
# 下载地址 + sha256；缺文件时脚本自动下载到 fonts/src/
SOURCE_FILES = {
    "wenkai-regular": (
        "https://raw.githubusercontent.com/lxgw/LxgwWenKai/v1.250/fonts/TTF/LXGWWenKai-Regular.ttf",
        "67bf3eba16f89862dc8f7e7b7c8ccf8d6477a479af1b72d0cf8b4fcb27336910",
    ),
    "wenkai-bold": (
        "https://raw.githubusercontent.com/lxgw/LxgwWenKai/v1.250/fonts/TTF/LXGWWenKai-Bold.ttf",
        "19578bd6975cd7183066aaebe86da21c95928d4c9786ae6974f237a660dca62d",
    ),
    # JetBrains Mono 400：取自 @fontsource/jetbrains-mono 的 latin 子集，字形与线上代码块一致
    "mono-regular": (
        "node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
        "14425ba9c695763c1547f48a206b7aa60350a33ae23de09f0407877f3fcd89eb",
    ),
}
SOURCES = {key: ROOT / "fonts/src" / url.rsplit("/", 1)[-1] for key, (url, _) in SOURCE_FILES.items()}

# 字体族对外名称。OFL 1.1 带保留字体名的字体裁剪后必须改名
FAMILIES = {
    "wenkai-regular": ("WeMD WenKai", "Regular", 400, "WenKai"),
    "wenkai-bold": ("WeMD WenKai", "Bold", 700, "WenKai"),
    "mono-regular": ("WeMD Mono", "Regular", 400, "Mono"),
}

# 浏览器默认开启、且这个字体里确实存在的特性才保留；其余（frac/subs/sups/dlig/salt/afrc/vert）只靠 font-feature-settings 触发，站点没用到
KEEP_FEATURES = ["calt", "ccmp", "liga", "locl", "mark", "mkmk", "rlig"]

# 未用到的表直接丢掉：垂直排版与 FontForge 时间戳
DROP_TABLES = ["vhea", "vmtx", "FFTM", "DSIG"]

# core 里固定包含的常用标点：弯引号、破折号、省略号
CORE_PUNCTUATION = "‘’“”–—…"

RANGE_EXTRA = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + list(range(0x100, 0x180))


def strip_tags(html: str) -> tuple[str, str]:
    """返回 (正文文字, 代码块文字)。整段删除 script/style，避免把样式内容算成语料。"""
    html = re.sub(r"<(script|style)\b.*?</\1>", " ", html, flags=re.S | re.I)
    code = " ".join(
        re.sub(r"<[^>]+>", "", m) for m in re.findall(r"<(?:pre|code)\b[^>]*>(.*?)</(?:pre|code)>", html, flags=re.S | re.I)
    )
    rest = re.sub(r"<(?:pre|code)\b[^>]*>.*?</(?:pre|code)>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", rest)
    unescape = lambda s: s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", "\u00a0").replace("&amp;", "&")
    return unescape(text), unescape(code)


def scan() -> dict:
    if not DIST.exists():
        sys.exit(f"找不到构建产物 {DIST}，先运行 pnpm exec vitepress build vp-docs")

    text_chars: set[str] = set()
    code_chars: set[str] = set()
    for page in sorted(DIST.rglob("*.html")):
        text, code = strip_tags(page.read_text(encoding="utf-8"))
        text_chars.update(text)
        code_chars.update(code)

    # 主题 JS 里的界面文案（菜单、搜索框、复制提示等）不在 HTML 里，按源码字符串收一份超集
    for asset in DIST.rglob("*.js"):
        text_chars.update(asset.read_bytes().decode("utf-8", "ignore"))
    for asset in DIST.rglob("*.css"):
        text_chars.update(asset.read_text(encoding="utf-8", errors="ignore"))

    charset = {
        "text": "".join(sorted(text_chars)),
        "code": "".join(sorted(code_chars)),
    }
    CHARSET_FILE.parent.mkdir(parents=True, exist_ok=True)
    CHARSET_FILE.write_text(json.dumps(charset, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"扫描完成：正文 {len(charset['text'])} 个字符，代码块 {len(charset['code'])} 个字符 → {CHARSET_FILE.relative_to(ROOT)}")
    return charset


def wanted_chars(chars: str) -> set[str]:
    """站点用到的字符 + ASCII + Latin-1 + Latin Extended-A。"""
    return set(chars) | {chr(c) for c in RANGE_EXTRA}


def split_core(chars: set[str]) -> tuple[set[str], set[str]]:
    core = {chr(c) for c in range(0x20, 0x7F)} | set(CORE_PUNCTUATION)
    return core & chars, chars - core


def rename(font: TTFont, family: str, style: str, slug: str) -> None:
    """OFL 保留字体名不能出现在裁剪后的字体里，同时改掉 PostScript 名。"""
    names = {
        1: family,
        2: style,
        3: f"{family} {style}; subset",
        4: f"{family} {style}",
        6: f"{family.replace(' ', '')}-{style}",
        16: family,
        17: style,
    }
    name_table = font["name"]
    for record in list(name_table.names):
        if record.nameID in names:
            name_table.setName(names[record.nameID], record.nameID, record.platformID, record.platEncID, record.langID)
    for record in list(name_table.names):
        if record.nameID in (1, 3, 4, 6, 16, 17):
            continue
        old = record.toUnicode()
        cleaned = old.replace("LXGW", "WeMD").replace("霞鹜", "WeMD").replace("霞鶩", "WeMD")
        if cleaned != old:
            name_table.setName(cleaned, record.nameID, record.platformID, record.platEncID, record.langID)


def unicode_range(font: TTFont) -> str:
    """把 cmap 压成 unicode-range 写法，只列文件里真的有的字符。"""
    cps = sorted(font.getBestCmap())
    ranges: list[tuple[int, int]] = []
    for cp in cps:
        if ranges and cp == ranges[-1][1] + 1:
            ranges[-1] = (ranges[-1][0], cp)
        else:
            ranges.append((cp, cp))
    fmt = lambda cp: f"U+{cp:X}"
    return ", ".join(fmt(a) if a == b else f"{fmt(a)}-{fmt(b)}" for a, b in ranges)


def ensure_source(key: str) -> Path:
    """缺源文件时下载并校验 sha256；本地 npm 里的文件复制过去。"""
    import hashlib
    import shutil
    import urllib.request

    src = SOURCES[key]
    url, digest = SOURCE_FILES[key]
    if src.exists():
        return src
    src.parent.mkdir(parents=True, exist_ok=True)
    if not url.startswith("http"):
        shutil.copyfile(ROOT / url, src)
    else:
        print(f"下载 {url}")
        urllib.request.urlretrieve(url, src)
    actual = hashlib.sha256(src.read_bytes()).hexdigest()
    if digest and actual != digest:
        src.unlink()
        sys.exit(f"{src.name} 校验失败：期望 {digest}，实际 {actual}。源字体版本变了，需要重新做像素对比")
    return src


def build_font(key: str, chars: set[str], part: str) -> tuple[str, str] | None:
    src = ensure_source(key)
    family, style, weight, slug = FAMILIES[key]

    font = TTFont(src)
    cmap = set(font.getBestCmap())
    available = {c for c in chars if ord(c) in cmap}
    missing = sorted(c for c in chars if ord(c) not in cmap)
    if not available:
        print(f"{key} {part}: 没有可用字符，跳过")
        return None

    out = PUBLIC_FONTS / f"wemd-{slug.lower()}-{weight}-{part}.woff2"
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = KEEP_FEATURES
    options.drop_tables += DROP_TABLES
    options.hinting = False
    options.desubroutinize = False
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.notdef_outline = True
    options.recalc_bounds = True

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=[ord(c) for c in available])
    subsetter.subset(font)
    rename(font, family, style, slug)
    PUBLIC_FONTS.mkdir(parents=True, exist_ok=True)
    # 只有设了 flavor 才会走 WOFF2 的 glyf 变换；否则存出来的是未压缩的 TTF
    font.flavor = "woff2"
    font.save(out)
    font.close()

    # 重新打开交付文件核对：字符集、名称、表
    check = TTFont(out)
    actual = set(check.getBestCmap())
    assert actual == {ord(c) for c in available}, f"{out.name} 字符集与预期不一致"
    for stale in ("LXGW", "霞鹜", "霞鶩"):
        assert not any(stale in (r.toUnicode() or "") for r in check["name"].names), f"{out.name} 仍含保留名称 {stale}"
    size = out.stat().st_size
    print(f"{out.name}: {len(actual)} 字形, {size / 1024:.1f} KB" + (f", 源字体缺少 {len(missing)} 个字符" if missing else ""))
    return out.name, unicode_range(check)


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    charset = scan() if mode in ("all", "scan") else json.loads(CHARSET_FILE.read_text(encoding="utf-8"))
    if mode == "scan":
        return

    text_chars = wanted_chars(charset["text"])
    code_chars = wanted_chars(charset["code"])

    blocks: list[str] = [
        "/* 由 scripts/subset-fonts.py 生成，不要手改。改字体内容后重新运行脚本。 */",
        "",
    ]
    for key, chars in (
        ("wenkai-regular", text_chars),
        ("wenkai-bold", text_chars),
        ("mono-regular", code_chars),
    ):
        core, ext = split_core(chars)
        for part, subset_chars in (("core", core), ("ext", ext)):
            built = build_font(key, subset_chars, part)
            if not built:
                continue
            filename, ranges = built
            family, _, weight, _ = FAMILIES[key]
            blocks.append(
                "@font-face {\n"
                f"    font-family: '{family}';\n"
                "    font-style: normal;\n"
                f"    font-weight: {weight};\n"
                "    font-display: swap;\n"
                f"    src: url('{BASE}fonts/{filename}') format('woff2');\n"
                f"    unicode-range: {ranges};\n"
                "}\n"
            )
    CSS_FILE.write_text("\n".join(blocks), encoding="utf-8")
    print(f"@font-face 已写入 {CSS_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
