"""Сахналар: ар бир функция (c, t, d, k) алат — t: убакыт, d: узактык, k: контекст."""
import math
import random
from draw import *

W, H = 1080, 1920
FLOOR = 1340


def blink(t, seed=0):
    p = (t + seed * 1.37) % 3.4
    return p < 0.12


class K:  # контекст
    def __init__(self, amp):
        self.amp = amp  # amp(t) -> 0..1 үндүн катуулугу

    def talk(self, t):
        return min(1.0, self.amp(t) * 1.6)


def pop(t, start, dur=0.45):
    return back((t - start) / dur) if t > start else 0.0


# ================= 1-СЕРИЯ =================
def s_shock_bag(c, t, d, k):
    background(c, W, H, t)
    floor(c, W, FLOOR)
    rnd = random.Random(3)
    for i in range(22):  # учуп жаткан акчалар
        x0 = rnd.uniform(60, W - 60)
        sp = rnd.uniform(140, 260)
        y = -100 + ((t * sp + rnd.uniform(0, 1400)) % 1500)
        bill(c, x0 + math.sin(t * 2 + i) * 40, y, rnd.uniform(0.7, 1.1), t * rnd.uniform(-120, 120) + i * 30, 230)
    sc = 1.15 + 0.08 * (1 - ease(t / 0.35))
    shake = math.sin(t * 60) * 6 * max(0, 1 - t / 0.6)

    def held(c, hp):
        money_bag(c, 0, -330, 1.25, glow=0.6 + 0.4 * math.sin(t * 5))
        for hx, hy in hp:
            c.drawCircle(hx, hy, 27, F(OUT))
            c.drawCircle(hx, hy, 23, F(SKIN))
    hero(c, 540 + shake, FLOOR + 20, sc, "shock", ("hold", "hold"), (0, -0.2), blink(t), k.talk(t) * 0.8,
         bob=math.sin(t * 8) * 3, held=held)
    p = pop(t, 0.25)
    if p:
        text(c, "!", 860, 520, 220 * p, YELLOW, outline=OUT, ow=12)
        text(c, "!", 220, 600, 160 * p, YELLOW, outline=OUT, ow=10)
    p2 = pop(t, 0.6)
    if p2:
        pill(c, 540, 360, "$1 000 000", "#16a34a", 70, scale=p2)


def s_calendar(c, t, d, k):
    background(c, W, H, t)
    floor(c, W, FLOOR)
    days_t = min(1, t / (d * 0.85))
    day = 1 + int(29 * ease(days_t * 1.05) if days_t < 1 else 29)
    flip = (days_t * 29) % 1 if days_t < 1 else 0
    calendar(c, 770, 560, day, flip, 1.15)
    # саат
    c.drawCircle(250, 330, 92, F(OUT))
    c.drawCircle(250, 330, 82, F("#f8fafc"))
    for i in range(12):
        a = i * math.pi / 6
        c.drawLine(250 + 66 * math.sin(a), 330 - 66 * math.cos(a), 250 + 74 * math.sin(a), 330 - 74 * math.cos(a), S(OUT, 5))
    a1, a2 = t * 9, t * 0.75
    c.drawLine(250, 330, 250 + 60 * math.sin(a1), 330 - 60 * math.cos(a1), S("#e11d48", 6))
    c.drawLine(250, 330, 250 + 40 * math.sin(a2), 330 - 40 * math.cos(a2), S(OUT, 9))
    chair(c, 370, FLOOR, 1.0)
    money_bag(c, 690, FLOOR - 90, 0.95)
    hero(c, 370, FLOOR - 2, 1.0, "calm", ("knee", "knee"), (0.5 * math.sin(t * 0.8), 0), blink(t, 1),
         pose="sit", bob=math.sin(t * 2) * 3)
    if days_t >= 0.98:
        p = pop(t, d * 0.85)
        pill(c, 770, 860, "1 АЙ ӨТТҮ", "#e11d48", 48, scale=p)


