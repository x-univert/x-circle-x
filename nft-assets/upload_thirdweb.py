"""
Upload XCIRCLEX NFT GIFs to IPFS using Thirdweb Storage (free)
"""

import os
import requests
import json

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

def upload_to_thirdweb():
    """
    Upload files using Thirdweb's free IPFS storage
    No API key required for basic uploads
    """
    # Thirdweb storage gateway upload endpoint
    url = "https://storage.thirdweb.com/ipfs/upload"

    print("Uploading to Thirdweb Storage...")
    print()

    files_to_upload = []
    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            files_to_upload.append((f"{level}.gif", file_path))

    # Try uploading one file first to test
    test_file = files_to_upload[0]
    print(f"Testing with {test_file[0]}...")

    try:
        with open(test_file[1], 'rb') as f:
            files = {'file': (test_file[0], f, 'image/gif')}
            response = requests.post(url, files=files, timeout=60)

            print(f"Response status: {response.status_code}")
            print(f"Response: {response.text[:500]}")

            if response.status_code == 200:
                result = response.json()
                print(f"Success! Result: {result}")
                return result
            else:
                print(f"Failed with status {response.status_code}")
                return None

    except Exception as e:
        print(f"Error: {e}")
        return None

def try_quicknode_ipfs():
    """Try QuickNode's free IPFS gateway"""
    url = "https://api.quicknode.com/ipfs/rest/v1/s3/put-object"

    print("Trying QuickNode IPFS...")

    # QuickNode requires API key
    api_key = os.environ.get('QUICKNODE_API_KEY', '')
    if not api_key:
        print("QuickNode API key not set")
        return None

    headers = {
        'x-api-key': api_key
    }

    # Upload test file
    file_path = os.path.join(ASSETS_DIR, "0.gif")
    with open(file_path, 'rb') as f:
        response = requests.post(url, headers=headers, files={'file': f}, timeout=60)
        print(f"QuickNode response: {response.status_code}")
        return response.json() if response.status_code == 200 else None

def try_4everland_ipfs():
    """Try 4EVERLAND's free IPFS pinning"""
    url = "https://api.4everland.dev/bucket/file"

    print("Trying 4EVERLAND IPFS...")

    # This requires registration but has a free tier
    api_key = os.environ.get('EVERLAND_API_KEY', '')
    if not api_key:
        print("4EVERLAND API key not set")
        return None

    headers = {
        'Authorization': f'Bearer {api_key}'
    }

    return None

def create_demo_uri():
    """
    Create a demo URI using a public placeholder
    For testing purposes on devnet
    """
    print()
    print("=" * 70)
    print("DEMO MODE - Using placeholder images for testing")
    print("=" * 70)
    print()

    # For devnet testing, we can use placeholder images
    # Real production would use actual IPFS upload
    demo_base_uri = "https://placeholder.com/xcirclex/"

    print("For devnet testing, you can use placeholder URLs.")
    print("The contract will work with any valid HTTP/HTTPS URL.")
    print()
    print(f"Demo base URI: {demo_base_uri}")
    print()

    return demo_base_uri

def try_fleek_storage():
    """Try Fleek's free IPFS storage"""
    print("Trying Fleek Storage...")

    # Fleek requires authentication
    # Check for API key
    api_key = os.environ.get('FLEEK_API_KEY', '')
    if not api_key:
        print("Fleek API key not set")
        return None

    return None

def upload_to_imgur():
    """
    Upload to Imgur as alternative (not IPFS but works for NFTs)
    """
    print("Trying Imgur upload...")

    client_id = os.environ.get('IMGUR_CLIENT_ID', '')
    if not client_id:
        # Use anonymous upload (limited)
        client_id = "546c25a59c58ad7"  # Public client ID for testing

    url = "https://api.imgur.com/3/image"
    headers = {
        'Authorization': f'Client-ID {client_id}'
    }

    uploaded = {}

    for level in range(13):
        file_path = os.path.join(ASSETS_DIR, f"{level}.gif")
        if os.path.exists(file_path):
            try:
                with open(file_path, 'rb') as f:
                    import base64
                    image_data = base64.b64encode(f.read()).decode('utf-8')

                data = {
                    'image': image_data,
                    'type': 'base64',
                    'name': f'xcirclex-level-{level}'
                }

                response = requests.post(url, headers=headers, data=data, timeout=60)

                if response.status_code == 200:
                    result = response.json()
                    link = result.get('data', {}).get('link', '')
                    uploaded[level] = link
                    print(f"  Level {level}: {link}")
                else:
                    print(f"  Level {level}: Failed - {response.status_code}")
                    # Rate limit - stop trying
                    if response.status_code == 429:
                        print("  Rate limited. Stopping.")
                        break

            except Exception as e:
                print(f"  Level {level}: Error - {e}")

    return uploaded

def main():
    print("=" * 70)
    print("XCIRCLEX NFT - Multi-Service IPFS Upload")
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

    # Try Thirdweb first
    result = upload_to_thirdweb()

    if not result:
        # Try Imgur as fallback
        print()
        print("Attempting Imgur upload as fallback...")
        imgur_result = upload_to_imgur()

        if imgur_result:
            print()
            print("=" * 70)
            print("Imgur upload successful!")
            print("=" * 70)
            for level, url in imgur_result.items():
                print(f"Level {level}: {url}")

            # Save URLs
            with open(os.path.join(ASSETS_DIR, 'imgur_urls.json'), 'w') as f:
                json.dump(imgur_result, f, indent=2)

            return imgur_result

    if not result:
        print()
        print("=" * 70)
        print("AUTOMATED UPLOAD FAILED")
        print("=" * 70)
        print()
        print("Please upload manually using one of these services:")
        print()
        print("1. PINATA (Recommended)")
        print("   - Go to: https://app.pinata.cloud/")
        print("   - Create free account")
        print("   - Upload > Folder")
        print(f"   - Select folder: {ASSETS_DIR}")
        print("   - Copy the CID after upload")
        print()
        print("2. NFT.STORAGE")
        print("   - Go to: https://nft.storage/")
        print("   - Login with GitHub")
        print("   - Upload all GIF files")
        print("   - Copy the CID")
        print()

        # Save file list
        with open(os.path.join(ASSETS_DIR, 'UPLOAD_INSTRUCTIONS.txt'), 'w') as f:
            f.write("XCIRCLEX NFT - Manual Upload Instructions\n")
            f.write("=" * 50 + "\n\n")
            f.write("1. Go to https://app.pinata.cloud/\n")
            f.write("2. Create a free account\n")
            f.write("3. Click 'Upload' -> 'Folder'\n")
            f.write(f"4. Navigate to: {ASSETS_DIR}\n")
            f.write("5. Select all GIF files (0.gif to 12.gif)\n")
            f.write("6. Upload and copy the CID\n\n")
            f.write("Files:\n")
            for level in range(13):
                f.write(f"  - {level}.gif\n")

        print(f"Instructions saved to: {os.path.join(ASSETS_DIR, 'UPLOAD_INSTRUCTIONS.txt')}")

    return result

if __name__ == "__main__":
    main()
