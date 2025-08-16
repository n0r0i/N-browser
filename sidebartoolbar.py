from PyQt6.QtWidgets import QToolBar
from PyQt6.QtCore import pyqtSignal, Qt

class SidebarToolBar(QToolBar):
    actionContextMenuRequested = pyqtSignal(object, object) # action, global_pos

    def contextMenuEvent(self, event):
        action = self.actionAt(event.pos())
        if action:
            self.actionContextMenuRequested.emit(action, event.globalPos())
        super().contextMenuEvent(event)
