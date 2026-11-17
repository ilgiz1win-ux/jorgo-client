"""Мультяшный стиль: каармандар жана реквизиттер (skia менен вектордук графика)."""
import math
import skia

BOLD = skia.Typeface.MakeFromFile("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
REG = skia.Typeface.MakeFromFile("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
_fonts = {}


def font(size, bold=True):
    k = (int(size), bold)
    if k not in _fonts:
        _fonts[k] = skia.Font(BOLD if bold else REG, int(size))
    return _fonts[k]


def C(h, a=255):
    h = h.lstrip("#")
    return skia.ColorSetARGB(int(a), int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def F(h, a=255, blur=0):
    p = skia.Paint(AntiAlias=True, Color=C(h, a))
    if blur:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    return p


def S(h, w, a=255):
    p = skia.Paint(AntiAlias=True, Color=C(h, a), Style=skia.Paint.kStroke_Style, StrokeWidth=w)
    p.setStrokeCap(skia.Paint.kRound_Cap)
    p.setStrokeJoin(skia.Paint.kRound_Join)
    return p


def R(x, y, w, h):
    return skia.Rect.MakeXYWH(x, y, w, h)


def rrect(c, x, y, w, h, r, p):
    c.drawRoundRect(R(x, y, w, h), r, r, p)


def oval(c, cx, cy, rx, ry, p):
    c.drawOval(R(cx - rx, cy - ry, 2 * rx, 2 * ry), p)


def poly(c, pts, p, close=True):
    path = skia.Path()
    path.moveTo(*pts[0])
    for q in pts[1:]:
        path.lineTo(*q)
    if close:
        path.close()
    c.drawPath(path, p)


def text(c, s, x, y, size, color="#ffffff", bold=True, align="center", a=255, outline=None, ow=0):
    f = font(size, bold)
    w = f.measureText(s)
    if align == "center":
        x -= w / 2
    elif align == "right":
        x -= w
    if outline:
        c.drawString(s, x, y, f, S(outline, ow, a))
    c.drawString(s, x, y, f, F(color, a))
    return w


def ease(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def back(t):  # пружиналуу чыгуу
    t = max(0.0, min(1.0, t))
    k = 1.70158
    return 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2


# ---------------- ПАЛИТРА ----------------
NAVY = "#0e1a33"
GRID = "#1a2b4d"
SKIN = "#f2c094"
SKIN_D = "#d99e6f"
HAIR = "#211a17"
HOOD = "#8b929e"
HOOD_D = "#6b7280"
HOOD_DD = "#565c68"
JEANS = "#2f3f5e"
OUT = "#141414"
YELLOW = "#ffd400"
MONEY = "#4caf50"
MONEY_D = "#2e7d32"


def background(c, W, H, t, dark=0.0, tint=None):
    c.clear(C(NAVY))
    gp = S(GRID, 2)
    off = (t * 6) % 60
    for x in range(0, W + 60, 60):
        c.drawLine(x, 0, x, H, gp)
    for y in range(-60, H + 60, 60):
        c.drawLine(0, y + off, W, y + off, gp)
    # виньетка
    sh = skia.GradientShader.MakeRadial(skia.Point(W / 2, H * 0.42), H * 0.75,
                                        [C("#000000", 0), C("#000000", int(150 + 90 * dark))])
    p = skia.Paint(AntiAlias=True)
    p.setShader(sh)
    c.drawRect(R(0, 0, W, H), p)
    if tint:
        c.drawRect(R(0, 0, W, H), F(tint[0], tint[1]))


def floor(c, W, y, color="#0d1830"):
    c.drawRect(R(0, y, W, 2000), F(color))
    c.drawLine(0, y, W, y, S("#23365f", 4))


# ---------------- БАШКЫ КААРМАН ----------------
ARMS = {
    "down": [(140, -370), (150, -272)],
    "hold": [(165, -385), (72, -345)],
    "up": [(190, -480), (150, -615)],
    "point": [(190, -445), (262, -525)],
    "give": [(195, -410), (285, -390)],
    "phone": [(160, -375), (62, -470)],
    "chin": [(160, -385), (38, -515)],
    "cross": [(150, -375), (-55, -362)],
    "wave": [(195, -480), (235, -610)],
    "knee": [(150, -360), (100, -250)],
    "hip": [(185, -380), (120, -300)],
}


def _arm(c, sx, sy, spec, side, color, w=54, hand=SKIN):
    if isinstance(spec, str):
        (ex, ey), (hx, hy) = ARMS[spec]
        ex, hx = ex * side, hx * side
    else:
        (ex, ey), (hx, hy) = spec
    path = skia.Path()
    path.moveTo(sx, sy)
    path.lineTo(ex, ey)
    path.lineTo(hx, hy)
    c.drawPath(path, S(OUT, w + 8))
    c.drawPath(path, S(color, w))
    c.drawCircle(hx, hy, 27, F(OUT))
    c.drawCircle(hx, hy, 23, F(hand))
    return hx, hy


def eyes(c, ex, ey, look, blink, kind="normal", rx=22, ry=26):
    lx, ly = look
    for sx in (-1, 1):
        x = ex * sx
        if kind == "happy":
            path = skia.Path()
            path.moveTo(x - 20, ey + 6)
            path.quadTo(x, ey - 22, x + 20, ey + 6)
            c.drawPath(path, S(OUT, 9))
            continue
        k = 0.08 if blink else 1.0
        yr = ry * (1.25 if kind == "shock" else 1.0) * k
        xr = rx * (1.15 if kind == "shock" else 1.0)
        oval(c, x, ey, xr + 4, yr + 4, F(OUT))
        oval(c, x, ey, xr, yr, F("#ffffff"))
        if not blink:
            pr = 8 if kind == "shock" else 12
            c.drawCircle(x + lx * 8, ey + ly * 8, pr, F(OUT))
            c.drawCircle(x + lx * 8 + 4, ey + ly * 8 - 4, 3.5, F("#ffffff"))
        if kind == "narrow" and not blink:
            c.drawRect(R(x - xr - 6, ey - yr - 8, 2 * xr + 12, yr + 2), F(SKIN))
            c.drawLine(x - xr - 2, ey - 6, x + xr + 2, ey - 6, S(OUT, 6))
        if kind == "sad" and not blink:
            path = skia.Path()
            path.moveTo(x - xr - 6, ey - yr - 6)
            path.lineTo(x + xr + 6, ey - yr - 6)
            path.lineTo(x + (xr if sx < 0 else -xr), ey - 6)
            path.close()
            c.drawPath(path, F(SKIN))


BROWS = {  # (ички, сырткы) бийиктик жылышы
    "neutral": (0, 0), "calm": (2, 2), "shock": (-20, -16), "worried": (-14, 6),
    "suspicious": None, "smile": (-4, -4), "happy": (-8, -8), "think": None,
    "angry": (12, -6), "talk": (-4, -2),
}


def brows(c, expr, y, color=HAIR, w=11):
    b = BROWS.get(expr, (0, 0))
    if expr == "suspicious":
        c.drawLine(-62, y - 14, -18, y - 22, S(color, w))
        c.drawLine(18, y + 2, 62, y - 6, S(color, w))
        return
    if expr == "think":
        c.drawLine(-62, y - 4, -18, y - 12, S(color, w))
        c.drawLine(18, y - 22, 62, y - 18, S(color, w))
        return
    i, o = b
    c.drawLine(-62, y + o, -18, y + i, S(color, w))
    c.drawLine(18, y + i, 62, y + o, S(color, w))


def mouth(c, expr, x, y, talk=0.0):
    if talk > 0.05 and expr not in ("happy",):
        h = 6 + 26 * talk
        oval(c, x, y, 22 + 6 * talk, h, F(OUT))
        oval(c, x, y + h * 0.45, 13, h * 0.35, F("#d9534f"))
        return
    if expr == "shock":
        oval(c, x, y + 6, 20, 26, F(OUT))
        oval(c, x, y + 16, 12, 10, F("#d9534f"))
    elif expr in ("smile", "happy"):
        path = skia.Path()
        path.moveTo(x - 38, y - 8)
        path.quadTo(x, y + 44, x + 38, y - 8)
        path.close()
        c.drawPath(path, F(OUT))
        path2 = skia.Path()
        path2.moveTo(x - 30, y - 4)
        path2.quadTo(x, y + 6, x + 30, y - 4)
        path2.lineTo(x + 26, y + 4)
        path2.quadTo(x, y + 12, x - 26, y + 4)
        path2.close()
        c.drawPath(path2, F("#ffffff"))
    elif expr == "worried":
        path = skia.Path()
        path.moveTo(x - 26, y + 6)
        path.cubicTo(x - 12, y - 8, x + 4, y + 14, x + 26, y)
        c.drawPath(path, S(OUT, 8))
    elif expr in ("suspicious", "think"):
        c.drawLine(x - 18, y + 4, x + 22, y - 4, S(OUT, 8))
    else:
        path = skia.Path()
        path.moveTo(x - 24, y)
        path.quadTo(x, y + 12, x + 24, y)
        c.drawPath(path, S(OUT, 8))


def hero(c, x, y, s=1.0, expr="neutral", arms=("down", "down"), look=(0, 0), blink=False,
         talk=0.0, pose="stand", bob=0.0, held=None, tilt=0.0):
    """Сур худи кийген жигит. (x,y) — бут асты. held(c, hx, hy) — колундагы буюм."""
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    c.drawOval(R(-150, -18, 300, 36), F("#000000", 90))
    dy = 0
    if pose == "sit":
        dy = 125
        rrect(c, -95, -245, 190, 75, 34, F(OUT))
        rrect(c, -91, -241, 182, 67, 30, F(JEANS))
        for lx in (-78, 26):
            rrect(c, lx - 4, -200, 60, 190, 22, F(OUT))
            rrect(c, lx, -196, 52, 182, 20, F(JEANS))
        for lx in (-92, 20):
            rrect(c, lx, -38, 74, 38, 16, F(OUT))
            rrect(c, lx + 4, -34, 66, 30, 13, F("#e5e7eb"))
    else:
        for lx in (-72, 20):
            rrect(c, lx - 4, -278, 60, 258, 22, F(OUT))
            rrect(c, lx, -274, 52, 250, 20, F(JEANS))
        for lx in (-92, 18):
            rrect(c, lx, -40, 76, 40, 16, F(OUT))
            rrect(c, lx + 4, -36, 68, 32, 13, F("#e5e7eb"))
            c.drawLine(lx + 8, -8, lx + 68, -8, S("#9ca3af", 5))
    c.translate(0, dy + bob)
    c.rotate(tilt)
    # капюшон артында
    oval(c, 0, -505, 120, 72, F(OUT))
    oval(c, 0, -505, 114, 66, F(HOOD_DD))
    # дене
    rrect(c, -138, -488, 276, 250, 66, F(OUT))
    rrect(c, -132, -482, 264, 238, 60, F(HOOD))
    rrect(c, -132, -272, 264, 30, 14, F(HOOD_D))
    rrect(c, -72, -365, 144, 62, 22, F(HOOD_D))
    c.drawLine(-72, -365, 72, -365, S(HOOD_DD, 4))
    c.drawLine(-26, -470, -32, -395, S("#e5e7eb", 6))
    c.drawLine(26, -470, 32, -395, S("#e5e7eb", 6))
    c.drawCircle(-32, -392, 6, F("#e5e7eb"))
    c.drawCircle(32, -392, 6, F("#e5e7eb"))
    # моюн жана баш
    rrect(c, -26, -510, 52, 36, 10, F(SKIN_D))
    hx_, hy_ = 0, -615
    c.drawCircle(-96, hy_ + 8, 24, F(OUT))
    c.drawCircle(96, hy_ + 8, 24, F(OUT))
    c.drawCircle(-96, hy_ + 8, 19, F(SKIN))
    c.drawCircle(96, hy_ + 8, 19, F(SKIN))
    rrect(c, -100, -728, 200, 222, 92, F(OUT))
    rrect(c, -95, -723, 190, 212, 88, F(SKIN))
    # чач
    hair = skia.Path()
    hair.moveTo(-101, -620)
    hair.cubicTo(-112, -720, -60, -760, 0, -758)
    hair.cubicTo(70, -760, 116, -716, 101, -620)
    hair.lineTo(88, -650)
    hair.lineTo(60, -672)
    hair.lineTo(40, -660)
    hair.lineTo(10, -682)
    hair.lineTo(-20, -664)
    hair.lineTo(-50, -684)
    hair.lineTo(-70, -662)
    hair.lineTo(-88, -652)
    hair.close()
    c.drawPath(hair, S(OUT, 6))
    c.drawPath(hair, F(HAIR))
    c.drawPath(hair, F(HAIR))
    # бет
    ek = {"shock": "shock", "suspicious": "narrow", "happy": "happy", "worried": "sad"}.get(expr, "normal")
    eyes(c, 40, -612, look, blink, ek)
    brows(c, expr, -654)
    path = skia.Path()
    path.moveTo(-6, -590)
    path.quadTo(-14, -570, 4, -568)
    c.drawPath(path, S(SKIN_D, 6))
    mouth(c, expr, 0, -548, talk)
    if expr in ("smile", "happy"):
        oval(c, -62, -560, 18, 10, F("#f28b82", 120))
        oval(c, 62, -560, 18, 10, F("#f28b82", 120))
    if expr in ("shock", "worried"):
        drop = skia.Path()
        drop.moveTo(108, -690)
        drop.quadTo(124, -660, 108, -648)
        drop.quadTo(92, -660, 108, -690)
        c.drawPath(drop, F("#7dd3fc"))
    # колдор
    held_pos = []
    for side, spec in ((-1, arms[0]), (1, arms[1])):
        if spec is None:
            continue
        held_pos.append(_arm(c, 110 * side, -455, spec, side, HOOD))
    if held:
        held(c, held_pos)
    c.restore()


# ---------------- БЕЙТААНЫШ ----------------
COAT = "#262b3b"
COAT_D = "#1a1e2b"


def stranger(c, x, y, s=1.0, mode="face", expr="smirk", look=(0, 0), blink=False, step=0.0,
             arms=("down", "down"), talk=0.0, glow=1.0):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    c.drawOval(R(-140, -16, 280, 32), F("#000000", 100))
    sil = mode == "silhouette"
    body = "#05070d" if sil else COAT
    out = "#05070d" if sil else OUT
    # буттар (басуу)
    for i, lx in enumerate((-55, 15)):
        sw = math.sin(step * math.pi * 2 + i * math.pi) * 18
        rrect(c, lx + sw, -260, 40, 245, 16, F(out))
        rrect(c, lx + sw - 12, -32, 66, 32, 12, F("#05070d" if sil else "#111111"))
    bob = abs(math.sin(step * math.pi * 2)) * -10
    c.translate(0, bob)
    # пальто
    coat = skia.Path()
    coat.moveTo(-120, -560)
    coat.lineTo(120, -560)
    coat.lineTo(150, -200)
    coat.lineTo(-150, -200)
    coat.close()
    c.drawPath(coat, S(out, 8))
    c.drawPath(coat, F(body))
    if not sil:
        poly(c, [(-20, -560), (0, -470), (20, -560)], F("#d1d5db"))
        poly(c, [(-60, -560), (0, -440), (-10, -560)], F(COAT_D))
        poly(c, [(60, -560), (0, -440), (10, -560)], F(COAT_D))
        for by in (-400, -330, -260):
            c.drawCircle(0, by, 7, F("#0b0d14"))
    for side, spec in ((-1, arms[0]), (1, arms[1])):
        _arm(c, 105 * side, -540, spec if spec != "down" else [(130 * side, -420), (140 * side, -300)],
             side, body, w=50, hand="#05070d" if sil else "#d9c2a8")
    # баш
    face = "#05070d" if sil else "#d9c2a8"
    rrect(c, -78, -720, 156, 176, 70, F(out))
    rrect(c, -72, -714, 144, 164, 64, F(face))
    # шляпа
    oval(c, 0, -702, 132, 22, F("#05070d" if sil else "#11131b"))
    rrect(c, -82, -810, 164, 110, 24, F("#05070d" if sil else "#11131b"))
    rrect(c, -82, -728, 164, 20, 4, F("#05070d" if sil else "#5b1a1a"))
    if sil:
        for sx in (-1, 1):
            c.drawCircle(sx * 30 + look[0] * 5, -640, 16, F("#ffde59", int(160 * glow), blur=10))
            oval(c, sx * 30 + look[0] * 5, -640, 13, 6, F("#fff3b0", int(255 * glow)))
    else:
        c.drawRect(R(-72, -690, 144, 26), F("#000000", 70))
        for sx in (-1, 1):
            ex = sx * 30
            k = 0.1 if blink else 1
            oval(c, ex, -640, 16, 9 * k, F("#ffffff"))
            if not blink:
                c.drawCircle(ex + look[0] * 6, -640 + look[1] * 3, 6, F(OUT))
        bw = {"angry": (14, -4), "nervous": (-10, 4), "smirk": (2, -4)}.get(expr, (0, 0))
        c.drawLine(-50, -662 + bw[1], -14, -662 + bw[0], S("#2b2b2b", 9))
        c.drawLine(14, -662 + bw[0], 50, -662 + bw[1], S("#2b2b2b", 9))
        # мурут
        must = skia.Path()
        must.moveTo(-34, -592)
        must.quadTo(0, -612, 34, -592)
        must.quadTo(0, -600, -34, -592)
        c.drawPath(must, S("#2b2b2b", 7))
        if talk > 0.05:
            oval(c, 0, -578, 16, 4 + 14 * talk, F(OUT))
        elif expr == "smirk":
            path = skia.Path()
            path.moveTo(-18, -578)
            path.quadTo(8, -570, 26, -588)
            c.drawPath(path, S(OUT, 6))
        elif expr == "nervous":
            path = skia.Path()
            path.moveTo(-22, -576)
            for i in range(1, 5):
                path.lineTo(-22 + i * 11, -576 + (8 if i % 2 else 0))
            c.drawPath(path, S(OUT, 5))
            drop = skia.Path()
            drop.moveTo(84, -700)
            drop.quadTo(98, -672, 84, -662)
            drop.quadTo(70, -672, 84, -700)
            c.drawPath(drop, F("#7dd3fc"))
        else:
            path = skia.Path()
            path.moveTo(-22, -570)
            path.quadTo(0, -586, 22, -570)
            c.drawPath(path, S(OUT, 6))
    c.restore()


# ---------------- КАРЫЯ ----------------
def oldman(c, x, y, s=1.0, expr="smile", look=(0, 0), blink=False, talk=0.0, arms=("down", "down"),
           tears=0.0, t=0.0, held=None):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    c.drawOval(R(-140, -16, 280, 32), F("#000000", 90))
    for lx in (-62, 14):
        rrect(c, lx - 4, -244, 56, 228, 20, F(OUT))
        rrect(c, lx, -240, 48, 220, 18, F("#5f6670"))
        rrect(c, lx - 10, -34, 70, 34, 14, F("#3b2a1f"))
    rrect(c, -128, -470, 256, 250, 60, F(OUT))
    rrect(c, -122, -464, 244, 238, 56, F("#efe8d8"))
    vest_l = [(-122, -440), (-30, -464), (-10, -240), (-122, -240)]
    vest_r = [(122, -440), (30, -464), (10, -240), (122, -240)]
    poly(c, vest_l, F("#7a4e2d"))
    poly(c, vest_r, F("#7a4e2d"))
    for by in (-400, -340, -280):
        c.drawCircle(-20, by, 6, F("#c9a227"))
    rrect(c, -24, -492, 48, 34, 10, F(SKIN_D))
    for sx in (-1, 1):
        c.drawCircle(sx * 92, -598, 22, F(OUT))
        c.drawCircle(sx * 92, -598, 17, F("#e8b48a"))
    rrect(c, -95, -708, 190, 210, 88, F(OUT))
    rrect(c, -90, -703, 180, 200, 84, F("#e8b48a"))
    # ак чач капталдарда
    for sx in (-1, 1):
        oval(c, sx * 82, -640, 22, 40, F("#e5e7eb"))
    # сакал
    beard = skia.Path()
    beard.moveTo(-84, -590)
    beard.cubicTo(-80, -470, -30, -440, 0, -436)
    beard.cubicTo(30, -440, 80, -470, 84, -590)
    beard.cubicTo(50, -548, -50, -548, -84, -590)
    c.drawPath(beard, S(OUT, 6))
    c.drawPath(beard, F("#f3f4f6"))
    # көздөр + көз айнек
    ek = "happy" if expr == "happy" else "normal"
    eyes(c, 36, -616, look, blink, ek, rx=15, ry=17)
    for sx in (-1, 1):
        c.drawCircle(sx * 36, -616, 28, S("#3f3f46", 6))
    c.drawLine(-8, -618, 8, -618, S("#3f3f46", 6))
    c.drawLine(-50, -660, -18, -654, S("#f3f4f6", 12))
    c.drawLine(18, -654, 50, -660, S("#f3f4f6", 12))
    oval(c, 0, -586, 12, 14, F(SKIN_D))
    # мурут жана ооз
    if talk > 0.05:
        oval(c, 0, -548, 16, 4 + 14 * talk, F(OUT))
    elif expr in ("smile", "happy"):
        path = skia.Path()
        path.moveTo(-26, -556)
        path.quadTo(0, -526, 26, -556)
        c.drawPath(path, S(OUT, 7))
    must = skia.Path()
    must.moveTo(-44, -556)
    must.quadTo(0, -592, 44, -556)
    must.quadTo(0, -570, -44, -556)
    c.drawPath(must, F("#ffffff"))
    if tears > 0:
        for sx in (-1, 1):
            for k in range(3):
                ph = (t * 1.6 + k / 3) % 1
                ty = -598 + ph * 120
                oval(c, sx * 46, ty, 7, 11, F("#60a5fa", int(255 * tears * (1 - ph))))
            path = skia.Path()
            path.moveTo(sx * 46, -598)
            path.lineTo(sx * 48, -540)
            c.drawPath(path, S("#93c5fd", 7, int(200 * tears)))
    hp = []
    for side, spec in ((-1, arms[0]), (1, arms[1])):
        hp.append(_arm(c, 100 * side, -440, spec, side, "#efe8d8", w=48, hand="#e8b48a"))
    if held:
        held(c, hp)
    c.restore()


def kid(c, x, y, s=1.0, girl=False, t=0.0, color="#f87171"):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    for lx in (-40, 8):
        rrect(c, lx, -150, 32, 140, 12, F("#374151"))
    rrect(c, -70, -300, 140, 170, 40, F(OUT))
    rrect(c, -66, -296, 132, 162, 36, F(color))
    rrect(c, -70, -450, 140, 150, 64, F(OUT))
    rrect(c, -66, -446, 132, 142, 60, F(SKIN))
    if girl:
        oval(c, 0, -440, 72, 34, F(HAIR))
        c.drawCircle(-74, -380, 22, F(HAIR))
        c.drawCircle(74, -380, 22, F(HAIR))
    else:
        oval(c, 0, -440, 70, 30, F("#5b3a29"))
    for sx in (-1, 1):
        c.drawCircle(sx * 26, -380, 9, F(OUT))
    path = skia.Path()
    path.moveTo(-18, -344)
    path.quadTo(0, -326, 18, -344)
    c.drawPath(path, S(OUT, 6))
    # китеп
    c.save()
    c.translate(0, -230 + math.sin(t * 3) * 4)
    rrect(c, -64, -38, 128, 76, 6, F("#1d4ed8"))
    c.drawLine(0, -38, 0, 38, S("#ffffff", 4))
    rrect(c, -58, -32, 54, 64, 4, F("#f8fafc"))
    rrect(c, 4, -32, 54, 64, 4, F("#f8fafc"))
    c.restore()
    c.restore()


# ---------------- РЕКВИЗИТ ----------------
def money_bag(c, x, y, s=1.0, glow=0.0):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    if glow:
        c.drawCircle(0, 0, 130, F(YELLOW, int(90 * glow), blur=40))
    bag = skia.Path()
    bag.moveTo(-40, -70)
    bag.cubicTo(-130, -40, -120, 90, 0, 90)
    bag.cubicTo(120, 90, 130, -40, 40, -70)
    bag.close()
    c.drawPath(bag, S(OUT, 10))
    c.drawPath(bag, F("#c49a5a"))
    oval(c, 0, 30, 70, 50, F("#b08546"))
    poly(c, [(-40, -70), (-58, -110), (0, -88), (58, -110), (40, -70)], F("#c49a5a"))
    c.drawLine(-46, -72, 46, -72, S("#6b4f2a", 12))
    text(c, "$", 0, 58, 90, "#2e7d32")
    c.restore()


def bill(c, x, y, s=1.0, rot=0.0, a=255):
    c.save()
    c.translate(x, y)
    c.rotate(rot)
    c.scale(s, s)
    rrect(c, -50, -24, 100, 48, 6, F(MONEY_D, a))
    rrect(c, -45, -19, 90, 38, 4, F(MONEY, a))
    c.drawCircle(0, 0, 13, F(MONEY_D, a))
    text(c, "$", 0, 9, 24, "#c8e6c9", a=a)
    c.restore()


def stack(c, x, y, n, w=150):
    for i in range(n):
        yy = y - i * 16
        rrect(c, x - w / 2 - 3, yy - 17, w + 6, 20, 5, F(OUT))
        rrect(c, x - w / 2, yy - 15, w, 16, 4, F(MONEY if i % 2 else "#43a047"))
        rrect(c, x - 18, yy - 15, 36, 16, 2, F("#e8f5e9"))


def chair(c, x, y, s=1.0):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    rrect(c, -110, -380, 220, 30, 10, F("#5b3a29"))
    rrect(c, -120, -390, 240, 20, 8, F("#7c4f35"))
    rrect(c, -125, -150, 250, 30, 10, F("#7c4f35"))
    for lx in (-110, 92):
        rrect(c, lx, -390, 18, 390, 6, F("#5b3a29"))
    c.restore()


def calendar(c, x, y, day, flip, s=1.0, total=30):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    rrect(c, -150, -170, 300, 340, 22, F(OUT))
    rrect(c, -144, -164, 288, 328, 18, F("#f8fafc"))
    rrect(c, -144, -164, 288, 80, 18, F("#e11d48"))
    c.drawRect(R(-144, -110, 288, 26), F("#e11d48"))
    text(c, "КҮН", 0, -106, 44, "#ffffff")
    for rx in (-80, 80):
        rrect(c, rx - 8, -190, 16, 50, 8, F("#94a3b8"))
    text(c, str(day), 0, 100, 150, "#1e293b")
    # барак айланып жатат
    if 0 < flip < 1:
        c.save()
        k = math.cos(flip * math.pi / 2)
        c.translate(0, -84)
        c.scale(1, k)
        c.rotate(-flip * 12)
        rrect(c, -144, 0, 288, 248, 14, F("#e2e8f0", int(255 * (1 - flip * 0.6))))
        text(c, str(max(1, day - 1)), 0, 184, 150, "#64748b", a=int(255 * (1 - flip)))
        c.restore()
    # прогресс
    rrect(c, -110, 136, 220, 12, 6, F("#e2e8f0"))
    rrect(c, -110, 136, 220 * day / total, 12, 6, F("#22c55e"))
    c.restore()


def shop(c, x, y, s=1.0, old=False, sign="ДҮКӨН", light=1.0):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    if old:
        c.rotate(-1.5)
    wall = "#b45309" if not old else "#8d6e63"
    rrect(c, -210, -420, 420, 420, 10, F(OUT))
    rrect(c, -204, -414, 408, 414, 8, F(wall))
    if old:
        for i in range(6):
            c.drawLine(-204, -360 + i * 60, 204, -360 + i * 60, S("#6d4c41", 4))
    # тент
    for i in range(7):
        col = "#ef4444" if i % 2 == 0 else "#f8fafc"
        if old:
            col = "#9b5c4f" if i % 2 == 0 else "#d7ccc8"
        poly(c, [(-230 + i * 66, -430), (-164 + i * 66, -430), (-164 + i * 66, -350), (-230 + i * 66, -350)], F(col))
        oval(c, -197 + i * 66, -350, 33, 18, F(col))
    rrect(c, -150, -520, 300, 80, 12, F(OUT))
    rrect(c, -144, -514, 288, 68, 10, F("#fde68a" if not old else "#d6c7a1"))
    text(c, sign, 0, -464, 46, "#7c2d12")
    # терезе жана эшик
    rrect(c, -180, -300, 170, 140, 8, F(OUT))
    rrect(c, -174, -294, 158, 128, 6, F("#fde047" if light > 0.5 else "#93c5fd", 230))
    c.drawLine(-95, -294, -95, -166, S(OUT, 5))
    rrect(c, 40, -300, 130, 300, 8, F(OUT))
    rrect(c, 46, -294, 118, 294, 6, F("#78350f"))
    c.drawCircle(146, -150, 9, F("#facc15"))
    c.restore()


def door(c, x, y, open_=0.0, shake=0.0, s=1.0, inside=None):
    c.save()
    c.translate(x + shake, y)
    c.scale(s, s)
    rrect(c, -150, -620, 300, 620, 10, F("#3f2a1d"))
    # ичи (ачылганда)
    c.drawRect(R(-132, -604, 264, 604), F("#0a0d16"))
    sh = skia.GradientShader.MakeLinear([skia.Point(0, -604), skia.Point(0, 0)], [C("#fbbf24", 60), C("#fbbf24", 0)])
    p = skia.Paint(AntiAlias=True)
    p.setShader(sh)
    c.drawRect(R(-132, -604, 264, 604), p)
    if inside:
        c.save()
        c.clipRect(R(-132, -604, 264, 604))
        inside(c)
        c.restore()
    w = 264 * (1 - open_ * 0.85)
    rrect(c, -132, -604, w, 604, 6, F("#92400e"))
    if w > 60:
        rrect(c, -132 + w * 0.12, -560, w * 0.76, 220, 6, F("#78350f"))
        rrect(c, -132 + w * 0.12, -300, w * 0.76, 240, 6, F("#78350f"))
        c.drawCircle(-132 + w - 28, -300, 13, F("#facc15"))
    c.restore()


def bubble(c, x, y, s, color="#ffffff", tcolor="#111827", size=46, tail=(0, 1), a=255, scale=1.0):
    f = font(size)
    lines = s.split("\n")
    w = max(f.measureText(l) for l in lines) + 60
    h = len(lines) * size * 1.25 + 40
    c.save()
    c.translate(x, y)
    c.scale(scale, scale)
    tx, ty = tail
    tp = [(-24 + tx * 40, h / 2 - 6), (24 + tx * 40, h / 2 - 6), (tx * 110, h / 2 + 60)]
    poly(c, tp, F(OUT, a))
    rrect(c, -w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 34, F(OUT, a))
    rrect(c, -w / 2, -h / 2, w, h, 30, F(color, a))
    poly(c, [(p[0], p[1] - 8) if i < 2 else (p[0] * 0.92, p[1] - 12) for i, p in enumerate(tp)], F(color, a))
    for i, l in enumerate(lines):
        text(c, l, 0, -h / 2 + 20 + size * (i + 0.95) * 1.2 - size * 0.15, size, tcolor, a=a)
    c.restore()


def pill(c, x, y, s, bg, size=40, fg="#ffffff", a=255, scale=1.0):
    f = font(size)
    w = f.measureText(s) + 50
    h = size * 1.6
    c.save()
    c.translate(x, y)
    c.scale(scale, scale)
    rrect(c, -w / 2 - 5, -h / 2 - 5, w + 10, h + 10, h / 2 + 5, F(OUT, a))
    rrect(c, -w / 2, -h / 2, w, h, h / 2, F(bg, a))
    text(c, s, 0, size * 0.36, size, fg, a=a)
    c.restore()


def qmark(c, x, y, size, a=255, color=YELLOW):
    text(c, "?", x + 6, y + 8, size, "#000000", a=int(a * 0.5))
    text(c, "?", x, y, size, color, a=a, outline=OUT, ow=size * 0.06)


def sparkle(c, x, y, r, a=255, color="#fff7c2"):
    path = skia.Path()
    path.moveTo(x, y - r)
    path.quadTo(x, y, x + r, y)
    path.quadTo(x, y, x, y + r)
    path.quadTo(x, y, x - r, y)
    path.quadTo(x, y, x, y - r)
    c.drawPath(path, F(color, a))


def heart(c, x, y, s, a=255, color="#f43f5e"):
    path = skia.Path()
    path.moveTo(x, y + 30 * s)
    path.cubicTo(x - 60 * s, y - 10 * s, x - 30 * s, y - 50 * s, x, y - 22 * s)
    path.cubicTo(x + 30 * s, y - 50 * s, x + 60 * s, y - 10 * s, x, y + 30 * s)
    c.drawPath(path, F(color, a))


def bell(c, x, y, s=1.0, rot=0.0):
    c.save()
    c.translate(x, y)
    c.rotate(rot)
    c.scale(s, s)
    path = skia.Path()
    path.moveTo(-40, 30)
    path.cubicTo(-40, -50, 40, -50, 40, 30)
    path.lineTo(52, 44)
    path.lineTo(-52, 44)
    path.close()
    c.drawPath(path, S(OUT, 8))
    c.drawPath(path, F(YELLOW))
    c.drawCircle(0, 54, 12, F(YELLOW))
    c.drawCircle(0, -44, 8, F(YELLOW))
    c.restore()


def phone(c, x, y, s=1.0):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    rrect(c, -230, -420, 460, 840, 60, F(OUT))
    rrect(c, -214, -404, 428, 808, 48, F("#111827"))
    rrect(c, -200, -380, 400, 760, 38, F("#f1f5f9"))
    rrect(c, -50, -398, 100, 20, 10, F(OUT))
    c.restore()


def moon_window(c, x, y, s=1.0, t=0.0):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    rrect(c, -170, -210, 340, 420, 14, F("#3f2a1d"))
    rrect(c, -156, -196, 312, 392, 8, F("#0b1630"))
    for i, (sx, sy) in enumerate([(-100, -140), (60, -160), (110, -60), (-60, 40), (100, 120), (-120, 140)]):
        a = int(160 + 90 * math.sin(t * 3 + i))
        sparkle(c, sx, sy, 10, a)
    c.drawCircle(-30, -60, 70, F("#fef3c7", 120, blur=25))
    c.drawCircle(-30, -60, 60, F("#fef3c7"))
    c.drawCircle(0, -80, 52, F("#0b1630"))
    c.drawLine(0, -196, 0, 196, S("#3f2a1d", 12))
    c.drawLine(-156, 0, 156, 0, S("#3f2a1d", 12))
    c.restore()


def chart(c, x, y, w, h, prog, t):
    rrect(c, x - 6, y - 6, w + 12, h + 12, 24, F(OUT))
    rrect(c, x, y, w, h, 20, F("#13254d"))
    for i in range(1, 5):
        c.drawLine(x + 30, y + h * i / 5, x + w - 30, y + h * i / 5, S("#22396b", 3))
    pts = [(0, 0.1), (0.15, 0.18), (0.3, 0.15), (0.45, 0.35), (0.6, 0.32), (0.75, 0.6), (0.9, 0.82)]
    path = skia.Path()
    n = len(pts)
    last = None
    for i, (px, py) in enumerate(pts):
        f = min(1, max(0, prog * (n - 1) - i + 1)) if i else 1
        if i and f <= 0:
            break
        if i:
            ox, oy = last
            px = ox + (px - ox) * f
            py = oy + (py - oy) * f
        X = x + 40 + px * (w - 80)
        Y = y + h - 40 - py * (h - 80)
        if i == 0:
            path.moveTo(X, Y)
        else:
            path.lineTo(X, Y)
        last = (pts[i][0], pts[i][1]) if f >= 1 else (px, py)
        tip = (X, Y)
    c.drawPath(path, S("#22c55e", 16))
    tx, ty = tip
    c.save()
    c.translate(tx, ty)
    c.rotate(-40)
    poly(c, [(-10, -26), (34, 0), (-10, 26)], F("#22c55e"))
    c.restore()
    c.drawCircle(tx, ty, 26, F("#22c55e", 80, blur=12))
