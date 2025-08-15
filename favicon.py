import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

def get_favicon_url(page_url):
    """
    Tries to find the favicon URL for a given page URL.
    """
    if not page_url.startswith('http'):
        page_url = 'http://' + page_url

    # 1. Check for favicon.ico in the root directory
    parsed_url = urlparse(page_url)
    favicon_ico_url = f"{parsed_url.scheme}://{parsed_url.netloc}/favicon.ico"

    try:
        response = requests.head(favicon_ico_url, timeout=2)
        if response.status_code == 200:
            return favicon_ico_url
    except requests.RequestException:
        pass

    # 2. If not found, parse the HTML for <link> tags
    try:
        response = requests.get(page_url, timeout=5)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'lxml')

            # Look for <link rel="icon" ...> or <link rel="shortcut icon" ...>
            icon_link = soup.find("link", rel=lambda rel: rel and 'icon' in rel.lower())

            if icon_link and icon_link.get('href'):
                favicon_url = icon_link.get('href')
                # Join with base URL if it's a relative path
                return urljoin(page_url, favicon_url)

    except requests.RequestException as e:
        print(f"Could not fetch page to find favicon: {e}")
        return None

    # Fallback if nothing is found
    return None