def s_three_stacks(c, t, d, k):
    background(c, W, H, t)
    floor(c, W, FLOOR)
    rrect(c, 300, 1010, 760, 40, 12, F("#5b3a29"))
    rrect(c, 330, 1050, 30, 290, 6, F("#4a2f21"))
    rrect(c, 1000, 1050, 30, 290, 6, F("#4a2f21"))
    labels = [("БИЗНЕС", "#2563eb", 420), ("ЗАПАС", "#16a34a", 640), ("ӨНҮКТҮРҮҮ", "#9333ea", 880)]
    for i, (lab, col, x) in enumerate(labels):
        st = 0.3 + i * d * 0.2
        n = int(14 * ease((t - st) / 1.0)) if t > st else 0
        stack(c, x, 1010, n, 170)
        p = pop(t, st + 0.5)
        if p:
            pill(c, x, 700 - i * 0, lab, col, 34, scale=p)
            # белгиси
            c.save()
            c.translate(x, 590)
            c.scale(p, p)
            c.drawCircle(0, 0, 58, F(OUT))
            c.drawCircle(0, 0, 52, F(col))
            if i == 0:
                rrect(c, -26, -14, 52, 38, 4, F("#ffffff"))
                poly(c, [(-34, -12), (0, -36), (34, -12)], F("#ffffff"))
            elif i == 1:
                poly(c, [(0, -34), (30, -22), (26, 10), (0, 32), (-26, 10), (-30, -22)], F("#ffffff"))
            else:
                c.drawLine(0, 30, 0, -10, S("#ffffff", 8))
                oval(c, -16, -16, 18, 10, F("#ffffff"))
                oval(c, 16, -26, 18, 10, F("#ffffff"))
            c.restore()
    hero(c, 170, FLOOR + 10, 0.82, "smile" if t > 1.5 else "neutral", ("down", "point"), (0.8, 0), blink(t, 2),
         bob=math.sin(t * 2) * 3)


def s_growth_shop(c, t, d, k):
    background(c, W, H, t)
    floor(c, W, FLOOR)
    chart(c, 110, 290, 860, 480, ease(t / (d * 0.55)), t)
    text(c, "+1 ЖЫЛ", 540, 820, 54, "#22c55e", outline=OUT, ow=8, a=int(255 * ease((t - 1) / 0.5)))
    p = pop(t, d * 0.45, 0.6)
    if p:
        shop(c, 780, FLOOR, 0.95 * p, light=1)
        for i in range(5):
            a = int(255 * (0.5 + 0.5 * math.sin(t * 4 + i)))
            sparkle(c, 600 + i * 90, 820 + (i % 2) * 70, 16, a)
    hero(c, 260, FLOOR + 10, 0.9, "happy" if t > d * 0.5 else "smile", ("down", "point"), (0.8, -0.2),
         blink(t, 3), bob=math.sin(t * 3) * 4)


def s_door_knock(c, t, d, k):
    background(c, W, H, t, dark=0.6)
    floor(c, W, FLOOR, "#0a1428")
    knocks = [0.35, 0.65, 0.95]
    shake = sum(math.sin((t - kt) * 90) * 10 * max(0, 1 - (t - kt) / 0.18) for kt in knocks if t > kt)
    op = ease((t - d * 0.38) / 0.8)

    def inside(c):
        if op > 0.05:
            stranger(c, 0, 0, 0.78, "silhouette", look=(-1, 0), glow=op)
    door(c, 720, FLOOR, op, shake, 1.0, inside=inside)
    for kt in knocks:
        if 0 < t - kt < 0.5:
            a = int(255 * (1 - (t - kt) / 0.5))
            text(c, "ТЫК!", 720 + (kt * 400 % 160) - 80, 640 - (t - kt) * 120, 70, YELLOW, a=a, outline=OUT, ow=8)
    hero(c, 250, FLOOR + 10, 0.92, "worried" if t > 0.4 else "neutral", ("down", "down"), (1, 0), blink(t, 4),
         bob=math.sin(t * 2) * 2)
    if op > 0.3:
        qmark(c, 250, 600, 120, int(255 * min(1, op)))


def s_to_camera(c, t, d, k, ep_next="2-БӨЛҮК", expr="neutral"):
    background(c, W, H, t)
    zoom = 1.75 + 0.06 * t / d
    hero(c, 540, 2120 + 10 * math.sin(t * 2), zoom, expr, ("down", "point") if t > 1.2 else ("down", "down"),
         (0, 0), blink(t, 5), k.talk(t), bob=math.sin(t * 2) * 3)
    p = pop(t, d * 0.35)
    if p:
        bubble(c, 820, 330, "💬", scale=0) if False else None
        c.save()
        c.translate(830, 400)
        c.scale(p, p)
        rrect(c, -110, -80, 220, 150, 40, F(OUT))
        rrect(c, -104, -74, 208, 138, 36, F("#ffffff"))
        poly(c, [(-60, 60), (-90, 120), (-10, 60)], F("#ffffff"))
        for i in range(3):
            c.drawCircle(-50 + i * 50, -5, 14, F("#111827"))
        c.restore()
    p2 = pop(t, d * 0.65)
    if p2:
        pill(c, 280, 400, ep_next + " →", "#e11d48", 50, scale=p2)


