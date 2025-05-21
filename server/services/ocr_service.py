import sys
import json
import pytesseract
from PIL import Image
import re

# Set Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def preprocess_image(image_path):
    img = Image.open(image_path)
    # Enhance image for better OCR
    img = img.convert('L')  # Convert to grayscale
    return img

def clean_price(price_str):
    # Convert 'S1.99' to '1.99'
    return price_str.replace('S', '').replace('$', '')

def parse_receipt(image_path):
    try:
        img = preprocess_image(image_path)
        extracted_text = pytesseract.image_to_string(img)
        print("Extracted text:", extracted_text, file=sys.stderr)
        
        items = []
        lines = extracted_text.split('\n')
        
        # Multiple patterns to match different item formats
        patterns = [
            # Free Jalapeno Peppers(Qty:2)-$0.47
            r'([^(]+?)\s*\(Qty:(\d+)\)\s*-\s*[\$S](\d+\.\d{2})',
            # Multi Grain Bread - 24oz (Qty:1)-$1.99
            r'([^-]+?)-\s*[\w\s.]+?\(Qty:(\d+)\)-[\$S](\d+\.\d{2})',
            # Navel Orange (Q:2)- $2.89
            r'([^(]+?)\s*\(Q:(\d+)\)-\s*[\$S](\d+\.\d{2})',
            # White Onion (Q:1) $1.08
            r'([^(]+?)\s*\(Q:(\d+)\)\s*[\$S](\d+\.\d{2})',
            # Lemons (Q:2) $1.00
            r'([^(]+?)\s*\(Q:(\d+)\)\s*[\$S](\d+\.\d{2})'
        ]

        for line in lines:
            line = line.strip()
            if not line or should_skip_line(line):
                continue

            # Try each pattern
            for pattern in patterns:
                match = re.search(pattern, line)
                if match:
                    name, qty_str, price_str = match.groups()
                    
                    # Clean up the data
                    name = clean_item_name(name)
                    quantity = int(qty_str)
                    price = float(clean_price(price_str))
                    
                    # Skip likely non-items
                    if price > 50 or not name:  # Skip items over $50 or empty names
                        continue
                    
                    item = {
                        'name': name,
                        'quantity': quantity,
                        'price': price,
                        'category': categorize_item(name)
                    }
                    print(f"Found item: {item}", file=sys.stderr)
                    items.append(item)
                    break  # Stop trying patterns if we found a match

        result = {
            'items': items,
            'total': sum(item['price'] * item['quantity'] for item in items)
        }
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        print(f"Error details: {str(e)}", file=sys.stderr)

def should_skip_line(line):
    skip_words = [
        'order', 'total', 'payment', 'summary', 'savings', 'subtotal',
        'complete', 'shopping', 'visa', 'method', 'preferences', 'profile',
        'receipt', 'program', 'services'
    ]
    return any(word in line.lower() for word in skip_words)

def clean_item_name(name):
    return name.strip().replace('  ', ' ')

def categorize_item(name):
    name = name.lower()
    categories = {
        'produce': [
            'apple', 'orange', 'pepper', 'tomato', 'onion', 'potato',
            'lemon', 'jalapeno', 'pear'
        ],
        'dairy': ['yogurt', 'greek'],
        'bakery': ['bread', 'rolls'],
        'pantry': ['sauce'],
        'paper_goods': ['paper towels', 'flora paper']
    }
    
    for category, keywords in categories.items():
        if any(keyword in name for keyword in keywords):
            return category
    return 'other'

if __name__ == '__main__':
    if len(sys.argv) > 1:
        parse_receipt(sys.argv[1]) 