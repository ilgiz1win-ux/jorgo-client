"""Электровелосипед батареясы жана суук — 30 сек, 9:16, неон инфографика.
python3 render.py preview | python3 render.py"""
import json, math, os, random, subprocess, sys, wave
from multiprocessing import Pool
import numpy as np
import skia
from scipy.signal import resample_poly

W, H, FPS, SR = 1080, 1920, 30, 44100
TOTAL_F = 30 * FPS
XF = 0.4  # сахналар ортосундагы кроссфейд
BOLD = skia.Typeface.MakeFromFile("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
REG = skia.Typeface.MakeFromFile("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
_F = {}

CYAN, BLUE, ICE, WHITE = "#38d6ff", "#2f7dff", "#bfe9ff", "#f2f8ff"
RED, AMBER, GREEN, WARM = "#ff4d5e", "#ffb547", "#34e39a", "#ff8a3d"


def font(s, b=True):
    k = (int(s), b)
    if k not in _F:
        _F[k] = skia.Font(BOLD if b else REG, int(s))
    return _F[k]


def C(h, a=255):
    h = h.lstrip("#")
    return skia.ColorSetARGB(int(max(0, min(255, a))), int(h[:2], 16), int(h[2:4], 16), int(h[4:], 16))


def F(h, a=255, blur=0):
    p = skia.Paint(AntiAlias=True, Color=C(h, a))
    if blur:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    return p


def S(h, w, a=255, blur=0):
    p = F(h, a, blur)
    p.setStyle(skia.Paint.kStroke_Style)
    p.setStrokeWidth(w)
    p.setStrokeCap(skia.Paint.kRound_Cap)
    p.setStrokeJoin(skia.Paint.kRound_Join)
    return p


def lin(x0, y0, x1, y1, cols, pos=None):
    p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeLinear([skia.Point(x0, y0), skia.Point(x1, y1)], [C(*c) if isinstance(c, tuple) else C(c) for c in cols], pos))
    return p


def rad(x, y, r, cols, pos=None):
    p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeRadial(skia.Point(x, y), r, [C(*c) if isinstance(c, tuple) else C(c) for c in cols], pos))
    return p


def RR(x, y, w, h):
    return skia.Rect.MakeXYWH(x, y, w, h)


def glow_line(c, pts, col, w, a=255, g=1.0):
    path = skia.Path()
    path.moveTo(*pts[0])
    for q in pts[1:]:
        path.lineTo(*q)
    c.drawPath(path, S(col, w * 3.5, int(a * 0.35 * g), blur=w * 2))
    c.drawPath(path, S(col, w, a))
    c.drawPath(path, S(WHITE, max(1, w * 0.35), int(a * 0.8)))


