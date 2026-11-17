"""Сценарийден (script.json) TikTok/Shorts (9:16) жана YouTube (16:9) видео жасайт.
Колдонуу: python3 make_video.py script.json [vertical|horizontal|both]"""
import json, math, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FPS = 30
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
PALETTES = [((230, 57, 70), (29, 53, 87)), ((255, 140, 0), (120, 20, 90)),
            ((0, 150, 199), (3, 4, 94)), ((46, 196, 182), (1, 22, 39)),
            ((255, 89, 94), (106, 76, 147)), ((138, 201, 38), (25, 70, 50)),
            ((255, 202, 58), (200, 40, 60))]

def ease(t): t = max(0, min(1, t)); return 1 - (1 - t) ** 3
def font(p, s): return ImageFont.truetype(p, s)

def wrap(draw, text, f, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def gradient(W, H, c1, c2, phase):
    y = np.linspace(0, 1, H)[:, None]; x = np.linspace(0, 1, W)[None, :]
    t = np.clip(0.5 + 0.5 * np.sin((x * 0.6 + y + phase) * math.pi), 0, 1)[..., None]
    return (np.array(c1) * t + np.array(c2) * (1 - t)).astype(np.uint8)

def text_center(img, draw, y, text, f, fill, alpha=1.0, shadow=True):
    w = draw.textlength(text, font=f); x = (img.width - w) / 2
    a = int(255 * alpha)
    if shadow: draw.text((x + 4, y + 5), text, font=f, fill=(0, 0, 0, int(a * 0.45)))
    draw.text((x, y), text, font=f, fill=fill + (a,))

def render_scene(sc, i, n, t, W, H, total_t, total):
    c1, c2 = PALETTES[i % len(PALETTES)]
    base = Image.fromarray(gradient(W, H, c1, c2, t * 0.15 + i)).convert("RGBA")
    ov = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(ov)
    s = min(W, H) / 1080; vert = H > W
    # калкыган тегеректер
    for k in range(6):
        r = (120 + 60 * k) * s
        cx = W * (0.15 + 0.15 * k) + math.sin(t * 0.8 + k) * 60 * s
        cy = H * ((0.1 + 0.17 * k) % 1) + math.cos(t * 0.6 + k * 2) * 80 * s
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 18))
    dur = sc["dur"]; ain = ease(t / 0.6); aout = 1 - ease((t - (dur - 0.4)) / 0.4)
    al = ain * aout; slide = (1 - ain) * 120 * s
    maxw = W * (0.84 if vert else 0.7)
    big = sc.get("big", ""); typ = sc["type"]
    if typ == "fact":
        # номер тегереги
        R = (170 if vert else 130) * s * (0.6 + 0.4 * ease(t / 0.5))
        cy = H * (0.30 if vert else 0.27)
        d.ellipse([W/2 - R, cy - R - slide, W/2 + R, cy + R - slide], fill=(255, 255, 255, int(235 * al)))
        fb = font(BOLD, int(R * 1.1))
        bw = d.textlength(big, font=fb)
        d.text((W/2 - bw/2, cy - R*0.68 - slide), big, font=fb, fill=c2 + (int(255*al),))
        y = cy + R + 60 * s
        fh = font(BOLD, int((96 if vert else 80) * s))
        for ln in wrap(d, sc["head"].upper(), fh, maxw):
            text_center(ov, d, y + slide * 0.5, ln, fh, (255, 255, 255), al); y += fh.size * 1.2
        y += 30 * s
        d.rounded_rectangle([W/2 - 90*s, y, W/2 + 90*s, y + 10*s], 5, fill=(255, 255, 255, int(200*al))); y += 60 * s
        ft = font(REG, int((60 if vert else 48) * s))
        words = sc["text"].split(); shown = int(len(words) * ease((t - 0.5) / 1.6)) if t > 0.5 else 0
        for ln in wrap(d, sc["text"], ft, maxw):
            lw = ln.split(); vis = " ".join(lw[:max(0, shown)]); shown -= len(lw)
            if vis:
                full = d.textlength(ln, font=ft); x = (W - full) / 2
                d.text((x + 3, y + 4), vis, font=ft, fill=(0, 0, 0, int(110*al)))
                d.text((x, y), vis, font=ft, fill=(255, 255, 255, int(255*al)))
            y += ft.size * 1.35
    else:
        pulse = 1 + 0.04 * math.sin(t * 6)
        fb = font(BOLD, int((210 if vert else 170) * s * pulse * (0.5 + 0.5 * ain)))
        y = H * (0.30 if vert else 0.22)
        text_center(ov, d, y - slide, big, fb, (255, 255, 255), al)
        y += fb.size * 1.5
        ft = font(BOLD, int((78 if vert else 64) * s))
        for ln in wrap(d, sc["text"], ft, maxw):
            text_center(ov, d, y + slide, ln, ft, (255, 255, 255), al); y += ft.size * 1.3
    # прогресс тилкеси
    p = total_t / total
    d.rectangle([0, H - 14*s, W * p, H], fill=(255, 255, 255, 220))
    return Image.alpha_composite(base, ov).convert("RGB")

