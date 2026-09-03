"""Build fonts/AntroposHebrew.otf.

Merges AntroposFreefont-BW2G.ttf (Latin) into the Hebrew-only source face and
applies the per-glyph adjustments below. Output stays OTF/CFF so the existing
@font-face (format('opentype')) keeps working.

Reads AntroposHebrew-source.otf, NOT AntroposHebrew.otf -- the latter is this
script's own output, and building from it would apply every adjustment twice.

    pip install fonttools
    python fonts/build-antropos-hebrew.py fonts/AntroposHebrew.otf

The 56 mockup pages carry the font inlined as base64 (see mockup/build.mjs);
replacing this file alone does not change them.
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen, DecomposingRecordingPen
from fontTools.misc.transform import Transform
from fontTools.feaLib.builder import addOpenTypeFeatures
from io import StringIO

# ---- tunables -------------------------------------------------------------
YOD_SCALE      = 1.20   # י 20% larger
WIDEN          = 1.10   # א, ד 10% wider
TAV_LSB_CUT    = 26     # units shaved off ת's left sidebearing (= RTL gap after ת)
TAV_YOD_KERN   = -40    # extra tightening for the ת+י pair
# ---------------------------------------------------------------------------

SRC = "/Users/orenknaan/Downloads/waldorf.co.il/fonts/"
heb = TTFont(SRC + "AntroposHebrew-source.otf")
lat = TTFont(SRC + "AntroposFreefont-BW2G.ttf")
out_path = sys.argv[1]

heb_gs, lat_gs = heb.getGlyphSet(), lat.getGlyphSet()
heb_cmap, lat_cmap = heb.getBestCmap(), lat.getBestCmap()
heb_hmtx, lat_hmtx = heb["hmtx"], lat["hmtx"]

HEBREW = range(0x0590, 0x0600)
KEEP_FROM_HEBREW = {0x20AA}          # ₪ — Latin font has no shekel
KEEP_FROM_HEBREW |= {0x0020}         # keep the Hebrew word space (320 vs 314)

def record(gs, name):
    rp = DecomposingRecordingPen(gs); gs[name].draw(rp); return rp

# ---- assemble the glyph roster -------------------------------------------
# Hebrew letters + shekel + space from the OTF; everything else from the TTF.
glyphs = {}   # final name -> (RecordingPen, advance width)
cmap = {}

for cp, gname in sorted(heb_cmap.items()):
    if cp in HEBREW or cp in KEEP_FROM_HEBREW:
        glyphs[gname] = (record(heb_gs, gname), heb_hmtx[gname][0])
        cmap[cp] = gname

latin_added = 0
for cp, gname in sorted(lat_cmap.items()):
    if cp in HEBREW or cp in KEEP_FROM_HEBREW:
        continue
    if gname not in glyphs:
        glyphs[gname] = (record(lat_gs, gname), lat_hmtx[gname][0])
        latin_added += 1
    cmap[cp] = gname

# .notdef from the Hebrew font
glyphs[".notdef"] = (record(heb_gs, ".notdef"), heb_hmtx[".notdef"][0])

# ---- drop the donor's undrawn glyphs -------------------------------------
# The Latin font declares ~20 codepoints (ss, mu, pm, ne, pi, radical, ...) in
# its cmap but never drew them: numContours=0 with a placeholder 358 advance.
# Mapping a codepoint to an empty glyph suppresses font fallback, so the
# character would render as nothing at all. Unmap them and let the next font
# in the CSS stack serve them instead. U+00A0 is a genuine blank and stays,
# at the Hebrew word-space width rather than the 358 placeholder.
SPACE = heb_cmap[0x0020]
space_adv = heb_hmtx[SPACE][0]
def is_blank(rp):
    bp = BoundsPen(None); rp.replay(bp); return bp.bounds is None
nbsp = lat_cmap.get(0x00A0)
dropped = []
for name in [n for n in glyphs if n not in (".notdef", SPACE)]:
    rp, adv = glyphs[name]
    if not is_blank(rp):
        continue
    if name == nbsp:
        glyphs[name] = (rp, space_adv)     # real space, correct width
        continue
    del glyphs[name]
    for cp in [c for c, g in cmap.items() if g == name]:
        del cmap[cp]
    dropped.append(name)

# ---- adjustments ----------------------------------------------------------
def bounds(rp):
    bp = BoundsPen(None); rp.replay(bp); return bp.bounds

def transform(gname, t, new_adv):
    rp_old, _ = glyphs[gname]
    rp_new = RecordingPen()
    rp_old.replay(TransformPen(rp_new, t))
    glyphs[gname] = (rp_new, new_adv)

def scale_glyph(gname, sx, sy, anchor):
    """anchor: (ax, ay) fixed point of the scale. Advance grows with the ink so
    the sidebearings are preserved."""
    rp, adv = glyphs[gname]
    x0, y0, x1, y1 = bounds(rp)
    ax, ay = anchor(x0, y0, x1, y1)
    t = (Transform().translate(ax, ay).scale(sx, sy).translate(-ax, -ay))
    grow = round((x1 - x0) * (sx - 1))
    transform(gname, t, adv + grow)
    return grow

# י — 20% larger, hung from the same top line so it stays aligned with the
# tops of the other letters and grows downward.
g_yod = heb_cmap[0x05D9]
grow_yod = scale_glyph(g_yod, YOD_SCALE, YOD_SCALE, lambda x0,y0,x1,y1: (x0, y1))

# א and ד — 10% wider, left edge fixed so the sidebearings stay put.
for cp in (0x05D0, 0x05D3):
    scale_glyph(heb_cmap[cp], WIDEN, 1.0, lambda x0,y0,x1,y1: (x0, 0))

# ת — tighter spacing on the side the text continues to (left, in RTL).
g_tav = heb_cmap[0x05EA]
rp, adv = glyphs[g_tav]
transform(g_tav, Transform().translate(-TAV_LSB_CUT, 0), adv - TAV_LSB_CUT)

# ---- draw everything into CFF charstrings ---------------------------------
# BasePen turns TrueType qCurveTo into cubics exactly; ReverseContourPen flips
# the TrueType contour direction to the PostScript convention.
order = [".notdef"] + [n for n in sorted(glyphs) if n != ".notdef"]
charstrings = {}
for name in order:
    rp, adv = glyphs[name]
    pen = T2CharStringPen(adv, None)
    rp.replay(ReverseContourPen(pen) if name in lat_gs and name not in heb_gs else pen)
    charstrings[name] = pen.getCharString()

metrics = {}
for name in order:
    rp, adv = glyphs[name]
    b = bounds(rp)
    metrics[name] = (adv, round(b[0]) if b else 0)

# ---- build the font -------------------------------------------------------
fb = FontBuilder(1000, isTTF=False)
fb.setupGlyphOrder(order)
fb.setupCharacterMap(cmap)
fb.setupCFF("AntroposHebrew-Regular",
            {"FullName": "Antropos Hebrew", "FamilyName": "Antropos Hebrew",
             "Weight": "Regular", "version": "2.000"},
            charstrings, {})
fb.setupHorizontalMetrics(metrics)

hhea = heb["hhea"]
fb.setupHorizontalHeader(ascent=hhea.ascent, descent=hhea.descent,
                         lineGap=hhea.lineGap)

n = heb["name"]
fb.setupNameTable({
    "familyName": "Antropos Hebrew",
    "styleName": "Regular",
    "uniqueFontIdentifier": "Antropos Hebrew Regular; 2.000",
    "fullName": "Antropos Hebrew",
    "psName": "AntroposHebrew-Regular",
    "version": "Version 2.000",
})

o = heb["OS/2"]
ymax = max((bounds(rp)[3] for rp, _ in glyphs.values() if bounds(rp)), default=1000)
ymin = min((bounds(rp)[1] for rp, _ in glyphs.values() if bounds(rp)), default=-440)
fb.setupOS2(
    sTypoAscender=o.sTypoAscender, sTypoDescender=o.sTypoDescender,
    sTypoLineGap=o.sTypoLineGap,
    usWinAscent=max(o.usWinAscent, int(ymax) + 10),
    usWinDescent=max(o.usWinDescent, abs(int(ymin)) + 10),
    sxHeight=o.sxHeight if hasattr(o, "sxHeight") else 700,
    sCapHeight=790, usWeightClass=400, usWidthClass=5,
    fsType=o.fsType, achVendID=o.achVendID, fsSelection=o.fsSelection,
)
fb.setupPost(italicAngle=0, underlinePosition=-100, underlineThickness=50)

# ---- kerning: the Latin font's 73 pairs, plus ת+י -------------------------
fea = ["languagesystem DFLT dflt;", "languagesystem latn dflt;",
       "languagesystem hebr dflt;", "feature kern {"]
kept = 0
for (l, r), v in sorted(lat["kern"].kernTables[0].kernTable.items()):
    if l in charstrings and r in charstrings:
        fea.append(f"  pos {l} {r} {v};"); kept += 1
fea.append(f"  pos {g_tav} {g_yod} {TAV_YOD_KERN};")
fea.append("} kern;")
addOpenTypeFeatures(fb.font, StringIO("\n".join(fea)))

fb.save(out_path)
print(f"glyphs: {len(order)} (Latin added: {latin_added})")
print(f"dropped {len(dropped)} undrawn donor glyphs: {', '.join(sorted(dropped))}")
print(f"yod advance grew by {grow_yod}; kern pairs: {kept} Latin + 1 Hebrew")
print(f"y extents {ymin:.0f}..{ymax:.0f}  usWin {max(o.usWinAscent,int(ymax)+10)}/{max(o.usWinDescent,abs(int(ymin))+10)}")
