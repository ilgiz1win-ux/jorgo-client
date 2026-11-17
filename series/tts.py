import json, os, sys, torch, numpy as np, scipy.io.wavfile as w
from transformers import VitsModel, AutoTokenizer
RATE = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
m = VitsModel.from_pretrained("facebook/mms-tts-kir"); tok = AutoTokenizer.from_pretrained("facebook/mms-tts-kir")
m.speaking_rate = RATE; torch.manual_seed(7)
os.makedirs("voice", exist_ok=True); data = json.load(open("scenes.json"))
for ep, e in data.items():
    tot = 0
    for i, sc in enumerate(e["scenes"], 1):
        parts = []
        for sent in [s.strip() for s in sc["tts"].replace("!", "!|").replace("?", "?|").replace(". ", ".|").split("|") if s.strip()]:
            with torch.no_grad(): a = m(**tok(sent, return_tensors="pt")).waveform[0].numpy()
            parts += [a, np.zeros(int(16000 * 0.18))]
        a = np.concatenate(parts[:-1]); a = a / np.abs(a).max() * 0.9
        w.write(f"voice/{ep}-{i}.wav", 16000, (a * 32767).astype(np.int16)); d = len(a) / 16000; tot += d
        print(f"{ep}-{i}: {d:.2f}s")
    print(f"серия {ep}: {tot:.1f}s")
