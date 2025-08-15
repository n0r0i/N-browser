from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtCore import QUrl

class WebPanel(QWebEngineView):
    def __init__(self, url, parent=None):
        super().__init__(parent)
        self.setUrl(QUrl(url))
        self.setVisible(False) # Start hidden
        self.setFixedWidth(300) # Default width for the panel
