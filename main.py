import sys
import os
import requests
from urllib.parse import quote_plus
from PyQt6.QtWidgets import (QApplication, QMainWindow, QToolBar,
                             QLineEdit, QStatusBar, QWidget, QVBoxLayout,
                             QPushButton, QStyle, QTabBar, QStackedWidget, QHBoxLayout,
                             QSizePolicy, QInputDialog, QMenu)
from PyQt6.QtCore import QUrl, Qt, QEvent
from PyQt6.QtGui import QAction, QIcon, QPixmap
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage

from blocker import Blocker, AdBlockerInterceptor

class AppAwareWebEnginePage(QWebEnginePage):
    def __init__(self, profile, parent=None, main_window=None):
        super().__init__(profile, parent)
        self.main_window = main_window

    def acceptNavigationRequest(self, url, _type, isMainFrame):
        if isMainFrame and url.scheme() == 'app':
            if url.path() == 'clear_history':
                database.clear_history()
                history_data = database.get_history()
                path = self.main_window.generate_page_from_template("Histórico", history_data, "history")
                self.setUrl(QUrl.fromLocalFile(path))
                return False
            elif url.path() == 'clear_favorites':
                database.clear_favorites()
                favorites_data = database.get_favorites()
                path = self.main_window.generate_page_from_template("Favoritos", favorites_data, "favorites")
                self.setUrl(QUrl.fromLocalFile(path))
                return False
        return super().acceptNavigationRequest(url, _type, isMainFrame)
import qdarkstyle
from stylesheet import CUSTOM_STYLE
from titlebar import CustomTitleBar
from webpanel import WebPanel
from favicon import get_favicon_url
from sidebartoolbar import SidebarToolBar
import database

