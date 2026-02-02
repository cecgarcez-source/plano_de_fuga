from PIL import Image, ImageDraw
import sys

input_path = "public/logo.png"
output_path = "public/logo.png"

def remove_checkerboard(img):
    img = img.convert("RGBA")
    datas = img.getdata()
    
    newData = []
    
    # Heuristic: The checkerboard is likely White (255,255,255) and Grey (usually ~204 or similar)
    # But since we don't know the exact grey, let's look at the corners.
    
    # Better approach: Flood fill from (0,0)
    # We can use ImageDraw.floodfill, but it only fills one color.
    # We need to fill "checkerboard".
    
    # Let's try to just replace the specific colors if they are "background-like".
    # Since the logo is a suitcase (brown), we can probably just replace white and grey.
    
    # Let's sample the top-left 10x10 pixels to find the "background colors"
    bg_colors = set()
    for x in range(10):
        for y in range(10):
            bg_colors.add(img.getpixel((x, y)))
            
    print(f"Detected background colors: {bg_colors}")
    
    # Now replace all pixels that match these background colors with transparent
    # This is risky if the logo has these colors inside.
    # But usually the logo (suitcase) is distinct.
    
    width, height = img.size
    for y in range(height):
        for x in range(width):
            pixel = img.getpixel((x, y))
            if pixel in bg_colors:
                newData.append((255, 255, 255, 0)) # Transparent
            else:
                newData.append(pixel)
                
    img.putdata(newData)
    return img

try:
    print(f"Processing {input_path}...")
    img = Image.open(input_path)
    img = remove_checkerboard(img)
    img.save(output_path)
    print(f"Successfully removed background and saved to {output_path}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
