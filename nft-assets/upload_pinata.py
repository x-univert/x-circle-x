"""
Upload XCIRCLEX NFT GIFs to Pinata IPFS (free tier: 1GB)
https://app.pinata.cloud/
"""

import os
import requests
import json

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

# Pinata API - Free tier available
PINATA_API_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_JWT = os.environ.get('PINATA_JWT', '')

def upload_folder_to_pinata():
    """
    Upload all GIFs as a folder to Pinata
    Returns the folder CID
    """
    if not PINATA_JWT:
        print("PINATA_JWT environment variable not set")
        print()
        print("To get a free Pinata JWT:")
        print("1. Go to https://app.pinata.cloud/")
        print("2. Create a free account")
        print("3. Go to API Keys")
        print("4. Create a new key with 'pinFileToIPFS' permission")
        print("5. Copy the JWT token")
        print("6. Set it: set PINATA_JWT=your_token_here")
        return None

    headers = {
        'Authorization': f'Bearer {PINATA_JWT}'
    }

    # Prepare files for folder upload
    files = []
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            # For folder structure, use pinataMetadata
            files.append(
                ('file', (f'xcirclex-nfts/{level}.gif', open(file_path, 'rb'), 'image/gif'))
            )

    if not files:
        print("No GIF files found!")
        return None

    # Pinata options for folder
    pinata_options = json.dumps({
        "cidVersion": 1,
        "wrapWithDirectory": True
    })

    pinata_metadata = json.dumps({
        "name": "xcirclex-nfts",
        "keyvalues": {
            "project": "XCIRCLEX",
            "type": "NFT-images"
        }
    })

    print(f"Uploading {len(files)} files to Pinata...")

    try:
        response = requests.post(
            PINATA_API_URL,
            files=files,
            data={
                'pinataOptions': pinata_options,
                'pinataMetadata': pinata_metadata
            },
            headers=headers,
            timeout=300
        )

        # Close file handles
        for f in files:
            f[1][1].close()

        if response.status_code == 200:
            result = response.json()
            cid = result.get('IpfsHash', '')
            print()
            print("=" * 60)
            print("SUCCESS! Files uploaded to Pinata IPFS")
            print("=" * 60)
            print(f"CID: {cid}")
            print()
            print("Gateway URLs:")
            print(f"  https://gateway.pinata.cloud/ipfs/{cid}/0.gif")
            print(f"  https://ipfs.io/ipfs/{cid}/0.gif")
            print()
            print("Base URI for contract:")
            print(f"  ipfs://{cid}/")

            # Save CID
            with open(os.path.join(ASSETS_DIR, 'pinata_cid.txt'), 'w') as f:
                f.write(cid)

            return cid
        else:
            print(f"Upload failed: {response.status_code}")
            print(response.text)
            return None

    except Exception as e:
        print(f"Error: {e}")
        # Close file handles on error
        for f in files:
            try:
                f[1][1].close()
            except:
                pass
        return None

def upload_individual_files():
    """Upload files individually and return mapping"""
    if not PINATA_JWT:
        print("PINATA_JWT not set")
        return None

    headers = {
        'Authorization': f'Bearer {PINATA_JWT}'
    }

    cids = {}

    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if not os.path.exists(file_path):
            continue

        with open(file_path, 'rb') as f:
            files = {
                'file': (f'{level}.gif', f, 'image/gif')
            }

            pinata_metadata = json.dumps({
                "name": f"xcirclex-level-{level}",
            })

            try:
                response = requests.post(
                    PINATA_API_URL,
                    files=files,
                    data={'pinataMetadata': pinata_metadata},
                    headers=headers,
                    timeout=60
                )

                if response.status_code == 200:
                    cid = response.json().get('IpfsHash', '')
                    cids[level] = cid
                    print(f"  Level {level}: {cid}")
                else:
                    print(f"  Level {level}: Failed - {response.status_code}")

            except Exception as e:
                print(f"  Level {level}: Error - {e}")

    return cids

def main():
    print("=" * 60)
    print("XCIRCLEX NFT - Pinata IPFS Upload")
    print("=" * 60)
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
    cid = upload_folder_to_pinata()

    if cid:
        print()
        print("Next step: Update contract with IPFS URIs")
        print()
        # Generate hex-encoded URIs for each level
        print("Commands to set URIs on contract:")
        for level in range(13):
            uri = f"ipfs://{cid}/{level}.gif"
            uri_hex = uri.encode().hex()
            print(f"Level {level}: {uri}")

    return cid

if __name__ == "__main__":
    main()
