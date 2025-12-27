"""
Upload to NFT.Storage using their Car Upload endpoint
"""

import os
import requests
import json

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

# NFT.Storage API - free for NFT data
NFT_STORAGE_ENDPOINT = "https://api.nft.storage/upload"

def test_simple_upload_no_auth():
    """Try uploading without auth to see if public endpoint exists"""

    # Try without auth first
    file_path = os.path.join(ASSETS_DIR, "0.gif")

    with open(file_path, 'rb') as f:
        response = requests.post(
            NFT_STORAGE_ENDPOINT,
            data=f.read(),
            headers={'Content-Type': 'image/gif'},
            timeout=60
        )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:300]}")

    return response.status_code == 200

def try_dweb_ipfs():
    """Try ipfs.dweb.link add endpoint"""
    url = "https://ipfs.dweb.link/api/v0/add"

    file_path = os.path.join(ASSETS_DIR, "0.gif")

    print("Trying dweb.link...")

    try:
        with open(file_path, 'rb') as f:
            files = {'file': ('0.gif', f, 'image/gif')}
            response = requests.post(url, files=files, timeout=60)

        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.text}")
            return True
        else:
            print(f"Error: {response.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

    return False

def try_cloudflare_ipfs():
    """Try Cloudflare's IPFS gateway"""
    url = "https://cloudflare-ipfs.com/api/v0/add"

    file_path = os.path.join(ASSETS_DIR, "0.gif")

    print("Trying Cloudflare IPFS...")

    try:
        with open(file_path, 'rb') as f:
            files = {'file': ('0.gif', f, 'image/gif')}
            response = requests.post(url, files=files, timeout=60)

        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def try_filebase():
    """Try Filebase public endpoint"""
    url = "https://api.filebase.io/v1/ipfs/pins"

    print("Trying Filebase...")

    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
    except Exception as e:
        print(f"Error: {e}")

    return False

def try_thirdweb_storage():
    """Try Thirdweb storage gateway"""
    url = "https://storage.thirdweb.com/ipfs/upload"

    file_path = os.path.join(ASSETS_DIR, "0.gif")

    print("Trying Thirdweb Storage...")

    try:
        with open(file_path, 'rb') as f:
            files = {'file': ('0.gif', f, 'image/gif')}
            response = requests.post(url, files=files, timeout=60)

        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def try_web3_storage_public():
    """Try web3.storage public endpoint"""
    url = "https://api.web3.storage/upload"

    print("Trying web3.storage...")

    file_path = os.path.join(ASSETS_DIR, "0.gif")

    try:
        with open(file_path, 'rb') as f:
            response = requests.post(
                url,
                data=f.read(),
                timeout=60
            )

        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
    except Exception as e:
        print(f"Error: {e}")

    return False

def main():
    print("=" * 70)
    print("Testing various IPFS upload services")
    print("=" * 70)
    print()

    # Test NFT.Storage
    print("1. NFT.Storage:")
    test_simple_upload_no_auth()
    print()

    # Test dweb
    print("2. dweb.link:")
    try_dweb_ipfs()
    print()

    # Test Cloudflare
    print("3. Cloudflare IPFS:")
    try_cloudflare_ipfs()
    print()

    # Test Thirdweb
    print("4. Thirdweb:")
    try_thirdweb_storage()
    print()

if __name__ == "__main__":
    main()