# ================= 2-СЕРИЯ =================
def s_stranger_door(c, t, d, k):
    background(c, W, H, t, dark=0.4)
    floor(c, W, FLOOR, "#0a1428")

    def inside(c):
        stranger(c, 0, 0, 0.8, "face", "smirk", look=(-1, 0), blink=blink(t, 6))
    door(c, 730, FLOOR, 1.0, 0, 1.0, inside=inside)
    hero(c, 260, FLOOR + 10, 0.92, "suspicious", ("cross", "cross"), (1, 0), blink(t, 7), bob=math.sin(t * 2) * 2)
    p = pop(t, d * 0.45)
    if p:
        qmark(c, 330, 560, 110 * p, 255)
    p2 = pop(t, 0.4)
    if p2:
        bubble(c, 760, 540, "Акча меники!", "#fef3c7", size=44, tail=(0, 1), scale=p2)


def s_confused_stranger(c, t, d, k):
    background(c, W, H, t, dark=0.3)
    floor(c, W, FLOOR)
    lines = ["$1 000 000!", "Мен... таптым", "Жок, жоготтум!", "Ммм... досум\nберген"]
    hero_b = t < d * 0.22
    stranger(c, 760, FLOOR + 10, 0.95, "face", "nervous" if not hero_b else "smirk",
             look=(math.sin(t * 5) * 1, 0), blink=blink(t, 8), arms=("down", "hip"), step=0,
             talk=0 if hero_b else k.talk(t) * 0.7)
    hero(c, 250, FLOOR + 10, 0.9, "suspicious" if not hero_b else "talk", ("cross", "cross") if not hero_b else ("down", "point"),
         (1, 0), blink(t, 9), 0, bob=math.sin(t * 2) * 2)
    if hero_b:
        p = pop(t, 0.15)
        bubble(c, 330, 560, "Далил көрсөт!", "#ffffff", size=46, tail=(0, 1), scale=p)
    else:
        seg = (d * 0.78) / len(lines)
        i = min(len(lines) - 1, int((t - d * 0.22) / seg))
        st = d * 0.22 + i * seg
        p = pop(t, st, 0.35)
        bubble(c, 700, 470 + (i % 2) * 30, lines[i], "#fef3c7", size=46, tail=(0.3, 1), scale=p)
        for j in range(3):
            a = int(200 * (0.5 + 0.5 * math.sin(t * 6 + j)))
            qmark(c, 600 + j * 150, 320 + (j % 2) * 40, 70, a, "#fca5a5")


def s_phone_check(c, t, d, k):
    background(c, W, H, t)
    floor(c, W, FLOOR)
    phone(c, 600, 720, 1.0)
    # экрандын ичи
    load = ease(t / (d * 0.45))
    rrect(c, 420, 360, 360, 70, 35, F("#e2e8f0"))
    text(c, "Издөө...", 520, 408, 34, "#475569", bold=False)
    c.drawCircle(450, 395, 14, S("#475569", 5))
    c.drawCircle(600, 600, 100, F("#cbd5e1"))
    c.drawCircle(600, 570, 40, F("#94a3b8"))
    oval(c, 600, 650, 70, 40, F("#94a3b8"))
    text(c, "Аты:", 600, 770, 40, "#334155", bold=False)
    text(c, "«Марат Асанов»", 600, 830, 46, "#0f172a")
    rrect(c, 430, 880, 340, 22, 11, F("#e2e8f0"))
    rrect(c, 430, 880, 340 * load, 22, 11, F("#ef4444" if load >= 1 else "#3b82f6"))
    for i, row in enumerate(["Дареги: ???", "Документ: жок", "Тааныштар: жок"]):
        a = int(255 * ease((t - 0.6 - i * 0.4) / 0.4))
        text(c, row, 600, 970 + i * 60, 36, "#64748b", bold=False, a=a)
    px = pop(t, d * 0.5, 0.35)
    if px:
        c.save()
        c.translate(600, 720)
        c.scale(px, px)
        c.drawLine(-170, -170, 170, 170, S("#dc2626", 44))
        c.drawLine(170, -170, -170, 170, S("#dc2626", 44))
        c.restore()
        c.save()
        c.translate(600, 1230)
        c.rotate(-6)
        c.scale(px, px)
        rrect(c, -160, -54, 320, 108, 14, S("#dc2626", 10))
        text(c, "ЖАЛГАН", 0, 24, 66, "#dc2626")
        c.restore()
    hero(c, 170, FLOOR + 10, 0.72, "suspicious" if t < d * 0.5 else "shock", ("down", "phone"), (0.7, -0.5),
         blink(t, 10), bob=math.sin(t * 2) * 2)


