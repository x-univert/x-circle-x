"""
Upload XCIRCLEX NFT GIFs to Filebase IPFS
Filebase offers 5GB free storage
"""

import os
import requests
import json
import base64
import time

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

# Filebase S3-compatible endpoint for IPFS
FILEBASE_ENDPOINT = "https://s3.filebase.com"
FILEBASE_ACCESS_KEY = os.environ.get('FILEBASE_ACCESS_KEY', '')
FILEBASE_SECRET_KEY = os.environ.get('FILEBASE_SECRET_KEY', '')
BUCKET_NAME = "xcirclex-nfts"

def try_infura_ipfs():
    """Try uploading via Infura IPFS (requires project ID)"""
    # Infura public endpoint
    url = "https://ipfs.infura.io:5001/api/v0/add?wrap-with-directory=true"

    print("Trying Infura IPFS...")

    files = []
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            files.append(('file', (f"{level}.gif", open(file_path, 'rb'), 'image/gif')))

    try:
        response = requests.post(url, files=files, timeout=300)
        print(f"Response: {response.status_code}")
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Infura failed: {e}")

    return None

def try_ipfs_io():
    """Try the public IPFS add endpoint"""
    url = "https://ipfs.io/api/v0/add?wrap-with-directory=true"

    print("Trying ipfs.io...")

    try:
        files = []
        for level in range(13):
            file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
            if os.path.exists(file_path):
                files.append(('file', (f"{level}.gif", open(file_path, 'rb'))))

        response = requests.post(url, files=files, timeout=300)
        print(f"Response: {response.status_code}")
        return response.json() if response.status_code == 200 else None
    except Exception as e:
        print(f"ipfs.io failed: {e}")
        return None

def try_dweb_link():
    """Try dweb.link gateway"""
    print("Trying dweb.link...")

    try:
        for level in range(13):
            file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
            if os.path.exists(file_path):
                # Just check connectivity
                response = requests.head("https://dweb.link", timeout=10)
                print(f"dweb.link status: {response.status_code}")
                break
    except Exception as e:
        print(f"dweb.link failed: {e}")

def upload_via_nftstorage_api():
    """
    Use NFT.Storage's new API (requires free API key from https://nft.storage)
    """
    api_key = os.environ.get('NFT_STORAGE_API_KEY', '')

    if not api_key:
        print("NFT.Storage API key not set")
        return None

    url = "https://api.nft.storage/upload"
    headers = {
        'Authorization': f'Bearer {api_key}'
    }

    print("Uploading to NFT.Storage...")

    cids = {}
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                response = requests.post(url, headers=headers, data=f, timeout=120)
                if response.status_code == 200:
                    result = response.json()
                    cid = result.get('value', {}).get('cid', '')
                    cids[level] = cid
                    print(f"  Level {level}: {cid}")
                else:
                    print(f"  Level {level}: Failed - {response.status_code}")

    return cids

def try_web3_storage():
    """Try web3.storage free tier"""
    api_key = os.environ.get('WEB3_STORAGE_TOKEN', '')

    if not api_key:
        print("Web3.Storage token not set")
        return None

    url = "https://api.web3.storage/upload"
    headers = {
        'Authorization': f'Bearer {api_key}',
        'X-NAME': 'xcirclex-nfts'
    }

    print("Uploading to Web3.Storage...")

    # Create CAR file or upload directory
    files = []
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            files.append(('file', (f"{level}.gif", open(file_path, 'rb'), 'image/gif')))

    response = requests.post(url, headers=headers, files=files, timeout=300)

    if response.status_code == 200:
        return response.json().get('cid')
    else:
        print(f"Web3.Storage failed: {response.status_code} - {response.text}")
        return None

def create_manual_instructions():
    """Create instructions for manual upload"""
    print()
    print("=" * 70)
    print("MANUAL UPLOAD INSTRUCTIONS")
    print("=" * 70)
    print()
    print("The automated IPFS services are not accessible from your network.")
    print("Please follow these steps to upload manually:")
    print()
    print("OPTION 1: Pinata (Recommended - Free)")
    print("-" * 50)
    print("1. Go to https://app.pinata.cloud/ and create a free account")
    print("2. Click 'Upload' -> 'Folder'")
    print(f"3. Navigate to: {ASSETS_DIR}")
    print("4. Select ALL the .gif files (0.gif through 12.gif)")
    print("5. Name the folder 'xcirclex-nfts'")
    print("6. Click 'Upload'")
    print("7. Copy the CID (starts with 'Qm...' or 'bafy...')")
    print()
    print("OPTION 2: NFT.Storage (Free)")
    print("-" * 50)
    print("1. Go to https://nft.storage/")
    print("2. Sign in with GitHub or Email")
    print("3. Click 'Upload' and select all GIF files")
    print("4. Copy the CID after upload")
    print()
    print("OPTION 3: Filebase (5GB Free)")
    print("-" * 50)
    print("1. Go to https://filebase.com/")
    print("2. Create account and create an IPFS bucket")
    print("3. Upload all GIF files")
    print("4. Copy the CID")
    print()
    print("=" * 70)
    print("After uploading, run this command to set the base URI:")
    print("=" * 70)
    print()
    print("Replace YOUR_CID with your actual CID:")
    print()
    print('mxpy tx new --receiver erd1qqqqqqqqqqqqqpgqjwd6xwycht2hmm5h76qcgzdqdxnz8g9wflfqt5v6zc \\')
    print('  --value 0 --gas-limit 10000000 \\')
    print('  --data "setBaseUri@[HEX_ENCODED_URI]" \\')
    print('  --pem multiversx-wallets/wallet-test-devnet.pem \\')
    print('  --chain D --proxy https://devnet-gateway.multiversx.com \\')
    print('  --recall-nonce --send')
    print()
    print("Where [HEX_ENCODED_URI] is the hex encoding of 'ipfs://YOUR_CID/'")
    print()

    # Save GIF list for reference
    gif_list = os.path.join(ASSETS_DIR, 'FILES_TO_UPLOAD.txt')
    with open(gif_list, 'w') as f:
        f.write("Files to upload to IPFS:\n")
        f.write("=" * 40 + "\n\n")
        total_size = 0
        for level in range(13):
            file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
            if os.path.exists(file_path):
                size = os.path.getsize(file_path)
                total_size += size
                f.write(f"{level}.gif - {size/1024:.1f} KB\n")
        f.write(f"\nTotal: {total_size/1024:.1f} KB\n")
        f.write(f"\nDirectory: {ASSETS_DIR}\n")

    print(f"File list saved to: {gif_list}")

def main():
    print("=" * 70)
    print("XCIRCLEX NFT - IPFS Upload Utility")
    print("=" * 70)
    print()

    # Check what files we have
    print("Checking GIF files...")
    total_size = 0
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            total_size += size
            print(f"  {level}.gif - {size/1024:.1f} KB")

    print(f"\nTotal: {total_size/1024:.1f} KB ({total_size/1024/1024:.2f} MB)")
    print()

    # Try various services
    cid = None

    # Try NFT.Storage
    if os.environ.get('NFT_STORAGE_API_KEY'):
        cid = upload_via_nftstorage_api()

    # Try Web3.Storage
    if not cid and os.environ.get('WEB3_STORAGE_TOKEN'):
        cid = try_web3_storage()

    # If no API keys, provide manual instructions
    if not cid:
        create_manual_instructions()

    return cid

if __name__ == "__main__":
    main()
