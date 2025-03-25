import os
import requests
from PIL import Image
from io import BytesIO

# ロゴのURLと保存名の対応
LOGO_URLS = {
    'chatgpt': 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    'gemini': 'https://www.gstatic.com/lamda/images/gemini_ai_v2_96x96.png',
    'claude': 'https://cdn.oaistatic.com/_next/static/media/claude-logo.8fe0b6c5.png',
    'perplexity': 'https://www.perplexity.ai/favicon.ico',
    'midjourney': 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Midjourney_Emblem.png',
    'suno': 'https://suno.ai/favicon.ico',
    'replit': 'https://replit.com/public/images/logo.svg',
    'v0': 'https://v0.dev/static/favicon.svg',
    'dify': 'https://docs.dify.ai/img/logo.svg',
    'notebooklm': 'https://www.gstatic.com/lamda/images/notebook_logo_v2_96x96.png',
    'a16z': 'https://a16z.com/wp-content/themes/a16z/assets/images/a16z-logo.svg'
}

def download_and_save_logo(url, name):
    try:
        # ディレクトリの作成
        os.makedirs('images', exist_ok=True)
        
        # User-Agentを設定
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Referer': 'https://www.google.com/'
        }
        
        # ロゴのダウンロード
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # SVGの場合はそのまま保存
        if url.endswith('.svg'):
            with open(f'images/{name}.svg', 'wb') as f:
                f.write(response.content)
            print(f'Saved {name}.svg')
            return
        
        # 画像の処理
        img = Image.open(BytesIO(response.content))
        
        # サイズの標準化（アスペクト比を保持）
        max_size = (120, 120)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # 透過背景を持つ新しい画像を作成
        new_img = Image.new('RGBA', max_size, (0, 0, 0, 0))
        
        # 画像を中央に配置
        x = (max_size[0] - img.size[0]) // 2
        y = (max_size[1] - img.size[1]) // 2
        
        # 透過を保持してペースト
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            new_img.paste(img, (x, y), img if img.mode == 'RGBA' else None)
        else:
            new_img.paste(img, (x, y))
        
        # PNGとして保存
        new_img.save(f'images/{name}.png', 'PNG')
        print(f'Saved {name}.png')
            
    except Exception as e:
        print(f'Error downloading {name}: {str(e)}')

def main():
    # SUNOのロゴのみを更新
    download_and_save_logo(LOGO_URLS['suno'], 'suno')

if __name__ == '__main__':
    main() 