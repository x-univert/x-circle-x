"""
Upload XCIRCLEX NFT GIFs to IPFS using Pinata
"""

import os
import requests
import json
import time

# Directory containing the GIFs
ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

# Pinata API (free tier available at https://app.pinata.cloud/)
# You can get a free API key by signing up
PINATA_API_KEY = os.environ.get('PINATA_API_KEY', '')
PINATA_SECRET_KEY = os.environ.get('PINATA_SECRET_KEY', '')

# Alternative: Use web3.storage or nft.storage
# For demo purposes, we'll use a public IPFS gateway

def upload_to_pinata(file_path, name):
    """Upload a single file to Pinata"""
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"

    headers = {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY
    }

    with open(file_path, 'rb') as f:
        files = {
            'file': (name, f)
        }

        metadata = {
            'name': name,
            'keyvalues': {
                'collection': 'XCIRCLEX',
                'type': 'nft-asset'
            }
        }

        data = {
            'pinataMetadata': json.dumps(metadata),
            'pinataOptions': json.dumps({'cidVersion': 1})
        }

        response = requests.post(url, files=files, data=data, headers=headers)

        if response.status_code == 200:
            result = response.json()
            return result['IpfsHash']
        else:
            print(f"Error uploading {name}: {response.text}")
            return None

def upload_folder_to_pinata():
    """Upload all GIFs as a folder to Pinata"""
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"

    headers = {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY
    }

    # Prepare files for folder upload
    files = []
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            files.append(
                ('file', (f'xcirclex-nfts/{level}.gif', open(file_path, 'rb'), 'image/gif'))
            )

    metadata = {
        'name': 'xcirclex-nfts',
        'keyvalues': {
            'collection': 'XCIRCLEX',
            'type': 'nft-collection'
        }
    }

    data = {
        'pinataMetadata': json.dumps(metadata),
        'pinataOptions': json.dumps({'cidVersion': 1, 'wrapWithDirectory': True})
    }

    print("Uploading folder to Pinata...")
    response = requests.post(url, files=files, data=data, headers=headers)

    # Close file handles
    for _, file_tuple in files:
        file_tuple[1].close()

    if response.status_code == 200:
        result = response.json()
        return result['IpfsHash']
    else:
        print(f"Error: {response.text}")
        return None