def s_stranger_leaves(c, t, d, k):
    background(c, W, H, t, dark=0.5 + 0.3 * t / d)
    floor(c, W, FLOOR, "#0a1428")
    door(c, 940, FLOOR, 1.0, 0, 0.9)
    prog = ease(t / (d * 0.75))
    sx = 520 + prog * 420
    angry = t > d * 0.45
    stranger(c, sx, FLOOR + 10, 0.9, "face", "angry" if angry else "nervous", look=(-1, 0) if angry else (1, 0),
             blink=blink(t, 11), step=t * 1.6 if prog < 1 else 0, talk=k.talk(t) * 0.6 if angry else 0)
    hero(c, 220, FLOOR + 10, 0.9, "worried", ("down", "down"), (1, 0), blink(t, 12), bob=math.sin(t * 2) * 2)
    if angry:
        p = pop(t, d * 0.5)
        bubble(c, 610, 470, "Сен менден качып\nкутула албайсың!", "#7f1d1d", "#fee2e2", 42, tail=(0.8, 1), scale=p)
        c.drawRect(R(0, 0, W, H), F("#7f1d1d", int(50 * p)))


def s_question(c, t, d, k):
    background(c, W, H, t)
    floor(c, W, FLOOR)
    for i in range(7):
        a = int(110 + 80 * math.sin(t * 2 + i))
        qmark(c, 120 + (i * 160) % 900, 420 + (i * 97) % 400 + math.sin(t + i) * 20, 70, a, "#93c5fd")
    hero(c, 540, FLOOR + 10, 1.12, "think", ("down", "chin"), (0.6, -0.8), blink(t, 13), k.talk(t) * 0.5,
         bob=math.sin(t * 2) * 3)
    sc = 1 + 0.08 * math.sin(t * 4)
    qmark(c, 540, 470, int(230 * sc * pop(t, 0.2)), 255)
    p = pop(t, d * 0.55)
    if p:
        pill(c, 300, 330, "3-БӨЛҮК", "#e11d48", 48, scale=p)
    p2 = pop(t, d * 0.72)
    if p2:
        pill(c, 740, 330, "ЖАЗЫЛ", "#dc2626", 48, scale=p2)
        bell(c, 900, 330, 0.8 * p2, math.sin(t * 14) * 18)


