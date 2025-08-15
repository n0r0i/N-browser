STYLE_SHEET = """
QWidget {
    background-color: #2E2E2E;
    color: #FFFFFF;
    font-size: 14px;
}

QMainWindow {
    background-color: #2E2E2E;
}

QToolBar {
    background-color: #333333;
    border: none;
    padding: 5px;
}

QToolButton {
    background-color: transparent;
    border: none;
    padding: 5px;
}

QToolButton:hover {
    background-color: #424242;
    border-radius: 4px;
}

QLineEdit {
    background-color: #424242;
    border: 1px solid #555555;
    border-radius: 8px;
    padding: 5px;
    color: #FFFFFF;
}

QStatusBar {
    background-color: #333333;
    color: #AAAAAA;
}

QTabWidget::pane {
    border: none;
}

QTabBar::tab {
    background: #424242;
    color: #AAAAAA;
    border: none;
    padding: 8px 15px;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
}

QTabBar::tab:selected {
    background: #2E2E2E;
    color: #FFFFFF;
}

QTabBar::tab:hover {
    background: #555555;
    color: #FFFFFF;
}

QToolBar#sidebar {
    background-color: #282828;
    width: 50px;
    padding: 10px;
}

QToolBar#sidebar QToolButton {
    width: 40px;
    height: 40px;
    padding: 5px;
    border-radius: 20px; /* Makes it circular */
}

QToolBar#sidebar QToolButton:hover {
    background-color: #424242;
}
"""
