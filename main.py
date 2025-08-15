import sys
from PyQt6.QtWidgets import (QApplication, QMainWindow, QToolBar,
                             QLineEdit, QStatusBar, QTabWidget, QWidget)
from PyQt6.QtCore import QUrl
from PyQt6.QtGui import QAction
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage

from blocker import Blocker, AdBlockerInterceptor

class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow, self).__init__(*args, **kwargs)

        # Blocker setup
        self.blocker = Blocker()
        self.interceptor = AdBlockerInterceptor(self.blocker)
        self.profile = QWebEngineProfile.defaultProfile()
        self.profile.setUrlRequestInterceptor(self.interceptor)

        self.setWindowTitle("Navegador Leve e Seguro")
        self.setGeometry(100, 100, 1200, 800)

        # Status Bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

        # Navigation Bar
        nav_bar = QToolBar("Navegação")
        self.addToolBar(nav_bar)

        back_button = QAction("Voltar", self)
        back_button.setStatusTip("Voltar para a página anterior")
        back_button.triggered.connect(self.navigate_back)
        nav_bar.addAction(back_button)

        forward_button = QAction("Avançar", self)
        forward_button.setStatusTip("Avançar para a próxima página")
        forward_button.triggered.connect(self.navigate_forward)
        nav_bar.addAction(forward_button)

        reload_button = QAction("Recarregar", self)
        reload_button.setStatusTip("Recarregar a página atual")
        reload_button.triggered.connect(self.navigate_reload)
        nav_bar.addAction(reload_button)

        new_tab_button = QAction("Nova Aba", self)
        new_tab_button.setStatusTip("Abrir uma nova aba")
        new_tab_button.triggered.connect(lambda _: self.add_new_tab())
        nav_bar.addAction(new_tab_button)

        self.url_bar = QLineEdit()
        self.url_bar.returnPressed.connect(self.navigate_to_url)
        nav_bar.addWidget(self.url_bar)

        # Tab Widget
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        self.tabs.setTabsClosable(True)
        self.tabs.tabCloseRequested.connect(self.close_current_tab)
        self.tabs.currentChanged.connect(self.current_tab_changed)
        self.setCentralWidget(self.tabs)

        # Add initial tab
        self.add_new_tab(QUrl("https://www.google.com"), "Página Inicial")

    def current_browser(self):
        # The widget in the tab is the QWebEngineView
        return self.tabs.currentWidget()

    def navigate_back(self):
        if self.current_browser():
            self.current_browser().back()

    def navigate_forward(self):
        if self.current_browser():
            self.current_browser().forward()

    def navigate_reload(self):
        if self.current_browser():
            self.current_browser().reload()

    def add_new_tab(self, qurl=None, label="Nova Aba"):
        if qurl is None:
            qurl = QUrl("https://www.google.com")

        # Create a new page with the default profile
        page = QWebEnginePage(self.profile, self)

        browser = QWebEngineView()
        browser.setPage(page) # Associate the view with the page
        browser.setUrl(qurl)

        i = self.tabs.addTab(browser, label)
        self.tabs.setCurrentIndex(i)

        # Signals need to be connected to the page, not the view
        browser.page().urlChanged.connect(lambda q, browser=browser:
                                   self.update_url_bar(q, browser))
        browser.page().loadFinished.connect(lambda _, i=i, browser=browser:
                                     self.tabs.setTabText(i, browser.page().title()))

    def close_current_tab(self, i):
        if self.tabs.count() < 2:
            self.close()
        else:
            self.tabs.removeTab(i)

    def current_tab_changed(self, i):
        browser = self.current_browser()
        qurl = browser.url() if browser else QUrl()
        self.update_url_bar(qurl, browser)
        self.update_title()

    def navigate_to_url(self):
        browser = self.current_browser()
        if not browser:
            return

        q = QUrl(self.url_bar.text())
        if q.scheme() == "":
            q.setScheme("http")
        browser.setUrl(q)

    def update_url_bar(self, q, browser=None):
        if browser != self.current_browser():
            # If the signal is not from the current tab, ignore
            return
        self.url_bar.setText(q.toString())
        self.url_bar.setCursorPosition(0)

    def update_title(self):
        browser = self.current_browser()
        if not browser:
            self.setWindowTitle("Navegador Leve e Seguro")
            return

        title = browser.page().title()
        self.setWindowTitle(f"{title} - Navegador Leve e Seguro")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
