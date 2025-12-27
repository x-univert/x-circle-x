"""
Generate animated GIFs for XCIRCLEX NFT Collection
13 levels (0-12) with different rarities and animations
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

# Output directory
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Image dimensions
WIDTH = 500
HEIGHT = 500
CENTER = (WIDTH // 2, HEIGHT // 2)

# Rarity configuration (matches smart contract)
RARITIES = {
    0: {"name": "Starter", "color": (128, 128, 128), "bg": (30, 30, 35), "rings": 1},
    1: {"name": "Common", "color": (255, 255, 255), "bg": (25, 25, 30), "rings": 2},
    2: {"name": "Common", "color": (255, 255, 255), "bg": (25, 25, 30), "rings": 2},
    3: {"name": "Uncommon", "color": (30, 255, 30), "bg": (20, 35, 20), "rings": 3},
    4: {"name": "Uncommon", "color": (30, 255, 30), "bg": (20, 35, 20), "rings": 3},
    5: {"name": "Rare", "color": (30, 144, 255), "bg": (20, 30, 45), "rings": 4},
    6: {"name": "Rare", "color": (30, 144, 255), "bg": (20, 30, 45), "rings": 4},
    7: {"name": "Epic", "color": (148, 0, 211), "bg": (35, 20, 45), "rings": 5},
    8: {"name": "Epic", "color": (148, 0, 211), "bg": (35, 20, 45), "rings": 5},
    9: {"name": "Legendary", "color": (255, 165, 0), "bg": (45, 35, 20), "rings": 6},
    10: {"name": "Legendary", "color": (255, 165, 0), "bg": (45, 35, 20), "rings": 6},
    11: {"name": "Mythic", "color": (255, 20, 147), "bg": (45, 20, 35), "rings": 7},
    12: {"name": "Transcendent", "color": (255, 215, 0), "bg": (50, 45, 30), "rings": 8},
}

def lerp_color(c1, c2, t):
    """Linear interpolation between two colors"""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def draw_ring(draw, center, radius, color, width, start_angle=0, segments=36):
    """Draw a segmented ring"""
    cx, cy = center
    for i in range(segments):
        angle1 = start_angle + (i * 360 / segments)
        angle2 = start_angle + ((i + 0.8) * 360 / segments)

        # Calculate points for arc segment
        x1 = cx + radius * math.cos(math.radians(angle1))
        y1 = cy + radius * math.sin(math.radians(angle1))
        x2 = cx + radius * math.cos(math.radians(angle2))
        y2 = cy + radius * math.sin(math.radians(angle2))

        # Draw arc
        bbox = (cx - radius, cy - radius, cx + radius, cy + radius)
        draw.arc(bbox, angle1, angle2, fill=color, width=width)

def draw_particles(draw, center, frame, num_particles, radius, color):
    """Draw animated particles around the center"""
    cx, cy = center
    for i in range(num_particles):
        angle = (i * 360 / num_particles) + frame * 3
        r = radius + 10 * math.sin(math.radians(frame * 5 + i * 30))
        x = cx + r * math.cos(math.radians(angle))
        y = cy + r * math.sin(math.radians(angle))

        # Pulsing size
        size = 3 + 2 * math.sin(math.radians(frame * 8 + i * 45))

        # Fade color based on position
        alpha = 0.5 + 0.5 * math.sin(math.radians(frame * 6 + i * 60))
        particle_color = tuple(int(c * alpha) for c in color)

        draw.ellipse([x - size, y - size, x + size, y + size], fill=particle_color)

def create_frame(level, frame_num, total_frames):
    """Create a single frame of the animated GIF"""
    config = RARITIES[level]

    # Create image with background
    img = Image.new('RGB', (WIDTH, HEIGHT), config["bg"])
    draw = ImageDraw.Draw(img)

    # Animation progress (0 to 1)
    progress = frame_num / total_frames
    rotation = frame_num * (360 / total_frames)

    # Draw outer glow
    glow_color = config["color"]
    for i in range(20, 0, -2):
        glow_alpha = i / 40
        glow_c = tuple(int(c * glow_alpha * 0.3) for c in glow_color)
        radius = 200 + i
        draw.ellipse([CENTER[0] - radius, CENTER[1] - radius,
                      CENTER[0] + radius, CENTER[1] + radius],
                     outline=glow_c, width=2)

    # Draw rotating rings based on rarity
    num_rings = config["rings"]
    for ring_idx in range(num_rings):
        ring_radius = 180 - ring_idx * 20
        ring_rotation = rotation * (1 if ring_idx % 2 == 0 else -1) * (0.5 + ring_idx * 0.1)

        # Color variation per ring
        ring_hue_shift = ring_idx * 0.1
        ring_color = lerp_color(config["color"], (255, 255, 255), ring_hue_shift * 0.3)

        # Pulsing width
        base_width = 4 + ring_idx
        pulse = math.sin(math.radians(frame_num * 8 + ring_idx * 45))
        ring_width = int(base_width + pulse * 2)

        draw_ring(draw, CENTER, ring_radius, ring_color, ring_width, ring_rotation)

    # Draw particles for higher levels
    if level >= 3:
        num_particles = min(level * 2, 20)
        particle_radius = 150
        draw_particles(draw, CENTER, frame_num, num_particles, particle_radius, config["color"])

    # Draw central circle
    inner_radius = 70
    inner_pulse = 5 * math.sin(math.radians(frame_num * 6))
    inner_r = int(inner_radius + inner_pulse)

    # Gradient effect for inner circle
    for i in range(inner_r, 0, -2):
        alpha = i / inner_r
        inner_color = lerp_color(config["bg"], config["color"], alpha * 0.5)
        draw.ellipse([CENTER[0] - i, CENTER[1] - i, CENTER[0] + i, CENTER[1] + i],
                     fill=inner_color)

    # Draw level number
    try:
        # Try to use a nice font
        font_size = 60 if level < 10 else 50
        font = ImageFont.truetype("arial.ttf", font_size)
        small_font = ImageFont.truetype("arial.ttf", 16)
    except:
        font = ImageFont.load_default()
        small_font = font

    # Level text with shadow
    level_text = str(level)
    bbox = draw.textbbox((0, 0), level_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = CENTER[0] - text_width // 2
    text_y = CENTER[1] - text_height // 2 - 10

    # Shadow
    draw.text((text_x + 2, text_y + 2), level_text, fill=(0, 0, 0), font=font)
    # Main text
    draw.text((text_x, text_y), level_text, fill=config["color"], font=font)

    # Draw "LEVEL" text above
    level_label = "LEVEL"
    bbox = draw.textbbox((0, 0), level_label, font=small_font)
    label_width = bbox[2] - bbox[0]
    draw.text((CENTER[0] - label_width // 2, text_y - 25), level_label,
              fill=(200, 200, 200), font=small_font)

    # Draw rarity name below
    rarity_name = config["name"].upper()
    bbox = draw.textbbox((0, 0), rarity_name, font=small_font)
    rarity_width = bbox[2] - bbox[0]
    draw.text((CENTER[0] - rarity_width // 2, CENTER[1] + 35), rarity_name,
              fill=config["color"], font=small_font)

    # Draw corner decorations for high levels
    if level >= 7:
        corner_size = 30
        corners = [(20, 20), (WIDTH - 50, 20), (20, HEIGHT - 50), (WIDTH - 50, HEIGHT - 50)]
        for cx, cy in corners:
            pulse = math.sin(math.radians(frame_num * 10))
            size = corner_size + pulse * 5
            draw.polygon([
                (cx + size//2, cy),
                (cx + size, cy + size//2),
                (cx + size//2, cy + size),
                (cx, cy + size//2)
            ], fill=config["color"], outline=(255, 255, 255))

    # Draw "XCIRCLEX" watermark at bottom
    watermark = "XCIRCLEX"
    bbox = draw.textbbox((0, 0), watermark, font=small_font)
    wm_width = bbox[2] - bbox[0]
    draw.text((CENTER[0] - wm_width // 2, HEIGHT - 30), watermark,
              fill=(100, 100, 100), font=small_font)

    return img

def generate_gif(level, num_frames=30, duration=50):
    """Generate an animated GIF for a specific level"""
    frames = []

    print(f"Generating level {level} ({RARITIES[level]['name']})...")

    for frame_num in range(num_frames):
        frame = create_frame(level, frame_num, num_frames)
        frames.append(frame)

    # Save as GIF
    output_path = os.path.join(OUTPUT_DIR, f"{level}.gif")
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True
    )

    file_size = os.path.getsize(output_path) / 1024
    print(f"  Saved: {output_path} ({file_size:.1f} KB)")

    return output_path

def main():
    print("=" * 50)
    print("XCIRCLEX NFT GIF Generator")
    print("=" * 50)
    print()

    generated_files = []

    for level in range(13):
        path = generate_gif(level)
        generated_files.append(path)

    print()
    print("=" * 50)
    print(f"Generated {len(generated_files)} GIFs successfully!")
    print("=" * 50)

    # Calculate total size
    total_size = sum(os.path.getsize(f) for f in generated_files) / 1024
    print(f"Total size: {total_size:.1f} KB")

if __name__ == "__main__":
    main()
