import sys
import os
from PyQt6.QtWidgets import (QApplication, QMainWindow, QToolBar,
                             QLineEdit, QStatusBar, QWidget, QVBoxLayout,
                             QPushButton, QStyle, QTabBar, QStackedWidget, QHBoxLayout)
from PyQt6.QtCore import QUrl, Qt, QEvent
from PyQt6.QtGui import QAction
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage

from blocker import Blocker, AdBlockerInterceptor
import qdarkstyle
from stylesheet import CUSTOM_STYLE
from titlebar import CustomTitleBar
from webpanel import WebPanel

class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow, self).__init__(*args, **kwargs)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint)

        self.blocker = Blocker()
        self.interceptor = AdBlockerInterceptor(self.blocker)
        self.profile = QWebEngineProfile.defaultProfile()
        self.profile.setUrlRequestInterceptor(self.interceptor)

        self.setWindowTitle("Navegador Leve e Seguro")
        self.setGeometry(100, 100, 1200, 800)

        # --- Widgets ---
        self.tabs = QTabBar()
        self.tabs.setTabsClosable(True)
        self.tabs.setMovable(True)

        self.stack = QStackedWidget()

        self.nav_bar = QToolBar("Navegação")
        self.nav_bar.setObjectName("navigation_bar")

        self.sidebar = QToolBar("Sidebar")
        self.sidebar.setObjectName("sidebar")
        self.sidebar.setMovable(False)
        self.sidebar.setOrientation(Qt.Orientation.Vertical)

        self.whatsapp_panel = WebPanel("https://web.whatsapp.com", self)

        # --- Layout Setup ---
        self.title_bar = CustomTitleBar(self)
        self.title_bar.minimize_button.clicked.connect(self.showMinimized)
        self.title_bar.maximize_button.clicked.connect(self.toggle_maximize)
        self.title_bar.close_button.clicked.connect(self.close)

        new_tab_button = QPushButton("+")
        new_tab_button.setStatusTip("Abrir uma nova aba")

        self.title_bar.layout.insertWidget(0, self.tabs)
        self.title_bar.layout.insertWidget(1, new_tab_button)

        content_layout = QHBoxLayout()
        content_layout.setSpacing(0)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.addWidget(self.stack, 1)
        content_layout.addWidget(self.whatsapp_panel)
        content_layout.addWidget(self.sidebar)

        main_layout = QVBoxLayout()
        main_layout.setSpacing(0)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.addWidget(self.title_bar)
        main_layout.addWidget(self.nav_bar)
        main_layout.addLayout(content_layout)

        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

        # --- Actions and Connections ---
        back_action = QAction("Voltar", self)
        self.nav_bar.addAction(back_action)

        forward_action = QAction("Avançar", self)
        self.nav_bar.addAction(forward_action)

        reload_action = QAction("Recarregar", self)
        self.nav_bar.addAction(reload_action)

        self.url_bar = QLineEdit()
        self.nav_bar.addWidget(self.url_bar)

        sidebar_toggle_action = QAction("Sidebar", self)
        sidebar_toggle_action.setCheckable(True)
        sidebar_toggle_action.setChecked(True)
        self.nav_bar.addAction(sidebar_toggle_action)

        whatsapp_action = QAction("WhatsApp", self) # Placeholder for a real icon
        self.sidebar.addAction(whatsapp_action)

        # Connect signals to slots
        whatsapp_action.triggered.connect(self.toggle_whatsapp_panel)
        back_action.triggered.connect(self.navigate_back)
        forward_action.triggered.connect(self.navigate_forward)
        reload_action.triggered.connect(self.navigate_reload)
        sidebar_toggle_action.triggered.connect(self.toggle_sidebar)
        self.url_bar.returnPressed.connect(self.navigate_to_url)
        new_tab_button.clicked.connect(lambda: self.add_new_tab())
        self.tabs.tabCloseRequested.connect(self.close_current_tab)
        self.tabs.currentChanged.connect(self.current_tab_changed)

        self.add_new_tab()

    def changeEvent(self, event):
        if event.type() == QEvent.Type.WindowStateChange:
            if self.isMaximized():
                self.title_bar.maximize_button.setIcon(self.style().standardIcon(QStyle.StandardPixmap.SP_TitleBarNormalButton))
            else:
                self.title_bar.maximize_button.setIcon(self.style().standardIcon(QStyle.StandardPixmap.SP_TitleBarMaxButton))
        super().changeEvent(event)

    def toggle_maximize(self):
        if self.isMaximized():
            self.showNormal()
        else:
            self.showMaximized()

    def toggle_sidebar(self, checked):
        self.sidebar.setVisible(checked)

    def toggle_whatsapp_panel(self):
        self.whatsapp_panel.setVisible(not self.whatsapp_panel.isVisible())

    def add_new_tab(self, qurl=None, label="Nova Aba"):
        if qurl is None:
            file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "new_tab_page.html"))
            qurl = QUrl.fromLocalFile(file_path)

        browser = QWebEngineView()
        page = QWebEnginePage(self.profile, browser)
        browser.setPage(page)
        browser.setUrl(qurl)

        self.tabs.blockSignals(True)
        i = self.tabs.addTab(label)
        self.tabs.setTabData(i, {"widget": browser})
        self.stack.addWidget(browser)
        self.tabs.blockSignals(False)

        self.tabs.setCurrentIndex(i)

        page.urlChanged.connect(lambda q, browser=browser: self.update_url_bar(q, browser))
        page.loadFinished.connect(lambda _, i=i, browser=browser: self.update_tab_title(i, browser))

    def update_tab_title(self, i, browser):
        title = browser.page().title()
        self.tabs.setTabText(i, title)

    def close_current_tab(self, i):
        if self.tabs.count() < 2: self.close()
        else:
            widget_to_remove = self.tabs.tabData(i)["widget"]
            self.stack.removeWidget(widget_to_remove)
            widget_to_remove.deleteLater()
            self.tabs.removeTab(i)

    def current_tab_changed(self, i):
        if i == -1: return

        try:
            widget = self.tabs.tabData(i)["widget"]
            self.stack.setCurrentWidget(widget)
            self.update_url_bar(widget.url(), widget)
            self.update_title(widget)
        except (KeyError, TypeError):
            pass

    def current_browser(self):
        return self.stack.currentWidget()

    def navigate_back(self):
        if self.current_browser(): self.current_browser().back()
    def navigate_forward(self):
        if self.current_browser(): self.current_browser().forward()
    def navigate_reload(self):
        if self.current_browser(): self.current_browser().reload()

    def navigate_home(self):
        if self.current_browser():
            file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "new_tab_page.html"))
            self.current_browser().setUrl(QUrl.fromLocalFile(file_path))

    def navigate_to_url(self):
        if not self.current_browser(): return
        q = QUrl(self.url_bar.text())
        if q.scheme() == "": q.setScheme("http")
        self.current_browser().setUrl(q)

    def update_url_bar(self, q, browser=None):
        if browser != self.current_browser(): return
        self.url_bar.setText(q.toString())
        self.url_bar.setCursorPosition(0)

    def update_title(self, browser=None):
        if not browser: browser = self.current_browser()

        if browser: self.setWindowTitle(f"{browser.page().title()} - Navegador Leve e Seguro")
        else: self.setWindowTitle("Navegador Leve e Seguro")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setStyleSheet(qdarkstyle.load_stylesheet() + CUSTOM_STYLE)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
