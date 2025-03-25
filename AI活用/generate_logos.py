from PIL import Image, ImageDraw, ImageFont
import os

# サービス名のリスト
services = [
    "a16z"
]

def generate_logo(service_name):
    # 画像サイズ
    size = (120, 120)
    
    # 新しい画像を作成（白背景）
    image = Image.new('RGB', size, '#f5f5f5')
    draw = ImageDraw.Draw(image)
    
    # フォントサイズをサービス名の長さに応じて調整
    font_size = min(24, 24 - (len(service_name) - 4) * 2)
    
    try:
        # システムフォントを使用
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # フォールバック
        font = ImageFont.load_default()
    
    # テキストのバウンディングボックスを取得
    bbox = draw.textbbox((0, 0), service_name, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # テキストを中央に配置
    x = (size[0] - text_width) / 2
    y = (size[1] - text_height) / 2
    
    # 外側の円を描画
    circle_margin = 15
    draw.ellipse([circle_margin, circle_margin, size[0]-circle_margin, size[1]-circle_margin], 
                 outline='#1a1a1a', width=2)
    
    # 内側の円を描画
    inner_margin = 25
    draw.ellipse([inner_margin, inner_margin, size[0]-inner_margin, size[1]-inner_margin], 
                 outline='#1a1a1a', width=1)
    
    # テキストを描画
    draw.text((x, y), service_name, font=font, fill='#1a1a1a')
    
    # 画像を保存
    if not os.path.exists('images'):
        os.makedirs('images')
    image.save(f'images/{service_name.lower()}.png')

def main():
    for service in services:
        generate_logo(service)

if __name__ == '__main__':
    main() 