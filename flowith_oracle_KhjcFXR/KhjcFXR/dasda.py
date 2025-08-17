from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "Este é meu site em Flask!"

if __name__ == "__main__":
    app.run(debug=True)
