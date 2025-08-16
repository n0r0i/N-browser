import sqlite3
import os

DB_FILE = "browser_data.db"

def add_history_entry(url, title):
    """Adds a new entry to the history table."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        cur.execute("INSERT INTO history (url, title) VALUES (?, ?)", (url, title))
        con.commit()
        con.close()
    except sqlite3.Error as e:
        print(f"Erro ao adicionar ao histórico: {e}")

def add_favorite_entry(url, title):
    """Adds a new entry to the favorites table."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        # Use INSERT OR IGNORE to prevent crashing if the URL is already a favorite
        cur.execute("INSERT OR IGNORE INTO favorites (url, title) VALUES (?, ?)", (url, title))
        con.commit()
        con.close()
    except sqlite3.Error as e:
        print(f"Erro ao adicionar aos favoritos: {e}")

def get_history():
    """Retrieves all history entries, most recent first."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        cur.execute("SELECT url, title, timestamp FROM history ORDER BY timestamp DESC")
        history = cur.fetchall()
        con.close()
        return history
    except sqlite3.Error as e:
        print(f"Erro ao buscar histórico: {e}")
        return []

def get_favorites():
    """Retrieves all favorite entries."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        cur.execute("SELECT url, title FROM favorites ORDER BY title ASC")
        favorites = cur.fetchall()
        con.close()
        return favorites
    except sqlite3.Error as e:
        print(f"Erro ao buscar favoritos: {e}")
        return []

def init_db():
    """Initializes the database and creates tables if they don't exist."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()

        # Create history table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                title TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create favorites table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                title TEXT
            )
        """)

        con.commit()
        con.close()
        print("Banco de dados inicializado com sucesso.")
    except sqlite3.Error as e:
        print(f"Erro ao inicializar o banco de dados: {e}")

if __name__ == '__main__':
    # Allows running this file directly to create the DB
    init_db()
