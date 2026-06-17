from PIL import Image

def remove_white_bg():
    try:
        img = Image.open('public/ksu-logo.png')
        img = img.convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # If pixel is close to white, make it transparent
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save('public/ksu-logo.png', "PNG")
        print("Successfully removed white background!")
    except Exception as e:
        print("Error:", str(e))

if __name__ == '__main__':
    remove_white_bg()
