import os
from urllib.parse import urlparse
import urllib.request
import urllib.error
import concurrent.futures  # For parallelism using threads

def download_file_from_url(url):
    """
    Downloads a file from a given URL using urllib.request with customized
    headers to mimic a browser request, and saves it to the correct directory
    based on the URL path structure.

    Args:
        url (str): The URL of the file to download.

    Returns:
        bool: True if the download was successful, False otherwise.
    """
    try:
        parsed_url = urlparse(url)
        path = parsed_url.path.lstrip('/')  # Remove leading slash if present
        file_path = os.path.join(".", path) # Add "./" to specify current directory

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        headers = {
            'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.9',
            'priority': 'u=1, i',
            'referer': 'http://127.0.0.1:8081/',
            'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'image',
            'sec-fetch-mode': 'no-cors',
            'sec-fetch-site': 'cross-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
        }

        if os.path.exists(file_path):
            return True

        req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req) as response:
                if response.getcode() == 200: # Check for HTTP 200 OK status
                    with open(file_path, 'wb') as file:
                        while True:
                            chunk = response.read(8192) # Read in chunks
                            if not chunk:
                                break
                            file.write(chunk)
                    print(f"Downloaded '{url}' to '{file_path}'")
                    return True
                else:
                    print(f"Error downloading '{url}': HTTP status code {response.getcode()}")
                    return False

        except urllib.error.HTTPError as e:
            print(f"Error downloading '{url}': HTTP Error {e.code} - {e.reason}")
            return False
        except urllib.error.URLError as e:
            print(f"Error downloading '{url}': URL Error - {e.reason}")
            return False


    except Exception as e:
        print(f"An unexpected error occurred while processing '{url}': {e}")
        return False

if __name__ == "__main__":
    links_file = "export.txt"
    links_to_download = []
    max_parallel_downloads = 32 # Number of files to download in parallel

    try:
        with open(links_file, 'r') as file:
            for line in file:
                url = line.strip()  # Remove leading/trailing whitespace and newline characters
                if url: # Make sure the line is not empty
                    links_to_download.append(url)
    except FileNotFoundError:
        print(f"Error: File '{links_file}' not found. Please create this file and put the links in it.")
        exit()
    except Exception as e:
        print(f"An error occurred while reading the file '{links_file}': {e}")
        exit()

    if not links_to_download:
        print(f"No links found in '{links_file}'. Please add links to download to the file.")
        exit()

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_parallel_downloads) as executor:
        futures = [executor.submit(download_file_from_url, link) for link in links_to_download]

    print("\nDownload process complete.")