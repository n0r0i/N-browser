import sys
import os
import requests
from PyQt6.QtWidgets import (QApplication, QMainWindow, QToolBar,
                             QLineEdit, QStatusBar, QWidget, QVBoxLayout,
                             QPushButton, QStyle, QTabBar, QStackedWidget, QHBoxLayout,
                             QSizePolicy, QInputDialog)
from PyQt6.QtCore import QUrl, Qt, QEvent
from PyQt6.QtGui import QAction, QIcon, QPixmap
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage

from blocker import Blocker, AdBlockerInterceptor
import qdarkstyle
from stylesheet import CUSTOM_STYLE
from titlebar import CustomTitleBar
from webpanel import WebPanel
from favicon import get_favicon_url

class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow, self).__init__(*args, **kwargs)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint)

        self.web_panels = [] # To hold our dynamic web panels

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

        # --- Layout Setup ---
        self.title_bar = CustomTitleBar(self)

        new_tab_button = QPushButton("+")
        new_tab_button.setStatusTip("Abrir uma nova aba")

        self.title_bar.layout.insertWidget(0, self.tabs)
        self.title_bar.layout.insertWidget(1, new_tab_button)

        self.content_layout = QHBoxLayout()
        self.content_layout.setSpacing(0)
        self.content_layout.setContentsMargins(0, 0, 0, 0)
        self.content_layout.addWidget(self.stack, 1)
        self.content_layout.addWidget(self.sidebar)

        main_layout = QVBoxLayout()
        main_layout.setSpacing(0)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.addWidget(self.title_bar)
        main_layout.addWidget(self.nav_bar)
        main_layout.addLayout(self.content_layout)

        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

        # --- Actions and Connections ---
        self.setup_actions()
        self.add_new_tab()

    def setup_actions(self):
        # Navigation Bar
        back_action = QAction("Voltar", self); self.nav_bar.addAction(back_action)
        forward_action = QAction("Avançar", self); self.nav_bar.addAction(forward_action)
        reload_action = QAction("Recarregar", self); self.nav_bar.addAction(reload_action)
        self.url_bar = QLineEdit(); self.nav_bar.addWidget(self.url_bar)
        sidebar_toggle_action = QAction("Sidebar", self); sidebar_toggle_action.setCheckable(True); sidebar_toggle_action.setChecked(True); self.nav_bar.addAction(sidebar_toggle_action)

        # Sidebar (dynamic actions will be added here)
        self.add_panel_action = QAction("+", self)
        self.add_panel_action.setStatusTip("Adicionar novo painel")
        self.sidebar.addAction(self.add_panel_action)

        self.sidebar_spacer = QWidget()
        self.sidebar_spacer.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.sidebar.addWidget(self.sidebar_spacer)

        settings_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_ComputerIcon), "Configurações", self)
        self.sidebar.addAction(settings_action)

        # Connect signals
        back_action.triggered.connect(self.navigate_back)
        forward_action.triggered.connect(self.navigate_forward)
        reload_action.triggered.connect(self.navigate_reload)
        self.url_bar.returnPressed.connect(self.navigate_to_url)
        sidebar_toggle_action.triggered.connect(self.toggle_sidebar)
        self.add_panel_action.triggered.connect(self.add_new_web_panel_dialog)
        self.tabs.tabCloseRequested.connect(self.close_current_tab)
        self.tabs.currentChanged.connect(self.current_tab_changed)
        self.title_bar.minimize_button.clicked.connect(self.showMinimized)
        self.title_bar.maximize_button.clicked.connect(self.toggle_maximize)
        self.title_bar.close_button.clicked.connect(self.close)
        self.title_bar.findChild(QPushButton).clicked.connect(lambda: self.add_new_tab())

    def changeEvent(self, event):
        if event.type() == QEvent.Type.WindowStateChange:
            if self.isMaximized(): self.title_bar.maximize_button.setIcon(self.style().standardIcon(QStyle.StandardPixmap.SP_TitleBarNormalButton))
            else: self.title_bar.maximize_button.setIcon(self.style().standardIcon(QStyle.StandardPixmap.SP_TitleBarMaxButton))
        super().changeEvent(event)

    def toggle_maximize(self):
        if self.isMaximized(): self.showNormal()
        else: self.showMaximized()

    def toggle_sidebar(self, checked): self.sidebar.setVisible(checked)

    def add_new_web_panel_dialog(self):
        url, ok = QInputDialog.getText(self, "Adicionar Painel", "Digite a URL do site:")
        if ok and url:
            favicon_url = get_favicon_url(url)
            icon = QIcon()
            if favicon_url:
                try:
                    data = requests.get(favicon_url, timeout=5).content
                    pixmap = QPixmap()
                    pixmap.loadFromData(data)
                    icon = QIcon(pixmap)
                except Exception as e:
                    print(f"Failed to load favicon: {e}")

            self.add_web_panel(url, icon)

    def add_web_panel(self, url, icon):
        panel = WebPanel(url, self)
        mobile_user_agent = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36"
        panel.page().profile().setHttpUserAgent(mobile_user_agent)

        self.web_panels.append(panel)
        self.content_layout.insertWidget(1, panel)

        action = QAction(icon, url.split('.')[0], self) # Use domain part as name
        action.setCheckable(True)
        action.triggered.connect(lambda checked, p=panel: self.toggle_web_panel(p, checked))

        self.sidebar.insertAction(self.add_panel_action, action)

    def toggle_web_panel(self, panel, checked):
        # Hide all other panels
        for p in self.web_panels:
            if p != panel:
                p.setVisible(False)
        # Uncheck all other actions
        for action in self.sidebar.actions():
            if action.text() != panel.url().split('.')[0] and action.isCheckable():
                action.setChecked(False)

        panel.setVisible(checked)

    def add_new_tab(self, qurl=None, label="Nova Aba"):
        if qurl is None:
            file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "new_tab_page.html"))
            qurl = QUrl.fromLocalFile(file_path)

        browser = QWebEngineView(); page = QWebEnginePage(self.profile, browser); browser.setPage(page); browser.setUrl(qurl)

        self.tabs.blockSignals(True)
        i = self.tabs.addTab(label); self.tabs.setTabData(i, {"widget": browser}); self.stack.addWidget(browser); self.tabs.blockSignals(False)
        self.tabs.setCurrentIndex(i)

        page.urlChanged.connect(lambda q, browser=browser: self.update_url_bar(q, browser))
        page.loadFinished.connect(lambda _, i=i, browser=browser: self.update_tab_title(i, browser))

    def update_tab_title(self, i, browser): self.tabs.setTabText(i, browser.page().title())

    def close_current_tab(self, i):
        if self.tabs.count() < 2: self.close()
        else:
            widget_to_remove = self.tabs.tabData(i)["widget"]; self.stack.removeWidget(widget_to_remove); widget_to_remove.deleteLater(); self.tabs.removeTab(i)

    def current_tab_changed(self, i):
        if i == -1: return
        try:
            widget = self.tabs.tabData(i)["widget"]; self.stack.setCurrentWidget(widget); self.update_url_bar(widget.url(), widget); self.update_title(widget)
        except (KeyError, TypeError): pass

    def current_browser(self): return self.stack.currentWidget()
    def navigate_back(self):
        if self.current_browser(): self.current_browser().back()
    def navigate_forward(self):
        if self.current_browser(): self.current_browser().forward()
    def navigate_reload(self):
        if self.current_browser(): self.current_browser().reload()

    def navigate_home(self):
        if self.current_browser():
            file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "new_tab_page.html")); self.current_browser().setUrl(QUrl.fromLocalFile(file_path))

    def navigate_to_url(self):
        if not self.current_browser(): return
        q = QUrl(self.url_bar.text());
        if q.scheme() == "": q.setScheme("http")
        self.current_browser().setUrl(q)

    def update_url_bar(self, q, browser=None):
        if browser != self.current_browser(): return
        self.url_bar.setText(q.toString()); self.url_bar.setCursorPosition(0)

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
