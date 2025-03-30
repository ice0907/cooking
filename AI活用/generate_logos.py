from PIL import Image, ImageDraw, ImageFont
import os
import re

# サービス名とファイル名のマッピング
services = {
    "Bolt": "bolt",
    "Yoom": "yoom",
    "Windsurf": "windsurf",
    "Lovable": "lovable",
    "Make": "make",
    "Manus": "manus",
    "ChatGPT": "chatgpt-operator",
    "神威": "kamui",
    "Mapify": "mapify",
    "NoLang": "nolang",
    "Fragments": "fragments",
    "Aomni": "aomni",
    "Origami": "origami",
    "IruSiru": "irusiru",
    "HeyGen": "heygen",
    "Rork": "rork",
    "AI HUB": "aihub",
    "Flowith": "flowith",
    "Zapier": "zapier",
    "Pika": "pika",
    "devin": "https://cognition-labs.com/",
    "mastra": "https://mastra.ai/",
    "sora": "https://openai.com/ja-JP/sora/"
}

def generate_logo(service_name, file_name):
    # 画像サイズ
    size = (120, 120)
    
    # 新しい画像を作成（白背景）
    image = Image.new('RGB', size, '#FFFFFF')
    draw = ImageDraw.Draw(image)
    
    # フォントサイズをサービス名の長さに応じて調整
    font_size = min(32, int(120 / (len(service_name) * 0.6)))
    
    try:
        # システムフォントを使用（日本語対応）
        font = ImageFont.truetype("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", font_size)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except:
            font = ImageFont.load_default()
    
    # テキストのバウンディングボックスを取得
    bbox = draw.textbbox((0, 0), service_name, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # テキストを中央に配置
    x = (size[0] - text_width) / 2
    y = (size[1] - text_height) / 2
    
    # アクセントカラーをサービス名から生成
    import hashlib
    hash_value = int(hashlib.md5(service_name.encode()).hexdigest(), 16)
    accent_color = '#{:06x}'.format(hash_value % 0x1000000)
    
    # 背景の円を描画
    circle_margin = 10
    draw.ellipse([circle_margin, circle_margin, size[0]-circle_margin, size[1]-circle_margin], 
                 fill=accent_color)
    
    # テキストを描画（白色で）
    draw.text((x, y), service_name, font=font, fill='#FFFFFF')
    
    # 画像を保存
    if not os.path.exists('images'):
        os.makedirs('images')
    image.save(f'images/{file_name}.png')

def main():
    for service_name, file_name in services.items():
        print(f"Generating logo for {service_name} as {file_name}.png")
        generate_logo(service_name, file_name)

if __name__ == "__main__":
    main() 