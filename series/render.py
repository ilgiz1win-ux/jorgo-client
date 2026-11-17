"""Сериялардын видеосун жыйнайт.
python3 render.py preview      — ар бир сахнадан PNG (текшерүү үчүн)
python3 render.py [1 2 3]      — видео: output/1-1.mp4 ... жана output/seriya-1.mp4"""
import json, os, subprocess, sys, wave
from multiprocessing import Pool
import numpy as np
import skia
from scipy.signal import resample_poly
import scenes as SC

FPS = 30
W, H = SC.W, SC.H
LEAD, TAIL = 0.25, 0.45
SR = 44100
OUT = "output"
DATA = json.load(open("scenes.json", encoding="utf-8"))


def load_voice(ep, i):
    with wave.open(f"voice/{ep}-{i}.wav") as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    return resample_poly(a, SR, sr).astype(np.float32)


def scene_info(ep):
    out = []
    for i, sc in enumerate(DATA[ep]["scenes"], 1):
        v = load_voice(ep, i)
        vd = len(v) / SR
        d = LEAD + vd + TAIL
        # үндүн катуулугу (ооз кыймылы үчүн)
        hop = SR // FPS
        env = np.array([np.sqrt(np.mean(v[j:j + hop] ** 2)) for j in range(0, len(v), hop)] + [0])
        env = np.convolve(env / (env.max() + 1e-9), [0.25, 0.5, 0.25], "same")
        out.append(dict(i=i, sc=sc, voice=v, vd=vd, d=d, env=env))
    return out


def make_amp(env):
    def amp(t):
        j = int((t - LEAD) * FPS)
        return float(env[j]) if 0 <= j < len(env) else 0.0
    return amp


def frame(ep, info, t):
    surf = skia.Surface.MakeRaster(skia.ImageInfo.Make(W, H, skia.kRGBA_8888_ColorType, skia.kPremul_AlphaType))
    c = surf.getCanvas()
    k = SC.K(make_amp(info["env"]))
    c.save()
    # жумшак камера: акырын жакындоо
    z = 1 + 0.03 * t / info["d"]
    c.translate(W / 2, H * 0.45)
    c.scale(z, z)
    c.translate(-W / 2, -H * 0.45)
    SC.SCENES[info["sc"]["kind"]](c, t, info["d"], k)
    c.restore()
    SC.draw_label(c, ep, DATA[ep]["title"])
    SC.draw_subs(c, info["chunks"], t, LEAD, info["vd"])
    # кирүү/чыгуу караңгылатуу
    fade = min(1, t / 0.2, (info["d"] - t) / 0.15)
    if fade < 1:
        c.drawRect(skia.Rect.MakeWH(W, H), skia.Paint(Color=skia.ColorSetARGB(int(255 * (1 - max(0, fade))), 0, 0, 0)))
    return surf.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType)


def render_scene(args):
    ep, info = args
    os.makedirs(f"{OUT}/tmp", exist_ok=True)
    path = f"{OUT}/tmp/{ep}-{info['i']}.mp4"
    n = int(round(info["d"] * FPS))
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for f in range(n):
        p.stdin.write(frame(ep, info, f / FPS).tobytes())
    p.stdin.close()
    p.wait()
    return path


