import requests
from PyQt6.QtWebEngineCore import QWebEngineUrlRequestInterceptor

BLOCKLIST_URL = "https://justdomains.github.io/blocklists/easylist-justdomains.txt"

class Blocker:
    def __init__(self):
        self._blocked_domains = set()
        self.load_blocklist()

    def load_blocklist(self):
        try:
            response = requests.get(BLOCKLIST_URL, timeout=10)
            if response.status_code == 200:
                lines = response.text.splitlines()
                # A lista pode conter comentários ou linhas em branco
                self._blocked_domains = {line.strip() for line in lines if line.strip() and not line.startswith('#')}
                print(f"Blocklist carregada com {len(self._blocked_domains)} domínios.")
            else:
                print(f"Falha ao carregar a blocklist. Status: {response.status_code}")
        except requests.RequestException as e:
            print(f"Erro de rede ao carregar a blocklist: {e}")

    def is_blocked(self, domain):
        return domain in self._blocked_domains

class AdBlockerInterceptor(QWebEngineUrlRequestInterceptor):
    def __init__(self, blocker, parent=None):
        super().__init__(parent)
        self.blocker = blocker

    def interceptRequest(self, info):
        url = info.requestUrl()
        domain = url.host()

        # Bloqueia subdomínios também (ex: ads.example.com se example.com está na lista)
        # Isso pode ser muito agressivo, uma abordagem mais refinada seria necessária
        # para uma implementação completa, mas para um começo é bom.
        parts = domain.split('.')
        base_domains = ['.'.join(parts[i:]) for i in range(len(parts) - 1)]

        for d in base_domains:
            if self.blocker.is_blocked(d):
                print(f"Bloqueando requisição para: {url.toString()}")
                info.block(True)
                return

        # Verificação do domínio exato
        if self.blocker.is_blocked(domain):
            print(f"Bloqueando requisição para: {url.toString()}")
            info.block(True)
