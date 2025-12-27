"""
Upload XCIRCLEX NFT GIFs to IPFS using Lighthouse.storage (free tier)
Alternative: Upload manually to Pinata
"""

import os
import requests
import json

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

def upload_to_lighthouse_free():
    """
    Upload files to Lighthouse.storage
    Free tier: 1GB storage, no API key needed for basic uploads
    """
    # Lighthouse public upload endpoint
    url = "https://node.lighthouse.storage/api/v0/add"

    uploaded_cids = {}

    print("Uploading to Lighthouse.storage (free IPFS pinning)...")
    print()

    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")

        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        try:
            with open(file_path, 'rb') as f:
                files = {'file': (f"{level}.gif", f, 'image/gif')}
                response = requests.post(url, files=files, timeout=60)

                if response.status_code == 200:
                    result = response.json()
                    cid = result.get('Hash', '')
                    size = result.get('Size', 0)
                    uploaded_cids[level] = cid
                    print(f"  Level {level}: {cid} ({int(size)/1024:.1f} KB)")
                else:
                    print(f"  Level {level}: Failed - {response.status_code}")

        except Exception as e:
            print(f"  Level {level}: Error - {str(e)}")

    return uploaded_cids

def create_folder_structure():
    """
    Create a folder with all GIFs and upload it
    This gives us a single CID for the entire collection
    """
    url = "https://node.lighthouse.storage/api/v0/add?wrap-with-directory=true"

    print("Creating folder upload...")

    files = []
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            # Read file content
            with open(file_path, 'rb') as f:
                content = f.read()
            files.append(('file', (f"{level}.gif", content, 'image/gif')))

    if not files:
        print("No files found!")
        return None

    try:
        response = requests.post(url, files=files, timeout=300)

        if response.status_code == 200:
            # Response contains multiple lines, last one is the directory
            lines = response.text.strip().split('\n')
            results = [json.loads(line) for line in lines if line.strip()]

            # Find the directory entry (empty name)
            for result in results:
                if result.get('Name') == '':
                    return result.get('Hash')

            # If no empty name, return last result
            if results:
                return results[-1].get('Hash')

        else:
            print(f"Upload failed: {response.status_code}")
            print(response.text)
            return None

    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def upload_individual_files():
    """Upload each file individually and track CIDs"""
    cids = upload_to_lighthouse_free()

    if cids:
        print()
        print("=" * 60)
        print("Individual file CIDs:")
        print("=" * 60)
        for level, cid in cids.items():
            print(f"Level {level}: ipfs://{cid}")

    return cids

def main():
    print("=" * 60)
    print("XCIRCLEX NFT - Lighthouse IPFS Upload")
    print("=" * 60)
    print()

    # Try folder upload first
    print("Attempting folder upload...")
    folder_cid = create_folder_structure()

    if folder_cid:
        print()
        print("=" * 60)
        print("SUCCESS! Folder uploaded to IPFS")
        print("=" * 60)
        print()
        print(f"Folder CID: {folder_cid}")
        print()
        print("Base URI for smart contract:")
        print(f"  ipfs://{folder_cid}/")
        print()
        print("Example URLs:")
        print(f"  https://gateway.lighthouse.storage/ipfs/{folder_cid}/0.gif")
        print(f"  https://ipfs.io/ipfs/{folder_cid}/0.gif")
        print()

        # Save CID to file for later use
        cid_file = os.path.join(ASSETS_DIR, 'ipfs_cid.txt')
        with open(cid_file, 'w') as f:
            f.write(folder_cid)
        print(f"CID saved to: {cid_file}")

        return folder_cid
    else:
        print("Folder upload failed, trying individual files...")
        return upload_individual_files()

if __name__ == "__main__":
    main()
