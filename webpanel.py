from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage
from PyQt6.QtCore import QUrl

class WebPanel(QWebEngineView):
    def __init__(self, url, profile, parent=None):
        super().__init__(parent)

        # Use the passed-in profile to create the page
        self.page_profile = profile
        self.setPage(QWebEnginePage(self.page_profile, self))

        self.is_mobile = True # Start as mobile by default
        self.desktop_user_agent = self.page_profile.httpUserAgent()
        self.mobile_user_agent = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36"

        self.set_user_agent()
        self.setUrl(QUrl(url))
        self.setVisible(False)
        self.setFixedWidth(320)

    def set_user_agent(self):
        if self.is_mobile:
            self.page_profile.setHttpUserAgent(self.mobile_user_agent)
        else:
            self.page_profile.setHttpUserAgent(self.desktop_user_agent)

    def toggle_user_agent(self):
        self.is_mobile = not self.is_mobile
        self.set_user_agent()
        self.reload()