def text(c, s, x, y, size, col=WHITE, b=True, align="c", a=255, glow=None, track=0):
    f = font(size, b)
    w = f.measureText(s)
    if align == "c":
        x -= w / 2
    elif align == "r":
        x -= w
    if glow:
        c.drawString(s, x, y, f, F(glow, int(a * 0.7), blur=size * 0.25))
    c.drawString(s, x, y, f, F(col, a))
    return w


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def eo(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


# ---------------- ФОН ----------------
def bg(c, t, warm=0.0, cold=0.0):
    c.drawRect(RR(0, 0, W, H), lin(0, 0, 0, H, ["#040a1a", "#071633", "#030817"], [0, 0.55, 1]))
    if warm > 0:
        c.drawRect(RR(0, 0, W, H), rad(W / 2, H * 0.45, H * 0.8, [("#ff7a2e", int(110 * warm)), ("#3a1606", int(80 * warm)), ("#000000", 0)], [0, 0.5, 1]))
    # перспективадагы тор
    hy = 1180
    gp = S("#1d4f9e", 1.5, int(70 * (1 - warm * 0.6)))
    for i in range(-12, 13):
        c.drawLine(W / 2 + i * 40, hy, W / 2 + i * 260, H, gp)
    for k in range(14):
        z = ((k + (t * 0.6) % 1) / 14) ** 2
        y = hy + z * (H - hy)
        c.drawLine(0, y, W, y, S("#1d4f9e", 1.5, int(90 * z * (1 - warm * 0.6))))
    # жогорку жылдыздар/бөлүкчөлөр
    rnd = random.Random(5)
    for i in range(60):
        x = rnd.uniform(0, W)
        y = (rnd.uniform(0, 1100) - t * rnd.uniform(4, 14)) % 1100
        c.drawCircle(x, y, rnd.uniform(0.8, 2.2), F(ICE if warm < .5 else "#ffd2a8", int(rnd.uniform(40, 140))))
    c.drawRect(RR(0, 0, W, H), rad(W / 2, H * 0.42, H * 0.72, [("#000000", 0), ("#000000", 170)]))


def snow(c, t, n=160, a=1.0, wind=60):
    rnd = random.Random(9)
    for i in range(n):
        z = rnd.uniform(0.3, 1.0)
        x = (rnd.uniform(0, W) + t * wind * z + math.sin(t * 1.3 + i) * 12) % (W + 40) - 20
        y = (rnd.uniform(0, H) + t * 170 * z) % (H + 40) - 20
        r = 2 + 4 * z
        c.drawCircle(x, y, r * 2.2, F(WHITE, int(40 * a * z), blur=r))
        c.drawCircle(x, y, r * 0.8, F(WHITE, int(220 * a * z)))


# ---------------- БАТАРЕЯ ----------------
def battery(c, x, y, w, h, level, t, a=255, rot=0.0, glow=1.0, cold=0.0):
    """Бирдей көрүнүштөгү батарея: күңүрт металл корпус, неон кыр, LED шкала."""
    c.save()
    c.translate(x, y)
    c.rotate(rot)
    r = h * 0.28
    c.drawRoundRect(RR(-w / 2, -h / 2, w, h), r, r, F(CYAN, int(a * 0.25 * glow), blur=26))
    c.drawRoundRect(RR(-w / 2, -h / 2, w, h), r, r, lin(0, -h / 2, 0, h / 2, [("#3a4456", a), ("#1a2030", a), ("#0b0f18", a), ("#252d3d", a)], [0, .35, .8, 1]))
    c.drawRoundRect(RR(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.18), r * 0.6, r * 0.6, F("#ffffff", int(a * 0.10)))
    c.drawRoundRect(RR(-w / 2, -h / 2, w, h), r, r, S(CYAN, 3, int(a * 0.9 * glow)))
    # LED шкала
    n = 10
    lx, lw = -w * 0.36, w * 0.56
    for i in range(n):
        on = (i + 0.5) / n <= level
        col = GREEN if level > .5 else (AMBER if level > .25 else RED)
        cx = lx + i * lw / n
        c.drawRoundRect(RR(cx, -h * 0.12, lw / n - 5, h * 0.24), 3, 3, F(col if on else "#2a3242", a if on else int(a * .8)))
        if on:
            c.drawRoundRect(RR(cx, -h * 0.12, lw / n - 5, h * 0.24), 3, 3, F(col, int(a * .5), blur=6))
    # туташтыргыч жана кулпу
    c.drawRoundRect(RR(w / 2 - 14, -h * 0.2, 22, h * 0.4), 5, 5, F("#0b0f18", a))
    c.drawCircle(-w * 0.43, 0, h * 0.11, F("#0b0f18", a))
    c.drawCircle(-w * 0.43, 0, h * 0.11, S("#5b6b85", 2, a))
    if cold > 0:  # кыроо
        c.drawRoundRect(RR(-w / 2, -h / 2, w, h), r, r, F("#cfeeff", int(a * 0.22 * cold)))
        rnd = random.Random(2)
        for i in range(14):
            px, py = rnd.uniform(-w / 2 + 8, w / 2 - 8), rnd.choice([-h / 2 + 3, h / 2 - 3])
            c.drawCircle(px, py, rnd.uniform(3, 7), F(WHITE, int(a * .7 * cold)))
    c.restore()


# ---------------- ВЕЛОСИПЕД ----------------
RW = 150  # дөңгөлөк радиусу
REAR, FRONT = (-270, 0), (275, 0)
BB = (-20, -10)
SEAT_TOP = (-120, -330)
HEAD = (200, -300)
BAT_POS = ((BB[0] + HEAD[0]) / 2 + 2, (BB[1] + HEAD[1]) / 2 + 26)
BAT_ROT = math.degrees(math.atan2(HEAD[1] - BB[1], HEAD[0] - BB[0]))


def wheel(c, x, y, ang, a, motor=False, mglow=0.0):
    c.drawCircle(x, y, RW + 10, F(CYAN, int(a * .18), blur=18))
    c.drawCircle(x, y, RW, S("#0a0d14", 26, a))
    c.drawCircle(x, y, RW - 4, S("#2b3344", 4, a))
    c.drawCircle(x, y, RW + 11, S(CYAN, 2, int(a * .75)))
    c.drawCircle(x, y, RW - 22, S("#8fa3c2", 4, a))
    for i in range(18):
        th = ang + i * math.pi / 9
        c.drawLine(x + 18 * math.cos(th), y + 18 * math.sin(th), x + (RW - 22) * math.cos(th + .25), y + (RW - 22) * math.sin(th + .25), S("#a9b8d0", 1.6, int(a * .8)))
    if motor:
        c.drawCircle(x, y, 52, F(BLUE, int(a * .6 * mglow), blur=24))
        c.drawCircle(x, y, 46, lin(x, y - 46, x, y + 46, [("#4a5568", a), ("#141a26", a)]))
        c.drawCircle(x, y, 46, S(CYAN, 3, int(a * (.5 + .5 * mglow))))
        for i in range(6):
            th = ang * 0.5 + i * math.pi / 3
            c.drawLine(x + 18 * math.cos(th), y + 18 * math.sin(th), x + 38 * math.cos(th), y + 38 * math.sin(th), S(CYAN, 3, int(a * .7 * mglow)))
    else:
        c.drawCircle(x, y, 18, F("#3a4456", a))


def tube(c, p0, p1, w, a):
    c.drawLine(*p0, *p1, S("#05070c", w + 6, a))
    c.drawLine(*p0, *p1, S("#2a3346", w, a))
    c.drawLine(p0[0], p0[1] - w * .22, p1[0], p1[1] - w * .22, S("#6d7d99", w * .25, int(a * .8)))


def ebike(c, x, y, s, t, speed=1.0, level=1.0, a=255, mglow=0.3, light=1.0, bat=True, cold=0.0, flow=0.0):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    ang = t * speed * 6
    c.drawOval(RR(-460, RW - 14, 920, 40), F("#000000", int(a * .55), blur=14))
    if light:
        beam = skia.Path()
        beam.moveTo(HEAD[0] + 40, HEAD[1] + 30)
        beam.lineTo(1100, HEAD[1] - 60)
        beam.lineTo(1100, HEAD[1] + 330)
        beam.close()
        c.drawPath(beam, lin(HEAD[0], 0, 1100, 0, [("#cfeeff", int(70 * light * a / 255)), ("#cfeeff", 0)]))
    wheel(c, *REAR, ang, a, motor=True, mglow=mglow)
    wheel(c, *FRONT, ang, a)
    tube(c, REAR, BB, 16, a)                      # чынжыр түтүгү
    tube(c, REAR, (SEAT_TOP[0] + 14, SEAT_TOP[1] + 40), 14, a)
    tube(c, BB, SEAT_TOP, 24, a)                  # отургуч түтүгү
    tube(c, (SEAT_TOP[0] + 10, SEAT_TOP[1] + 30), HEAD, 22, a)  # үстүнкү түтүк
    tube(c, BB, HEAD, 38, a)                      # ылдыйкы түтүк (батарея ушул жерде)
    tube(c, HEAD, FRONT, 20, a)                   # айры
    tube(c, HEAD, (HEAD[0] - 20, HEAD[1] - 90), 18, a)
    c.drawLine(HEAD[0] - 60, HEAD[1] - 92, HEAD[0] + 30, HEAD[1] - 100, S("#11151f", 16, a))
    c.drawRoundRect(RR(HEAD[0] - 74, HEAD[1] - 104, 34, 22), 8, 8, F("#0b0d12", a))
    # дисплей
    c.drawRoundRect(RR(HEAD[0] - 26, HEAD[1] - 132, 52, 30), 6, 6, F("#0b0f18", a))
    c.drawRoundRect(RR(HEAD[0] - 22, HEAD[1] - 128, 44 * level, 22), 4, 4, F(GREEN if level > .5 else (AMBER if level > .25 else RED), a))
    # отургуч
    seat = skia.Path()
    seat.moveTo(SEAT_TOP[0] - 70, SEAT_TOP[1] - 18)
    seat.cubicTo(SEAT_TOP[0] - 30, SEAT_TOP[1] - 40, SEAT_TOP[0] + 40, SEAT_TOP[1] - 34, SEAT_TOP[0] + 60, SEAT_TOP[1] - 22)
    seat.lineTo(SEAT_TOP[0] + 40, SEAT_TOP[1] - 6)
    seat.lineTo(SEAT_TOP[0] - 60, SEAT_TOP[1] - 4)
    seat.close()
    c.drawPath(seat, F("#0d1018", a))
    c.drawPath(seat, S("#3c4760", 2, a))
    # педаль
    pa = ang * 0.6
    for k in (0, math.pi):
        px, py = BB[0] + 70 * math.cos(pa + k), BB[1] + 70 * math.sin(pa + k)
        c.drawLine(*BB, px, py, S("#6d7d99", 8, a))
        c.drawRoundRect(RR(px - 24, py - 6, 48, 12), 4, 4, F("#141a26", a))
    c.drawCircle(*BB, 34, F("#1a2030", a))
    c.drawCircle(*BB, 34, S("#5b6b85", 3, a))
    # фара
    c.drawCircle(HEAD[0] + 36, HEAD[1] + 28, 14, F("#e8f6ff", a))
    c.drawCircle(HEAD[0] + 36, HEAD[1] + 28, 26, F("#cfeeff", int(a * .6 * light), blur=12))
    if bat:
        battery(c, BAT_POS[0], BAT_POS[1], 250, 62, level, t, a, BAT_ROT, cold=cold)
    if flow > 0:  # батареядан моторго энергия агымы
        pts = [BAT_POS, BB, REAR]
        glow_line(c, pts, CYAN, 4, int(a * .5 * flow), g=flow)
        segs = [(BAT_POS, BB), (BB, REAR)]
        for k in range(10):
            ph = (t * 0.55 * flow + k / 10) % 1
            sx, sy = (segs[0][0] if ph < .5 else segs[1][0])
            ex, ey = (segs[0][1] if ph < .5 else segs[1][1])
            q = (ph % .5) * 2
            c.drawCircle(sx + (ex - sx) * q, sy + (ey - sy) * q, 9, F(CYAN, int(a * flow), blur=6))
            c.drawCircle(sx + (ex - sx) * q, sy + (ey - sy) * q, 4, F(WHITE, int(a * flow)))
    c.restore()


# ---------------- UI ЭЛЕМЕНТТЕРИ ----------------
def header(c, s, a=255, y=300, size=64, col=WHITE, glow=CYAN, chip=None):
    if chip:
        f = font(34)
        cw = f.measureText(chip) + 44
        c.drawRoundRect(RR(W / 2 - cw / 2, y - 132, cw, 56), 28, 28, F(CYAN, int(a * .16)))
        c.drawRoundRect(RR(W / 2 - cw / 2, y - 132, cw, 56), 28, 28, S(CYAN, 2, a))
        text(c, chip, W / 2, y - 92, 34, CYAN, a=a)
    lines = wrap(s, font(size), W - 120)
    for i, ln in enumerate(lines):
        text(c, ln, W / 2, y + i * size * 1.15, size, col, a=a, glow=glow)
    return y + len(lines) * size * 1.15


def wrap(s, f, maxw):
    out, cur = [], ""
    for w in s.split():
        t = (cur + " " + w).strip()
        if f.measureText(t) <= maxw:
            cur = t
        else:
            out.append(cur)
            cur = w
    if cur:
        out.append(cur)
    return out


def hud_ring(c, x, y, r, frac, label, col, a=255, sub=None):
    c.drawCircle(x, y, r, S("#16284d", 16, a))
    path = skia.Path()
    path.addArc(RR(x - r, y - r, 2 * r, 2 * r), -90, 360 * frac)
    c.drawPath(path, S(col, 16, int(a * .5), blur=10))
    c.drawPath(path, S(col, 16, a))
    for i in range(60):
        th = i * math.pi / 30
        c.drawLine(x + (r + 20) * math.cos(th), y + (r + 20) * math.sin(th), x + (r + 26) * math.cos(th), y + (r + 26) * math.sin(th), S("#2b4f8a", 2, a))
    text(c, label, x, y + r * 0.22, r * 0.62, WHITE, a=a, glow=col)
    if sub:
        text(c, sub, x, y + r * 0.62, r * 0.2, "#8fb3e6", b=False, a=a)


def chip(c, x, y, s, col, a=255, size=40, fill=0.15):
    f = font(size)
    w = f.measureText(s) + 48
    h = size * 1.6
    c.drawRoundRect(RR(x - w / 2, y - h / 2, w, h), h / 2, h / 2, F(col, int(a * fill)))
    c.drawRoundRect(RR(x - w / 2, y - h / 2, w, h), h / 2, h / 2, S(col, 2.5, a))
    text(c, s, x, y + size * 0.36, size, WHITE, a=a)


def thermo(c, x, y, h, frac, col, label, a=255):
    c.drawRoundRect(RR(x - 22, y - h, 44, h), 22, 22, F("#0b1428", a))
    c.drawRoundRect(RR(x - 22, y - h, 44, h), 22, 22, S("#3a5f9a", 3, a))
    fh = (h - 30) * frac
    c.drawRoundRect(RR(x - 11, y - 15 - fh, 22, fh + 10), 11, 11, F(col, a))
    c.drawCircle(x, y + 18, 40, F(col, int(a * .5), blur=14))
    c.drawCircle(x, y + 18, 36, F(col, a))
    c.drawCircle(x, y + 18, 36, S("#3a5f9a", 3, a))
    text(c, label, min(x, W - 110), y - h - 30, 46, WHITE, a=a, glow=col)


def cell(c, x, y, w, h, t, speed, a, n_ions=14, cold=1.0):
    """Литий-ион элементинин кесилиши: анод | электролит | катод, иондор жылат."""
    c.drawRoundRect(RR(x, y, w, h), 26, 26, F("#081227", a))
    c.drawRoundRect(RR(x + 14, y + 14, w * .22, h - 28), 14, 14, lin(x, 0, x + w * .22, 0, [("#3b3f4a", a), ("#20232b", a)]))
    c.drawRoundRect(RR(x + w * .78 - 14, y + 14, w * .22, h - 28), 14, 14, lin(x + w * .78, 0, x + w, 0, [("#5a4630", a), ("#30261a", a)]))
    c.drawRect(RR(x + w * .5 - 3, y + 20, 6, h - 40), F("#7aa7d9", int(a * .5)))
    c.drawRoundRect(RR(x, y, w, h), 26, 26, S(CYAN, 3, a))
    text(c, "АНОД", x + w * .11 + 14, y - 22, 30, "#9fb9e0", a=a)
    text(c, "КАТОД", x + w * .89 - 14, y - 22, 30, "#e0c39f", a=a)
    text(c, "Li⁺", x + w * .5, y - 22, 34, CYAN, a=a, glow=CYAN)
    rnd = random.Random(4)
    for i in range(n_ions):
        ph = (rnd.random() + t * speed) % 1
        ix = x + w * .2 + ph * w * .6
        iy = y + 40 + rnd.random() * (h - 80) + math.sin(t * 2 + i) * 6
        c.drawCircle(ix, iy, 16, F(CYAN, int(a * .5), blur=8))
        c.drawCircle(ix, iy, 8, F(WHITE, a))
    if cold:
        c.drawRoundRect(RR(x, y, w, h), 26, 26, F("#bfe6ff", int(a * .12 * cold)))


def house(c, x, y, s, a):
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    p = skia.Path()
    p.moveTo(-260, -40)
    p.lineTo(0, -260)
    p.lineTo(260, -40)
    c.drawPath(p, S(AMBER, 6, int(a * .4), blur=10))
    c.drawPath(p, S(AMBER, 6, a))
    c.drawRect(RR(-210, -60, 420, 360), S(AMBER, 5, a))
    c.drawRect(RR(-210, -60, 420, 360), F(WARM, int(a * .08)))
    c.restore()


# ---------------- СУБТИТР ----------------
def chunks_of(s, size=54, maxw=940):
    f = font(size)
    words, out, cur = s.split(), [], []
    for w in words:
        test = cur + [w]
        if len(wrap(" ".join(test), f, maxw)) > 2:
            out.append(" ".join(cur))
            cur = [w]
        else:
            cur = test
        if w[-1] in ".?!" and len(cur) >= 3:
            out.append(" ".join(cur))
            cur = []
    if cur:
        out.append(" ".join(cur))
    return out


def subs(c, chunks, t, vdur, size=54):
    if t < 0 or t > vdur + 0.3:
        return
    total = sum(len(x) for x in chunks)
    acc = 0
    cur = chunks[-1]
    for ch in chunks:
        dd = vdur * len(ch) / total
        if t < acc + dd:
            cur = ch
            break
        acc += dd
    lines = wrap(cur, font(size), 940)
    y0 = 1610 - (len(lines) - 1) * size * 0.6
    for i, ln in enumerate(lines):
        y = y0 + i * size * 1.22
        w = font(size).measureText(ln)
        c.drawRoundRect(RR(540 - w / 2 - 22, y - size * 0.95, w + 44, size * 1.3), 14, 14, F("#020611", 170))
        text(c, ln, 540, y, size, "#ffffff", a=255)




# ---------------- БЕЛГИЛЕР (эмодзинин ордуна) ----------------
def ic_snow(c, x, y, r, col=ICE, a=255):
    for k in range(6):
        th = k * math.pi / 3
        ex, ey = x + r * math.cos(th), y + r * math.sin(th)
        c.drawLine(x, y, ex, ey, S(col, r * 0.16, a))
        for sgn in (-1, 1):
            mx, my = x + r * .6 * math.cos(th), y + r * .6 * math.sin(th)
            c.drawLine(mx, my, mx + r * .3 * math.cos(th + sgn * .9), my + r * .3 * math.sin(th + sgn * .9), S(col, r * .12, a))


def ic_fire(c, x, y, r, a=255):
    p = skia.Path()
    p.moveTo(x, y - r)
    p.cubicTo(x + r * .9, y - r * .2, x + r * .8, y + r * .9, x, y + r)
    p.cubicTo(x - r * .8, y + r * .9, x - r * .9, y - r * .1, x - r * .2, y - r * .4)
    p.cubicTo(x - r * .1, y - r * .1, x + r * .1, y - r * .5, x, y - r)
    c.drawPath(p, F(WARM, a))
    c.drawCircle(x, y + r * .45, r * .38, F("#ffd166", a))


def ic_bat(c, x, y, r, a=255, lvl=0.35):
    c.drawRoundRect(RR(x - r, y - r * .5, r * 1.8, r), 6, 6, S(WHITE, r * .12, a))
    c.drawRect(RR(x + r * .8, y - r * .2, r * .2, r * .4), F(WHITE, a))
    c.drawRect(RR(x - r * .85, y - r * .35, r * 1.5 * lvl, r * .7), F(RED, a))


def ic_check(c, x, y, r, a=255):
    c.drawCircle(x, y, r, F(GREEN, a))
    c.drawPath(_path([(x - r * .45, y), (x - r * .1, y + r * .35), (x + r * .5, y - r * .35)]), S("#04210f", r * .2, a))


def ic_bell(c, x, y, r, a=255, rot=0):
    c.save()
    c.translate(x, y)
    c.rotate(rot)
    p = skia.Path()
    p.moveTo(-r * .7, r * .5)
    p.cubicTo(-r * .7, -r * .9, r * .7, -r * .9, r * .7, r * .5)
    p.lineTo(r * .9, r * .7)
    p.lineTo(-r * .9, r * .7)
    p.close()
    c.drawPath(p, F(AMBER, a))
    c.drawCircle(0, r * .85, r * .2, F(AMBER, a))
    c.restore()


def ic_phone(c, x, y, r, col, a=255):
    p = skia.Path()
    p.moveTo(x - r * .45, y - r * .5)
    p.cubicTo(x - r * .6, y + r * .1, x - r * .1, y + r * .6, x + r * .5, y + r * .45)
    c.drawPath(p, S(col, r * .3, a))


def _path(pts):
    p = skia.Path()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    return p


# ---------------- АДАМ (силуэт) ----------------
def rider(c, x, y, s, t, a=255):
    """Велосипеддеги адам: кышкы куртка, шапка, шарф — караңгы силуэт, неон кыры."""
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    jacket = lin(0, -620, 0, -250, [("#2a3550", a), ("#141b2b", a)])
    pa = t * 1.6 * 6 * 0.6
    # буттар (педальга)
    for k in (0, math.pi):
        px, py = BB[0] + 70 * math.cos(pa + k), BB[1] + 70 * math.sin(pa + k)
        knee = ((SEAT_TOP[0] + px) / 2 + 60, (SEAT_TOP[1] + py) / 2 - 40)
        c.drawPath(_path([(SEAT_TOP[0], SEAT_TOP[1] - 30), knee, (px, py)]), S("#10151f", 34, a))
    # дене
    body = skia.Path()
    body.moveTo(SEAT_TOP[0] - 40, SEAT_TOP[1] - 30)
    body.cubicTo(SEAT_TOP[0] - 30, -560, 20, -640, 80, -620)
    body.lineTo(110, -560)
    body.cubicTo(60, -520, 10, -420, SEAT_TOP[0] + 50, SEAT_TOP[1] - 20)
    body.close()
    c.drawPath(body, jacket)
    c.drawPath(body, S(CYAN, 2.5, int(a * .7)))
    # кол рулга
    c.drawPath(_path([(70, -600), (150, -500), (HEAD[0] - 50, HEAD[1] - 96)]), S("#1b2335", 30, a))
    c.drawCircle(HEAD[0] - 50, HEAD[1] - 96, 16, F("#0b0e15", a))
    # шарф жана баш
    c.drawRoundRect(RR(60, -650, 80, 34), 14, 14, F("#c0392b", a))
    sc = math.sin(t * 8) * 8
    c.drawPath(_path([(70, -630), (20, -610 + sc), (-10, -590 - sc)]), S("#c0392b", 16, a))
    c.drawCircle(110, -700, 52, F("#d6a77a", a))
    c.drawCircle(110, -700, 52, S(CYAN, 2, int(a * .5)))
    hat = skia.Path()
    hat.moveTo(56, -705)
    hat.cubicTo(60, -780, 160, -780, 164, -705)
    hat.close()
    c.drawPath(hat, F("#1f4fa8", a))
    c.drawCircle(110, -770, 14, F(WHITE, a))
    c.drawRect(RR(56, -716, 108, 16), F("#163b80", a))
    c.restore()


def person_carry(c, x, y, s, t, a=255):
    """Батареяны көтөрүп бараткан адамдын силуэти."""
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    step = math.sin(t * 7)
    for k, sg in ((0, 1), (1, -1)):
        c.drawPath(_path([(0, -300), (sg * step * 40, -150), (sg * step * 60, 0)]), S("#141b2b", 40, a))
    body = lin(0, -600, 0, -280, [("#2a3550", a), ("#141b2b", a)])
    c.drawRoundRect(RR(-70, -600, 140, 320), 50, 50, body)
    c.drawRoundRect(RR(-70, -600, 140, 320), 50, 50, S(AMBER, 2.5, int(a * .6)))
    c.drawPath(_path([(-50, -560), (40, -470), (110, -440)]), S("#1b2335", 30, a))
    c.drawPath(_path([(50, -560), (110, -480), (130, -450)]), S("#1b2335", 30, a))
    c.drawRoundRect(RR(-40, -640, 80, 30), 12, 12, F("#c0392b", a))
    c.drawCircle(0, -690, 50, F("#d6a77a", a))
    hat = skia.Path()
    hat.moveTo(-52, -695)
    hat.cubicTo(-48, -770, 48, -770, 52, -695)
    hat.close()
    c.drawPath(hat, F("#1f4fa8", a))
    c.drawCircle(0, -762, 13, F(WHITE, a))
    c.restore()


# ---------------- САХНАЛАР ----------------
def title(c, s, a, y=330, size=60, icon=None, col=WHITE, glow=CYAN):
    f = font(size)
    lines = wrap(s, f, W - 200)
    for i, ln in enumerate(lines):
        yy = y + i * size * 1.15
        wdt = f.measureText(ln)
        text(c, ln, W / 2 + (34 if icon and i == 0 else 0), yy, size, col, a=a, glow=glow)
        if icon and i == 0:
            icon(W / 2 - wdt / 2 - 20, yy - size * .35)


def scene1(c, t, d):
    bg(c, t, cold=1)
    c.drawRect(RR(0, 1300, W, 620), lin(0, 1300, 0, H, ["#cfe3f5", "#6f8fb3", "#1b2c48"], [0, .3, 1]))
    for i in range(8):
        x = ((i * 220 - t * 900) % (W + 300)) - 150
        c.drawRoundRect(RR(x, 1420, 120, 12), 6, 6, F("#ffffff", 140))
    z = 1.0 + 0.08 * ease((t - 1.0) / (d - 1.2))
    bx, by = 540 + BAT_POS[0] * .85, 1270 + BAT_POS[1] * .85
    c.save()
    c.translate(bx, by)
    c.scale(z, z)
    c.translate(-bx, -by)
    lvl = 1.0 - 0.62 * ease((t - 0.5) / (d - 0.7))
    ebike(c, 540, 1270, 0.85, t, 1.6, lvl, cold=0.8, mglow=.5)
    rider(c, 540, 1270, 0.85, t)
    c.restore()
    snow(c, t, 170, 1.0, -260)
    a = int(255 * eo((t - 0.4) / 0.5))
    hud_ring(c, 860, 620, 90, lvl, f"{int(round(lvl * 100))}%", GREEN if lvl > .5 else (AMBER if lvl > .25 else RED), a, "заряд")
    chip(c, 220, 600, "−15°C", "#7cc8ff", a, 42)
    ta = int(255 * eo(t / .5))
    title(c, "Суукта батарея эмнеге азаят?", ta, 360, 58, icon=lambda x, y: ic_snow(c, x, y, 26, ICE, ta))


def scene2(c, t, d):
    bg(c, t)
    title(c, "Батареянын ичинде эмне болот?", int(255 * eo(t / .5)), 300, 50)
    a1 = int(255 * eo((t - .3) / .5))
    a2 = int(255 * eo((t - 1.6) / .5))
    # жылуу: иондор тез
    text(c, "ЖЫЛУУ  +20°C", 140, 440, 34, WARM, align="l", a=a1)
    cell(c, 140, 510, 800, 220, t, 0.45, a1, cold=0)
    c.drawRoundRect(RR(140, 510, 800, 220), 26, 26, F(WARM, int(a1 * .08)))
    # суук: иондор жай
    text(c, "СУУК  −15°C", 140, 810, 34, "#7cc8ff", align="l", a=a2)
    cell(c, 140, 880, 800, 220, t, 0.05, a2, cold=1)
    # тизме
    items = [(lambda x, y, a: ic_fire(c, x, y, 24, a), "Жылуу = активдүү", WARM),
             (lambda x, y, a: ic_snow(c, x, y, 24, ICE, a), "Суук = жайлайт", "#7cc8ff"),
             (lambda x, y, a: ic_bat(c, x, y, 26, a), "Чакырым азаят", RED)]
    for k, (ic, s, col) in enumerate(items):
        a = int(255 * eo((t - d * 0.45 - k * 0.7) / .4))
        if a <= 0:
            continue
        y = 1180 + k * 90
        c.drawRoundRect(RR(200, y - 40, 680, 78), 39, 39, F(col, int(a * .12)))
        c.drawRoundRect(RR(200, y - 40, 680, 78), 39, 39, S(col, 2, a))
        ic(262, y, a)
        text(c, s, 320, y + 14, 38, WHITE, align="l", a=a)


def scene3(c, t, d):
    warm = ease(t / 1.0)
    bg(c, t, warm=warm)
    ta = int(255 * eo(t / .5))
    title(c, "Батареяны жылууда сакта", ta, 330, 56, icon=lambda x, y: ic_check(c, x, y, 28, ta), glow=AMBER)
    house(c, 630, 900, 0.9, int(255 * warm))
    # бөлмөдөгү жылуу жарык
    c.drawCircle(630, 1000, 220, F(AMBER, int(60 * warm), blur=80))
    pr = ease((t - 0.2) / (d * 0.6))
    px = 110 + pr * 520
    person_carry(c, px, 1260, 0.62, t if pr < 1 else 0)
    battery(c, px + 0.62 * 125, 1260 - 0.62 * 460, 170, 44, 0.9, t, 255, 0, cold=max(0, 1 - pr * 1.3))
    tt = ease((t - 0.8) / (d - 1.2))
    thermo(c, 985, 1220, 280, 0.2 + 0.7 * tt, AMBER if tt > .5 else "#7cc8ff", f"{int(-15 + 35 * tt):+d}°C".replace("-", "−"), int(255 * warm))


LOGO = skia.Image.open("logo.png")


def phone_pill(c, cx, cy, sc, a, size=74):
    c.save()
    c.translate(cx, cy)
    c.scale(sc, sc)
    c.drawRoundRect(RR(-400, -75, 800, 150), 75, 75, F("#5fbf2a", int(a * .45), blur=24))
    c.drawRoundRect(RR(-400, -75, 800, 150), 75, 75, F("#4caf28", a))
    c.drawCircle(-315, 0, 46, F("#ffffff", a))
    ic_phone(c, -315, 0, 44, "#4caf28", a)
    text(c, "0702 088 089", 50, 26, size, WHITE, a=a)
    c.restore()


def scene4(c, t, d):
    bg(c, t)
    sw = SPLIT4  # кийинки бөлүккө өтүү (реклама)
    if t < sw + 0.4:
        a = int(255 * min(eo(t / .5), 1 - ease((t - sw) / .4)))
        ic_bell(c, 270, 300, 28, a, math.sin(t * 12) * 15)
        text(c, "Кийинки видеодо:", 580, 315, 46, WHITE, a=a, glow=CYAN)
        for k, (lab, sub, col, lvl) in enumerate([("ЛИТИЙ-ИОН", "Li-ion", CYAN, .8), ("ТЕМИР ФОСФАТ", "LiFePO4", GREEN, .8)]):
            x = 290 + k * 500
            pa = int(a * eo((t - .3 - k * .3) / .5))
            battery(c, x, 720, 330, 90, lvl, t, pa, -90, glow=1)
            text(c, lab, x, 980, 40, col, a=pa, glow=col)
            text(c, sub, x, 1030, 32, "#9fc3f0", b=False, a=pa)
        p = eo((t - .9) / .4)
        sc = 1 + .06 * math.sin(t * 6)
        c.drawCircle(540, 720, 70 * p, F(RED, int(a * .5), blur=30))
        text(c, "VS", 540, 745, int(76 * p * sc) + 1, WHITE, a=a, glow=RED)
        # телефон (1-жолу)
        ba = int(a * eo((t - 1.4) / .4))
        c.drawRoundRect(RR(110, 1140, 860, 110), 55, 55, F("#0f2a14", int(ba * .9)))
        c.drawRoundRect(RR(110, 1140, 860, 110), 55, 55, S("#5fbf2a", 2.5, ba))
        text(c, "Jorgo Eco Service · 0702 088 089", 540, 1208, 40, WHITE, a=ba)
    if t > sw:
        tt = t - sw
        p = eo(tt / 0.6)
        cw, chh = 900, 520
        x0, y0 = (W - cw) / 2, 300 + 40 * (1 - p)
        c.drawRoundRect(RR(x0, y0, cw, chh), 44, 44, F("#7bd23a", int(90 * p), blur=50))
        c.drawRoundRect(RR(x0, y0, cw, chh), 44, 44, F("#ffffff", int(255 * p)))
        lw = cw - 80
        lh = lw * LOGO.height() / LOGO.width()
        paint = skia.Paint(AntiAlias=True)
        paint.setAlphaf(p)
        c.drawImageRect(LOGO, RR(x0 + 40, y0 + (chh - lh) / 2, lw, lh), skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear), paint)
        a2 = int(255 * eo((tt - .4) / .5))
        # ачкыч белгиси
        text(c, "Батарейкаңызда көйгөй болсо:", 540, 935, 44, WHITE, a=a2)
        a3 = int(255 * eo((tt - .8) / .5))
        phone_pill(c, 540, 1080, 1 + 0.03 * math.sin(t * 5), a3)  # телефон (2-жолу)


