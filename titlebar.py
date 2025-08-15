from PyQt6.QtWidgets import QWidget, QHBoxLayout, QPushButton
from PyQt6.QtCore import Qt, QPoint

class CustomTitleBar(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent

        self.layout = QHBoxLayout()
        self.layout.setContentsMargins(10, 0, 0, 0) # Left margin for tabs
        self.layout.setSpacing(0)

        # --- Window Controls ---
        self.minimize_button = QPushButton("_")
        self.maximize_button = QPushButton("[]")
        self.close_button = QPushButton("X")

        self.minimize_button.setFixedSize(30, 30)
        self.maximize_button.setFixedSize(30, 30)
        self.close_button.setFixedSize(30, 30)

        self.minimize_button.setObjectName("windowControlButton")
        self.maximize_button.setObjectName("windowControlButton")
        self.close_button.setObjectName("windowCloseButton") # For specific hover color

        # Spacer to push controls to the right
        self.layout.addStretch(1)

        self.layout.addWidget(self.minimize_button)
        self.layout.addWidget(self.maximize_button)
        self.layout.addWidget(self.close_button)

        self.setLayout(self.layout)

        self._drag_start_position = QPoint()

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_start_position = event.globalPosition().toPoint()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.MouseButton.LeftButton:
            delta = event.globalPosition().toPoint() - self._drag_start_position
            if self.parent:
                self.parent.move(self.parent.pos() + delta)
            self._drag_start_position = event.globalPosition().toPoint()
            event.accept()

    def mouseReleaseEvent(self, event):
        self._drag_start_position = QPoint()
        event.accept()