class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow, self).__init__(*args, **kwargs)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint)

        self.web_panels = []

        self.blocker = Blocker()
        self.interceptor = AdBlockerInterceptor(self.blocker)
        self.profile = QWebEngineProfile.defaultProfile()
        self.profile.setUrlRequestInterceptor(self.interceptor)

        self.setWindowTitle("Navegador Leve e Seguro")
        self.setGeometry(100, 100, 1200, 800)

        self.tabs = QTabBar(); self.tabs.setTabsClosable(True); self.tabs.setMovable(True)
        self.stack = QStackedWidget()
        self.nav_bar = QToolBar("Navegação"); self.nav_bar.setObjectName("navigation_bar")
        self.sidebar = SidebarToolBar("Sidebar"); self.sidebar.setObjectName("sidebar"); self.sidebar.setMovable(False); self.sidebar.setOrientation(Qt.Orientation.Vertical)

        self.title_bar = CustomTitleBar(self)
        self.new_tab_button = QPushButton("+")
        self.title_bar.layout.insertWidget(0, self.tabs)
        self.title_bar.layout.insertWidget(1, self.new_tab_button)

        self.content_layout = QHBoxLayout(); self.content_layout.setSpacing(0); self.content_layout.setContentsMargins(0, 0, 0, 0)
        self.content_layout.addWidget(self.sidebar)
        self.content_layout.addWidget(self.stack, 1)

        main_layout = QVBoxLayout(); main_layout.setSpacing(0); main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.addWidget(self.title_bar)
        main_layout.addWidget(self.nav_bar)
        main_layout.addLayout(self.content_layout)

        central_widget = QWidget(); central_widget.setLayout(main_layout); self.setCentralWidget(central_widget)

        self.setup_actions()
        self.load_panels()
        self.add_new_tab()

    def setup_actions(self):
        back_action = QAction("Voltar", self); self.nav_bar.addAction(back_action)
        forward_action = QAction("Avançar", self); self.nav_bar.addAction(forward_action)
        reload_action = QAction("Recarregar", self); self.nav_bar.addAction(reload_action)
        self.url_bar = QLineEdit(); self.nav_bar.addWidget(self.url_bar)
        add_favorite_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_DialogSaveButton), "Adicionar a Favoritos", self); self.nav_bar.addAction(add_favorite_action)
        sidebar_toggle_action = QAction("Sidebar", self); sidebar_toggle_action.setCheckable(True); sidebar_toggle_action.setChecked(True); self.nav_bar.addAction(sidebar_toggle_action)

        self.add_panel_action = QAction("+", self); self.sidebar.addAction(self.add_panel_action)
        self.sidebar_spacer = QWidget(); self.sidebar_spacer.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding); self.sidebar.addWidget(self.sidebar_spacer)

        history_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_FileDialogDetailedView), "Histórico", self); self.sidebar.addAction(history_action)
        favorites_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_DialogSaveButton), "Favoritos", self); self.sidebar.addAction(favorites_action)
        downloads_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_ArrowDown), "Downloads", self); self.sidebar.addAction(downloads_action)
        settings_action = QAction(self.style().standardIcon(QStyle.StandardPixmap.SP_ComputerIcon), "Configurações", self); self.sidebar.addAction(settings_action)

        back_action.triggered.connect(self.navigate_back)
        forward_action.triggered.connect(self.navigate_forward)
        reload_action.triggered.connect(self.navigate_reload)
        add_favorite_action.triggered.connect(self.add_current_page_to_favorites)
        self.url_bar.returnPressed.connect(self.navigate_to_url)
        sidebar_toggle_action.triggered.connect(self.toggle_sidebar)
        self.add_panel_action.triggered.connect(self.add_new_web_panel_dialog)
        self.sidebar.actionContextMenuRequested.connect(self.show_panel_context_menu)
        history_action.triggered.connect(self.show_history_page)
        favorites_action.triggered.connect(self.show_favorites_page)
        self.tabs.tabCloseRequested.connect(self.close_current_tab)
        self.tabs.currentChanged.connect(self.current_tab_changed)
        self.title_bar.minimize_button.clicked.connect(self.showMinimized)
        self.title_bar.maximize_button.clicked.connect(self.toggle_maximize)
        self.title_bar.close_button.clicked.connect(self.close)
        self.new_tab_button.clicked.connect(self.handle_new_tab_button_click)

    def handle_new_tab_button_click(self, checked=False):
        self.add_new_tab()

    def show_panel_context_menu(self, action, pos):
        panel = action.data()
        if not (panel and isinstance(panel, WebPanel)): return

        menu = QMenu(self)
        desktop_action = menu.addAction("Ver como Desktop")
        mobile_action = menu.addAction("Ver como Celular")
        menu.addSeparator()
        remove_action = menu.addAction("Remover Painel")

        selected_action = menu.exec(pos)

        if selected_action == desktop_action:
            panel.is_mobile = False; panel.set_user_agent(); panel.reload()
        elif selected_action == mobile_action:
            panel.is_mobile = True; panel.set_user_agent(); panel.reload()
        elif selected_action == remove_action:
            self.remove_web_panel(action)

    def remove_web_panel(self, action):
        panel = action.data()
        if not panel: return

        # Remove from database
        database.remove_panel(panel.url().toString())

        # Remove from UI
        self.sidebar.removeAction(action)
        self.web_panels.remove(panel)
        panel.deleteLater()

    def changeEvent(self, event):
        if event.type() == QEvent.Type.WindowStateChange:
            if self.isMaximized(): self.title_bar.maximize_button.setIcon(self.style().standardIcon(QStyle.StandardPixmap.SP_TitleBarNormalButton))
            else: self.title_bar.maximize_button.setIcon(self.style().standardIcon(QStyle.StandardPixmap.SP_TitleBarMaxButton))
        super().changeEvent(event)

    def toggle_maximize(self):
        if self.isMaximized(): self.showNormal()
        else: self.showMaximized()

    def toggle_sidebar(self, checked):
        self.sidebar.setVisible(checked)
        if not checked:
            for panel in self.web_panels: panel.setVisible(False)
            for action in self.sidebar.actions():
                if action.isCheckable(): action.setChecked(False)

    def add_new_web_panel_dialog(self):
        url, ok = QInputDialog.getText(self, "Adicionar Painel", "Digite a URL do site:")
        if ok and url:
            database.add_panel(url) # Save to database
            favicon_url = get_favicon_url(url); icon = QIcon()
            if favicon_url:
                try:
                    data = requests.get(favicon_url, timeout=5).content
                    pixmap = QPixmap(); pixmap.loadFromData(data); icon = QIcon(pixmap)
                except Exception as e: print(f"Failed to load favicon: {e}")
            self.add_web_panel(url, icon)

    def add_web_panel(self, url, icon):
        # Create a new profile for each panel to isolate its settings (e.g., user agent)
        panel_profile = QWebEngineProfile(self)
        panel = WebPanel(url, panel_profile, self); self.web_panels.append(panel)
        self.content_layout.insertWidget(self.content_layout.indexOf(self.sidebar) + 1, panel)
        action = QAction(icon, url, self); action.setCheckable(True); action.setData(panel)
        action.triggered.connect(lambda checked, p=panel: self.toggle_web_panel(p, checked))
        self.sidebar.insertAction(self.add_panel_action, action)

    def toggle_web_panel(self, panel, checked):
        for p in self.web_panels:
            if p != panel: p.setVisible(False)
        for action in self.sidebar.actions():
            if action.data() != panel and action.isCheckable(): action.setChecked(False)
        panel.setVisible(checked)

    def load_panels(self):
        urls = database.get_panels()
        for url in urls:
            favicon_url = get_favicon_url(url)
            icon = QIcon()
            if favicon_url:
                try:
                    data = requests.get(favicon_url, timeout=5).content
                    pixmap = QPixmap()
                    pixmap.loadFromData(data)
                    icon = QIcon(pixmap)
                except Exception as e:
                    print(f"Failed to load favicon for saved panel: {e}")
            self.add_web_panel(url, icon)

    def add_new_tab(self, qurl=None, label="Nova Aba"):
        if qurl is None: qurl = QUrl.fromLocalFile(os.path.abspath(os.path.join(os.path.dirname(__file__), "new_tab_page.html")))
        browser = QWebEngineView()
        page = AppAwareWebEnginePage(self.profile, browser, main_window=self)
        browser.setPage(page)
        browser.setUrl(qurl)
        self.tabs.blockSignals(True)
        i = self.tabs.addTab(label); self.tabs.setTabData(i, {"widget": browser}); self.stack.addWidget(browser); self.tabs.blockSignals(False)
        self.tabs.setCurrentIndex(i)
        page.urlChanged.connect(lambda q, browser=browser: self.update_url_bar(q, browser))
        page.loadFinished.connect(lambda _, i=i, browser=browser: self.on_load_finished(i, browser))

    def on_load_finished(self, i, browser):
        self.update_tab_title(i, browser)
        if browser.url().scheme() != 'file': database.add_history_entry(browser.url().toString(), browser.page().title())

    def update_tab_title(self, i, browser): self.tabs.setTabText(i, browser.page().title())
    def close_current_tab(self, i):
        if self.tabs.count() < 2: self.close()
        else:
            widget = self.tabs.tabData(i)["widget"]; self.stack.removeWidget(widget); widget.deleteLater(); self.tabs.removeTab(i)
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
        if self.current_browser(): self.current_browser().setUrl(QUrl.fromLocalFile(os.path.abspath(os.path.join(os.path.dirname(__file__), "new_tab_page.html"))))

    def add_current_page_to_favorites(self):
        browser = self.current_browser()
        if browser:
            url = browser.url().toString(); title = browser.page().title()
            if url and title and browser.url().scheme() != 'file': database.add_favorite_entry(url, title)

    def generate_page_from_template(self, title, data, template_name):
        with open("template.html", "r") as f: template = f.read()

        list_items = ""
        if template_name == "history":
            for row in data:
                list_items += f'<li><a href="{row[0]}">{row[1]}</a><span class="timestamp">{row[2]}</span></li>'
        else: # favorites
            for row in data:
                list_items += f'<li><a href="{row[0]}">{row[1]}</a></li>'

        final_html = template.replace("{{TITLE}}", title).replace("{{CONTENT}}", list_items)

        temp_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f"temp_{template_name}.html"))
        with open(temp_file_path, "w") as f: f.write(final_html)

        return temp_file_path

    def show_history_page(self):
        history_data = database.get_history()
        path = self.generate_page_from_template("Histórico", history_data, "history")
        self.add_new_tab(QUrl.fromLocalFile(path), "Histórico")

    def show_favorites_page(self):
        favorites_data = database.get_favorites()
        path = self.generate_page_from_template("Favoritos", favorites_data, "favorites")
        self.add_new_tab(QUrl.fromLocalFile(path), "Favoritos")

    def navigate_to_url(self):
        if not self.current_browser():
            return

        text = self.url_bar.text()

        # Check if it's likely a URL or a search query
        if '.' in text and ' ' not in text:
            # It's likely a URL
            q = QUrl(text)
            if q.scheme() == "":
                q.setScheme("http")
            self.current_browser().setUrl(q)
        else:
            # It's likely a search query
            search_url = "https://www.google.com/search?q=" + quote_plus(text)
            self.current_browser().setUrl(QUrl(search_url))
    def update_url_bar(self, q, browser=None):
        if browser != self.current_browser(): return
        self.url_bar.setText(q.toString()); self.url_bar.setCursorPosition(0)
    def update_title(self, browser=None):
        if not browser: browser = self.current_browser()
        if browser: self.setWindowTitle(f"{browser.page().title()} - Navegador Leve e Seguro")
        else: self.setWindowTitle("Navegador Leve e Seguro")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    database.init_db()
    app.setStyleSheet(qdarkstyle.load_stylesheet() + CUSTOM_STYLE)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