SCENES = [scene1, scene2, scene3, scene4]


# ---------------- ЖЫЙНОО ----------------
LINES = json.load(open("lines.json", encoding="utf-8"))


def load_voice(i):
    with wave.open(f"voice/{i}.wav") as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return resample_poly(a, SR, 16000).astype(np.float32)


N = len(LINES)
VOICES = [load_voice(i + 1) for i in range(N)]
LEAD = 0.15
TOTAL = 35.0
DUR = [len(v) / SR + 0.3 for v in VOICES]
DUR[-1] += TOTAL - sum(DUR)
TOTAL_F = int(round(TOTAL * FPS))
STARTS = list(np.cumsum([0] + DUR[:-1]))
CHUNKS = [chunks_of(l["sub"]) for l in LINES]
_s4 = LINES[3]["sub"]
SPLIT4 = LEAD + (len(VOICES[3]) / SR) * (_s4.index("Батарейкаңызда") / len(_s4)) - 0.2


def scene_at(c, i, gt):
    SCENES[i](c, gt - STARTS[i], DUR[i])


def frame(fi, with_subs=True):
    gt = fi / FPS
    surf = skia.Surface.MakeRaster(skia.ImageInfo.Make(W, H, skia.kRGBA_8888_ColorType, skia.kPremul_AlphaType))
    c = surf.getCanvas()
    i = max(k for k in range(N) if STARTS[k] <= gt + 1e-9)
    scene_at(c, i, gt)
    if i < N - 1 and gt > STARTS[i + 1] - XF:
        a = ease((gt - (STARTS[i + 1] - XF)) / XF)
        c.saveLayerAlpha(None, int(255 * a))
        scene_at(c, i + 1, gt)
        c.restore()
    if with_subs:
        subs(c, CHUNKS[i], gt - STARTS[i] - LEAD, len(VOICES[i]) / SR)
    if gt < 0.3:
        c.drawRect(RR(0, 0, W, H), F("#000000", int(255 * (1 - gt / .3))))
    if gt > TOTAL - 0.4:
        c.drawRect(RR(0, 0, W, H), F("#000000", int(255 * ease((gt - (TOTAL - 0.4)) / .4))))
    return surf.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType)


