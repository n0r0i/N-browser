CUSTOM_STYLE = """
/* --- Tab Close Button --- */
QTabBar::close-button {
    min-width: 16px;
    min-height: 16px;
    max-width: 16px;
    max-height: 16px;
    border-radius: 8px;
    padding: 2px;
    margin: 4px;
}
QTabBar::close-button:hover {
    background-color: #555555;
}

/* --- Window Control Buttons in Custom Title Bar --- */
CustomTitleBar #windowControlButton {
    background-color: transparent;
    border: none;
    padding: 5px;
}
CustomTitleBar #windowControlButton:hover {
    background-color: #424242;
    border-radius: 4px;
}
CustomTitleBar #windowCloseButton {
    background-color: transparent;
    border: none;
    padding: 5px;
}
CustomTitleBar #windowCloseButton:hover {
    background-color: #E81123;
    border-radius: 4px;
}

/* --- New Tab Button --- */
CustomTitleBar QPushButton {
    background-color: transparent;
    border: none;
    padding: 5px;
    font-size: 16px;
    qproperty-iconSize: 16px; /* If using an icon */
    min-width: 30px;
    min-height: 30px;
}
CustomTitleBar QPushButton:hover {
    background-color: #424242;
    border-radius: 4px;
}

/* --- Navigation Toolbar Buttons --- */
QToolBar#navigation_bar QToolButton {
    padding: 5px;
    margin: 2px;
    border-radius: 4px;
}
QToolBar#navigation_bar QToolButton:hover {
    background-color: #424242;
}
"""