# ================= 3-СЕРИЯ =================
def s_night(c, t, d, k):
    background(c, W, H, t, dark=0.8, tint=("#0b1a4a", 90))
    floor(c, W, FLOOR, "#0a1430")
    moon_window(c, 760, 560, 1.0, t)
    # керебет
    rrect(c, 80, 1100, 560, 120, 20, F("#1e3a8a"))
    rrect(c, 80, 1060, 160, 70, 30, F("#e2e8f0", 200))
    rrect(c, 70, 1000, 30, 340, 8, F("#3f2a1d"))
    rrect(c, 620, 1100, 30, 240, 8, F("#3f2a1d"))
    hero(c, 420, FLOOR, 0.95, "worried", ("knee", "knee"), (0.6, -0.3), blink(t, 14), pose="sit",
         bob=math.sin(t * 1.5) * 2)
    a = int(150 * (0.5 + 0.5 * math.sin(t * 2.5)))
    text(c, "...качып кутула албайсың", 540, 330, 50, "#f87171", a=a)
    text(c, "...качып кутула албайсың", 560, 400, 34, "#f87171", a=a // 2)


def s_old_shop(c, t, d, k):
    background(c, W, H, t, dark=0.2)
    floor(c, W, FLOOR, "#111c30")
    # көчө чырагы
    rrect(c, 120, 520, 18, 820, 6, F("#334155"))
    c.drawCircle(129, 520, 60, F("#fde68a", 60, blur=30))
    c.drawCircle(129, 520, 24, F("#fde68a"))
    shop(c, 810, FLOOR, 0.9, old=True, sign="ЭСКИ ДҮКӨН", light=1)
    om_wave = t > d * 0.55
    oldman(c, 440, FLOOR + 10, 0.8, "smile", look=(-1, 0), blink=blink(t, 15),
           arms=("down", "wave") if om_wave else ("down", "down"))
    hx = -100 + 290 * ease(t / (d * 0.5))
    walking = t < d * 0.5
    hero(c, hx, FLOOR + 10 - (abs(math.sin(t * 7)) * 12 if walking else 0), 0.86, "neutral" if walking else "smile",
         ("down", "down") if walking else ("down", "wave"), (1, 0), blink(t, 16))


def s_flashback(c, t, d, k):
    background(c, W, H, t)
    floor(c, W, FLOOR)
    oldman(c, 300, FLOOR + 10, 0.8, "smile", look=(0.6, -0.3), blink=blink(t, 17), talk=k.talk(t),
           arms=("down", "down"), t=t)
    hero(c, 830, FLOOR + 10, 0.76, "worried" if t > d * 0.55 else "neutral", ("down", "down"), (-1, 0), blink(t, 18))
    p = ease(t / 0.6)
    x0, y0, w, h = 110, 270, 860, 450
    c.save()
    c.translate(540, 495)
    c.scale(0.9 + 0.1 * p, 0.9 + 0.1 * p)
    c.translate(-540, -495)
    rrect(c, x0 - 8, y0 - 8, w + 16, h + 16, 36, F(OUT, int(255 * p)))
    rrect(c, x0, y0, w, h, 30, F("#e7d7b5", int(255 * p)))
    c.save()
    c.clipRect(R(x0, y0, w, h))
    if p > 0.3:
        c.drawRect(R(x0, y0 + h - 90, w, 90), F("#c9b48a"))
        rrect(c, 180, 560, 300, 26, 8, F("#8b5e3c"))
        kid(c, 260, 680, 0.5, False, t, "#60a5fa")
        kid(c, 420, 680, 0.5, True, t + 1, "#f472b6")
        rrect(c, 560, 500, 110, 130, 28, F("#bfdbfe", 200))
        stack(c, 615, 620, 5, 80)
        text(c, "ОКУУ", 615, 488, 32, "#7c2d12")
        sp = ease((t - d * 0.5) / 1.0)
        if sp > 0:
            rrect(c, 800, y0, 170, h, 0, F("#8d7b5c"))
            stranger(c, 890 - 80 * sp, 740, 0.5, "silhouette", look=(-1, 0), glow=sp)
            rrect(c, 845, y0, 125, h, 0, F("#8d7b5c"))
    c.drawRect(R(x0, y0, w, h), F("#a0522d", 40))
    c.restore()
    text(c, "1 ЖЫЛ МУРУН", 400, y0 + 60, 42, "#7c2d12", a=int(255 * p))
    c.restore()
    poly(c, [(280, 726), (330, 726), (300, 770)], F("#e7d7b5", int(255 * p)))


def s_return_bag(c, t, d, k):
    background(c, W, H, t)
    floor(c, W, FLOOR)
    tr = ease((t - d * 0.15) / (d * 0.25))
    happy = t > d * 0.4
    bx = 760 + (330 - 760) * tr
    by = 1010 - math.sin(tr * math.pi) * 120

    oldman(c, 280, FLOOR + 10, 0.92, "happy" if happy else "smile", look=(1, 0), blink=blink(t, 19),
           arms=("hold", "hold") if happy else ("down", "give"), tears=1.0 if happy else 0, t=t)
    hero(c, 800, FLOOR + 10, 0.92, "smile", ([(-190, -400), (-280, -380)], [(-120, -380), (-210, -350)]) if tr < 1
         else ("down", "down"), (-1, 0), blink(t, 20), bob=math.sin(t * 2) * 2)
    money_bag(c, bx, by, 0.95, glow=0.5)
    # пайда — баатырда калган тыйындар
    stack(c, 990, FLOOR, int(6 * ease((t - d * 0.6) / 0.8)), 110)
    if t > d * 0.6:
        pill(c, 990, FLOOR - 160, "ПАЙДА", "#16a34a", 30, scale=pop(t, d * 0.6))
    if happy:
        for i in range(6):
            ph = (t * 0.5 + i / 6) % 1
            heart(c, 260 + math.sin(i * 2 + t) * 120, 680 - ph * 300, 0.8, int(255 * (1 - ph)))


def s_smile(c, t, d, k):
    background(c, W, H, t)
    for i in range(10):
        a = int(255 * (0.5 + 0.5 * math.sin(t * 3 + i * 1.3)))
        sparkle(c, 100 + (i * 113) % 880, 250 + (i * 171) % 700, 18 + (i % 3) * 8, a)
    hero(c, 540, 2120 + 10 * math.sin(t * 2), 1.75 + 0.06 * t / d, "smile", ("down", "wave") if t > d * 0.5 else ("down", "down"),
         (0, 0), blink(t, 21), k.talk(t), bob=math.sin(t * 2) * 3)
    p = pop(t, 0.3)
    pill(c, 540, 340, "АДАЛ ЖОЛ УТАТ", "#16a34a", 52, scale=p)
    p2 = pop(t, d * 0.6)
    if p2:
        pill(c, 440, 470, "ЖАЗЫЛ", "#dc2626", 46, scale=p2)
        bell(c, 620, 470, 0.75 * p2, math.sin(t * 14) * 18)


SCENES = {
    "shock_bag": s_shock_bag, "calendar": s_calendar, "three_stacks": s_three_stacks,
    "growth_shop": s_growth_shop, "door_knock": s_door_knock,
    "to_camera": lambda c, t, d, k: s_to_camera(c, t, d, k, "2-БӨЛҮК"),
    "stranger_door": s_stranger_door, "confused_stranger": s_confused_stranger,
    "phone_check": s_phone_check, "stranger_leaves": s_stranger_leaves, "question": s_question,
    "night": s_night, "old_shop": s_old_shop, "flashback": s_flashback, "return_bag": s_return_bag,
    "smile": s_smile,
}


# ================= СУБТИТР ЖАНА БАШ ТАМГА =================
def sub_chunks(s, maxw=920, size=62):
    f = font(size)
    words = s.split()
    chunks, cur = [], []
    for w in words:
        test = cur + [w]
        lines = wrap_lines(" ".join(test), f, maxw)
        if len(lines) > 2 or (len(test) > 10):
            chunks.append(" ".join(cur))
            cur = [w]
        else:
            cur = test
        if w.rstrip("»«")[-1:] in ".?!:" and len(cur) >= 4:
            chunks.append(" ".join(cur))
            cur = []
    if cur:
        chunks.append(" ".join(cur))
    return [ch for ch in chunks if ch]


def wrap_lines(s, f, maxw):
    lines, cur = [], ""
    for w in s.split():
        t = (cur + " " + w).strip()
        if f.measureText(t) <= maxw:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_subs(c, chunks, t, start, vdur, size=62):
    if not chunks:
        return
    total = sum(len(ch) for ch in chunks)
    acc = start
    cur = None
    for ch in chunks:
        dd = vdur * len(ch) / total
        if t < acc + dd:
            cur, cst = ch, acc
            break
        acc += dd
    if cur is None:
        cur, cst = chunks[-1], acc - vdur * len(chunks[-1]) / total
    p = back((t - cst) / 0.18) if t >= cst else 0
    f = font(size)
    lines = wrap_lines(cur, f, 920)
    base = 1560 - (len(lines) - 1) * size * 0.6
    c.save()
    c.translate(540, base)
    sc = 0.85 + 0.15 * min(1, p)
    c.scale(sc, sc)
    for i, ln in enumerate(lines):
        y = i * size * 1.2 + size * 0.35
        text(c, ln, 4, y + 6, size, "#000000", a=140)
        text(c, ln, 0, y, size, YELLOW, outline=OUT, ow=12)
    c.restore()


def draw_label(c, ep, title):
    pill(c, 540, 118, f"{ep}-БӨЛҮК", "#e11d48", 30)
    text(c, title, 540, 200, 36, "#ffffff", outline=OUT, ow=7)
