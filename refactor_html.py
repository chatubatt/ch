
from bs4 import BeautifulSoup

# Carregar o arquivo HTML
with open("/home/ubuntu/upload/index.html.html", "r", encoding="utf-8") as f:
    html_content = f.read()

soup = BeautifulSoup(html_content, "html.parser")

# Remover a tag <style> e seu conteúdo
style_tag = soup.find("style")
if style_tag:
    style_tag.decompose()

# Remover todas as tags <script> que não possuem o atributo 'src' (inline)
for script in soup.find_all("script"):
    if not script.get("src"):
        script.decompose()

# Adicionar o link para o arquivo CSS externo no <head>
head = soup.head
if head:
    new_css_link = soup.new_tag("link", rel="stylesheet", href="style.css")
    head.append(new_css_link)

# Adicionar o link para o arquivo JavaScript externo no final do <body>
body = soup.body
if body:
    new_script_tag = soup.new_tag("script", src="script.js")
    body.append(new_script_tag)

# Salvar o novo conteúdo HTML
with open("index_melhorado.html", "w", encoding="utf-8") as f:
    f.write(str(soup))

print("Arquivo HTML refatorado e salvo como index_melhorado.html")