def create_metadata_files():
    """Create JSON metadata files for each NFT"""

    rarities = {
        0: {"name": "Starter", "description": "A new member begins their journey in the Circle of Life"},
        1: {"name": "Common", "description": "Starting to understand the circular economy"},
        2: {"name": "Common", "description": "Building connections within the circle"},
        3: {"name": "Uncommon", "description": "Contributing regularly to the community"},
        4: {"name": "Uncommon", "description": "Establishing trust with fellow members"},
        5: {"name": "Rare", "description": "A respected member of the Circle"},
        6: {"name": "Rare", "description": "Demonstrating commitment to the ecosystem"},
        7: {"name": "Epic", "description": "A pillar of the circular community"},
        8: {"name": "Epic", "description": "Inspiring others through dedication"},
        9: {"name": "Legendary", "description": "A master of circular economics"},
        10: {"name": "Legendary", "description": "Leading by example in the Circle"},
        11: {"name": "Mythic", "description": "Transcending ordinary participation"},
        12: {"name": "Transcendent", "description": "The Perfect Circle - Maximum achievement unlocked"},
    }

    metadata_dir = os.path.join(ASSETS_DIR, 'metadata')
    os.makedirs(metadata_dir, exist_ok=True)

    for level in range(13):
        rarity = rarities[level]
        metadata = {
            "name": f"XCIRCLEX Level {level}",
            "description": rarity["description"],
            "image": f"ipfs://REPLACE_WITH_CID/{level}.gif",
            "attributes": [
                {"trait_type": "Level", "value": level},
                {"trait_type": "Rarity", "value": rarity["name"]},
                {"trait_type": "Collection", "value": "XCIRCLEX"},
                {"trait_type": "Type", "value": "Circle of Life NFT"}
            ]
        }

        metadata_path = os.path.join(metadata_dir, f"{level}.json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        print(f"Created metadata: {metadata_path}")

def main():
    print("=" * 60)
    print("XCIRCLEX NFT IPFS Uploader")
    print("=" * 60)
    print()

    # Check for API keys
    if not PINATA_API_KEY or not PINATA_SECRET_KEY:
        print("WARNING: Pinata API keys not set!")
        print()
        print("To upload to IPFS, you have two options:")
        print()
        print("OPTION 1: Use Pinata (Recommended)")
        print("-" * 40)
        print("1. Go to https://app.pinata.cloud/ and create a free account")
        print("2. Go to API Keys and create a new key")
        print("3. Set environment variables:")
        print("   set PINATA_API_KEY=your_api_key")
        print("   set PINATA_SECRET_KEY=your_secret_key")
        print("4. Run this script again")
        print()
        print("OPTION 2: Manual Upload")
        print("-" * 40)
        print("1. Go to https://app.pinata.cloud/pinmanager")
        print("2. Click 'Upload' -> 'Folder'")
        print(f"3. Select all GIFs from: {ASSETS_DIR}")
        print("4. Name the folder 'xcirclex-nfts'")
        print("5. Copy the CID after upload")
        print()
        print("Files to upload:")
        for level in range(13):
            file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
            if os.path.exists(file_path):
                size = os.path.getsize(file_path) / 1024
                print(f"  {level}.gif ({size:.1f} KB)")

        # Create metadata files anyway
        print()
        print("Creating metadata files...")
        create_metadata_files()

        return None

    # Upload to Pinata
    print("Uploading GIFs folder to Pinata IPFS...")
    print()

    cid = upload_folder_to_pinata()

    if cid:
        print()
        print("=" * 60)
        print("SUCCESS! Files uploaded to IPFS")
        print("=" * 60)
        print()
        print(f"IPFS CID: {cid}")
        print()
        print("Base URI for smart contract:")
        print(f"  ipfs://{cid}/")
        print()
        print("Gateway URLs:")
        print(f"  https://gateway.pinata.cloud/ipfs/{cid}/0.gif")
        print(f"  https://ipfs.io/ipfs/{cid}/0.gif")
        print()

        # Update metadata files with correct CID
        print("Updating metadata files with CID...")
        metadata_dir = os.path.join(ASSETS_DIR, 'metadata')
        os.makedirs(metadata_dir, exist_ok=True)

        rarities = {
            0: {"name": "Starter", "description": "A new member begins their journey"},
            1: {"name": "Common", "description": "Starting to understand the circular economy"},
            2: {"name": "Common", "description": "Building connections within the circle"},
            3: {"name": "Uncommon", "description": "Contributing regularly to the community"},
            4: {"name": "Uncommon", "description": "Establishing trust with fellow members"},
            5: {"name": "Rare", "description": "A respected member of the Circle"},
            6: {"name": "Rare", "description": "Demonstrating commitment to the ecosystem"},
            7: {"name": "Epic", "description": "A pillar of the circular community"},
            8: {"name": "Epic", "description": "Inspiring others through dedication"},
            9: {"name": "Legendary", "description": "A master of circular economics"},
            10: {"name": "Legendary", "description": "Leading by example in the Circle"},
            11: {"name": "Mythic", "description": "Transcending ordinary participation"},
            12: {"name": "Transcendent", "description": "The Perfect Circle achieved"},
        }

        for level in range(13):
            rarity = rarities[level]
            metadata = {
                "name": f"XCIRCLEX Level {level}",
                "description": rarity["description"],
                "image": f"ipfs://{cid}/{level}.gif",
                "attributes": [
                    {"trait_type": "Level", "value": level},
                    {"trait_type": "Rarity", "value": rarity["name"]},
                    {"trait_type": "Collection", "value": "XCIRCLEX"}
                ]
            }

            with open(os.path.join(metadata_dir, f"{level}.json"), 'w') as f:
                json.dump(metadata, f, indent=2)

        print("Done!")
        return cid
    else:
        print("Upload failed!")
        return None

if __name__ == "__main__":
    main()
