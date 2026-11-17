import json, torch, numpy as np, scipy.io.wavfile as w
from transformers import VitsModel, AutoTokenizer
m = VitsModel.from_pretrained("facebook/mms-tts-kir"); tok = AutoTokenizer.from_pretrained("facebook/mms-tts-kir")
L = json.load(open("lines.json"))
def synth(txt, rate, gap=0.12):
    m.speaking_rate = rate; torch.manual_seed(11); parts = []
    for s in [x.strip() for x in txt.replace("!", "!|").replace("?", "?|").replace(". ", ".|").replace(": ", ":|").split("|") if x.strip()]:
        with torch.no_grad(): a = m(**tok(s, return_tensors="pt")).waveform[0].numpy()
        parts += [a, np.zeros(int(16000 * gap))]
    a = np.concatenate(parts[:-1]); return a / np.abs(a).max() * 0.9
budget = 35 - 4 * 0.3 - 0.8
for r in (1.0,):
    print("rate 1.0:", round(sum(len(synth(l["tts"], 1.0)) / 16000 for l in L), 1))
lo, hi = 1.0, 2.4
for _ in range(9):
    mid = (lo + hi) / 2
    tot = sum(len(synth(l["tts"], mid)) / 16000 for l in L)
    lo, hi = (mid, hi) if tot > budget else (lo, mid)
print("ылдамдык:", round(hi, 2))
for i, l in enumerate(L, 1):
    a = synth(l["tts"], hi); w.write(f"voice/{i}.wav", 16000, (a * 32767).astype(np.int16)); print(i, round(len(a) / 16000, 2))
