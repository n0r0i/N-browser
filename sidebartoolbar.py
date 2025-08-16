from PyQt6.QtWidgets import QToolBar
from PyQt6.QtCore import pyqtSignal, Qt

class SidebarToolBar(QToolBar):
    actionMiddleClicked = pyqtSignal(object)

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.MiddleButton:
            action = self.actionAt(event.pos())
            if action:
                self.actionMiddleClicked.emit(action)
        super().mousePressEvent(event)