def render_part(args):
    k, f0, f1, ws = args
    path = f"out/tmp/part{k}{'s' if ws else 'n'}.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for fi in range(f0, f1):
        p.stdin.write(frame(fi, ws).tobytes())
    p.stdin.close()
    p.wait()
    return path


def music():
    """Жеңил, позитивдүү фон: C – G – Am – F, жаркын арпеджио."""
    n = int(TOTAL * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    prog = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]]
    bar = 2.0
    for b in range(int(TOTAL / bar) + 1):
        st, en = int(b * bar * SR), min(n, int((b + 1) * bar * SR + SR // 2))
        if st >= n:
            break
        tt = t[st:en] - b * bar
        env = np.minimum(1, tt / .15) * np.exp(-tt * .6)
        for f in prog[b % 4]:
            out[st:en] += 0.06 * (np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt)) * env
    step = 0.25
    for k in range(int(TOTAL / step)):
        ch = prog[int(k * step / bar) % 4]
        f = ch[k % 3] * 2
        st = int(k * step * SR)
        L = min(int(.2 * SR), n - st)
        tt = np.arange(L) / SR
        out[st:st + L] += 0.04 * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18)
    for k in range(int(TOTAL / .5)):  # жумшак кик
        st = int(k * .5 * SR)
        L = min(int(.2 * SR), n - st)
        tt = np.arange(L) / SR
        out[st:st + L] += 0.18 * np.sin(2 * np.pi * (60 + 40 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14)
    rng = np.random.default_rng(1)
    for k in range(int(TOTAL / .5)):  # шейкер
        st = int((k * .5 + .25) * SR)
        L = min(int(.04 * SR), n - st)
        if L > 0:
            out[st:st + L] += 0.03 * rng.standard_normal(L) * np.exp(-np.arange(L) / SR * 90)
    for s in STARTS[1:] + [STARTS[3] + SPLIT4]:  # өтүү "whoosh"
        st = int((s - .3) * SR)
        L = int(.5 * SR)
        noise = np.convolve(rng.standard_normal(L), np.ones(20) / 20, "same")
        out[st:st + L] += 0.25 * noise * np.sin(np.linspace(0, np.pi, L)) ** 2
    out[:int(.4 * SR)] *= np.linspace(0, 1, int(.4 * SR))
    out[-int(1.0 * SR):] *= np.linspace(1, 0, int(1.0 * SR))
    return out / np.abs(out).max()


def audio():
    n = int(TOTAL * SR)
    v = np.zeros(n, np.float32)
    for i, a in enumerate(VOICES):
        st = int((STARTS[i] + LEAD) * SR)
        v[st:st + len(a)] += a[: n - st]
    m = music()
    env = np.convolve(np.abs(v), np.ones(SR // 5) / (SR // 5), "same")
    duck = 1 - 0.5 * np.clip(env / (env.max() * .3), 0, 1)
    mix = v + m * 0.15 * duck
    mix /= max(1, np.abs(mix).max() / 0.95)
    with wave.open("out/tmp/mix.wav", "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())


def build(ws, pool, name):
    parts = 8
    edges = [round(TOTAL_F * k / parts) for k in range(parts + 1)]
    paths = pool.map(render_part, [(k, edges[k], edges[k + 1], ws) for k in range(parts)])
    with open("out/tmp/list.txt", "w") as f:
        for p in paths:
            f.write(f"file '{os.path.abspath(p)}'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "out/tmp/list.txt", "-i", "out/tmp/mix.wav",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{TOTAL_F / FPS:.3f}", "-movflags", "+faststart", f"out/{name}"], check=True)
    print("даяр:", name, flush=True)


if __name__ == "__main__":
    os.makedirs("out/tmp", exist_ok=True)
    print("сахналар:", [round(x, 2) for x in DUR], "жалпы", round(sum(DUR), 2))
    if sys.argv[1:] == ["preview"]:
        from PIL import Image
        os.makedirs("out/preview", exist_ok=True)
        for i in range(N):
            for frac in (0.25, 0.8):
                fi = int((STARTS[i] + DUR[i] * frac) * FPS)
                Image.fromarray(frame(fi)).convert("RGB").save(f"out/preview/s{i + 1}_{int(frac * 100)}.png")
        print("preview ok")
    else:
        audio()
        with Pool(4) as pool:
            build(True, pool, "ebike_kyshta_v2.mp4")
            build(False, pool, "ebike_kyshta_v2_subtitrsiz.mp4")