def music(path, total, scenes):
    sr = 44100; n = int(sr * total); t = np.arange(n) / sr
    bpm = 110; beat = 60 / bpm
    chords = [[220, 277.2, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]
    out = np.zeros(n)
    bar = beat * 4
    for b in range(int(total / bar) + 1):
        ch = chords[b % 4]; st = int(b * bar * sr); en = min(n, int((b + 1) * bar * sr))
        tt = t[st:en] - b * bar
        env = np.minimum(1, tt * 4) * np.exp(-tt * 0.4)
        for f in ch: out[st:en] += 0.06 * np.sin(2 * np.pi * f * tt) * env
    for k in range(int(total / beat)):  # кик
        st = int(k * beat * sr); L = min(int(0.25 * sr), n - st)
        tt = np.arange(L) / sr
        out[st:st+L] += 0.35 * np.sin(2 * np.pi * (50 + 80 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 12)
    for k in range(int(total / (beat / 2))):  # хай-хэт
        st = int((k + 0.5) * beat / 2 * sr); L = min(int(0.05 * sr), n - st)
        if L > 0: out[st:st+L] += 0.04 * np.random.randn(L) * np.exp(-np.arange(L) / sr * 80)
    acc = 0  # сахна алмашканда "whoosh"
    for sc in scenes[:-1]:
        acc += sc["dur"]; st = int((acc - 0.25) * sr); L = int(0.4 * sr)
        if st + L < n:
            env = np.sin(np.linspace(0, np.pi, L)); out[st:st+L] += 0.08 * np.random.randn(L) * env
    fade = int(sr * 1.5); out[-fade:] *= np.linspace(1, 0, fade)
    out = np.clip(out / max(1e-9, np.abs(out).max()) * 0.8, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((out * 32767).astype(np.int16).tobytes())

def build(data, W, H, out):
    scenes = data["scenes"]; total = sum(s["dur"] for s in scenes)
    music("music.wav", total, scenes)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", "music.wav",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    elapsed = 0.0
    for i, sc in enumerate(scenes):
        for f in range(int(sc["dur"] * FPS)):
            t = f / FPS
            p.stdin.write(render_scene(sc, i, len(scenes), t, W, H, elapsed + t, total).tobytes())
        elapsed += sc["dur"]
    p.stdin.close(); p.wait(); print("Даяр:", out)

if __name__ == "__main__":
    data = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "script.json", encoding="utf-8"))
    mode = sys.argv[2] if len(sys.argv) > 2 else "both"
    if mode in ("vertical", "both"): build(data, 1080, 1920, "tiktok_shorts_9x16.mp4")
    if mode in ("horizontal", "both"): build(data, 1920, 1080, "youtube_16x9.mp4")
