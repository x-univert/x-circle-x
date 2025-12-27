"""
Upload XCIRCLEX NFT GIFs to NFT.Storage (free, unlimited storage for NFTs)
https://nft.storage/
"""

import os
import requests
import json

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

# NFT.Storage API
NFT_STORAGE_API = "https://api.nft.storage/upload"
NFT_STORAGE_KEY = os.environ.get('NFT_STORAGE_KEY', '')

def upload_to_nft_storage():
    """Upload files to NFT.Storage"""

    if not NFT_STORAGE_KEY:
        print("NFT_STORAGE_KEY not set")
        print()
        print("To get a free NFT.Storage API key:")
        print("1. Go to https://nft.storage/")
        print("2. Sign in with GitHub or email")
        print("3. Go to API Keys")
        print("4. Create a new API key")
        print("5. Set it: set NFT_STORAGE_KEY=your_key_here")
        return None

    headers = {
        'Authorization': f'Bearer {NFT_STORAGE_KEY}'
    }

    cids = {}

    print("Uploading to NFT.Storage...")
    print()

    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if not os.path.exists(file_path):
            continue

        with open(file_path, 'rb') as f:
            try:
                response = requests.post(
                    NFT_STORAGE_API,
                    headers=headers,
                    data=f,
                    timeout=120
                )

                if response.status_code == 200:
                    result = response.json()
                    cid = result.get('value', {}).get('cid', '')
                    cids[level] = cid
                    print(f"  Level {level}: {cid}")
                else:
                    print(f"  Level {level}: Failed - {response.status_code}")
                    print(f"    {response.text[:200]}")

            except Exception as e:
                print(f"  Level {level}: Error - {e}")

    if cids:
        # Save CIDs
        with open(os.path.join(ASSETS_DIR, 'nftstorage_cids.json'), 'w') as f:
            json.dump(cids, f, indent=2)
        print()
        print(f"CIDs saved to nftstorage_cids.json")

    return cids

def main():
    print("=" * 60)
    print("XCIRCLEX NFT - NFT.Storage Upload")
    print("=" * 60)
    print()

    cids = upload_to_nft_storage()

    if cids:
        print()
        print("=" * 60)
        print("Upload complete!")
        print("=" * 60)
        for level, cid in cids.items():
            print(f"Level {level}: ipfs://{cid}")

if __name__ == "__main__":
    main()
