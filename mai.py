import eel
@eel.expose
def app():
    print("application running")

app()
eel.start('index.html',size=(500,600))