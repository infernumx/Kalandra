#!/usr/bin/env python

from flask import Flask, request
from flask_socketio import SocketIO, emit
import pyperclip
import pygetwindow as gw
import time
import pythoncom
import win32gui
import win32com.client
import os
import json
from pynput.keyboard import Key, Controller
import traceback

try:
    dirname = os.path.dirname(__file__)
    keyboard = Controller()

    app = Flask(__name__)
    socketio = SocketIO(app)

    with open(os.path.join(dirname, "Resources/config.json")) as f:
        config = json.load(f)

    whisper_paste = config["general"]["whisperPaste"]

    def kalandra_log(msg):
        emit("Logger", f"keyboard.py [Keyboard Server]: {msg}")

    def paste():
        keyboard.press(Key.ctrl)
        time.sleep(0.02)
        keyboard.type("v")
        keyboard.release(Key.ctrl)

    @socketio.on("Whisper")
    def handle_whisper(messages):
        windows = gw.getWindowsWithTitle("Path of Exile")
        if windows:
            window = [w for w in windows if w.title == "Path of Exile"][0]
            pythoncom.CoInitialize()
            shell = win32com.client.Dispatch("WScript.Shell")
            shell.SendKeys("%")
            window.activate()
            time.sleep(0.01)
            for msg in messages:
                print(msg)
                keyboard.press(Key.enter)
                keyboard.release(Key.enter)
                time.sleep(0.03)
                if whisper_paste:
                    pyperclip.copy(msg)
                    window.activate()
                    paste()
                else:
                    keyboard.type(msg)
                keyboard.press(Key.enter)
                keyboard.release(Key.enter)
                kalandra_log(msg)

    if __name__ == "__main__":
        print("Running keyboard listener")
        socketio.run(app, host="127.0.0.1", port=5000)
except Exception as e:
    with open("error-log.txt", "w+") as f:
        traceback.print_exception(type(e), e, e.__traceback__, file=f)
