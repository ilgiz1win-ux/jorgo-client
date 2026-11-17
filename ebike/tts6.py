import torch, numpy as np, scipy.io.wavfile as w
from transformers import VitsModel, AutoTokenizer
m = VitsModel.from_pretrained("facebook/mms-tts-kir"); tok = AutoTokenizer.from_pretrained("facebook/mms-tts-kir")
parts = []
for s, r in [("Батареяңызда көйгөй болсо, Жорго эко сервиске кайрылыңыз!", 1.9)]:
    m.speaking_rate = r; torch.manual_seed(11)
    with torch.no_grad(): a = m(**tok(s, return_tensors="pt")).waveform[0].numpy()
    parts += [a, np.zeros(int(16000 * 0.25))]
a = np.concatenate(parts[:-1]); a = a / np.abs(a).max() * 0.9
w.write("voice/6.wav", 16000, (a * 32767).astype(np.int16)); print(len(a) / 16000)
