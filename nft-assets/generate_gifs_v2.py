"""
XCIRCLEX NFT Collection - Beautiful Animated GIFs v2
=====================================================
Features:
- HYPNOTIC SPIRAL at the center (mesmerizing whirlpool effect)
- Orbiting spheres (count = NFT level)
- Special sun-like glow for level 0 and 12
- Animated starfield background
- Advanced graphical effects
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os
import random

# Output directory
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Image dimensions
WIDTH = 512
HEIGHT = 512
CENTER = (WIDTH // 2, HEIGHT // 2)

# Number of frames and animation settings
NUM_FRAMES = 60
FRAME_DURATION = 50  # ms per frame

# Seed for reproducible stars
random.seed(42)

# Pre-generate star positions
STARS = [(random.randint(0, WIDTH), random.randint(0, HEIGHT),
          random.uniform(0.3, 1.0), random.uniform(0.5, 2.0))
         for _ in range(300)]  # More stars for better effect

# Pre-generate shooting stars
# Each shooting star: (start_x, start_y, angle, speed, start_frame, duration, brightness)
SHOOTING_STARS = []
for i in range(8):  # 8 shooting stars per animation cycle
    start_x = random.randint(-50, WIDTH + 50)
    start_y = random.randint(-50, HEIGHT // 2)  # Start from top half
    angle = random.uniform(math.pi / 6, math.pi / 3)  # Diagonal downward (30-60 degrees)
    if random.random() > 0.5:
        angle = math.pi - angle  # Some go the other direction
    speed = random.uniform(8, 15)  # Pixels per frame
    start_frame = random.randint(0, 50)  # When the shooting star appears
    duration = random.randint(12, 25)  # How many frames it lasts
    brightness = random.uniform(0.7, 1.0)
    SHOOTING_STARS.append((start_x, start_y, angle, speed, start_frame, duration, brightness))

# Rarity configuration with enhanced colors
RARITIES = {
    0: {"name": "Genesis", "primary": (255, 215, 0), "secondary": (255, 140, 0),
        "bg_top": (10, 5, 20), "bg_bottom": (30, 15, 50), "special": True},
    1: {"name": "Common", "primary": (200, 200, 220), "secondary": (150, 150, 180),
        "bg_top": (15, 15, 25), "bg_bottom": (25, 25, 40), "special": False},
    2: {"name": "Common", "primary": (180, 200, 255), "secondary": (120, 150, 200),
        "bg_top": (15, 18, 30), "bg_bottom": (25, 30, 50), "special": False},
    3: {"name": "Uncommon", "primary": (100, 255, 150), "secondary": (50, 200, 100),
        "bg_top": (10, 25, 15), "bg_bottom": (20, 45, 30), "special": False},
    4: {"name": "Uncommon", "primary": (150, 255, 180), "secondary": (80, 220, 120),
        "bg_top": (12, 28, 18), "bg_bottom": (22, 50, 35), "special": False},
    5: {"name": "Rare", "primary": (80, 180, 255), "secondary": (30, 120, 220),
        "bg_top": (10, 20, 35), "bg_bottom": (20, 40, 70), "special": False},
    6: {"name": "Rare", "primary": (100, 200, 255), "secondary": (50, 150, 230),
        "bg_top": (12, 25, 40), "bg_bottom": (25, 50, 80), "special": False},
    7: {"name": "Epic", "primary": (180, 100, 255), "secondary": (130, 50, 200),
        "bg_top": (25, 10, 35), "bg_bottom": (50, 25, 70), "special": False},
    8: {"name": "Epic", "primary": (200, 120, 255), "secondary": (150, 70, 220),
        "bg_top": (30, 15, 40), "bg_bottom": (60, 30, 80), "special": False},
    9: {"name": "Legendary", "primary": (255, 180, 50), "secondary": (255, 120, 20),
        "bg_top": (35, 20, 10), "bg_bottom": (70, 45, 20), "special": False},
    10: {"name": "Legendary", "primary": (255, 200, 80), "secondary": (255, 150, 40),
         "bg_top": (40, 25, 12), "bg_bottom": (80, 55, 25), "special": False},
    11: {"name": "Mythic", "primary": (255, 100, 180), "secondary": (220, 50, 150),
         "bg_top": (35, 10, 25), "bg_bottom": (70, 25, 55), "special": False},
    12: {"name": "Transcendent", "primary": (255, 255, 200), "secondary": (255, 215, 100),
         "bg_top": (20, 15, 35), "bg_bottom": (50, 40, 80), "special": True},
}

def lerp(a, b, t):
    """Linear interpolation"""
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    """Linear interpolation between two colors"""
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))

def clamp(val, min_val, max_val):
    """Clamp value between min and max"""
    return max(min_val, min(max_val, val))

def draw_gradient_background(img, top_color, bottom_color):
    """Draw a vertical gradient background"""
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        t = y / HEIGHT
        color = lerp_color(top_color, bottom_color, t)
        draw.line([(0, y), (WIDTH, y)], fill=color)

def draw_stars(draw, frame, num_frames, level=0):
    """Draw twinkling stars with parallax effect. Level 12 has golden bright stars with rays."""
    is_transcendent = (level == 12)

    for x, y, brightness, speed in STARS:
        # Twinkle effect
        twinkle = 0.5 + 0.5 * math.sin(frame * 0.2 * speed + x * 0.1)
        alpha = brightness * twinkle

        # Parallax movement (subtle)
        offset_x = math.sin(frame * 0.05) * speed * 2
        offset_y = math.cos(frame * 0.03) * speed * 1.5

        star_x = (x + offset_x) % WIDTH
        star_y = (y + offset_y) % HEIGHT

        # For Level 12: Golden/yellow bright stars
        if is_transcendent:
            # All stars are golden/yellow for Transcendent level
            golden_intensity = 0.6 + 0.4 * twinkle
            if brightness > 0.6:
                # Bright golden stars
                color = (
                    int(255 * golden_intensity),
                    int(220 * golden_intensity),
                    int(100 * golden_intensity * 0.5)
                )
            else:
                # Dimmer golden stars
                color = (
                    int(255 * alpha * 0.9),
                    int(200 * alpha * 0.8),
                    int(80 * alpha * 0.4)
                )

            # Larger, brighter stars for level 12
            size = 2 + int(brightness * 2.5)

            # Draw sun rays for bright stars in level 12
            if brightness > 0.65:
                # Draw mini sun rays
                num_rays = 4
                ray_length = 4 + int(brightness * 8 * twinkle)
                for ray in range(num_rays):
                    ray_angle = (ray * math.pi / 2) + frame * 0.05  # Slowly rotating rays
                    ray_end_x = star_x + ray_length * math.cos(ray_angle)
                    ray_end_y = star_y + ray_length * math.sin(ray_angle)
                    ray_color = (
                        int(255 * golden_intensity * 0.7),
                        int(200 * golden_intensity * 0.6),
                        int(50 * golden_intensity * 0.3)
                    )
                    draw.line([(star_x, star_y), (ray_end_x, ray_end_y)],
                             fill=ray_color, width=1)

                # Extra diagonal rays for very bright stars
                if brightness > 0.8:
                    for ray in range(4):
                        ray_angle = (ray * math.pi / 2) + math.pi/4 + frame * 0.03
                        ray_length_diag = 3 + int(brightness * 5 * twinkle)
                        ray_end_x = star_x + ray_length_diag * math.cos(ray_angle)
                        ray_end_y = star_y + ray_length_diag * math.sin(ray_angle)
                        ray_color = (
                            int(255 * golden_intensity * 0.5),
                            int(180 * golden_intensity * 0.4),
                            int(30 * golden_intensity * 0.2)
                        )
                        draw.line([(star_x, star_y), (ray_end_x, ray_end_y)],
                                 fill=ray_color, width=1)

            # Draw enhanced glow for level 12 stars
            if brightness > 0.5:
                for r in range(6, 0, -1):
                    glow_alpha = 0.25 * (7 - r) / 6
                    glow_color = (
                        int(255 * glow_alpha),
                        int(200 * glow_alpha),
                        int(50 * glow_alpha)
                    )
                    draw.ellipse([star_x - r, star_y - r, star_x + r, star_y + r],
                               fill=glow_color)
        else:
            # Normal star colors for other levels
            if brightness > 0.8:
                color = (255, 255, int(200 + 55 * twinkle))
            else:
                color = (int(180 * alpha), int(180 * alpha), int(220 * alpha))

            size = 1 + int(brightness * 1.5)

            # Draw glow for bright ones
            if brightness > 0.7:
                for r in range(3, 0, -1):
                    glow_alpha = 0.2 * (4 - r) / 3
                    glow_color = tuple(int(c * glow_alpha) for c in color)
                    draw.ellipse([star_x - r, star_y - r, star_x + r, star_y + r],
                               fill=glow_color)

        draw.ellipse([star_x - size//2, star_y - size//2,
                     star_x + size//2, star_y + size//2], fill=color)

def draw_shooting_stars(draw, frame, num_frames):
    """Draw animated shooting stars with glowing trails"""
    for start_x, start_y, angle, speed, start_frame, duration, brightness in SHOOTING_STARS:
        # Calculate if this shooting star is active in this frame
        # Use modulo to make shooting stars loop
        effective_frame = (frame - start_frame) % num_frames

        if effective_frame < 0 or effective_frame >= duration:
            continue

        # Progress of the shooting star (0 to 1)
        progress = effective_frame / duration

        # Current position
        distance = effective_frame * speed
        current_x = start_x + distance * math.cos(angle)
        current_y = start_y + distance * math.sin(angle)

        # Skip if completely off screen
        if current_x < -50 or current_x > WIDTH + 50 or current_y < -50 or current_y > HEIGHT + 50:
            continue

        # Draw the trail (multiple segments fading behind)
        trail_length = 12
        for t in range(trail_length):
            trail_progress = t / trail_length
            trail_x = current_x - t * speed * 0.4 * math.cos(angle)
            trail_y = current_y - t * speed * 0.4 * math.sin(angle)

            # Skip if off screen
            if trail_x < 0 or trail_x > WIDTH or trail_y < 0 or trail_y > HEIGHT:
                continue

            # Fade out along the trail and over time
            fade = (1 - trail_progress) * brightness
            # Also fade at start and end of shooting star life
            if progress < 0.2:
                fade *= progress / 0.2
            elif progress > 0.7:
                fade *= (1 - progress) / 0.3

            # Trail color (white to blue gradient)
            if trail_progress < 0.3:
                # Head is bright white/yellow
                color = (
                    int(255 * fade),
                    int(255 * fade),
                    int(220 * fade)
                )
            else:
                # Trail fades to blue
                blue_factor = (trail_progress - 0.3) / 0.7
                color = (
                    int(200 * fade * (1 - blue_factor * 0.5)),
                    int(220 * fade * (1 - blue_factor * 0.3)),
                    int(255 * fade)
                )

            # Size decreases along the trail
            size = max(1, int(3 * (1 - trail_progress * 0.7)))

            draw.ellipse([trail_x - size, trail_y - size,
                         trail_x + size, trail_y + size], fill=color)

        # Draw bright head of shooting star
        head_brightness = brightness
        if progress < 0.2:
            head_brightness *= progress / 0.2
        elif progress > 0.7:
            head_brightness *= (1 - progress) / 0.3

        # Glow around head
        for glow_r in range(6, 0, -1):
            glow_alpha = (7 - glow_r) / 7 * head_brightness * 0.5
            glow_color = (int(255 * glow_alpha), int(255 * glow_alpha), int(200 * glow_alpha))
            draw.ellipse([current_x - glow_r, current_y - glow_r,
                         current_x + glow_r, current_y + glow_r], fill=glow_color)

        # Bright white center
        center_color = (int(255 * head_brightness), int(255 * head_brightness), int(255 * head_brightness))
        draw.ellipse([current_x - 2, current_y - 2, current_x + 2, current_y + 2], fill=center_color)

def draw_hypnotic_spiral(draw, center, frame, num_frames, primary_color, secondary_color, is_special=False, level=0):
    """Draw a mesmerizing hypnotic spiral that spins continuously"""
    cx, cy = center
    is_transcendent = (level == 12)

    # For level 12: Override colors to be bright golden yellow like a sun
    if is_transcendent:
        primary_color = (255, 230, 80)   # Bright golden yellow
        secondary_color = (255, 180, 20)  # Deep gold/orange

    # Rotation animation - smooth continuous spin
    rotation = (frame / num_frames) * math.pi * 4  # 2 full rotations per loop

    # Spiral parameters - larger for level 12
    max_radius = 95 if not is_special else (120 if is_transcendent else 110)
    num_spiral_arms = 6  # Number of spiral arms
    spiral_tightness = 3.5  # How tight the spiral is

    # For level 12: Draw subtle outer golden glow/aura
    if is_transcendent:
        pulse = 1 + 0.1 * math.sin(frame * 0.2)
        for r in range(int(max_radius + 15), int(max_radius), -2):
            glow_t = (r - max_radius) / 15
            glow_alpha = 0.15 * (1 - glow_t) * pulse  # More subtle
            glow_color = (
                int(255 * glow_alpha),
                int(200 * glow_alpha),
                int(50 * glow_alpha)
            )
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=glow_color)

    # Draw the hypnotic spiral pattern
    # We draw from outside to inside for proper layering
    for r in range(int(max_radius), 5, -1):
        t = r / max_radius  # 1 at edge, 0 at center

        # Calculate spiral angle at this radius
        spiral_angle = spiral_tightness * math.log(r + 1) + rotation

        # Draw alternating colored segments around the circle at this radius
        num_segments = num_spiral_arms * 2  # Alternating colors
        segment_angle = (2 * math.pi) / num_segments

        for seg in range(num_segments):
            start_angle = seg * segment_angle + spiral_angle
            end_angle = start_angle + segment_angle * 0.95  # Small gap between segments

            # Alternate between primary and secondary colors
            if seg % 2 == 0:
                # Primary color with gradient based on radius
                intensity = 0.5 + 0.5 * t
                if is_transcendent:
                    intensity = 0.7 + 0.3 * t  # Brighter for level 12
                color = tuple(int(c * intensity) for c in primary_color)
            else:
                # Secondary color / darker
                intensity = 0.3 + 0.4 * t
                if is_transcendent:
                    intensity = 0.5 + 0.4 * t  # Brighter for level 12
                color = tuple(int(c * intensity) for c in secondary_color)

            # Draw arc segment
            bbox = [cx - r, cy - r, cx + r, cy + r]
            start_deg = math.degrees(start_angle)
            end_deg = math.degrees(end_angle)

            # Draw filled arc by drawing a pie slice
            width = max(2, int(3 * t)) if not is_transcendent else max(3, int(4 * t))
            draw.arc(bbox, start_deg, end_deg, fill=color, width=width)

    # Draw concentric spiral lines for hypnotic effect
    for arm in range(num_spiral_arms):
        arm_offset = (arm * 2 * math.pi) / num_spiral_arms

        points = []
        for r in range(5, int(max_radius), 2):
            angle = spiral_tightness * math.log(r + 1) + rotation + arm_offset
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            points.append((x, y))

        # Draw the spiral line
        if len(points) > 1:
            for i in range(len(points) - 1):
                t = i / len(points)
                # Color transitions along the spiral
                line_color = lerp_color(secondary_color, primary_color, t)
                # Fade alpha towards edge
                alpha = 0.8 - 0.3 * t
                if is_transcendent:
                    alpha = 1.0 - 0.2 * t  # More visible for level 12
                fade_color = tuple(int(c * alpha) for c in line_color)
                line_width = 3 if is_transcendent else 2
                draw.line([points[i], points[i+1]], fill=fade_color, width=line_width)

    # Central glowing core - slightly bigger for level 12 but not too much
    core_radius = 35 if is_transcendent else 30
    for r in range(core_radius, 0, -1):
        t = 1 - (r / core_radius)  # 0 at edge, 1 at center
        pulse = 1 + 0.15 * math.sin(frame * 0.25)
        if is_transcendent:
            pulse = 1 + 0.25 * math.sin(frame * 0.2)  # Stronger pulse

        # Blend colors toward center
        core_color = lerp_color(secondary_color, primary_color, t)
        # Brighten the very center
        if r < core_radius // 2:
            brightness = 1 + (1 - r/(core_radius//2)) * (0.8 if is_transcendent else 0.5)
            core_color = tuple(min(255, int(c * brightness)) for c in core_color)

        radius = int(r * pulse)
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=core_color)

    # Bright center point - golden for level 12 but not too big
    pulse = 0.8 + 0.2 * math.sin(frame * 0.3)
    if is_transcendent:
        # Golden center for level 12 (smaller to keep spiral visible)
        bright_center = (255, 230, int(100 + 50 * pulse))
        draw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=bright_center)
        draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(255, 245, 180))
        draw.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(255, 255, 220))
    else:
        bright_center = tuple(min(255, int(c * 1.3 * pulse)) for c in primary_color)
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=bright_center)
        draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(255, 255, 255))

    # For special levels (0 and 12), add sun-like rays
    if is_special:
        draw_sun_rays(draw, center, frame, num_frames, primary_color, is_transcendent)

def draw_sun_rays(draw, center, frame, num_frames, color, is_transcendent=False):
    """Draw animated sun rays for special levels. Much bigger and brighter for level 12."""
    cx, cy = center

    # Level 12 gets more rays but shorter to not cover spheres
    if is_transcendent:
        num_rays = 12
        base_ray_length = 80  # Shorter to not cover orbiting spheres
        inner_radius = 50
        base_width = 12
        tip_width = 2
        base_alpha = 0.25  # Less bright
        alpha_variation = 0.15
        # Override color to golden yellow
        color = (255, 220, 60)
    else:
        num_rays = 12
        base_ray_length = 120
        inner_radius = 45
        base_width = 15
        tip_width = 3
        base_alpha = 0.3
        alpha_variation = 0.2

    rotation = (frame / num_frames) * 360

    # For level 12: Draw secondary smaller rays between main rays (subtle)
    if is_transcendent:
        for i in range(num_rays):
            # Secondary ray offset by half
            angle = math.radians((i * 360 / num_rays) + rotation * 0.5 + (180 / num_rays))

            pulse = 0.7 + 0.3 * math.sin(frame * 0.25 + i * 0.6)
            ray_length = base_ray_length * 0.5 * pulse  # Shorter secondary rays

            outer_radius = inner_radius + ray_length
            perp_angle = angle + math.pi / 2

            small_base = base_width * 0.4
            small_tip = tip_width * 0.4

            inner_left = (cx + inner_radius * math.cos(angle) + small_base * math.cos(perp_angle),
                         cy + inner_radius * math.sin(angle) + small_base * math.sin(perp_angle))
            inner_right = (cx + inner_radius * math.cos(angle) - small_base * math.cos(perp_angle),
                          cy + inner_radius * math.sin(angle) - small_base * math.sin(perp_angle))
            outer_left = (cx + outer_radius * math.cos(angle) + small_tip * math.cos(perp_angle),
                         cy + outer_radius * math.sin(angle) + small_tip * math.sin(perp_angle))
            outer_right = (cx + outer_radius * math.cos(angle) - small_tip * math.cos(perp_angle),
                          cy + outer_radius * math.sin(angle) - small_tip * math.sin(perp_angle))

            alpha = 0.15 + 0.1 * math.sin(frame * 0.2 + i * 0.9)  # More subtle
            ray_color = (int(255 * alpha), int(200 * alpha), int(40 * alpha))
            draw.polygon([inner_left, outer_left, outer_right, inner_right], fill=ray_color)

    # Main rays
    for i in range(num_rays):
        angle = math.radians((i * 360 / num_rays) + rotation * 0.5)

        # Ray length pulsates
        pulse = 0.8 + 0.2 * math.sin(frame * 0.2 + i * 0.5)
        ray_length = base_ray_length * pulse

        outer_radius = inner_radius + ray_length

        # Calculate ray polygon points
        perp_angle = angle + math.pi / 2

        inner_left = (cx + inner_radius * math.cos(angle) + base_width * math.cos(perp_angle),
                     cy + inner_radius * math.sin(angle) + base_width * math.sin(perp_angle))
        inner_right = (cx + inner_radius * math.cos(angle) - base_width * math.cos(perp_angle),
                      cy + inner_radius * math.sin(angle) - base_width * math.sin(perp_angle))
        outer_left = (cx + outer_radius * math.cos(angle) + tip_width * math.cos(perp_angle),
                     cy + outer_radius * math.sin(angle) + tip_width * math.sin(perp_angle))
        outer_right = (cx + outer_radius * math.cos(angle) - tip_width * math.cos(perp_angle),
                      cy + outer_radius * math.sin(angle) - tip_width * math.sin(perp_angle))

        # Draw ray with gradient (simulate with alpha)
        alpha = base_alpha + alpha_variation * math.sin(frame * 0.15 + i * 0.8)
        if is_transcendent:
            ray_color = (int(255 * alpha), int(210 * alpha), int(50 * alpha))
        else:
            ray_color = tuple(int(c * alpha) for c in color)

        draw.polygon([inner_left, outer_left, outer_right, inner_right], fill=ray_color)

        # No extra glow for level 12 to keep spiral visible

def draw_orbiting_spheres(draw, center, frame, num_frames, num_spheres, primary_color, secondary_color, level=0):
    """Draw spheres orbiting around the center"""
    if num_spheres == 0:
        return

    cx, cy = center
    orbit_radius = 140
    rotation = (frame / num_frames) * 360
    is_transcendent = (level == 12)

    for i in range(num_spheres):
        # Calculate sphere position
        base_angle = (i * 360 / num_spheres)
        angle = math.radians(base_angle + rotation)

        # Slight vertical oscillation for 3D effect
        z_offset = math.sin(frame * 0.1 + i * 0.5) * 10

        x = cx + orbit_radius * math.cos(angle)
        y = cy + orbit_radius * math.sin(angle) + z_offset * 0.3

        # Sphere size (varies slightly with position for depth)
        depth_factor = 0.8 + 0.2 * math.sin(angle)
        base_size = 14 if is_transcendent else 12  # Bigger for level 12
        size = base_size * depth_factor

        # For level 12: use golden colors
        if is_transcendent:
            sphere_primary = (255, 230, 80)
            sphere_secondary = (255, 180, 20)
        else:
            sphere_primary = primary_color
            sphere_secondary = secondary_color

        # Draw sphere with gradient (3D effect)
        draw_sphere_3d(draw, x, y, size, sphere_primary, sphere_secondary, frame, i, is_transcendent)

def draw_sphere_3d(draw, x, y, radius, primary_color, secondary_color, frame, index, is_glowing=False):
    """Draw a 3D-looking sphere with highlights. is_glowing adds extra shine for level 12."""

    # For glowing spheres (level 12): Draw outer rays first
    if is_glowing:
        num_rays = 8
        pulse = 0.7 + 0.3 * math.sin(frame * 0.25 + index * 0.5)
        ray_length = radius * 1.5 * pulse

        for ray in range(num_rays):
            ray_angle = (ray * math.pi * 2 / num_rays) + frame * 0.08 + index * 0.3
            ray_end_x = x + (radius + ray_length) * math.cos(ray_angle)
            ray_end_y = y + (radius + ray_length) * math.sin(ray_angle)

            # Ray color (golden, fading)
            ray_alpha = 0.4 * pulse
            ray_color = (int(255 * ray_alpha), int(200 * ray_alpha), int(50 * ray_alpha))
            draw.line([(x, y), (ray_end_x, ray_end_y)], fill=ray_color, width=2)

        # Draw larger outer glow for glowing spheres
        for r in range(int(radius + 15), int(radius), -1):
            glow_t = (r - radius) / 15
            glow_alpha = 0.35 * (1 - glow_t) * pulse
            glow_color = (int(255 * glow_alpha), int(220 * glow_alpha), int(60 * glow_alpha))
            draw.ellipse([x - r, y - r, x + r, y + r], fill=glow_color)

    # Base sphere with gradient
    for r in range(int(radius), 0, -1):
        t = 1 - (r / radius)
        color = lerp_color(secondary_color, primary_color, t * 0.7)
        if is_glowing:
            # Brighter for glowing spheres
            color = tuple(min(255, int(c * 1.2)) for c in color)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)

    # Highlight (top-left)
    highlight_offset = radius * 0.3
    highlight_size = radius * (0.5 if is_glowing else 0.4)
    pulse = 0.7 + 0.3 * math.sin(frame * 0.2 + index)

    if is_glowing:
        # Brighter golden highlight for level 12
        highlight_color = (
            int(min(255, 255 * pulse)),
            int(min(255, 245 * pulse)),
            int(min(255, 150 * pulse))
        )
    else:
        highlight_color = tuple(int(min(255, c * 1.5) * pulse) for c in primary_color)

    draw.ellipse([x - highlight_offset - highlight_size,
                  y - highlight_offset - highlight_size,
                  x - highlight_offset + highlight_size,
                  y - highlight_offset + highlight_size],
                 fill=highlight_color)

    # Outer glow ring
    glow_range = 12 if is_glowing else 8
    for r in range(int(radius + glow_range), int(radius), -1):
        alpha = (radius + glow_range - r) / glow_range * (0.5 if is_glowing else 0.3)
        if is_glowing:
            glow_color = (int(255 * alpha), int(220 * alpha), int(60 * alpha))
        else:
            glow_color = tuple(int(c * alpha) for c in primary_color)
        draw.ellipse([x - r, y - r, x + r, y + r], outline=glow_color, width=1)

def draw_orbit_ring(draw, center, radius, color, frame, num_frames, is_special=False):
    """Draw the orbit ring with animation"""
    cx, cy = center

    # Ring glow effect
    for r in range(3, 0, -1):
        alpha = 0.15 * (4 - r)
        glow_color = tuple(int(c * alpha) for c in color)
        draw.ellipse([cx - radius - r, cy - radius - r,
                     cx + radius + r, cy + radius + r],
                    outline=glow_color, width=2)

    # Main ring (dashed for regular, solid glow for special)
    if is_special:
        # Glowing solid ring
        pulse = 0.7 + 0.3 * math.sin(frame * 0.15)
        ring_color = tuple(int(c * pulse) for c in color)
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                    outline=ring_color, width=2)

        # Additional outer glow for special
        for r in range(10, 0, -2):
            alpha = 0.1 * (10 - r) / 10
            glow_color = tuple(int(c * alpha) for c in color)
            draw.ellipse([cx - radius - r, cy - radius - r,
                         cx + radius + r, cy + radius + r],
                        outline=glow_color, width=1)
    else:
        # Dashed ring effect
        num_dashes = 60
        rotation = (frame / num_frames) * 360 * 0.5
        for i in range(num_dashes):
            if i % 2 == 0:
                start_angle = (i * 360 / num_dashes) + rotation
                end_angle = ((i + 0.7) * 360 / num_dashes) + rotation
                draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
                        start_angle, end_angle, fill=color, width=1)

def draw_level_text(draw, level, config, frame):
    """Draw level number and rarity text"""
    try:
        font_large = ImageFont.truetype("arial.ttf", 28)
        font_small = ImageFont.truetype("arial.ttf", 14)
        font_tiny = ImageFont.truetype("arial.ttf", 11)
    except:
        font_large = ImageFont.load_default()
        font_small = font_large
        font_tiny = font_large

    primary = config["primary"]

    # Level number at center
    level_text = str(level)
    bbox = draw.textbbox((0, 0), level_text, font=font_large)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    # Pulsing effect for text
    pulse = 0.9 + 0.1 * math.sin(frame * 0.2)
    text_color = tuple(int(c * pulse) for c in primary)

    # Shadow
    draw.text((CENTER[0] - text_w//2 + 2, CENTER[1] - text_h//2 + 2),
              level_text, fill=(0, 0, 0), font=font_large)
    # Main text
    draw.text((CENTER[0] - text_w//2, CENTER[1] - text_h//2),
              level_text, fill=text_color, font=font_large)

    # "LEVEL" above
    level_label = "LEVEL"
    bbox = draw.textbbox((0, 0), level_label, font=font_small)
    label_w = bbox[2] - bbox[0]
    draw.text((CENTER[0] - label_w//2, CENTER[1] - 45),
              level_label, fill=(180, 180, 180), font=font_small)

    # Rarity name below
    rarity = config["name"].upper()
    bbox = draw.textbbox((0, 0), rarity, font=font_small)
    rarity_w = bbox[2] - bbox[0]
    draw.text((CENTER[0] - rarity_w//2, CENTER[1] + 28),
              rarity, fill=primary, font=font_small)

    # XCIRCLEX at bottom
    watermark = "XCIRCLEX"
    bbox = draw.textbbox((0, 0), watermark, font=font_tiny)
    wm_w = bbox[2] - bbox[0]
    draw.text((CENTER[0] - wm_w//2, HEIGHT - 25),
              watermark, fill=(80, 80, 100), font=font_tiny)

def create_frame(level, frame_num, total_frames):
    """Create a single frame of the animated NFT"""
    config = RARITIES[level]

    # Create image with gradient background
    img = Image.new('RGB', (WIDTH, HEIGHT), (0, 0, 0))
    draw_gradient_background(img, config["bg_top"], config["bg_bottom"])

    draw = ImageDraw.Draw(img)

    # Draw stars and shooting stars
    draw_stars(draw, frame_num, total_frames, level)
    draw_shooting_stars(draw, frame_num, total_frames)

    # Draw orbit ring
    orbit_radius = 140
    draw_orbit_ring(draw, CENTER, orbit_radius, config["primary"],
                   frame_num, total_frames, config["special"])

    # Draw orbiting spheres (count = level, but at least show the orbit for level 0)
    num_spheres = level if level > 0 else 0
    draw_orbiting_spheres(draw, CENTER, frame_num, total_frames, num_spheres,
                         config["primary"], config["secondary"], level)

    # Draw central hypnotic spiral
    draw_hypnotic_spiral(draw, CENTER, frame_num, total_frames,
                        config["primary"], config["secondary"], config["special"], level)

    # Draw level text
    draw_level_text(draw, level, config, frame_num)

    return img

def generate_gif(level, num_frames=NUM_FRAMES, duration=FRAME_DURATION):
    """Generate an animated GIF for a specific level"""
    frames = []
    config = RARITIES[level]

    print(f"Generating level {level} ({config['name']})...")

    for frame_num in range(num_frames):
        frame = create_frame(level, frame_num, num_frames)
        frames.append(frame)

        # Progress indicator
        if (frame_num + 1) % 20 == 0:
            print(f"  Frame {frame_num + 1}/{num_frames}")

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
    print("=" * 60)
    print("    XCIRCLEX NFT Collection - Beautiful GIF Generator v2")
    print("=" * 60)
    print()
    print("Features:")
    print("  - HYPNOTIC SPIRAL at center (mesmerizing whirlpool)")
    print("  - Orbiting spheres (count = level)")
    print("  - Sun rays for Level 0 (Genesis) and Level 12 (Transcendent)")
    print("  - Animated starfield background with SHOOTING STARS")
    print()

    generated_files = []

    for level in range(13):
        path = generate_gif(level)
        generated_files.append(path)
        print()

    print("=" * 60)
    print(f"Generated {len(generated_files)} GIFs successfully!")
    print("=" * 60)

    # Calculate total size
    total_size = sum(os.path.getsize(f) for f in generated_files) / 1024
    print(f"Total size: {total_size:.1f} KB ({total_size/1024:.2f} MB)")

    print()
    print("Next steps:")
    print("  1. Review the generated GIFs")
    print("  2. Upload to IPFS using upload_pinata.py")
    print("  3. Update NFT metadata with new CIDs")

if __name__ == "__main__":
    main()
