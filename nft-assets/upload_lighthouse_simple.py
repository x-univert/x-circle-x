"""
Upload XCIRCLEX NFT GIFs to Lighthouse IPFS (free, no API key needed)
"""

import os
import requests
import json

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

def upload_to_lighthouse_public():
    """
    Upload files to Lighthouse.storage public endpoint
    Free tier: 1GB storage, no API key needed
    """
    url = "https://node.lighthouse.storage/api/v0/add?wrap-with-directory=true"

    # Collect files
    files = []
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                content = f.read()
            files.append(('file', (f"{level}.gif", content, 'image/gif')))

    if not files:
        print("No files found!")
        return None

    print(f"Uploading {len(files)} files to Lighthouse...")

    try:
        response = requests.post(url, files=files, timeout=300)

        print(f"Response status: {response.status_code}")

        if response.status_code == 200:
            # Parse response - Lighthouse returns NDJSON
            lines = response.text.strip().split('\n')
            results = []
            folder_cid = None

            for line in lines:
                if line.strip():
                    try:
                        result = json.loads(line)
                        results.append(result)
                        # The folder is the entry with empty Name
                        if result.get('Name') == '':
                            folder_cid = result.get('Hash')
                    except json.JSONDecodeError:
                        pass

            if folder_cid:
                return folder_cid
            elif results:
                return results[-1].get('Hash')

        else:
            print(f"Error: {response.text[:500]}")
            return None

    except requests.exceptions.Timeout:
        print("Upload timed out")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    print("=" * 70)
    print("XCIRCLEX NFT - Lighthouse IPFS Upload (Free)")
    print("=" * 70)
    print()

    # List files
    print("Files to upload:")
    total = 0
    for level in range(13):
        path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(path):
            size = os.path.getsize(path) / 1024
            total += size
            print(f"  {level}.gif: {size:.1f} KB")
    print(f"Total: {total:.1f} KB ({total/1024:.2f} MB)")
    print()

    cid = upload_to_lighthouse_public()

    if cid:
        print()
        print("=" * 70)
        print("SUCCESS!")
        print("=" * 70)
        print()
        print(f"Folder CID: {cid}")
        print()
        print("Base URI for contract:")
        print(f"  ipfs://{cid}/")
        print()
        print("Test URLs:")
        print(f"  https://gateway.lighthouse.storage/ipfs/{cid}/0.gif")
        print(f"  https://ipfs.io/ipfs/{cid}/0.gif")
        print()

        # Save
        with open(os.path.join(ASSETS_DIR, 'ipfs_cid.txt'), 'w') as f:
            f.write(cid)

        return cid

    return None

if __name__ == "__main__":
    main()
