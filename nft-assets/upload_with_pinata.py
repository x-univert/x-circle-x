"""
Upload XCIRCLEX NFT GIFs to Pinata IPFS using existing API keys
"""

import os
import requests
import json

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

# Pinata API keys from DEMOCRATIX project
PINATA_API_KEY = "582556ecae27aec7767f"
PINATA_SECRET_KEY = "a269c8791384c64e19ba45451bec2b76d17c5ce39af798a550e82aefdd7e4cb6"
PINATA_BASE_URL = "https://api.pinata.cloud"

def upload_file_to_pinata(file_path: str, file_name: str) -> str:
    """Upload a single file to Pinata"""
    url = f"{PINATA_BASE_URL}/pinning/pinFileToIPFS"

    headers = {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
    }

    with open(file_path, 'rb') as f:
        files = {
            'file': (file_name, f, 'image/gif')
        }

        metadata = {
            "name": file_name,
            "keyvalues": {
                "project": "XCIRCLEX",
                "type": "NFT-level-image"
            }
        }

        response = requests.post(
            url,
            files=files,
            data={'pinataMetadata': json.dumps(metadata)},
            headers=headers,
            timeout=120
        )

        if response.status_code == 200:
            return response.json().get('IpfsHash', '')
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return ''

def upload_folder_to_pinata() -> str:
    """Upload all GIFs as a folder to Pinata"""
    url = f"{PINATA_BASE_URL}/pinning/pinFileToIPFS"

    headers = {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
    }

    # Collect all files
    files = []
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            # For folder upload, use 'file' with tuple including path
            files.append(
                ('file', (f"xcirclex/{level}.gif", open(file_path, 'rb'), 'image/gif'))
            )

    if not files:
        print("No GIF files found!")
        return ''

    metadata = {
        "name": "xcirclex-nfts",
        "keyvalues": {
            "project": "XCIRCLEX",
            "type": "NFT-collection"
        }
    }

    options = {
        "wrapWithDirectory": True
    }

    print(f"Uploading {len(files)} files to Pinata as folder...")

    try:
        response = requests.post(
            url,
            files=files,
            data={
                'pinataMetadata': json.dumps(metadata),
                'pinataOptions': json.dumps(options)
            },
            headers=headers,
            timeout=300
        )

        # Close file handles
        for f in files:
            try:
                f[1][1].close()
            except:
                pass

        if response.status_code == 200:
            cid = response.json().get('IpfsHash', '')
            print(f"Success! CID: {cid}")
            return cid
        else:
            print(f"Error: {response.status_code}")
            print(response.text[:500])
            return ''

    except Exception as e:
        print(f"Exception: {e}")
        for f in files:
            try:
                f[1][1].close()
            except:
                pass
        return ''

def upload_individual_files() -> dict:
    """Upload each file individually"""
    cids = {}

    print("Uploading files individually...")
    print()

    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            cid = upload_file_to_pinata(file_path, f"{level}.gif")
            if cid:
                cids[level] = cid
                print(f"  Level {level}: {cid}")
            else:
                print(f"  Level {level}: FAILED")

    return cids

def main():
    print("=" * 70)
    print("XCIRCLEX NFT - Pinata IPFS Upload")
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
    print(f"Total: {total:.1f} KB")
    print()

    # Try folder upload
    print("Attempting folder upload...")
    folder_cid = upload_folder_to_pinata()

    if folder_cid:
        print()
        print("=" * 70)
        print("SUCCESS! Folder uploaded to IPFS")
        print("=" * 70)
        print()
        print(f"Folder CID: {folder_cid}")
        print()
        print("Base URI for contract:")
        base_uri = f"ipfs://{folder_cid}/xcirclex/"
        print(f"  {base_uri}")
        print()
        print("Gateway URLs to test:")
        print(f"  https://gateway.pinata.cloud/ipfs/{folder_cid}/xcirclex/0.gif")
        print(f"  https://ipfs.io/ipfs/{folder_cid}/xcirclex/0.gif")
        print()

        # Save CID
        with open(os.path.join(ASSETS_DIR, 'pinata_cid.txt'), 'w') as f:
            f.write(folder_cid)

        # Generate URIs for each level
        print("Individual level URIs:")
        for level in range(13):
            uri = f"ipfs://{folder_cid}/xcirclex/{level}.gif"
            uri_hex = uri.encode().hex()
            print(f"  Level {level}: {uri}")

        return folder_cid
    else:
        # Fallback to individual uploads
        print()
        print("Folder upload failed, trying individual files...")
        cids = upload_individual_files()

        if cids:
            print()
            print("=" * 70)
            print("Individual uploads completed")
            print("=" * 70)

            # Save CIDs
            with open(os.path.join(ASSETS_DIR, 'pinata_individual_cids.json'), 'w') as f:
                json.dump(cids, f, indent=2)

            print("Individual CIDs saved to pinata_individual_cids.json")

            # Generate URIs
            for level, cid in cids.items():
                uri = f"ipfs://{cid}"
                print(f"  Level {level}: {uri}")

            return cids

        return None

if __name__ == "__main__":
    main()
