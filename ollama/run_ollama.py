import torch
from transformers import AutoModel, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
model = AutoModel.from_pretrained("bert-base-uncased")

input_text = "Hello, world!"
tokens = tokenizer(input_text, return_tensors="pt")

with torch.no_grad():
    output = model(**tokens)

print("OLAMA Model Output:", output)
