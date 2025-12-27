"""
Try various free public IPFS upload endpoints
"""

import os
import requests
import json
import time

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

def try_estuary_upload():
    """Try Estuary shuttle (free IPFS pinning)"""
    # Estuary has a public upload endpoint
    url = "https://shuttle-5.estuary.tech/content/add"

    file_path = os.path.join(ASSETS_DIR, "0.gif")

    print("Trying Estuary...")

    try:
        with open(file_path, 'rb') as f:
            files = {'data': ('0.gif', f, 'image/gif')}
            response = requests.post(url, files=files, timeout=60)

        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def try_ipfstech():
    """Try ipfs.tech (Protocol Labs official)"""
    url = "https://ipfs.tech/api/v0/add"

    file_path = os.path.join(ASSETS_DIR, "0.gif")

    print("Trying ipfs.tech...")

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

def try_4everland():
    """Try 4EVERLAND (has free tier)"""
    url = "https://endpoint.4everland.co"

    print("Trying 4EVERLAND...")

    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def try_fleek():
    """Try Fleek IPFS"""
    url = "https://storageapi.fleek.co/pinfile"

    print("Trying Fleek...")

    file_path = os.path.join(ASSETS_DIR, "0.gif")

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

def try_crust_gateway():
    """Try Crust Network IPFS Gateway"""
    url = "https://gw.crustfiles.app/api/v0/add"

    print("Trying Crust Gateway...")

    file_path = os.path.join(ASSETS_DIR, "0.gif")

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

def try_pinata_public():
    """Check if Pinata.cloud is accessible"""
    print("Checking Pinata.cloud accessibility...")

    try:
        response = requests.get("https://api.pinata.cloud", timeout=10)
        print(f"Status: {response.status_code}")
        print("Pinata.cloud is accessible!")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("=" * 70)
    print("Testing public IPFS upload services")
    print("=" * 70)
    print()

    # Test connectivity to various services
    print("=" * 50)
    print("1. Testing Pinata.cloud")
    print("=" * 50)
    try_pinata_public()
    print()

    print("=" * 50)
    print("2. Testing Estuary")
    print("=" * 50)
    try_estuary_upload()
    print()

    print("=" * 50)
    print("3. Testing ipfs.tech")
    print("=" * 50)
    try_ipfstech()
    print()

    print("=" * 50)
    print("4. Testing Crust Gateway")
    print("=" * 50)
    try_crust_gateway()
    print()

if __name__ == "__main__":
    main()
