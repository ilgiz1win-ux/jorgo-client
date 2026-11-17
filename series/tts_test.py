import torch, scipy.io.wavfile as w
from transformers import VitsModel, AutoTokenizer
m = VitsModel.from_pretrained("facebook/mms-tts-kir"); tok = AutoTokenizer.from_pretrained("facebook/mms-tts-kir")
txt = "Көчөдөн 1 миллион доллар таап алдым. Эмне кылдым, билесиңби?"
print(tok.convert_ids_to_tokens(tok(txt).input_ids)[:40])
with torch.no_grad(): o = m(**tok(txt, return_tensors="pt")).waveform
w.write("/tmp/claude-0/-home-user-jorgo-client/d841ed02-bd1f-58e2-8a6c-089423d5ff6d/scratchpad/t.wav", m.config.sampling_rate, o[0].numpy())
print(m.config.sampling_rate, o.shape[-1]/m.config.sampling_rate)
