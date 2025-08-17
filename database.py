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

        # Create web_panels table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS web_panels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE
            )
        """)

        con.commit()
        con.close()
    except sqlite3.Error as e:
        print(f"Erro ao inicializar o banco de dados: {e}")

def add_panel(url):
    """Adds a new web panel URL to the database."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        cur.execute("INSERT OR IGNORE INTO web_panels (url) VALUES (?)", (url,))
        con.commit()
        con.close()
    except sqlite3.Error as e:
        print(f"Erro ao adicionar painel: {e}")

def remove_panel(url):
    """Removes a web panel URL from the database."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        cur.execute("DELETE FROM web_panels WHERE url = ?", (url,))
        con.commit()
        con.close()
    except sqlite3.Error as e:
        print(f"Erro ao remover painel: {e}")

def get_panels():
    """Retrieves all saved web panel URLs."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        cur.execute("SELECT url FROM web_panels ORDER BY id")
        panels = cur.fetchall()
        con.close()
        return [row[0] for row in panels] # Return a simple list of URLs
    except sqlite3.Error as e:
        print(f"Erro ao buscar painéis: {e}")
        return []

def clear_history():
    """Deletes all entries from the history table."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        cur.execute("DELETE FROM history")
        con.commit()
        con.close()
    except sqlite3.Error as e:
        print(f"Erro ao limpar histórico: {e}")

def clear_favorites():
    """Deletes all entries from the favorites table."""
    try:
        con = sqlite3.connect(DB_FILE)
        cur = con.cursor()
        cur.execute("DELETE FROM favorites")
        con.commit()
        con.close()
    except sqlite3.Error as e:
        print(f"Erro ao limpar favoritos: {e}")

if __name__ == '__main__':
    # Allows running this file directly to create the DB
    init_db()
