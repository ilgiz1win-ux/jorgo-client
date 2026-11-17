import json, os, torch, numpy as np, scipy.io.wavfile as w
from transformers import VitsModel, AutoTokenizer
m = VitsModel.from_pretrained("facebook/mms-tts-kir"); tok = AutoTokenizer.from_pretrained("facebook/mms-tts-kir")
L = json.load(open("lines.json")); os.makedirs("voice", exist_ok=True)
def synth(txt, rate):
    m.speaking_rate = rate; torch.manual_seed(11); parts = []
    for s in [x.strip() for x in txt.replace("!", "!|").replace("?", "?|").replace(". ", ".|").split("|") if x.strip()]:
        with torch.no_grad(): a = m(**tok(s, return_tensors="pt")).waveform[0].numpy()
        parts += [a, np.zeros(int(16000 * 0.15))]
    a = np.concatenate(parts[:-1]); return a / np.abs(a).max() * 0.9
for i, l in enumerate(L, 1):
    target = (l["win"][1] - l["win"][0]) - 0.45
    rate = 1.0; a = synth(l["tts"], rate)
    for _ in range(4):
        d = len(a) / 16000
        if d <= target: break
        rate *= d / target * 1.01; a = synth(l["tts"], rate)
    w.write(f"voice/{i}.wav", 16000, (a * 32767).astype(np.int16))
    print(i, f"окно {target+0.45:.0f}s  үн {len(a)/16000:.2f}s  ылдамдык {rate:.2f}")
