import sys
from PyQt6.QtWidgets import (QApplication, QMainWindow, QToolBar,
                             QLineEdit, QStatusBar, QTabWidget, QWidget, QVBoxLayout, QPushButton, QStyle)
from PyQt6.QtCore import QUrl, Qt
from PyQt6.QtGui import QAction
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage

from blocker import Blocker, AdBlockerInterceptor
import qdarkstyle

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

        # Tab Widget
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        self.tabs.setTabsClosable(True)
        self.tabs.tabCloseRequested.connect(self.close_current_tab)
        self.tabs.currentChanged.connect(self.current_tab_changed)

        # Add '+' button to tab bar
        new_tab_button = QPushButton("+")
        new_tab_button.setStatusTip("Abrir uma nova aba")
        new_tab_button.clicked.connect(lambda _: self.add_new_tab())
        self.tabs.setCornerWidget(new_tab_button, Qt.Corner.TopRightCorner)

        # Navigation Bar
        nav_bar = QToolBar("Navegação")
        nav_bar.setObjectName("navigation_bar") # Set object name for styling if needed

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

        self.url_bar = QLineEdit()
        self.url_bar.returnPressed.connect(self.navigate_to_url)
        nav_bar.addWidget(self.url_bar)

        # Sidebar
        sidebar = QToolBar("Sidebar")
        sidebar.setObjectName("sidebar")
        self.addToolBar(Qt.ToolBarArea.RightToolBarArea, sidebar)

        # Add some actions with icons
        home_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_DirHomeIcon), "Home", self)
        home_action.setStatusTip("Go home")
        sidebar.addAction(home_action)

        downloads_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_ArrowDown), "Downloads", self)
        downloads_action.setStatusTip("View downloads")
        sidebar.addAction(downloads_action)

        settings_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_ComputerIcon), "Settings", self)
        settings_action.setStatusTip("View settings")
        sidebar.addAction(settings_action)

        # Main Layout
        main_layout = QVBoxLayout()
        main_layout.setSpacing(0)
        main_layout.setContentsMargins(0, 0, 0, 0)

        main_layout.addWidget(self.tabs)
        main_layout.addWidget(nav_bar)

        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

        # Add initial tab
        self.add_new_tab(QUrl("https://www.google.com"), "Página Inicial")

    def current_browser(self):
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

        page = QWebEnginePage(self.profile, self)

        browser = QWebEngineView()
        browser.setPage(page)
        browser.setUrl(qurl)

        i = self.tabs.addTab(browser, label)
        self.tabs.setCurrentIndex(i)

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
    app.setStyleSheet(qdarkstyle.load_stylesheet())
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