# ---------------- ҮН: музыка жана эффекттер ----------------
def music(total, seed):
    rng = np.random.default_rng(seed)
    n = int(total * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    # караңгы фон (Am — F — Dm — E)
    prog = [[110, 164.8, 220], [87.3, 130.8, 174.6], [73.4, 110, 146.8], [82.4, 123.5, 207.7]]
    bar = 4.0
    for b in range(int(total / bar) + 1):
        st, en = int(b * bar * SR), min(n, int((b + 1) * bar * SR + SR))
        if st >= n:
            break
        tt = t[st:en] - b * bar
        env = np.minimum(1, tt / 1.2) * np.exp(-np.maximum(0, tt - 3.5) * 2)
        for f in prog[b % 4]:
            out[st:en] += (0.10 * np.sin(2 * np.pi * f * tt) + 0.03 * np.sin(2 * np.pi * f * 2.003 * tt)) * env
    # жүрөктүн согушундай бас
    beat = 60 / 72
    for kk in range(int(total / beat)):
        for off, amp in ((0, 0.35), (0.22, 0.22)):
            st = int((kk * beat + off) * SR)
            L = min(int(0.3 * SR), n - st)
            if L <= 0:
                continue
            tt = np.arange(L) / SR
            out[st:st + L] += amp * np.sin(2 * np.pi * (45 + 30 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 10)
    # саат чыкылдаганы
    for kk in range(int(total / 0.5)):
        st = int(kk * 0.5 * SR)
        L = min(int(0.015 * SR), n - st)
        if L > 0:
            out[st:st + L] += 0.03 * rng.standard_normal(L) * np.exp(-np.arange(L) / SR * 400)
    # кээде сырдуу "дзинь"
    for kk in range(int(total / 6)):
        st = int((kk * 6 + 3) * SR)
        L = min(int(2.5 * SR), n - st)
        if L > 0:
            tt = np.arange(L) / SR
            f = [880, 830.6, 659.3][kk % 3]
            out[st:st + L] += 0.04 * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 1.5)
    fi, fo = int(0.5 * SR), int(1.5 * SR)
    out[:fi] *= np.linspace(0, 1, fi)
    out[-fo:] *= np.linspace(1, 0, fo)
    return out / (np.abs(out).max() + 1e-9)


def knock():
    L = int(0.12 * SR)
    tt = np.arange(L) / SR
    return (0.9 * np.sin(2 * np.pi * 120 * tt) * np.exp(-tt * 40) +
            0.3 * np.random.default_rng(1).standard_normal(L) * np.exp(-tt * 70)).astype(np.float32)


def sting():
    L = int(1.2 * SR)
    tt = np.arange(L) / SR
    s = sum(np.sin(2 * np.pi * f * tt) for f in (233, 246.9, 277.2)) * np.exp(-tt * 3)
    return (0.5 * s).astype(np.float32)


def sfx_for(kind, d):
    ev = []
    if kind == "door_knock":
        ev += [(kt, knock()) for kt in (0.35, 0.65, 0.95)]
    if kind == "phone_check":
        ev.append((d * 0.5, sting()))
    if kind == "stranger_leaves":
        ev.append((d * 0.5, sting() * 0.8))
    return ev


def build_audio(ep, infos):
    total = sum(x["d"] for x in infos)
    n = int(round(total * FPS)) * SR // FPS + SR
    voice = np.zeros(n, np.float32)
    sfx = np.zeros(n, np.float32)
    off = 0.0
    bounds = []
    for x in infos:
        nfr = int(round(x["d"] * FPS))
        st = int((off + LEAD) * SR)
        voice[st:st + len(x["voice"])] += x["voice"]
        for et, s in sfx_for(x["sc"]["kind"], x["d"]):
            a = int((off + et) * SR)
            sfx[a:a + len(s)] += s[: max(0, n - a)]
        bounds.append((off, nfr / FPS))
        off += nfr / FPS
    m = music(off + 1, int(ep))[:n]
    m = np.pad(m, (0, n - len(m)))
    # дауккинг: сүйлөгөндө музыка акырын
    venv = np.convolve(np.abs(voice), np.ones(SR // 5) / (SR // 5), "same")
    duck = 1 - 0.45 * np.clip(venv / (venv.max() * 0.3 + 1e-9), 0, 1)
    mix = voice * 1.0 + m * 0.16 * duck + sfx * 0.5
    mix = np.clip(mix / max(1.0, np.abs(mix).max() / 0.95), -1, 1)
    return mix, bounds


def write_wav(path, a):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((a * 32767).astype(np.int16).tobytes())


def episode(ep, pool):
    infos = scene_info(ep)
    for x in infos:
        x["chunks"] = SC.sub_chunks(x["sc"]["sub"])
    clips = pool.map(render_scene, [(ep, x) for x in infos])
    mix, bounds = build_audio(ep, infos)
    write_wav(f"{OUT}/tmp/{ep}.wav", mix)
    # ар бир сахна өзүнчө клип (үнү менен)
    for (st, du), clip, x in zip(bounds, clips, infos):
        seg = mix[int(st * SR): int((st + du) * SR)]
        write_wav(f"{OUT}/tmp/{ep}-{x['i']}.wav", seg)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", clip, "-i", f"{OUT}/tmp/{ep}-{x['i']}.wav",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                        f"{OUT}/{ep}-{x['i']}.mp4"], check=True)
    with open(f"{OUT}/tmp/list{ep}.txt", "w") as f:
        for clip in clips:
            f.write(f"file '{os.path.abspath(clip)}'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{OUT}/tmp/list{ep}.txt",
                    "-i", f"{OUT}/tmp/{ep}.wav", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", f"{OUT}/seriya-{ep}.mp4"], check=True)
    print(f"Серия {ep}: {sum(b[1] for b in bounds):.1f} сек", flush=True)


def preview(times=(0.5,)):
    os.makedirs(f"{OUT}/preview", exist_ok=True)
    from PIL import Image
    for ep in DATA:
        for x in scene_info(ep):
            x["chunks"] = SC.sub_chunks(x["sc"]["sub"])
            t = x["d"] * 0.7
            Image.fromarray(frame(ep, x, t)).convert("RGB").save(f"{OUT}/preview/{ep}-{x['i']}.png")
    print("preview ok")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        preview()
    else:
        eps = sys.argv[1:] or list(DATA)
        with Pool(4) as pool:
            for ep in eps:
                episode(ep, pool)
